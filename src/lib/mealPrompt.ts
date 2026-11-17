// Prompt, response schema and response parsing for meal photo recognition.
// Pure (no device APIs) so it can be tested from Node (scripts/try-photo.ts).

import { BUILT_IN_DISHES } from '../data/dishes';
import { INGREDIENTS } from '../data/ingredients';

export type DetectedDish = {
  dishId: string | null; // id from our list, or null for an unknown dish
  name: string;
  ingredients: string[]; // our ingredient ids
  fried: boolean;
  portion: string;
  confidence: number; // 0-1
  seen: string; // what the model saw, for debugging
};

export type DetectResult = { notFood: boolean; dishes: DetectedDish[] };

// Each dish with its main ingredients, so the model can tell look-alike
// dishes apart (misal vs pav bhaji, sambar vs dal, chole vs rajma).
const dishList = BUILT_IN_DISHES.map((d) => {
  const ings = d.ingredients.map((i) => INGREDIENTS[i]?.name ?? i).join(', ');
  return `${d.id}: ${d.name}${d.alt ? ` (${d.alt})` : ''} — ${ings}${d.fried ? '; deep fried' : ''}`;
}).join('\n');

const ingredientList = Object.entries(INGREDIENTS)
  .map(([id, i]) => `${id}: ${i.name}`)
  .join('\n');

export const PROMPT = `You identify Indian food in photos for a psoriasis food diary.

Step 1. For each separate dish or drink on the plate, first write "seen": a short visual description (colour, texture, toppings, how it is served).
Step 2. Match it to the single best dish in DISH LIST using its ingredients, not just its name. Then set dish_id and name.

Tips for look-alike dishes:
- Misal pav: thin spicy red-orange gravy (kat/tarri) with sprouts or moth beans, topped with crunchy yellow farsan/sev, chopped onion, lemon, served with pav. Pav bhaji instead is a thick, smooth, mashed vegetable bhaji, usually with butter on top, no sprouts, no farsan.
- Sambar has vegetables and tamarind; dal tadka is plain yellow lentils; kadhi is pale yellow and made with curd and besan.
- Chole are big beige chickpeas; rajma are dark red kidney beans.
- Poha is flattened rice flakes; upma is a soft semolina mash.
- Idli is white and steamed; dhokla is yellow and spongy.

Rules:
- Bread or pav served as part of misal pav, pav bhaji, vada pav or dabeli is part of that dish: do not list it separately.
- Ignore small garnishes (chopped onion, lemon wedge, coriander), but list sides like curd, raita, papad, pickle, chutney, salad and drinks.
- If nothing in DISH LIST fits, set dish_id to "none", give a short name, and list main ingredients using ONLY ids from INGREDIENT LIST. Set fried=true if it is deep fried.
- portion: short estimate like "1 katori", "2 pav", "1 plate", "1 glass".
- confidence: 0 to 1. Use below 0.6 when unsure.
- If the photo shows no food or drink, set not_food=true and return an empty list.
- Describe only the food, never people or skin.

DISH LIST (id: name — main ingredients):
${dishList}

INGREDIENT LIST (id: name):
${ingredientList}`;

export const SCHEMA = {
  type: 'object',
  properties: {
    not_food: { type: 'boolean' },
    dishes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          seen: { type: 'string' },
          dish_id: { type: 'string' },
          name: { type: 'string' },
          ingredients: { type: 'array', items: { type: 'string' } },
          fried: { type: 'boolean' },
          portion: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['seen', 'dish_id', 'name', 'portion', 'confidence'],
        propertyOrdering: ['seen', 'dish_id', 'name', 'ingredients', 'fried', 'portion', 'confidence'],
      },
    },
  },
  required: ['not_food', 'dishes'],
};

export function requestBody(base64Jpeg: string) {
  return {
    contents: [{ role: 'user', parts: [{ text: PROMPT }, { inlineData: { mimeType: 'image/jpeg', data: base64Jpeg } }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseJsonSchema: SCHEMA },
  };
}

type RawDish = {
  seen?: string;
  dish_id?: string;
  name?: string;
  ingredients?: string[];
  fried?: boolean;
  portion?: string;
  confidence?: number;
};

/** Turns a generateContent JSON response into dishes from our database. Throws Error with a user-facing message. */
export function parseResponse(json: unknown): DetectResult {
  const j = json as {
    promptFeedback?: { blockReason?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const block = j?.promptFeedback?.blockReason;
  if (block) throw new Error(`The photo was blocked (${block}). Try another photo.`);
  const text = j?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (!text) throw new Error('No answer from Gemini. Try again.');

  let parsed: { not_food?: boolean; dishes?: RawDish[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Could not read Gemini’s answer. Try again.');
  }

  const known = new Map(BUILT_IN_DISHES.map((d) => [d.id, d]));
  const dishes: DetectedDish[] = (parsed.dishes ?? []).map((d) => {
    const match = d.dish_id && d.dish_id !== 'none' ? known.get(d.dish_id) : undefined;
    return {
      dishId: match ? match.id : null,
      name: match ? match.name : (d.name ?? 'Unknown dish').trim(),
      ingredients: match ? match.ingredients : (d.ingredients ?? []).filter((i) => i in INGREDIENTS),
      fried: match ? match.fried : !!d.fried,
      portion: d.portion ?? '',
      confidence: Math.max(0, Math.min(1, d.confidence ?? 0.5)),
      seen: d.seen ?? '',
    };
  });
  return { notFood: !!parsed.not_food, dishes };
}

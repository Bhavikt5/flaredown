// Dish or packaged product name -> ingredients, using Gemini (text only).
// Pure (no device APIs) so it can be tested from Node (scripts/try-dish.ts).

import { ALL_TAGS, findIngredientByName, INGREDIENTS, Tag, TAG_LABELS } from '../data/ingredients';

export type DishSuggestion = {
  known: string[]; // ids from our ingredient list
  newItems: { name: string; tags: Tag[] }[]; // ingredients not in our list
  fried: boolean;
  note: string;
};

const ingredientList = Object.entries(INGREDIENTS)
  .map(([id, i]) => `${id}: ${i.name}`)
  .join('\n');
const tagList = ALL_TAGS.map((t) => `${t}: ${TAG_LABELS[t]}`).join('\n');

export function dishPrompt(name: string, extraIngredients: { id: string; name: string }[] = []) {
  const extra = extraIngredients.length ? '\n' + extraIngredients.map((i) => `${i.id}: ${i.name}`).join('\n') : '';
  return `You help an Indian psoriasis food diary describe a dish or packaged food product.

Food: "${name.replace(/"/g, "'")}"

Return its MAIN ingredients (at most 8):
- known: ids from INGREDIENT LIST that are in it.
- new_items: main ingredients NOT in the list (for example a branded sauce, a specific snack or cheese). For each, a short name and the tags that apply from TAG LIST.
- If it is a branded or packaged product (biscuits, chips, namkeen, instant food, sauces, soft drinks, ready-to-eat), include the tag "processed" on the matching new item, or use known packaged ids.
- fried: true if the food is usually deep fried.
- note: one short sentence describing the food, or "unknown food" if you do not recognise it.
Use typical Indian home or market versions. Do not invent ingredients you are unsure of.

INGREDIENT LIST (id: name):
${ingredientList}${extra}

TAG LIST (id: meaning):
${tagList}`;
}

export const DISH_SCHEMA = {
  type: 'object',
  properties: {
    note: { type: 'string' },
    known: { type: 'array', items: { type: 'string' } },
    new_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, tags: { type: 'array', items: { type: 'string', enum: ALL_TAGS } } },
        required: ['name', 'tags'],
      },
    },
    fried: { type: 'boolean' },
  },
  required: ['note', 'known', 'new_items', 'fried'],
};

export function dishRequestBody(name: string, extra: { id: string; name: string }[] = []) {
  return {
    contents: [{ role: 'user', parts: [{ text: dishPrompt(name, extra) }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseJsonSchema: DISH_SCHEMA },
  };
}

export function parseDishResponse(
  json: unknown,
  validIds: (id: string) => boolean,
  findByName: (name: string) => string | undefined = findIngredientByName,
): DishSuggestion {
  const j = json as { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null;
  const text = j?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (!text) throw new Error('No answer from Gemini. Try again.');
  let p: { note?: string; known?: string[]; new_items?: { name?: string; tags?: string[] }[]; fried?: boolean };
  try {
    p = JSON.parse(text);
  } catch {
    throw new Error('Could not read Gemini’s answer. Try again.');
  }
  const known = [...new Set((p.known ?? []).filter(validIds))];
  const newItems: DishSuggestion['newItems'] = [];
  for (const i of (p.new_items ?? []).slice(0, 6)) {
    const name = (i.name ?? '').trim().replace(/\s+/g, ' ');
    if (name.length < 2) continue;
    // The model sometimes lists a known ingredient as "new": use ours instead.
    const existing = findByName(name);
    if (existing) {
      if (!known.includes(existing)) known.push(existing);
      continue;
    }
    if (newItems.some((x) => x.name.toLowerCase() === name.toLowerCase())) continue;
    newItems.push({ name, tags: [...new Set((i.tags ?? []).filter((t): t is Tag => t in TAG_LABELS))] });
  }
  return { known, newItems, fried: !!p.fried, note: (p.note ?? '').trim() };
}

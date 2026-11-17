// Ingredients and the tags the trigger engine groups them by.
// Tags let the engine spot patterns (e.g. "nightshades") even when single
// ingredients are eaten too rarely to analyse on their own.

export type Tag =
  | 'gluten'
  | 'refined_flour'
  | 'dairy'
  | 'nightshade'
  | 'fried'
  | 'sugar'
  | 'red_meat'
  | 'processed'
  | 'spicy'
  | 'caffeine'
  | 'citrus'
  | 'fish'
  | 'eggs'
  | 'legumes'
  | 'nuts'
  | 'leafy_greens'
  | 'whole_grain'
  | 'fermented';

export const TAG_LABELS: Record<Tag, string> = {
  gluten: 'Gluten',
  refined_flour: 'Refined flour (maida)',
  dairy: 'Dairy',
  nightshade: 'Nightshades',
  fried: 'Fried food',
  sugar: 'Added sugar',
  red_meat: 'Red meat',
  processed: 'Ultra-processed',
  spicy: 'Spicy (chilli)',
  caffeine: 'Caffeine',
  citrus: 'Citrus / sour',
  fish: 'Fish and seafood',
  eggs: 'Eggs',
  legumes: 'Dals and legumes',
  nuts: 'Nuts and seeds',
  leafy_greens: 'Leafy greens',
  whole_grain: 'Whole grains and millets',
  fermented: 'Fermented / pickled',
};

export type Ingredient = { name: string; tags: Tag[]; custom?: boolean };

export const ALL_TAGS = Object.keys(TAG_LABELS) as Tag[];

// Ingredients the user added (loaded from the database at start-up).
// Kept here so pure code (scoring, engine labels) can look them up.
const CUSTOM: Record<string, Ingredient> = {};

export function setCustomIngredients(list: { id: string; name: string; tags: Tag[] }[]) {
  for (const k of Object.keys(CUSTOM)) delete CUSTOM[k];
  for (const i of list) CUSTOM[i.id] = { name: i.name, tags: i.tags.filter((t) => t in TAG_LABELS), custom: true };
}

/** Built-in or user-added ingredient. */
export function ingredientInfo(id: string): Ingredient | undefined {
  return INGREDIENTS[id] ?? CUSTOM[id];
}

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Finds an existing ingredient whose name (or a part like "Tomato" in "Tomato / tamatar") matches. */
export function findIngredientByName(name: string): string | undefined {
  const n = normName(name);
  if (!n) return undefined;
  for (const [id, ing] of allIngredients()) {
    const parts = [ing.name, ...ing.name.split(/[/(),]/)].map(normName).filter(Boolean);
    if (parts.includes(n) || normName(id) === n) return id;
  }
  return undefined;
}

/** All ingredients, user-added first. */
export function allIngredients(): [string, Ingredient][] {
  return [...Object.entries(CUSTOM), ...Object.entries(INGREDIENTS)];
}

export const INGREDIENTS: Record<string, Ingredient> = {
  // Grains and flours
  wheat: { name: 'Wheat (atta)', tags: ['gluten', 'whole_grain'] },
  maida: { name: 'Maida', tags: ['gluten', 'refined_flour'] },
  sooji: { name: 'Sooji / rava', tags: ['gluten'] },
  rice: { name: 'Rice', tags: [] },
  poha: { name: 'Poha', tags: [] },
  millet: { name: 'Millet (bajra, jowar, ragi)', tags: ['whole_grain'] },
  oats: { name: 'Oats', tags: ['whole_grain'] },
  bread: { name: 'Bread / pav', tags: ['gluten', 'refined_flour', 'processed'] },
  besan: { name: 'Besan (gram flour)', tags: ['legumes'] },
  corn: { name: 'Corn / makki', tags: ['whole_grain'] },
  sabudana: { name: 'Sabudana', tags: [] },
  noodles: { name: 'Instant noodles', tags: ['gluten', 'refined_flour', 'processed', 'fried'] },

  // Dairy
  milk: { name: 'Milk', tags: ['dairy'] },
  curd: { name: 'Curd / dahi', tags: ['dairy', 'fermented'] },
  paneer: { name: 'Paneer', tags: ['dairy'] },
  ghee: { name: 'Ghee', tags: ['dairy'] },
  butter: { name: 'Butter', tags: ['dairy'] },
  cream: { name: 'Cream / malai', tags: ['dairy'] },
  cheese: { name: 'Cheese', tags: ['dairy', 'processed'] },
  khoya: { name: 'Khoya / mawa', tags: ['dairy'] },

  // Nightshades
  tomato: { name: 'Tomato', tags: ['nightshade'] },
  potato: { name: 'Potato', tags: ['nightshade'] },
  brinjal: { name: 'Brinjal', tags: ['nightshade'] },
  capsicum: { name: 'Capsicum', tags: ['nightshade'] },
  green_chilli: { name: 'Green chilli', tags: ['nightshade', 'spicy'] },
  red_chilli: { name: 'Red chilli powder', tags: ['nightshade', 'spicy'] },

  // Other vegetables
  onion: { name: 'Onion', tags: [] },
  garlic: { name: 'Garlic', tags: [] },
  ginger: { name: 'Ginger', tags: [] },
  spinach: { name: 'Spinach / palak', tags: ['leafy_greens'] },
  methi: { name: 'Methi leaves', tags: ['leafy_greens'] },
  sarson: { name: 'Mustard greens', tags: ['leafy_greens'] },
  cauliflower: { name: 'Cauliflower', tags: [] },
  cabbage: { name: 'Cabbage', tags: [] },
  okra: { name: 'Bhindi', tags: [] },
  peas: { name: 'Peas', tags: ['legumes'] },
  carrot: { name: 'Carrot', tags: [] },
  gourd: { name: 'Gourd (lauki, tinda, turai)', tags: [] },
  bitter_gourd: { name: 'Karela', tags: [] },
  beans: { name: 'Green beans', tags: [] },
  mushroom: { name: 'Mushroom', tags: [] },
  cucumber: { name: 'Cucumber', tags: [] },
  coriander: { name: 'Coriander leaves', tags: [] },
  mint: { name: 'Mint', tags: [] },
  coconut: { name: 'Coconut', tags: [] },
  tamarind: { name: 'Tamarind', tags: ['citrus'] },
  lemon: { name: 'Lemon / lime', tags: ['citrus'] },

  // Legumes
  toor_dal: { name: 'Toor dal', tags: ['legumes'] },
  moong_dal: { name: 'Moong dal', tags: ['legumes'] },
  masoor_dal: { name: 'Masoor dal', tags: ['legumes'] },
  urad_dal: { name: 'Urad dal', tags: ['legumes'] },
  chana: { name: 'Chana / chole', tags: ['legumes'] },
  rajma: { name: 'Rajma', tags: ['legumes'] },
  soy: { name: 'Soya chunks', tags: ['legumes'] },
  sprouts: { name: 'Sprouts', tags: ['legumes'] },

  // Protein
  chicken: { name: 'Chicken', tags: [] },
  mutton: { name: 'Mutton', tags: ['red_meat'] },
  fish: { name: 'Fish', tags: ['fish'] },
  prawns: { name: 'Prawns', tags: ['fish'] },
  egg: { name: 'Egg', tags: ['eggs'] },
  processed_meat: { name: 'Sausage / salami', tags: ['red_meat', 'processed'] },

  // Fats, nuts, sweet
  oil: { name: 'Cooking oil', tags: [] },
  mustard_oil: { name: 'Mustard oil', tags: [] },
  peanuts: { name: 'Peanuts', tags: ['nuts'] },
  cashew: { name: 'Cashew / almonds', tags: ['nuts'] },
  sesame: { name: 'Sesame / flaxseed', tags: ['nuts'] },
  sugar: { name: 'Sugar', tags: ['sugar'] },
  jaggery: { name: 'Jaggery / gur', tags: ['sugar'] },
  honey: { name: 'Honey', tags: ['sugar'] },
  chocolate: { name: 'Chocolate', tags: ['sugar', 'dairy', 'processed'] },

  // Spices and condiments
  garam_masala: { name: 'Garam masala', tags: ['spicy'] },
  pickle: { name: 'Achar (pickle)', tags: ['fermented', 'spicy'] },
  sauce: { name: 'Ketchup / sauces', tags: ['sugar', 'processed', 'nightshade'] },
  mayonnaise: { name: 'Mayonnaise', tags: ['eggs', 'processed'] },

  // Drinks
  tea: { name: 'Tea', tags: ['caffeine'] },
  coffee: { name: 'Coffee', tags: ['caffeine'] },
  soft_drink: { name: 'Soft drink', tags: ['sugar', 'processed', 'caffeine'] },
  packaged_juice: { name: 'Packaged juice', tags: ['sugar', 'processed'] },

  // Fruit
  banana: { name: 'Banana', tags: [] },
  apple: { name: 'Apple', tags: [] },
  mango: { name: 'Mango', tags: [] },
  orange: { name: 'Orange / mosambi', tags: ['citrus'] },
  papaya: { name: 'Papaya', tags: [] },
  guava: { name: 'Guava', tags: [] },
  grapes: { name: 'Grapes', tags: [] },
  watermelon: { name: 'Watermelon', tags: [] },
  pomegranate: { name: 'Pomegranate', tags: [] },
};

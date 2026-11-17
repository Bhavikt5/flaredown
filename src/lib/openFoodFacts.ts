// Packaged food lookup by barcode using Open Food Facts (free, open data).
// Pure mapping + fetch only (works in the app and in Node for tests).
// https://world.openfoodfacts.org/data

import { Tag } from '../data/ingredients';

export type OffProduct = {
  code: string;
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
  ingredients_tags?: string[];
  allergens_tags?: string[];
  categories_tags?: string[];
  nova_group?: number;
  nutriments?: { sugars_100g?: number };
  image_front_small_url?: string;
};

export type MappedProduct = {
  code: string;
  name: string; // "Brand Product"
  imageUrl: string | null;
  tags: Tag[];
  reasons: Partial<Record<Tag, string>>; // why each tag was added
  ingredients: string[]; // our ingredient ids found on the label
  fried: boolean;
  nova: number | null;
  ingredientsText: string;
};

const FIELDS =
  'code,product_name,brands,ingredients_text,ingredients_tags,allergens_tags,categories_tags,nova_group,nutriments,image_front_small_url';

export type LookupResult = { found: true; product: MappedProduct } | { found: false; code: string };

export async function lookupBarcode(code: string): Promise<LookupResult> {
  const clean = code.replace(/\D/g, '');
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=${FIELDS}`, {
    headers: { 'User-Agent': 'FlareDown/0.1 (personal prototype)' },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Open Food Facts is not responding (${res.status}). Try again.`);
  const json = (await res.json().catch(() => null)) as { status?: number; product?: OffProduct } | null;
  if (!json || json.status !== 1 || !json.product) return { found: false, code: clean };
  return { found: true, product: mapProduct({ ...json.product, code: clean }) };
}

const strip = (t: string) => t.replace(/^[a-z]{2}:/, '').toLowerCase();

// Label words -> our ingredient ids (so the trigger engine can track them).
const INGREDIENT_WORDS: [RegExp, string][] = [
  [/^(maida|refined-wheat-flour)$/, 'maida'],
  [/^(whole-wheat-flour|atta|whole-wheat)$/, 'wheat'],
  [/^(semolina|sooji|rava)$/, 'sooji'],
  [/^rice/, 'rice'],
  [/^(corn|maize|corn-meal|cornmeal|maize-flour)/, 'corn'],
  [/^(oat|oats|rolled-oats)/, 'oats'],
  [/^(millet|ragi|jowar|bajra|finger-millet|pearl-millet|sorghum)/, 'millet'],
  [/^(gram-flour|besan|chickpea-flour|bengal-gram)/, 'besan'],
  [/^(potato|potato-flakes|dehydrated-potato)/, 'potato'],
  [/^(tomato|tomato-paste|tomato-powder)/, 'tomato'],
  [/^(onion|onion-powder)/, 'onion'],
  [/^(garlic|garlic-powder)/, 'garlic'],
  [/^(red-chili|chili-pepper|chilli|red-chilli|chili-powder)/, 'red_chilli'],
  [/^(milk|milk-solids|milk-powder|skimmed-milk-powder|whole-milk-powder)$/, 'milk'],
  [/^(cheese|processed-cheese)/, 'cheese'],
  [/^(butter|butter-oil)$/, 'butter'],
  [/^(ghee)$/, 'ghee'],
  [/^(cream|fresh-cream)$/, 'cream'],
  [/^(peanut|groundnut)/, 'peanuts'],
  [/^(cashew|almond|pistachio)/, 'cashew'],
  [/^(sesame|flax)/, 'sesame'],
  [/^(sugar|added-sugar|invert-sugar|invert-sugar-syrup|glucose-syrup|liquid-glucose|dextrose|fructose)/, 'sugar'],
  [/^jaggery/, 'jaggery'],
  [/^(cocoa|chocolate|cocoa-solids)/, 'chocolate'],
  [/^egg/, 'egg'],
  [/^(tea|tea-extract)$/, 'tea'],
  [/^(coffee|instant-coffee)/, 'coffee'],
  [/^(soy-chunks|soya-chunks|textured-soy|soy-protein)/, 'soy'],
];

const FRIED_CATEGORIES = /(chips|crisps|fries|namkeen|bhujia|fried|instant-noodles|savory-snacks|savoury-snacks|extruded)/;

export function mapProduct(p: OffProduct): MappedProduct {
  const ing = (p.ingredients_tags ?? []).map(strip);
  const allergens = (p.allergens_tags ?? []).map(strip);
  const cats = (p.categories_tags ?? []).map(strip);
  const text = (p.ingredients_text ?? '').toLowerCase();
  const tags = new Set<Tag>();
  const reasons: Partial<Record<Tag, string>> = {};
  const add = (t: Tag, why: string) => {
    if (!tags.has(t)) reasons[t] = why;
    tags.add(t);
  };
  const has = (re: RegExp) => ing.some((t) => re.test(t));

  if (p.nova_group === 4) add('processed', 'NOVA group 4: ultra-processed');
  if (allergens.includes('gluten') || has(/^(wheat|maida|barley|rye|semolina)/)) add('gluten', 'Contains wheat or gluten');
  if (has(/^(maida|refined-wheat-flour)$/) || text.includes('refined wheat flour')) add('refined_flour', 'Refined wheat flour (maida)');
  if (allergens.includes('milk')) add('dairy', 'Contains milk');
  if (allergens.includes('eggs')) add('eggs', 'Contains egg');
  if (allergens.some((a) => ['nuts', 'peanuts', 'sesame-seeds'].includes(a))) add('nuts', 'Contains nuts or seeds');
  if (allergens.some((a) => ['fish', 'crustaceans', 'molluscs'].includes(a))) add('fish', 'Contains fish or seafood');
  // Real pulses only: soy in packaged food is usually a trace emulsifier (lecithin).
  if (has(/^(chickpea|chickpea-flour|gram-flour|besan|bengal-gram|lentil|red-lentil|moong|green-gram|urad|black-gram|kidney-bean|rajma)/)) {
    add('legumes', 'Contains pulses (dal, besan, chana)');
  }
  const sugar100 = p.nutriments?.sugars_100g;
  if (has(/^(added-sugar|sugar|invert-sugar|glucose-syrup|liquid-glucose|dextrose|fructose|jaggery)/)) add('sugar', 'Sugar on the label');
  else if (typeof sugar100 === 'number' && sugar100 >= 10) add('sugar', `${Math.round(sugar100)} g sugar per 100 g`);
  if (has(/^(potato|tomato|chili|chilli|red-chili|capsicum|bell-pepper|paprika|eggplant|brinjal)/)) add('nightshade', 'Potato, tomato or chilli');
  if (has(/^(chili|chilli|red-chili|green-chili)/)) add('spicy', 'Contains chilli');
  if (has(/^(coffee|tea|caffeine|instant-coffee)/)) add('caffeine', 'Contains tea, coffee or caffeine');
  if (has(/(whole-wheat|whole-grain|wholegrain|(^|-)oats?($|-)|millet|ragi|jowar|bajra)/)) add('whole_grain', 'Whole grains or millets');

  const fried = cats.some((c) => FRIED_CATEGORIES.test(c)) || /\bfried\b/.test(text);
  if (fried) add('fried', 'Fried snack or instant noodles');

  const ingredients = new Set<string>();
  for (const t of ing) {
    for (const [re, id] of INGREDIENT_WORDS) if (re.test(t)) ingredients.add(id);
  }

  const brand = (p.brands ?? '').split(',')[0].trim();
  const productName = (p.product_name ?? '').trim() || 'Packaged product';
  const name = brand && !productName.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${productName}` : productName;

  return {
    code: p.code,
    name,
    imageUrl: p.image_front_small_url ?? null,
    tags: [...tags],
    reasons,
    ingredients: [...ingredients],
    fried,
    nova: p.nova_group ?? null,
    ingredientsText: p.ingredients_text ?? '',
  };
}

// Run: npx tsx scripts/test-barcode.ts — checks Open Food Facts label mapping (no network).
import { mapProduct } from '../src/lib/openFoodFacts';
import { scoreTags } from '../src/lib/score';

let failures = 0;
const check = (cond: boolean, msg: string) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};

// Shaped like the real Open Food Facts answers for Maggi noodles and Parle-G.
const noodles = mapProduct({
  code: '8901058000306',
  product_name: 'Masala Noodles',
  brands: 'Maggi,Nestlé',
  nova_group: 4,
  allergens_tags: ['en:gluten', 'en:milk', 'en:soybeans'],
  ingredients_tags: ['en:maida', 'en:palm-oil', 'en:salt', 'en:wheat-gluten', 'en:red-chili-pepper', 'en:garlic-powder', 'en:sugar'],
  categories_tags: ['en:noodles', 'en:instant-noodles'],
  ingredients_text: 'Refined wheat flour (Maida), Palm oil, Iodized salt, Wheat gluten…',
  nutriments: { sugars_100g: 1.4 },
});
check(noodles.name === 'Maggi Masala Noodles', 'brand is added to the name');
check(noodles.tags.includes('processed'), 'NOVA 4 marks ultra-processed');
check(noodles.tags.includes('refined_flour') && noodles.tags.includes('gluten'), 'maida gives refined flour and gluten');
check(noodles.tags.includes('fried'), 'instant noodles count as fried');
check(noodles.tags.includes('spicy') && noodles.tags.includes('nightshade'), 'chilli gives spicy and nightshade');
check(!noodles.tags.includes('legumes'), 'soy allergen alone does not count as dal/legumes');
check(noodles.ingredients.includes('maida') && noodles.ingredients.includes('red_chilli'), 'label ingredients map to our ingredients');
check(scoreTags(noodles.tags).level === 'High', 'instant noodles score High');

const biscuit = mapProduct({
  code: '8901719134845',
  product_name: 'Parle-G Biscuit',
  brands: 'Parle',
  nova_group: 4,
  allergens_tags: ['en:gluten', 'en:milk'],
  ingredients_tags: ['en:maida', 'en:wheat-flour', 'en:sugar', 'en:added-sugar', 'en:palm-oil', 'en:invert-sugar-syrup'],
  categories_tags: ['en:biscuits'],
  nutriments: { sugars_100g: 25.5 },
});
check(biscuit.name === 'Parle-G Biscuit', 'brand not repeated when already in the name');
check(biscuit.tags.includes('sugar') && biscuit.tags.includes('dairy'), 'sugar and milk detected');
check(!biscuit.tags.includes('fried'), 'biscuits are not marked fried');

const oats = mapProduct({
  code: '1',
  product_name: 'Rolled Oats',
  nova_group: 1,
  ingredients_tags: ['en:rolled-oats'],
  nutriments: { sugars_100g: 1 },
});
check(oats.tags.includes('whole_grain') && !oats.tags.includes('processed'), 'plain oats are whole grain, not processed');
check(scoreTags(oats.tags).level === 'Low', 'plain oats score Low');

const sweetNoLabel = mapProduct({ code: '2', product_name: 'Fruit drink', nutriments: { sugars_100g: 12 } });
check(sweetNoLabel.tags.includes('sugar'), 'high sugar per 100 g counts even without an ingredient list');

process.exit(failures ? 1 : 0);

// Run: npx tsx scripts/test-dish.ts — checks AI ingredient parsing and custom ingredients (no network).
import { parseDishResponse } from '../src/lib/dishPrompt';
import { findIngredientByName, ingredientInfo, setCustomIngredients, INGREDIENTS } from '../src/data/ingredients';
import { dishTags } from '../src/data/dishes';
import { scoreTags } from '../src/lib/score';

let failures = 0;
const check = (cond: boolean, msg: string) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const reply = (o: unknown) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(o) }] } }] });

check(findIngredientByName('garlic') === 'garlic', 'finds built-in ingredient by name');
check(findIngredientByName('Tomato') === 'tomato', 'name match ignores case');
check(findIngredientByName('Kokum') === undefined, 'unknown name returns nothing');

const s = parseDishResponse(
  reply({
    note: 'Sol kadhi',
    known: ['coconut', 'not_a_real_id'],
    new_items: [
      { name: 'Garlic', tags: [] },
      { name: 'kokum', tags: ['citrus', 'made_up_tag'] },
      { name: 'Kokum', tags: ['citrus'] },
    ],
    fried: false,
  }),
  (id) => id in INGREDIENTS,
);
check(s.known.includes('coconut') && !s.known.includes('not_a_real_id'), 'drops invalid ingredient ids');
check(s.known.includes('garlic'), '"new" item that already exists is mapped to the known ingredient');
check(s.newItems.length === 1 && s.newItems[0].name === 'kokum', 'duplicate new items are merged');
check(s.newItems[0].tags.join() === 'citrus', 'unknown tags are dropped');

setCustomIngredients([{ id: 'ci_1', name: 'Schezwan sauce', tags: ['processed', 'spicy'] }]);
check(ingredientInfo('ci_1')?.name === 'Schezwan sauce', 'custom ingredient is registered');
check(findIngredientByName('schezwan sauce') === 'ci_1', 'custom ingredient found by name');
const tags = dishTags({ id: 'x', name: 'Noodles', alt: '', category: 'Custom', ingredients: ['maida', 'ci_1'], fried: false });
check(tags.includes('processed') && tags.includes('spicy') && tags.includes('refined_flour'), 'custom ingredient tags count in the dish');
check(scoreTags(tags).level === 'High', 'dish with custom processed sauce scores High');

process.exit(failures ? 1 : 0);

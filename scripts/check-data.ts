// Run: npx tsx scripts/check-data.ts — checks every dish uses known ingredients and ids are unique.
import { BUILT_IN_DISHES } from '../src/data/dishes';
import { INGREDIENTS } from '../src/data/ingredients';
const bad = BUILT_IN_DISHES.flatMap((d) => d.ingredients.filter((i) => !(i in INGREDIENTS)).map((i) => `${d.id}: ${i}`));
const ids = BUILT_IN_DISHES.map((d) => d.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
console.log(`${BUILT_IN_DISHES.length} dishes, ${Object.keys(INGREDIENTS).length} ingredients`);
console.log(bad.length ? `Unknown ingredients: ${bad.join(', ')}` : 'All ingredients known');
console.log(dupes.length ? `Duplicate ids: ${dupes.join(', ')}` : 'No duplicate ids');
process.exit(bad.length || dupes.length ? 1 : 0);

// Run: npx tsx scripts/test-score.ts
// Sanity checks that the general flare risk score ranks dishes sensibly.

import { BUILT_IN_DISHES } from '../src/data/dishes';
import { scoreDish, scoreDishes } from '../src/lib/score';

const dish = (id: string) => {
  const d = BUILT_IN_DISHES.find((x) => x.id === id);
  if (!d) throw new Error(`no dish ${id}`);
  return d;
};

let failures = 0;
const check = (cond: boolean, msg: string) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};

const show = ['samosa', 'maggi', 'chole_bhature', 'chai', 'dal_tadka', 'roti', 'palak_paneer', 'fish_curry', 'salad', 'bajra_roti', 'gulab_jamun', 'idli'];
for (const id of show) {
  const r = scoreDish(dish(id));
  console.log(`  ${dish(id).name.padEnd(22)} ${r.score.toFixed(1).padStart(4)}  ${r.level}`);
}

check(scoreDish(dish('samosa')).level === 'High', 'samosa is High');
check(scoreDish(dish('maggi')).level === 'High', 'instant noodles are High');
check(scoreDish(dish('roti')).level === 'Low', 'roti is Low');
check(scoreDish(dish('bajra_roti')).level === 'Low', 'bajra roti is Low');
check(scoreDish(dish('fish_curry')).level === 'Low', 'fish curry is Low');
check(scoreDish(dish('palak_paneer')).score < scoreDish(dish('paneer_butter_masala')).score, 'palak paneer scores lower than paneer butter masala');
const all = BUILT_IN_DISHES.map((d) => scoreDish(d).score);
check(all.every((s) => s >= 0 && s <= 10), 'every dish scores within 0-10');
const meal = scoreDishes([dish('roti'), dish('roti'), dish('dal_tadka')]);
check(meal.score === scoreDishes([dish('roti'), dish('dal_tadka')]).score, 'repeating a dish does not raise the meal score');

process.exit(failures ? 1 : 0);

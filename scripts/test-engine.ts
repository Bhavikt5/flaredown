// Run: npx tsx scripts/test-engine.ts
// Synthetic 70-day diary where tomato triggers flares 4-7 days later and
// dairy is random noise. The engine should find tomato (or nightshades)
// and should NOT report dairy.

import { runEngine, DayCheckin, DayFood, MIN_CHECKIN_DAYS } from '../src/lib/engine';

let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const date = (i: number) => new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString().slice(0, 10);

const days = 70;
const tomato: boolean[] = [];
const checkins: DayCheckin[] = [];
const foods: DayFood[] = [];
let failures = 0;
const check = (cond: boolean, msg: string) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};

for (let i = 0; i < days; i++) {
  const ateTomato = rand() < 0.3;
  tomato.push(ateTomato);
  const keys = ['tag:legumes', 'ing:rice'];
  if (ateTomato) keys.push('ing:tomato', 'tag:nightshade');
  if (rand() < 0.5) keys.push('ing:milk', 'tag:dairy');
  foods.push({ date: date(i), keys });

  const recentTomato = [4, 5, 6, 7].some((k) => i - k >= 0 && tomato[i - k]);
  const flare = recentTomato ? rand() < 0.75 : rand() < 0.08;
  checkins.push({
    date: date(i),
    skin: flare ? 7 : 3 + Math.round(rand()),
    stress: 4,
    sleepHours: 7,
    alcoholUnits: 0,
    flare: false,
  });
}

// Not enough data yet: no insights.
const early = runEngine(checkins.slice(0, MIN_CHECKIN_DAYS - 1), foods, []);
check(!early.ready && early.insights.length === 0, 'no insights before 21 days');

const res = runEngine(checkins, foods, []);
console.log(`check-in days ${res.checkinDays}, flare days ${res.flareDays}`);
for (const i of res.insights) {
  console.log(
    `  ${i.key.padEnd(18)} ${i.direction} flares, ${i.window}, x${i.ratio.toFixed(1)}, ${i.confidence} (z=${i.z.toFixed(2)}, seen ${i.exposedDays})`,
  );
}
const top = res.insights[0]?.key;
check(top === 'ing:tomato' || top === 'tag:nightshade', 'top insight is tomato or nightshades');
const tomatoInsight = res.insights.find((i) => i.key === 'ing:tomato');
check(tomatoInsight?.window === '4 to 7 days', 'tomato found in the 4 to 7 day window');
check(!res.insights.some((i) => i.key === 'tag:dairy' && i.confidence !== 'Low'), 'dairy (noise) not reported with Medium/High confidence');

process.exit(failures ? 1 : 0);

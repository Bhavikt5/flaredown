// Glue between the database and the trigger engine.

import { listAllMeals, listCheckins, listWeather } from './db';
import { DayCheckin, DayFood, DayWeather } from './engine';
import { ingredientInfo, TAG_LABELS, Tag } from '@/data/ingredients';

export async function loadEngineInputs(): Promise<[DayCheckin[], DayFood[], DayWeather[]]> {
  const checkins = await listCheckins();
  const meals = await listAllMeals();
  const weather = await listWeather();

  const byDate = new Map<string, Set<string>>();
  for (const m of meals) {
    if (!byDate.has(m.date)) byDate.set(m.date, new Set());
    const s = byDate.get(m.date)!;
    for (const i of m.ingredients) s.add('ing:' + i);
    for (const t of m.tags) s.add('tag:' + t);
  }

  return [
    checkins.map((c) => ({
      date: c.date,
      skin: c.skin,
      stress: c.stress,
      sleepHours: c.sleepHours,
      alcoholUnits: c.alcoholUnits,
      flare: c.flare,
    })),
    [...byDate].map(([date, keys]) => ({ date, keys: [...keys] })),
    weather.map((w) => ({ date: w.date, humidity: w.humidity, tempMin: w.tempMin })),
  ];
}

const LIFE_LABELS: Record<string, string> = {
  'life:alcohol': 'Alcohol',
  'life:short_sleep': 'Less than 6 hours sleep',
  'life:high_stress': 'High stress (7+)',
  'env:dry_air': 'Dry air (humidity under 40%)',
  'env:cold': 'Cold nights (under 12°C)',
};

export function insightLabel(key: string): string {
  if (key in LIFE_LABELS) return LIFE_LABELS[key];
  if (key.startsWith('tag:')) return TAG_LABELS[key.slice(4) as Tag] ?? key;
  if (key.startsWith('ing:')) return ingredientInfo(key.slice(4))?.name ?? key.slice(4);
  return key;
}

export function insightKind(key: string): string {
  if (key.startsWith('tag:')) return 'Food group';
  if (key.startsWith('ing:')) return 'Ingredient';
  if (key.startsWith('env:')) return 'Weather';
  return 'Lifestyle';
}

// Flare risk score (0-10) for a dish, meal or day, from the GENERAL research
// guide only (src/data/foodGuide.ts). It is not personal and not a measure of
// inflammation in the body; it estimates how many research-linked risk
// factors a meal contains.
//
// score = BASE + sum of weights of the food groups present, clamped to 0-10.
// Each food group counts once per meal, so 3 rotis don't triple the score.

import { Dish, dishTags } from '@/data/dishes';
import { Tag, TAG_LABELS } from '@/data/ingredients';

const BASE = 3;

// Weights follow the guide's risk level and evidence strength:
// higher + strong/moderate evidence weigh most; "watch" with limited evidence
// weighs little; supportive groups lower the score.
export const TAG_WEIGHTS: Record<Tag, number> = {
  processed: 3,
  fried: 2,
  sugar: 1.5,
  refined_flour: 1.5,
  red_meat: 1.5,
  gluten: 0.5,
  dairy: 0.5,
  nightshade: 0.5,
  spicy: 0.5,
  caffeine: 0.5,
  citrus: 0,
  eggs: 0,
  fermented: 0,
  nuts: -0.5,
  fish: -1,
  legumes: -1,
  whole_grain: -1,
  leafy_greens: -1.5,
};

export type Level = 'Low' | 'Moderate' | 'High';

export type ScoreResult = {
  score: number; // 0-10, one decimal
  level: Level;
  raises: { tag: Tag; label: string; weight: number }[];
  lowers: { tag: Tag; label: string; weight: number }[];
};

export function levelOf(score: number): Level {
  return score >= 7 ? 'High' : score >= 4 ? 'Moderate' : 'Low';
}

export function scoreTags(tags: Iterable<string>): ScoreResult {
  const unique = [...new Set(tags)].filter((t): t is Tag => t in TAG_WEIGHTS);
  const sum = unique.reduce((acc, t) => acc + TAG_WEIGHTS[t], 0);
  const score = Math.round(Math.min(10, Math.max(0, BASE + sum)) * 10) / 10;
  const entries = unique.map((t) => ({ tag: t, label: TAG_LABELS[t], weight: TAG_WEIGHTS[t] }));
  return {
    score,
    level: levelOf(score),
    raises: entries.filter((e) => e.weight > 0).sort((a, b) => b.weight - a.weight),
    lowers: entries.filter((e) => e.weight < 0).sort((a, b) => a.weight - b.weight),
  };
}

export function scoreDish(dish: Dish): ScoreResult {
  return scoreTags(dishTags(dish));
}

export function scoreDishes(dishes: Dish[]): ScoreResult {
  return scoreTags(dishes.flatMap(dishTags));
}

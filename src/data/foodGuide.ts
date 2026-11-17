// General food guide: a starting point from published research.
// IMPORTANT: these ratings must be reviewed by a dermatologist or clinical
// nutritionist before any public release. Your own data in the app
// (Insights tab) matters more than this general guide.

import { Tag } from './ingredients';

export type Risk = 'higher' | 'watch' | 'neutral' | 'supportive';
export type Evidence = 'strong' | 'moderate' | 'limited';

export type GuideEntry = {
  key: Tag | 'alcohol' | 'smoking' | 'weight';
  title: string;
  risk: Risk;
  evidence: Evidence;
  note: string;
};

export const RISK_LABEL: Record<Risk, string> = {
  higher: 'Higher risk',
  watch: 'Watch',
  neutral: 'Neutral',
  supportive: 'Supportive',
};

export const EVIDENCE_LABEL: Record<Evidence, string> = {
  strong: 'Strong evidence',
  moderate: 'Moderate evidence',
  limited: 'Limited evidence',
};

export const FOOD_GUIDE: GuideEntry[] = [
  {
    key: 'alcohol',
    title: 'Alcohol',
    risk: 'higher',
    evidence: 'strong',
    note: 'Linked to more severe psoriasis and to treatments working less well. Log it in the daily check-in.',
  },
  {
    key: 'weight',
    title: 'Excess weight',
    risk: 'higher',
    evidence: 'strong',
    note: 'Weight loss in people with overweight has improved psoriasis in trials. Not a food, but diet affects it.',
  },
  {
    key: 'smoking',
    title: 'Smoking',
    risk: 'higher',
    evidence: 'strong',
    note: 'Linked to developing psoriasis and to more severe disease.',
  },
  {
    key: 'processed',
    title: 'Ultra-processed food',
    risk: 'higher',
    evidence: 'moderate',
    note: 'Packaged snacks, instant noodles and fast food are linked with inflammation and weight gain.',
  },
  {
    key: 'sugar',
    title: 'Added sugar',
    risk: 'watch',
    evidence: 'limited',
    note: 'High-sugar diets are linked to inflammation in general; direct psoriasis evidence is limited.',
  },
  {
    key: 'refined_flour',
    title: 'Refined flour (maida)',
    risk: 'watch',
    evidence: 'limited',
    note: 'Part of the Western-style eating pattern linked with worse outcomes.',
  },
  {
    key: 'fried',
    title: 'Fried food',
    risk: 'watch',
    evidence: 'limited',
    note: 'Often high in calories and reused oils; many patients report flares.',
  },
  {
    key: 'red_meat',
    title: 'Red and processed meat',
    risk: 'watch',
    evidence: 'limited',
    note: 'Some studies link high intake with inflammation.',
  },
  {
    key: 'gluten',
    title: 'Gluten',
    risk: 'watch',
    evidence: 'moderate',
    note: 'Clear benefit mainly in people with celiac antibodies. Ask your doctor about a blood test before cutting wheat.',
  },
  {
    key: 'dairy',
    title: 'Dairy',
    risk: 'watch',
    evidence: 'limited',
    note: 'Some people report flares; evidence is mostly from surveys. Test it personally.',
  },
  {
    key: 'nightshade',
    title: 'Nightshades (tomato, potato, brinjal, chilli)',
    risk: 'watch',
    evidence: 'limited',
    note: 'Popular claim, mainly from patient surveys. Personal testing recommended.',
  },
  {
    key: 'spicy',
    title: 'Spicy food',
    risk: 'neutral',
    evidence: 'limited',
    note: 'No consistent link found; some people report itch.',
  },
  {
    key: 'caffeine',
    title: 'Tea and coffee',
    risk: 'neutral',
    evidence: 'limited',
    note: 'No consistent link found. Watch the sugar and milk added.',
  },
  {
    key: 'citrus',
    title: 'Citrus and sour foods',
    risk: 'neutral',
    evidence: 'limited',
    note: 'No consistent link found.',
  },
  {
    key: 'eggs',
    title: 'Eggs',
    risk: 'neutral',
    evidence: 'limited',
    note: 'No consistent link found.',
  },
  {
    key: 'fermented',
    title: 'Pickles and fermented foods',
    risk: 'neutral',
    evidence: 'limited',
    note: 'Curd is fine for most people. Pickles are high in salt and oil.',
  },
  {
    key: 'fish',
    title: 'Fish',
    risk: 'supportive',
    evidence: 'limited',
    note: 'Oily fish (mackerel/bangda, sardine/mathi) gives omega-3; trial results are mixed.',
  },
  {
    key: 'leafy_greens',
    title: 'Leafy greens and vegetables',
    risk: 'supportive',
    evidence: 'moderate',
    note: 'Part of the Mediterranean-style pattern linked with milder psoriasis.',
  },
  {
    key: 'whole_grain',
    title: 'Whole grains and millets',
    risk: 'supportive',
    evidence: 'limited',
    note: 'Bajra, jowar, ragi and atta fit the anti-inflammatory pattern.',
  },
  {
    key: 'legumes',
    title: 'Dals and legumes',
    risk: 'supportive',
    evidence: 'limited',
    note: 'Good protein and fibre; part of the Mediterranean-style pattern.',
  },
  {
    key: 'nuts',
    title: 'Nuts and seeds',
    risk: 'supportive',
    evidence: 'limited',
    note: 'Healthy fats; part of the Mediterranean-style pattern.',
  },
];

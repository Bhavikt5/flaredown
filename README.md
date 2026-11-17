# Flare Down (prototype)

A psoriasis trigger tracker for Indian food. Runs on your Android phone, free.
**Setup and install steps: see [SETUP.md](SETUP.md).**

## Screens

| Where | What it does |
| --- | --- |
| Home | Today's skin ring, food flare risk gauge, logging streak, 7/30-day skin trend, trigger preview, today's meals |
| + button | Snap a meal (AI), search food, flare photo, daily check-in |
| Food | Week strip, day's flare risk score, meals with per-dish scores, copy yesterday |
| Insights | Days logged, flare days, 30-day trend, possible personal triggers with confidence |
| Profile | Name, cloud sync (Supabase), skin photo backup, doctor PDF report, treatments, reminders, weather, export |

## Flare risk score (0-10)

General score from published research (`src/data/foodGuide.ts`, weights in `src/lib/score.ts`),
not personal to you and not a measure of inflammation. Each food group in a meal counts once:
ultra-processed +3, fried +2, sugar/maida/red meat +1.5, gluten/dairy/nightshades/spicy/caffeine +0.5,
nuts −0.5, fish/dals/whole grains −1, leafy greens −1.5, on a base of 3.
0–3.9 Low · 4–6.9 Moderate · 7–10 High. Ratings still need review by a dermatologist or nutritionist.

## Tech

| Part | Choice | Cost |
| --- | --- | --- |
| App | React Native + Expo SDK 58, Expo Router | Free |
| Local database | SQLite on the phone (`expo-sqlite`), works offline | Free |
| Cloud database | Supabase (Postgres + private storage), two-way sync | Free plan |
| Meal photo AI | Google Gemini API, free tier | Free (daily limit) |
| Packaged food barcodes | Open Food Facts (open database), `expo-camera` scanner | Free |
| Weather | Open-Meteo | Free |
| Reminders, PDF | Local notifications, on-device PDF | Free |

## Checks

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # trigger engine, flare score, food data
```

## Layout

```
src/app/(tabs)/      Home, Food, Insights, Profile
src/app/             check-in, snap, add-food, photos, account and other screens
src/components/      design system (ui.tsx), tab bar + quick-add sheet, charts
src/data/            dishes (166), ingredients, food guide, body areas
src/lib/db.ts        local SQLite
src/lib/engine.ts    personal trigger engine (tested)
src/lib/score.ts     general flare risk score (tested)
src/lib/gemini.ts    meal photo recognition
src/lib/sync.ts      Supabase sync
supabase/schema.sql  tables, row-level security, photo bucket
```

## Safety

Personal tracking only, not medical advice. Never stop or change prescribed treatment
because of the app. Meal photos go to Google Gemini (free tier may be used by Google to
improve products); skin photos never do.

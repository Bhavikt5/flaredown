/// <reference types="node" />
// Run: npx tsx scripts/try-photo.ts path/to/meal.jpg
// Sends one meal photo to Gemini with the app's real prompt (uses .env key)
// and prints what was detected. Useful for improving the prompt.

import { readFileSync } from 'fs';
import { requestBody, parseResponse } from '../src/lib/mealPrompt';
import { callWithFallback } from '../src/lib/retry';
import { scoreDishes } from '../src/lib/score';

const env: Record<string, string> = {};
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
const key = env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!key) throw new Error('No EXPO_PUBLIC_GEMINI_API_KEY in .env');
const path = process.argv[2];
if (!path) throw new Error('Pass a photo path');
const mime = /\.png$/i.test(path) ? 'image/png' : 'image/jpeg';

(async () => {
  const body = requestBody(readFileSync(path).toString('base64'));
  body.contents[0].parts[1] = { inlineData: { mimeType: mime, data: (body.contents[0].parts[1] as { inlineData: { data: string } }).inlineData.data } };
  const models = [env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash-lite', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];
  const { value, model } = await callWithFallback(models, async (m) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (res.ok) return { ok: true as const, value: json };
    console.log(`  ${m}: ${res.status} ${json?.error?.message ?? ''}`.slice(0, 200));
    return { ok: false as const, status: res.status, message: json?.error?.message ?? `HTTP ${res.status}` };
  });
  const result = parseResponse(value);
  console.log(`model: ${model}  not_food: ${result.notFood}`);
  for (const d of result.dishes) {
    console.log(`- ${d.name} [${d.dishId ?? 'new'}] ${d.portion} conf ${d.confidence}\n    seen: ${d.seen}`);
  }
  const s = scoreDishes(
    result.dishes.map((d, i) => ({ id: d.dishId ?? `x${i}`, name: d.name, alt: '', category: 'Custom', ingredients: d.ingredients, fried: d.fried })),
  );
  console.log(`meal score: ${s.score} ${s.level}`);
})();

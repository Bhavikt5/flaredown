/// <reference types="node" />
// Run: npx tsx scripts/try-dish.ts "Kurkure Masala Munch" "Amul cheese slice"
// Asks Gemini for the ingredients of each name using the app's real prompt.

import { readFileSync } from 'fs';
import { dishRequestBody, parseDishResponse } from '../src/lib/dishPrompt';
import { callWithFallback } from '../src/lib/retry';
import { INGREDIENTS, TAG_LABELS, Tag } from '../src/data/ingredients';
import { scoreTags } from '../src/lib/score';

const env: Record<string, string> = {};
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
const key = env.EXPO_PUBLIC_GEMINI_API_KEY;
const models = [env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash-lite', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];

(async () => {
  for (const name of process.argv.slice(2)) {
    const { value, model } = await callWithFallback(models, async (m) => {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(dishRequestBody(name)),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) return { ok: true as const, value: json };
      return { ok: false as const, status: res.status, message: json?.error?.message ?? `HTTP ${res.status}` };
    });
    const s = parseDishResponse(value, (id) => id in INGREDIENTS);
    const tags: Tag[] = [...s.known.flatMap((id) => INGREDIENTS[id].tags), ...s.newItems.flatMap((i) => i.tags)];
    if (s.fried) tags.push('fried');
    const sc = scoreTags(tags);
    console.log(`\n${name}  (${model})\n  note: ${s.note}\n  known: ${s.known.map((id) => INGREDIENTS[id].name).join(', ') || '-'}`);
    for (const i of s.newItems) console.log(`  new: ${i.name} [${i.tags.map((t) => TAG_LABELS[t]).join(', ')}]`);
    console.log(`  fried: ${s.fried}  score: ${sc.score} ${sc.level}`);
  }
})();

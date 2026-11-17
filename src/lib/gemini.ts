// Meal photo -> dishes, using Google Gemini (free tier) over plain fetch.
// Prompt and parsing live in mealPrompt.ts. Only meal photos are ever sent
// here, never skin photos.

import { File } from 'expo-file-system';
import { config } from './config';
import { callWithFallback } from './retry';
import { DetectResult, parseResponse, requestBody } from './mealPrompt';
import { DishSuggestion, dishRequestBody, parseDishResponse } from './dishPrompt';
import { allIngredients, ingredientInfo } from '@/data/ingredients';

export type { DetectedDish, DetectResult } from './mealPrompt';

export class GeminiError extends Error {}

// Tried in order. Free-tier limits are per model, so a busy or exhausted
// model can be covered by the next one.
export const GEMINI_MODELS = () => [config.geminiModel, 'gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];

async function callModel(model: string, base64: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
    body: JSON.stringify(requestBody(base64)),
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

/** Suggests ingredients for a dish or product name (text only, no photo). */
export async function suggestIngredients(name: string): Promise<DishSuggestion> {
  const custom = allIngredients()
    .filter(([, i]) => i.custom)
    .map(([id, i]) => ({ id, name: i.name }));
  try {
    const { value } = await callWithFallback(GEMINI_MODELS(), async (model) => {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
        body: JSON.stringify(dishRequestBody(name, custom)),
      })
        .then(async (r) => ({ ok: r.ok, status: r.status, json: await r.json().catch(() => null) }))
        .catch(() => ({ ok: false, status: 503, json: null }));
      if (res.ok) return { ok: true as const, value: res.json };
      return { ok: false as const, status: res.status, message: res.json?.error?.message ?? `HTTP ${res.status}` };
    });
    return parseDishResponse(value, (id) => !!ingredientInfo(id));
  } catch (e) {
    throw new GeminiError(e instanceof Error ? e.message : String(e));
  }
}

export async function detectDishes(photoUri: string): Promise<DetectResult> {
  const base64 = await new File(photoUri).base64();
  try {
    const { value } = await callWithFallback(GEMINI_MODELS(), async (model) => {
      const res = await callModel(model, base64).catch(() => ({ ok: false, status: 503, json: null }));
      if (res.ok) return { ok: true as const, value: res.json };
      return { ok: false as const, status: res.status, message: res.json?.error?.message ?? `HTTP ${res.status}` };
    });
    return parseResponse(value);
  } catch (e) {
    throw new GeminiError(e instanceof Error ? e.message : String(e));
  }
}

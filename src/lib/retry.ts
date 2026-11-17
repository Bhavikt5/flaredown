// Retry and fallback for AI calls. Pure (no device APIs) so it can be tested in Node.
//
// For each model in order:
//  - 503/500/502/504 (busy / temporary): retry the same model with backoff
//  - 429 (quota) or 404/400 "model not found": move to the next model
//  - other errors: stop and report
// Free-tier quotas are per model, so a different model often still works.

export type CallResult<T> = { ok: true; value: T } | { ok: false; status: number; message: string };

export type RetryOptions = {
  attemptsPerModel?: number;
  delaysMs?: number[];
  sleep?: (ms: number) => Promise<void>;
};

const TEMPORARY = new Set([500, 502, 503, 504]);
const NEXT_MODEL = new Set([429, 404]);

export class AiBusyError extends Error {}
export class AiQuotaError extends Error {}
export class AiRequestError extends Error {}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function callWithFallback<T>(
  models: string[],
  call: (model: string) => Promise<CallResult<T>>,
  opts: RetryOptions = {},
): Promise<{ value: T; model: string }> {
  const attempts = opts.attemptsPerModel ?? 3;
  const delays = opts.delaysMs ?? [1500, 4000];
  const sleep = opts.sleep ?? defaultSleep;
  const unique = [...new Set(models.filter(Boolean))];

  let sawBusy = false;
  let sawQuota = false;
  let lastMessage = '';

  for (const model of unique) {
    for (let a = 0; a < attempts; a++) {
      const r = await call(model);
      if (r.ok) return { value: r.value, model };
      lastMessage = r.message;
      if (TEMPORARY.has(r.status)) {
        sawBusy = true;
        if (a < attempts - 1) await sleep(delays[Math.min(a, delays.length - 1)]);
        continue;
      }
      if (r.status === 429) sawQuota = true;
      const modelMissing = r.status === 400 && /model|not found|not supported/i.test(r.message);
      if (NEXT_MODEL.has(r.status) || modelMissing) break; // try next model
      throw new AiRequestError(r.message || `Request failed (${r.status})`);
    }
  }

  if (sawBusy) throw new AiBusyError('Gemini is busy right now. Tap Retry in a minute, or search the food instead.');
  if (sawQuota) throw new AiQuotaError('Free daily AI limit reached. It resets overnight; search the food instead for now.');
  throw new AiRequestError(lastMessage || 'Gemini is not available.');
}

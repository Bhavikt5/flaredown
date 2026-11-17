// Run: npx tsx scripts/test-retry.ts
// Checks the Gemini retry/fallback logic with fake responses (no network).

import { callWithFallback, CallResult, AiBusyError, AiQuotaError } from '../src/lib/retry';

let failures = 0;
const check = (cond: boolean, msg: string) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const noSleep = async () => {};
const busy: CallResult<string> = { ok: false, status: 503, message: 'This model is currently experiencing high demand.' };
const quota: CallResult<string> = { ok: false, status: 429, message: 'Quota exceeded' };

(async () => {
  // 1. Busy twice, then succeeds on the same model.
  let calls: string[] = [];
  let n = 0;
  const r1 = await callWithFallback(['a', 'b'], async (m) => (calls.push(m), ++n < 3 ? busy : { ok: true, value: 'dishes' }), { sleep: noSleep });
  check(r1.value === 'dishes' && r1.model === 'a' && calls.join() === 'a,a,a', 'retries the same model while busy');

  // 2. First model always busy, second works.
  calls = [];
  const r2 = await callWithFallback(['a', 'b'], async (m) => (calls.push(m), m === 'a' ? busy : { ok: true, value: 'ok' }), { sleep: noSleep });
  check(r2.model === 'b' && calls.join() === 'a,a,a,b', 'falls back to the next model after 3 busy tries');

  // 3. Quota on first model moves straight to the next.
  calls = [];
  const r3 = await callWithFallback(['a', 'b'], async (m) => (calls.push(m), m === 'a' ? quota : { ok: true, value: 'ok' }), { sleep: noSleep });
  check(r3.model === 'b' && calls.join() === 'a,b', 'quota error skips to next model without waiting');

  // 4. Everything busy -> friendly busy error.
  try {
    await callWithFallback(['a', 'b'], async () => busy, { sleep: noSleep });
    check(false, 'all busy throws');
  } catch (e) {
    check(e instanceof AiBusyError, 'all models busy gives the "busy, retry" message');
  }

  // 5. Everything over quota -> quota error.
  try {
    await callWithFallback(['a', 'b'], async () => quota, { sleep: noSleep });
    check(false, 'all quota throws');
  } catch (e) {
    check(e instanceof AiQuotaError, 'all models over quota gives the daily-limit message');
  }

  // 6. Unknown model name moves on.
  const r6 = await callWithFallback(
    ['old-model', 'b'],
    async (m) => (m === 'old-model' ? { ok: false, status: 404, message: 'models/old-model is not found' } : { ok: true, value: 'ok' }),
    { sleep: noSleep },
  );
  check(r6.model === 'b', 'retired model name falls through to the next model');

  // 7. Duplicate model names are only tried once.
  calls = [];
  await callWithFallback(['a', 'a', 'b'], async (m) => (calls.push(m), m === 'a' ? quota : { ok: true, value: 'ok' }), { sleep: noSleep });
  check(calls.join() === 'a,b', 'duplicate models tried once');

  process.exit(failures ? 1 : 0);
})();

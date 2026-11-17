// Personal trigger engine. Pure functions, no app or device code, so it can be
// tested on its own (see scripts/test-engine.ts).
//
// Method (deliberately simple and explainable):
// 1. A day is a "flare day" if the user marked a flare, or the skin rating is
//    2+ points above their average of the previous 14 days.
// 2. For each exposure (a food tag, an ingredient, alcohol, short sleep, high
//    stress, dry or cold weather) and each delay window (1-3, 4-7, 8-14 days
//    before), compare how often flares happen after exposure vs without it.
// 3. A link is shown only if the exposure was seen at least MIN_EXPOSED times
//    and the difference passes a basic significance check. Confidence is Low,
//    Medium or High from the z-score. These are possible links, not proof.

export const MIN_CHECKIN_DAYS = 21;
export const MIN_EXPOSED = 4;
export const BASELINE_DAYS = 14;
export const MIN_BASELINE_POINTS = 5;
export const FLARE_JUMP = 2;

export const WINDOWS: { label: string; from: number; to: number }[] = [
  { label: '1 to 3 days', from: 1, to: 3 },
  { label: '4 to 7 days', from: 4, to: 7 },
  { label: '8 to 14 days', from: 8, to: 14 },
];

export type DayCheckin = {
  date: string; // YYYY-MM-DD
  skin: number; // 0-10, higher = worse
  stress: number; // 0-10
  sleepHours: number;
  alcoholUnits: number;
  flare: boolean; // user marked a flare
};

export type DayFood = { date: string; keys: string[] }; // e.g. 'tag:gluten', 'ing:tomato'
export type DayWeather = { date: string; humidity: number | null; tempMin: number | null };

export type Insight = {
  key: string;
  window: string;
  ratio: number; // flare rate after exposure / without
  direction: 'more' | 'fewer';
  confidence: 'Low' | 'Medium' | 'High';
  z: number;
  exposedDays: number; // days the exposure happened
  flareRateWith: number;
  flareRateWithout: number;
};

export type EngineResult = {
  checkinDays: number;
  flareDays: number;
  ready: boolean;
  insights: Insight[];
};

const DAY_MS = 86_400_000;
const toDay = (d: string) => Math.round(Date.parse(d + 'T00:00:00Z') / DAY_MS);

/** Marks each check-in day as flare or not, using the user's rolling baseline. */
export function flareDays(checkins: DayCheckin[]): Map<number, boolean> {
  const byDay = new Map<number, DayCheckin>();
  for (const c of checkins) byDay.set(toDay(c.date), c);
  const days = [...byDay.keys()].sort((a, b) => a - b);
  const out = new Map<number, boolean>();
  for (const d of days) {
    const c = byDay.get(d)!;
    const prior: number[] = [];
    for (let k = 1; k <= BASELINE_DAYS; k++) {
      const p = byDay.get(d - k);
      if (p) prior.push(p.skin);
    }
    let flare = c.flare;
    if (!flare && prior.length >= MIN_BASELINE_POINTS) {
      const base = prior.reduce((s, v) => s + v, 0) / prior.length;
      flare = c.skin >= base + FLARE_JUMP;
    }
    out.set(d, flare);
  }
  return out;
}

/** Builds per-day exposure sets and the set of days each source was observed. */
function buildExposures(checkins: DayCheckin[], foods: DayFood[], weather: DayWeather[]) {
  const exposures = new Map<number, Set<string>>();
  const add = (day: number, key: string) => {
    if (!exposures.has(day)) exposures.set(day, new Set());
    exposures.get(day)!.add(key);
  };
  const observedFood = new Set<number>();
  const observedCheckin = new Set<number>();
  const observedWeather = new Set<number>();

  for (const f of foods) {
    const d = toDay(f.date);
    if (f.keys.length) observedFood.add(d);
    for (const k of f.keys) add(d, k);
  }
  for (const c of checkins) {
    const d = toDay(c.date);
    observedCheckin.add(d);
    if (c.alcoholUnits > 0) add(d, 'life:alcohol');
    if (c.sleepHours > 0 && c.sleepHours < 6) add(d, 'life:short_sleep');
    if (c.stress >= 7) add(d, 'life:high_stress');
  }
  for (const w of weather) {
    const d = toDay(w.date);
    if (w.humidity == null && w.tempMin == null) continue;
    observedWeather.add(d);
    if (w.humidity != null && w.humidity < 40) add(d, 'env:dry_air');
    if (w.tempMin != null && w.tempMin < 12) add(d, 'env:cold');
  }
  const observedFor = (key: string) =>
    key.startsWith('life:') ? observedCheckin : key.startsWith('env:') ? observedWeather : observedFood;
  return { exposures, observedFor };
}

/** Standard normal two-proportion z-score (pooled). */
function zScore(a: number, n1: number, c: number, n0: number): number {
  if (n1 === 0 || n0 === 0) return 0;
  const p1 = a / n1;
  const p0 = c / n0;
  const p = (a + c) / (n1 + n0);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n0));
  return se === 0 ? 0 : (p1 - p0) / se;
}

export function runEngine(
  checkins: DayCheckin[],
  foods: DayFood[],
  weather: DayWeather[],
): EngineResult {
  const flares = flareDays(checkins);
  const checkinDays = flares.size;
  const flareCount = [...flares.values()].filter(Boolean).length;
  const ready = checkinDays >= MIN_CHECKIN_DAYS;
  if (!ready || flareCount < 3) {
    return { checkinDays, flareDays: flareCount, ready, insights: [] };
  }

  const { exposures, observedFor } = buildExposures(checkins, foods, weather);
  const allKeys = new Set<string>();
  const exposedDayCount = new Map<string, number>();
  for (const set of exposures.values()) {
    for (const k of set) {
      allKeys.add(k);
      exposedDayCount.set(k, (exposedDayCount.get(k) ?? 0) + 1);
    }
  }

  const insights: Insight[] = [];
  for (const key of allKeys) {
    const seen = exposedDayCount.get(key) ?? 0;
    if (seen < MIN_EXPOSED) continue;
    const observed = observedFor(key);
    let best: Insight | null = null;

    for (const w of WINDOWS) {
      let a = 0, n1 = 0, c = 0, n0 = 0;
      for (const [day, isFlare] of flares) {
        let exposed = false;
        let observedCount = 0;
        const span = w.to - w.from + 1;
        for (let k = w.from; k <= w.to; k++) {
          const d = day - k;
          if (observed.has(d)) observedCount++;
          if (exposures.get(d)?.has(key)) exposed = true;
        }
        if (exposed) {
          n1++;
          if (isFlare) a++;
        } else if (observedCount * 2 >= span) {
          // Only count as "not exposed" if at least half the window was logged.
          n0++;
          if (isFlare) c++;
        }
      }
      if (n1 < MIN_EXPOSED || n0 < MIN_EXPOSED) continue;
      const z = zScore(a, n1, c, n0);
      const rateWith = a / n1;
      const rateWithout = c / n0;
      const ratio = (a + 0.5) / (n1 + 1) / ((c + 0.5) / (n0 + 1));
      const cand: Insight = {
        key,
        window: w.label,
        ratio,
        direction: ratio >= 1 ? 'more' : 'fewer',
        confidence: Math.abs(z) >= 2.5 ? 'High' : Math.abs(z) >= 2 ? 'Medium' : 'Low',
        z,
        exposedDays: seen,
        flareRateWith: rateWith,
        flareRateWithout: rateWithout,
      };
      if (!best || Math.abs(cand.z) > Math.abs(best.z)) best = cand;
    }

    if (best && Math.abs(best.z) >= 1.5 && (best.ratio >= 1.4 || best.ratio <= 0.7)) {
      insights.push(best);
    }
  }

  insights.sort((x, y) => Math.abs(y.z) - Math.abs(x.z));
  return { checkinDays, flareDays: flareCount, ready, insights };
}

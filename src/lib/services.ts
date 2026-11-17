// Device services: weather, reminders, PDF report, backup.
// All free: Open-Meteo (no key), local notifications, on-device PDF.

import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import {
  addDays,
  exportAll,
  getSetting,
  listAllMeals,
  listCheckins,
  listPhotos,
  listTreatments,
  listWeather,
  localDate,
  prettyDate,
  setSetting,
  upsertWeather,
} from './db';
import { runEngine } from './engine';
import { loadEngineInputs, insightLabel } from './insights';

// ---------- weather ----------

/** Fetches the last 14 days of weather for the phone's location. Returns false if not allowed or offline. */
export async function refreshWeather(force = false): Promise<boolean> {
  if ((await getSetting('weather_enabled')) === '0') return false;
  const last = Number((await getSetting('weather_fetched_at')) ?? 0);
  if (!force && Date.now() - last < 6 * 3600_000) return true;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return false;
  const pos =
    (await Location.getLastKnownPositionAsync()) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
  if (!pos) return false;
  // Round to ~10 km so we never send a precise location.
  const lat = pos.coords.latitude.toFixed(1);
  const lon = pos.coords.longitude.toFixed(1);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&daily=temperature_2m_min,temperature_2m_max,relative_humidity_2m_mean&past_days=14&forecast_days=1&timezone=auto';
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const json = await res.json();
    const d = json.daily;
    for (let i = 0; i < d.time.length; i++) {
      await upsertWeather({
        date: d.time[i],
        humidity: d.relative_humidity_2m_mean[i],
        tempMin: d.temperature_2m_min[i],
        tempMax: d.temperature_2m_max[i],
      });
    }
    await setSetting('weather_fetched_at', String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

// ---------- reminders ----------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type Reminder = { id: string; label: string; hour: number; minute: number; on: boolean };

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: 'checkin', label: 'Daily check-in', hour: 21, minute: 0, on: true },
  { id: 'morning_cream', label: 'Morning cream / medicine', hour: 8, minute: 30, on: false },
  { id: 'night_cream', label: 'Night cream / medicine', hour: 22, minute: 0, on: false },
];

export async function getReminders(): Promise<Reminder[]> {
  const raw = await getSetting('reminders');
  return raw ? JSON.parse(raw) : DEFAULT_REMINDERS;
}

const REMINDER_TEXT: Record<string, { title: string; body: string }> = {
  checkin: { title: 'Flare Down', body: 'How was your skin today? Your check-in takes under a minute.' },
  morning_cream: { title: 'Flare Down', body: 'Time for your morning cream or medicine.' },
  night_cream: { title: 'Flare Down', body: 'Time for your night cream or medicine.' },
};

/** Saves reminders and reschedules all local notifications. Returns false if permission was refused. */
export async function saveReminders(list: Reminder[]): Promise<boolean> {
  await setSetting('reminders', JSON.stringify(list));
  // AndroidImportance is re-exported via `export *`; eslint's import plugin misses it (tsc confirms it exists).
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    // eslint-disable-next-line import/namespace
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!list.some((r) => r.on)) return true;
  const perm = await Notifications.getPermissionsAsync();
  let granted = perm.granted;
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return false;
  for (const r of list) {
    if (!r.on) continue;
    await Notifications.scheduleNotificationAsync({
      content: REMINDER_TEXT[r.id] ?? { title: 'Flare Down', body: r.label },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: r.hour,
        minute: r.minute,
        channelId: 'reminders',
      },
    });
  }
  return true;
}

// ---------- doctor report ----------

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Builds a PDF summary of the last `days` days and opens the share sheet. */
export async function shareDoctorReport(days = 30) {
  const to = localDate();
  const from = addDays(to, -(days - 1));
  const checkins = (await listCheckins(from)).filter((c) => c.date <= to);
  const meals = await listAllMeals(from);
  const treatments = await listTreatments();
  const photos = (await listPhotos()).filter((p) => p.date >= from);
  const engine = runEngine(...(await loadEngineInputs()));

  const avg = (xs: number[]) => (xs.length ? (xs.reduce((s, v) => s + v, 0) / xs.length).toFixed(1) : '-');
  const flareCount = checkins.filter((c) => c.flare).length;
  const areaCounts = new Map<string, number>();
  for (const c of checkins) for (const a of c.areas) areaCounts.set(a, (areaCounts.get(a) ?? 0) + 1);
  const treatmentDays = new Map<string, number>();
  for (const c of checkins) for (const t of c.treatments) treatmentDays.set(t, (treatmentDays.get(t) ?? 0) + 1);

  const maxBar = 10;
  const bars = checkins
    .map(
      (c) =>
        `<div class="bar" title="${c.date}"><div style="height:${(c.skin / maxBar) * 100}%;background:${
          c.flare ? '#c0392b' : '#2f6fb2'
        }"></div></div>`,
    )
    .join('');

  // Inline up to 4 recent photos as base64 so they render in the PDF.
  const photoHtml: string[] = [];
  for (const p of photos.slice(0, 4)) {
    try {
      const b64 = await new File(p.uri).base64();
      photoHtml.push(
        `<figure><img src="data:image/jpeg;base64,${b64}"/><figcaption>${esc(p.area)}, ${prettyDate(p.date)}</figcaption></figure>`,
      );
    } catch {
      // Skip a photo that can't be read.
    }
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    body{font-family:-apple-system,Roboto,Arial,sans-serif;color:#1d2433;margin:28px;font-size:12px}
    h1{font-size:20px;margin:0 0 2px} h2{font-size:14px;margin:18px 0 6px;border-bottom:1px solid #dde3ea;padding-bottom:3px}
    .muted{color:#667085} table{border-collapse:collapse;width:100%} td,th{padding:4px 6px;border-bottom:1px solid #eef1f4;text-align:left}
    .grid{display:flex;gap:16px} .stat{flex:1;background:#f4f7fb;border-radius:8px;padding:8px}
    .stat b{display:block;font-size:18px}
    .chart{display:flex;align-items:flex-end;height:80px;gap:2px;border-bottom:1px solid #ccd3dc}
    .bar{flex:1;height:100%;display:flex;align-items:flex-end} .bar div{width:100%;border-radius:2px 2px 0 0}
    figure{display:inline-block;margin:4px;width:23%} img{width:100%;border-radius:6px} figcaption{font-size:10px;color:#667085}
  </style></head><body>
  <h1>Psoriasis self-tracking summary</h1>
  <div class="muted">${prettyDate(from)} to ${prettyDate(to)} · Generated by Flare Down (prototype). Patient-recorded data, not a clinical assessment.</div>
  <h2>At a glance</h2>
  <div class="grid">
    <div class="stat"><b>${checkins.length}/${days}</b>days logged</div>
    <div class="stat"><b>${avg(checkins.map((c) => c.skin))}</b>avg skin rating (0-10)</div>
    <div class="stat"><b>${avg(checkins.map((c) => c.itch))}</b>avg itch (0-10)</div>
    <div class="stat"><b>${flareCount}</b>flare days marked</div>
  </div>
  <h2>Skin rating by day</h2>
  <div class="chart">${bars || '<span class="muted">No check-ins yet</span>'}</div>
  <div class="muted">Blue = normal day, red = marked flare. Taller = worse.</div>
  <h2>Affected areas (days reported)</h2>
  <div>${[...areaCounts].sort((a, b) => b[1] - a[1]).map(([a, n]) => `${esc(a)} (${n})`).join(', ') || '<span class="muted">None recorded</span>'}</div>
  <h2>Treatments (days used of ${checkins.length} logged)</h2>
  <table><tr><th>Treatment</th><th>Type</th><th>Days used</th></tr>
  ${treatments.map((t) => `<tr><td>${esc(t.name)}</td><td>${esc(t.kind)}</td><td>${treatmentDays.get(t.id) ?? 0}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">None added</td></tr>'}
  </table>
  <h2>Lifestyle (averages)</h2>
  <div>Sleep ${avg(checkins.map((c) => c.sleepHours))} h · Stress ${avg(checkins.map((c) => c.stress))}/10 · Alcohol on ${checkins.filter((c) => c.alcoholUnits > 0).length} days · Meals logged: ${meals.length}</div>
  <h2>Possible personal triggers</h2>
  ${
    engine.insights.length
      ? `<table><tr><th>Exposure</th><th>Delay</th><th>Flares</th><th>Confidence</th></tr>${engine.insights
          .slice(0, 8)
          .map(
            (i) =>
              `<tr><td>${esc(insightLabel(i.key))}</td><td>${i.window}</td><td>${i.direction === 'more' ? `${i.ratio.toFixed(1)}x more` : `${(1 / i.ratio).toFixed(1)}x fewer`}</td><td>${i.confidence} (seen ${i.exposedDays} days)</td></tr>`,
          )
          .join('')}</table>
         <div class="muted">Statistical associations from self-logged data. They are not proof of cause.</div>`
      : `<div class="muted">Not enough data yet (${engine.checkinDays} of 21 check-in days needed, ${engine.flareDays} flare days).</div>`
  }
  ${photoHtml.length ? `<h2>Recent photos</h2>${photoHtml.join('')}` : ''}
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  await shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share report', UTI: '.pdf' });
}

// ---------- backup ----------

/** Writes all data as JSON and opens the share sheet (save to Google Drive, email, WhatsApp). */
export async function shareBackup() {
  const data = await exportAll();
  const file = new File(Paths.cache, `flare-down-backup-${localDate()}.json`);
  if (file.exists) file.delete();
  file.create();
  await file.write(JSON.stringify(data, null, 2));
  await shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save backup' });
  await setSetting('last_backup', localDate());
}

export { listWeather };

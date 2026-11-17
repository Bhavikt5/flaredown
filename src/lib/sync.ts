// Two-way sync between the phone's SQLite database and Supabase.
// The phone stays the working copy (works offline). When signed in:
//  - push: rows changed locally since the last push are upserted to Supabase
//  - pull: rows changed in Supabase since the last pull are merged locally
//    (newest updated_at wins)
//  - photos: skin photo files upload to a private bucket only if the user
//    turned "Back up skin photos" on.

import { Directory, File, Paths } from 'expo-file-system';
import { db, getSetting, loadCustomIngredients, onLocalChange, setSetting } from './db';
import { getSupabase, PHOTO_BUCKET } from './supabase';

type Spec = { table: string; cols: string[]; json: string[]; bool: string[] };

const SPECS: Spec[] = [
  {
    table: 'checkins',
    cols: ['id', 'date', 'skin', 'itch', 'stress', 'sleep_hours', 'alcohol_units', 'flare', 'areas', 'treatments', 'notes', 'updated_at', 'deleted'],
    json: ['areas', 'treatments'],
    bool: ['flare', 'deleted'],
  },
  {
    table: 'meals',
    cols: ['id', 'date', 'meal', 'dish_id', 'dish_name', 'ingredients', 'tags', 'created_at', 'updated_at', 'deleted'],
    json: ['ingredients', 'tags'],
    bool: ['deleted'],
  },
  {
    table: 'custom_dishes',
    cols: ['id', 'name', 'ingredients', 'fried', 'updated_at', 'deleted'],
    json: ['ingredients'],
    bool: ['fried', 'deleted'],
  },
  { table: 'custom_ingredients', cols: ['id', 'name', 'tags', 'updated_at', 'deleted'], json: ['tags'], bool: ['deleted'] },
  { table: 'treatments', cols: ['id', 'name', 'kind', 'active', 'updated_at', 'deleted'], json: [], bool: ['active', 'deleted'] },
  { table: 'photos', cols: ['id', 'date', 'area', 'note', 'updated_at', 'deleted'], json: [], bool: ['deleted'] },
];

/** A table added in a later app version may not exist in Supabase yet (SQL not re-run). */
const isMissingTable = (msg: string) => /could not find the table|does not exist|PGRST205|42P01/i.test(msg);
let missingTables: string[] = [];

const photoDir = () => {
  const dir = new Directory(Paths.document, 'photos');
  dir.create({ idempotent: true, intermediates: true });
  return dir;
};

export type SyncStatus = { ok: boolean; message: string; at?: string };

let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Debounced sync after a local change. */
export function syncSoon(delayMs = 4000) {
  if (!getSupabase()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    syncNow().catch(() => {});
  }, delayMs);
}

onLocalChange(() => syncSoon());

export async function syncNow(): Promise<SyncStatus> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: 'Supabase is not set up' };
  const { data: sessionData } = await sb.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { ok: false, message: 'Not signed in' };
  if (running) return { ok: true, message: 'Sync already running' };
  running = true;
  try {
    // Never mix two accounts' data: if a different user signs in, start fresh watermarks.
    const lastUser = await getSetting('sync_user');
    if (lastUser !== user.id) {
      for (const s of SPECS) {
        await setSetting(`push_${s.table}`, '');
        await setSetting(`pull_${s.table}`, '');
      }
      await setSetting('sync_user', user.id);
    }

    missingTables = [];
    let pushed = 0;
    let pulled = 0;
    for (const spec of SPECS) {
      pushed += await push(spec, user.id);
      pulled += await pull(spec);
    }
    await loadCustomIngredients();
    await syncProfile(user.id);
    await syncPhotoFiles(user.id);

    const at = new Date().toISOString();
    await setSetting('last_sync', at);
    const warn = missingTables.length
      ? `Supabase is missing table(s) ${missingTables.join(', ')}. Re-run supabase/schema.sql.`
      : '';
    await setSetting('last_sync_error', warn);
    return { ok: true, message: `Synced (${pushed} up, ${pulled} down)${warn ? '. ' + warn : ''}`, at };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await setSetting('last_sync_error', message);
    return { ok: false, message };
  } finally {
    running = false;
  }
}

async function push(spec: Spec, userId: string): Promise<number> {
  const sb = getSupabase()!;
  const since = (await getSetting(`push_${spec.table}`)) || '';
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${spec.cols.join(', ')} FROM ${spec.table} WHERE updated_at > ? ORDER BY updated_at`,
    since,
  );
  if (!rows.length) return 0;
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200).map((r) => {
      const out: Record<string, unknown> = { ...r, user_id: userId };
      for (const c of spec.json) out[c] = JSON.parse(String(r[c] ?? '[]'));
      for (const c of spec.bool) out[c] = !!r[c];
      return out;
    });
    const { error } = await sb.from(spec.table).upsert(batch, { onConflict: 'id' });
    if (error) {
      if (isMissingTable(error.message)) {
        missingTables.push(spec.table);
        return 0;
      }
      throw new Error(`${spec.table} upload: ${error.message}`);
    }
  }
  await setSetting(`push_${spec.table}`, String(rows[rows.length - 1].updated_at));
  return rows.length;
}

async function pull(spec: Spec): Promise<number> {
  const sb = getSupabase()!;
  let since = (await getSetting(`pull_${spec.table}`)) || '1970-01-01T00:00:00Z';
  let total = 0;
  for (;;) {
    const { data, error } = await sb
      .from(spec.table)
      .select(spec.cols.join(','))
      .gt('updated_at', since)
      .order('updated_at', { ascending: true })
      .limit(500);
    if (error) {
      if (isMissingTable(error.message)) {
        if (!missingTables.includes(spec.table)) missingTables.push(spec.table);
        return total;
      }
      throw new Error(`${spec.table} download: ${error.message}`);
    }
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    if (!rows.length) break;

    for (const r of rows) {
      const updated = new Date(String(r.updated_at)).toISOString();
      const local = await db.getFirstAsync<{ updated_at: string }>(`SELECT updated_at FROM ${spec.table} WHERE id = ?`, String(r.id));
      if (local && local.updated_at >= updated) continue;
      const values = spec.cols.map((c) => {
        if (c === 'updated_at') return updated;
        if (spec.json.includes(c)) return JSON.stringify(r[c] ?? []);
        if (spec.bool.includes(c)) return r[c] ? 1 : 0;
        return r[c] as string | number | null;
      });
      const cols = [...spec.cols];
      if (spec.table === 'photos') {
        // Photos need a local file path; the file itself is fetched in syncPhotoFiles.
        cols.push('uri', 'uploaded');
        values.push(new File(photoDir(), `${String(r.id)}.jpg`).uri, 1);
      }
      await db.runAsync(
        `INSERT OR REPLACE INTO ${spec.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        ...values,
      );
      total++;
    }
    since = String(rows[rows.length - 1].updated_at);
    await setSetting(`pull_${spec.table}`, since);
    if (rows.length < 500) break;
  }
  return total;
}

async function syncProfile(userId: string) {
  const sb = getSupabase()!;
  const name = (await getSetting('name')) ?? '';
  if (name) {
    const { error } = await sb.from('profiles').upsert({ user_id: userId, name, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw new Error(`profile: ${error.message}`);
  } else {
    const { data } = await sb.from('profiles').select('name').eq('user_id', userId).maybeSingle();
    if (data?.name) await setSetting('name', data.name);
  }
}

async function syncPhotoFiles(userId: string) {
  if ((await getSetting('photo_cloud')) !== '1') return;
  const sb = getSupabase()!;
  const bucket = sb.storage.from(PHOTO_BUCKET);

  // Upload photos not yet in the cloud.
  const pending = await db.getAllAsync<{ id: string; uri: string }>('SELECT id, uri FROM photos WHERE deleted = 0 AND uploaded = 0');
  for (const p of pending) {
    const f = new File(p.uri);
    if (!f.exists) continue;
    const bytes = await f.bytes();
    const { error } = await bucket.upload(`${userId}/${p.id}.jpg`, bytes, { contentType: 'image/jpeg', upsert: true });
    if (error) throw new Error(`photo upload: ${error.message}`);
    await db.runAsync('UPDATE photos SET uploaded = 1 WHERE id = ?', p.id);
  }

  // Remove deleted photos from the cloud.
  const removed = await db.getAllAsync<{ id: string }>('SELECT id FROM photos WHERE deleted = 1 AND uploaded = 1');
  if (removed.length) {
    await bucket.remove(removed.map((p) => `${userId}/${p.id}.jpg`));
    for (const p of removed) await db.runAsync('UPDATE photos SET uploaded = 0 WHERE id = ?', p.id);
  }

  // Download photos that exist in the cloud but not on this phone (e.g. new phone).
  const missing = await db.getAllAsync<{ id: string; uri: string }>('SELECT id, uri FROM photos WHERE deleted = 0 AND uploaded = 1');
  for (const p of missing) {
    const dest = new File(p.uri);
    if (dest.exists) continue;
    const { data, error } = await bucket.createSignedUrl(`${userId}/${p.id}.jpg`, 300);
    if (error || !data?.signedUrl) continue;
    try {
      await File.downloadFileAsync(data.signedUrl, dest);
    } catch {
      // Try again next sync.
    }
  }
}

// ---------- account ----------

export async function currentUserEmail(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user.email ?? null;
}

export async function signIn(email: string, password: string, create: boolean): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return 'Supabase is not set up. Add the keys to .env first.';
  const res = create ? await sb.auth.signUp({ email, password }) : await sb.auth.signInWithPassword({ email, password });
  if (res.error) return res.error.message;
  if (create && !res.data.session) {
    return 'Account created. Confirm the email link, or turn off "Confirm email" in Supabase, then sign in.';
  }
  return null;
}

export async function signOut() {
  await getSupabase()?.auth.signOut();
}

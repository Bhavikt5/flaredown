// Local database. Everything stays on the phone.
// Every record has a UUID, updated_at and a deleted flag so it can sync to a
// future backend without changes (see the system design doc).

import { openDatabaseSync } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { BUILT_IN_DISHES, Dish, dishTags, Category } from '@/data/dishes';
import { ingredientInfo, setCustomIngredients, Tag } from '@/data/ingredients';

export const db = openDatabaseSync('flaredown.db');

const SCHEMA_VERSION = 3;

// Lets the sync engine know something changed locally, without db.ts
// importing sync.ts (which imports db.ts).
const changeListeners = new Set<() => void>();
export function onLocalChange(fn: () => void) {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}
function changed() {
  for (const fn of changeListeners) fn();
}

export async function initDb() {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS checkins (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL UNIQUE,
        skin INTEGER NOT NULL,
        itch INTEGER NOT NULL,
        stress INTEGER NOT NULL,
        sleep_hours REAL NOT NULL,
        alcohol_units REAL NOT NULL,
        flare INTEGER NOT NULL DEFAULT 0,
        areas TEXT NOT NULL DEFAULT '[]',
        treatments TEXT NOT NULL DEFAULT '[]',
        notes TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS meals (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        meal TEXT NOT NULL,
        dish_id TEXT NOT NULL,
        dish_name TEXT NOT NULL,
        ingredients TEXT NOT NULL,
        tags TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS meals_date ON meals(date);
      CREATE TABLE IF NOT EXISTS custom_dishes (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        ingredients TEXT NOT NULL,
        fried INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS favourites (dish_id TEXT PRIMARY KEY NOT NULL);
      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        area TEXT NOT NULL,
        uri TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS weather (
        date TEXT PRIMARY KEY NOT NULL,
        humidity REAL,
        temp_min REAL,
        temp_max REAL
      );
      CREATE TABLE IF NOT EXISTS treatments (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    `);
  }
  if (version < 2) {
    // Tracks whether a photo file has been uploaded to cloud storage.
    await db.execAsync('ALTER TABLE photos ADD COLUMN uploaded INTEGER NOT NULL DEFAULT 0');
  }
  if (version < 3) {
    // Ingredients and packaged products the user adds themselves.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS custom_ingredients (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0
      );
    `);
  }
  if (version < SCHEMA_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
  await loadCustomIngredients();
}

// ---------- custom ingredients ----------

export type CustomIngredient = { id: string; name: string; tags: Tag[] };

/** Reads user-added ingredients into the in-memory registry used by scoring and labels. */
export async function loadCustomIngredients(): Promise<CustomIngredient[]> {
  const rows = await db.getAllAsync<{ id: string; name: string; tags: string }>(
    'SELECT id, name, tags FROM custom_ingredients WHERE deleted = 0 ORDER BY name',
  );
  const list = rows.map((r) => ({ id: r.id, name: r.name, tags: JSON.parse(r.tags) as Tag[] }));
  setCustomIngredients(list);
  return list;
}

/** Adds an ingredient, or returns the existing one with the same name (case-insensitive). */
/** Pass fixedId for barcode products (bc_<barcode>) so a rescan updates the same item. */
export async function saveCustomIngredient(name: string, tags: Tag[], fixedId?: string): Promise<string> {
  const clean = name.trim();
  const existing = fixedId
    ? null
    : await db.getFirstAsync<{ id: string }>('SELECT id FROM custom_ingredients WHERE deleted = 0 AND lower(name) = lower(?)', clean);
  const id = fixedId ?? existing?.id ?? 'ci_' + uuid();
  await db.runAsync(
    `INSERT INTO custom_ingredients (id, name, tags, updated_at, deleted) VALUES (?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, tags = excluded.tags, updated_at = excluded.updated_at, deleted = 0`,
    id,
    clean,
    JSON.stringify([...new Set(tags)]),
    now(),
  );
  await loadCustomIngredients();
  changed();
  return id;
}

// ---------- helpers ----------

export const uuid = () => Crypto.randomUUID();
const now = () => new Date().toISOString();

/** Local calendar date as YYYY-MM-DD. */
export function localDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + n));
}

export function prettyDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ---------- settings ----------

export async function getSetting(key: string): Promise<string | null> {
  const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return r?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

// ---------- check-ins ----------

export type Checkin = {
  id: string;
  date: string;
  skin: number;
  itch: number;
  stress: number;
  sleepHours: number;
  alcoholUnits: number;
  flare: boolean;
  areas: string[];
  treatments: string[];
  notes: string;
};

type CheckinRow = {
  id: string;
  date: string;
  skin: number;
  itch: number;
  stress: number;
  sleep_hours: number;
  alcohol_units: number;
  flare: number;
  areas: string;
  treatments: string;
  notes: string;
};

const toCheckin = (r: CheckinRow): Checkin => ({
  id: r.id,
  date: r.date,
  skin: r.skin,
  itch: r.itch,
  stress: r.stress,
  sleepHours: r.sleep_hours,
  alcoholUnits: r.alcohol_units,
  flare: !!r.flare,
  areas: JSON.parse(r.areas),
  treatments: JSON.parse(r.treatments),
  notes: r.notes,
});

export async function getCheckin(date: string): Promise<Checkin | null> {
  const r = await db.getFirstAsync<CheckinRow>('SELECT * FROM checkins WHERE date = ? AND deleted = 0', date);
  return r ? toCheckin(r) : null;
}

export async function getLatestCheckinBefore(date: string): Promise<Checkin | null> {
  const r = await db.getFirstAsync<CheckinRow>(
    'SELECT * FROM checkins WHERE date < ? AND deleted = 0 ORDER BY date DESC LIMIT 1',
    date,
  );
  return r ? toCheckin(r) : null;
}

export async function listCheckins(fromDate?: string): Promise<Checkin[]> {
  const rows = fromDate
    ? await db.getAllAsync<CheckinRow>('SELECT * FROM checkins WHERE deleted = 0 AND date >= ? ORDER BY date', fromDate)
    : await db.getAllAsync<CheckinRow>('SELECT * FROM checkins WHERE deleted = 0 ORDER BY date');
  return rows.map(toCheckin);
}

export async function saveCheckin(c: Omit<Checkin, 'id'> & { id?: string }) {
  const existing = await getCheckin(c.date);
  const id = existing?.id ?? c.id ?? uuid();
  await db.runAsync(
    `INSERT INTO checkins (id, date, skin, itch, stress, sleep_hours, alcohol_units, flare, areas, treatments, notes, updated_at, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(date) DO UPDATE SET skin = excluded.skin, itch = excluded.itch, stress = excluded.stress,
       sleep_hours = excluded.sleep_hours, alcohol_units = excluded.alcohol_units, flare = excluded.flare,
       areas = excluded.areas, treatments = excluded.treatments, notes = excluded.notes,
       updated_at = excluded.updated_at, deleted = 0`,
    id,
    c.date,
    c.skin,
    c.itch,
    c.stress,
    c.sleepHours,
    c.alcoholUnits,
    c.flare ? 1 : 0,
    JSON.stringify(c.areas),
    JSON.stringify(c.treatments),
    c.notes,
    now(),
  );
  changed();
}

// ---------- dishes ----------

type CustomDishRow = { id: string; name: string; ingredients: string; fried: number };

export async function listCustomDishes(): Promise<Dish[]> {
  const rows = await db.getAllAsync<CustomDishRow>('SELECT * FROM custom_dishes WHERE deleted = 0 ORDER BY name');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    alt: 'My dish',
    category: 'Custom' as Category,
    ingredients: JSON.parse(r.ingredients),
    fried: !!r.fried,
    custom: true,
  }));
}

export async function allDishes(): Promise<Dish[]> {
  return [...(await listCustomDishes()), ...BUILT_IN_DISHES];
}

/** Pass fixedId for barcode products (bcd_<barcode>) so a rescan reuses the same dish. */
export async function saveCustomDish(name: string, ingredients: string[], fried: boolean, fixedId?: string): Promise<string> {
  const id = fixedId ?? 'custom_' + uuid();
  await db.runAsync(
    `INSERT INTO custom_dishes (id, name, ingredients, fried, updated_at, deleted) VALUES (?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, ingredients = excluded.ingredients, fried = excluded.fried,
       updated_at = excluded.updated_at, deleted = 0`,
    id,
    name,
    JSON.stringify(ingredients),
    fried ? 1 : 0,
    now(),
  );
  changed();
  return id;
}

/** A saved product/dish by id (used to recognise a barcode scanned before). */
export async function getCustomDish(id: string): Promise<Dish | null> {
  const r = await db.getFirstAsync<CustomDishRow>('SELECT * FROM custom_dishes WHERE id = ? AND deleted = 0', id);
  return r
    ? { id: r.id, name: r.name, alt: 'My dish', category: 'Custom', ingredients: JSON.parse(r.ingredients), fried: !!r.fried, custom: true }
    : null;
}

export async function listFavourites(): Promise<string[]> {
  const rows = await db.getAllAsync<{ dish_id: string }>('SELECT dish_id FROM favourites');
  return rows.map((r) => r.dish_id);
}

export async function toggleFavourite(dishId: string, on: boolean) {
  if (on) await db.runAsync('INSERT OR IGNORE INTO favourites (dish_id) VALUES (?)', dishId);
  else await db.runAsync('DELETE FROM favourites WHERE dish_id = ?', dishId);
  changed();
}

/** Dish ids the user logged most recently, newest first. */
export async function recentDishIds(limit = 12): Promise<string[]> {
  const rows = await db.getAllAsync<{ dish_id: string }>(
    'SELECT dish_id, MAX(created_at) AS last FROM meals WHERE deleted = 0 GROUP BY dish_id ORDER BY last DESC LIMIT ?',
    limit,
  );
  return rows.map((r) => r.dish_id);
}

// ---------- meals ----------

export type MealType = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner';
export const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

/** Guesses the meal from the time of day. */
export function currentMealType(d = new Date()): MealType {
  const h = d.getHours();
  if (h < 11) return 'Breakfast';
  if (h < 16) return 'Lunch';
  if (h < 19) return 'Snack';
  return 'Dinner';
}

export type MealEntry = {
  id: string;
  date: string;
  meal: MealType;
  dishId: string;
  dishName: string;
  ingredients: string[];
  tags: string[];
};

type MealRow = {
  id: string;
  date: string;
  meal: string;
  dish_id: string;
  dish_name: string;
  ingredients: string;
  tags: string;
};

const toMeal = (r: MealRow): MealEntry => ({
  id: r.id,
  date: r.date,
  meal: r.meal as MealType,
  dishId: r.dish_id,
  dishName: r.dish_name,
  ingredients: JSON.parse(r.ingredients),
  tags: JSON.parse(r.tags),
});

export async function listMeals(date: string): Promise<MealEntry[]> {
  const rows = await db.getAllAsync<MealRow>(
    'SELECT * FROM meals WHERE date = ? AND deleted = 0 ORDER BY created_at',
    date,
  );
  return rows.map(toMeal);
}

export async function listAllMeals(fromDate?: string): Promise<MealEntry[]> {
  const rows = fromDate
    ? await db.getAllAsync<MealRow>('SELECT * FROM meals WHERE deleted = 0 AND date >= ? ORDER BY date', fromDate)
    : await db.getAllAsync<MealRow>('SELECT * FROM meals WHERE deleted = 0 ORDER BY date');
  return rows.map(toMeal);
}

/** Saves the dish's ingredients and tags as they are today, so later recipe edits don't rewrite history. */
export async function addMeal(date: string, meal: MealType, dish: Dish) {
  await db.runAsync(
    `INSERT INTO meals (id, date, meal, dish_id, dish_name, ingredients, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    uuid(),
    date,
    meal,
    dish.id,
    dish.name,
    JSON.stringify(dish.ingredients.filter((i) => ingredientInfo(i))),
    JSON.stringify(dishTags(dish)),
    now(),
    now(),
  );
  changed();
}

export async function deleteMeal(id: string) {
  await db.runAsync('UPDATE meals SET deleted = 1, updated_at = ? WHERE id = ?', now(), id);
  changed();
}

/** Copies all meals from one day to another ("same as yesterday"). */
export async function copyMeals(fromDate: string, toDate: string): Promise<number> {
  const meals = await listMeals(fromDate);
  for (const m of meals) {
    await db.runAsync(
      `INSERT INTO meals (id, date, meal, dish_id, dish_name, ingredients, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      uuid(),
      toDate,
      m.meal,
      m.dishId,
      m.dishName,
      JSON.stringify(m.ingredients),
      JSON.stringify(m.tags),
      now(),
      now(),
    );
  }
  changed();
  return meals.length;
}

// ---------- photos ----------

export type Photo = { id: string; date: string; area: string; uri: string; note: string };

export async function listPhotos(): Promise<Photo[]> {
  return db.getAllAsync<Photo>(
    'SELECT id, date, area, uri, note FROM photos WHERE deleted = 0 ORDER BY date DESC, updated_at DESC',
  );
}

export async function addPhoto(p: Omit<Photo, 'id'>): Promise<string> {
  const id = uuid();
  await db.runAsync(
    'INSERT INTO photos (id, date, area, uri, note, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    p.date,
    p.area,
    p.uri,
    p.note,
    now(),
  );
  changed();
  return id;
}

export async function deletePhotoRow(id: string) {
  await db.runAsync('UPDATE photos SET deleted = 1, updated_at = ? WHERE id = ?', now(), id);
  changed();
}

// ---------- weather ----------

export type Weather = { date: string; humidity: number | null; tempMin: number | null; tempMax: number | null };

export async function upsertWeather(w: Weather) {
  await db.runAsync(
    `INSERT INTO weather (date, humidity, temp_min, temp_max) VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET humidity = excluded.humidity, temp_min = excluded.temp_min, temp_max = excluded.temp_max`,
    w.date,
    w.humidity,
    w.tempMin,
    w.tempMax,
  );
}

export async function listWeather(): Promise<Weather[]> {
  return db.getAllAsync<Weather>(
    'SELECT date, humidity, temp_min AS tempMin, temp_max AS tempMax FROM weather ORDER BY date',
  );
}

// ---------- treatments ----------

export type Treatment = { id: string; name: string; kind: string; active: boolean };

export async function listTreatments(): Promise<Treatment[]> {
  const rows = await db.getAllAsync<{ id: string; name: string; kind: string; active: number }>(
    'SELECT id, name, kind, active FROM treatments WHERE deleted = 0 ORDER BY name',
  );
  return rows.map((r) => ({ ...r, active: !!r.active }));
}

export async function addTreatment(name: string, kind: string) {
  await db.runAsync(
    'INSERT INTO treatments (id, name, kind, active, updated_at) VALUES (?, ?, ?, 1, ?)',
    uuid(),
    name,
    kind,
    now(),
  );
  changed();
}

export async function deleteTreatment(id: string) {
  await db.runAsync('UPDATE treatments SET deleted = 1, updated_at = ? WHERE id = ?', now(), id);
  changed();
}

// ---------- export ----------

export async function exportAll() {
  const tables = ['checkins', 'meals', 'custom_dishes', 'custom_ingredients', 'favourites', 'photos', 'weather', 'treatments', 'settings'];
  const out: Record<string, unknown[]> = {};
  for (const t of tables) out[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  return { app: 'Flare Down prototype', schema: SCHEMA_VERSION, exportedAt: now(), data: out };
}

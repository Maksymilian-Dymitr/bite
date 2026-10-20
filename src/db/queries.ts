import { and, asc, desc, eq, gte, lt, lte, or, sql } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "./client";
import { goals, mealItems, meals, weights, type Meal, type MealItem, type NewMealItem } from "./schema";
import { addDays, dayKey, dayRange, startOfDay } from "@/lib/dates";
import { sum, type Macros } from "@/lib/nutrition";

export type MealWithItems = Meal & { items: MealItem[]; totals: Macros };

function groupMeals(rows: { meal: Meal; item: MealItem | null }[]): MealWithItems[] {
  const byId = new Map<number, MealWithItems>();
  for (const { meal, item } of rows) {
    let m = byId.get(meal.id);
    if (!m) {
      m = { ...meal, items: [], totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 } };
      byId.set(meal.id, m);
    }
    if (item) m.items.push(item);
  }
  for (const m of byId.values()) m.totals = sum(m.items);
  return [...byId.values()];
}

/* ---------- reads (live) ---------- */

export function useDayMeals(day: Date = new Date()) {
  const [from, to] = dayRange(day);
  const { data } = useLiveQuery(
    db
      .select({ meal: meals, item: mealItems })
      .from(meals)
      .leftJoin(mealItems, eq(mealItems.mealId, meals.id))
      .where(and(gte(meals.eatenAt, from), lt(meals.eatenAt, to)))
      .orderBy(asc(meals.eatenAt), asc(mealItems.id)),
    [from],
  );
  return groupMeals(data ?? []);
}

export function useMeal(id: number) {
  const { data } = useLiveQuery(
    db
      .select({ meal: meals, item: mealItems })
      .from(meals)
      .leftJoin(mealItems, eq(mealItems.mealId, meals.id))
      .where(eq(meals.id, id))
      .orderBy(asc(mealItems.id)),
    [id],
  );
  return groupMeals(data ?? [])[0];
}

export function useGoal(day: Date = new Date()) {
  const key = dayKey(day);
  const { data } = useLiveQuery(
    db
      .select()
      .from(goals)
      .where(lte(goals.effectiveFrom, key))
      .orderBy(desc(goals.effectiveFrom), desc(goals.id))
      .limit(1),
    [key],
  );
  return data?.[0];
}

/** kcal per day for the last `days` days, oldest first. Days with nothing logged are 0. */
export function useDailyTotals(days: number) {
  const today = new Date();
  const from = startOfDay(addDays(today, -(days - 1)));
  const { data } = useLiveQuery(
    db
      .select({
        eatenAt: meals.eatenAt,
        kcal: sql<number>`coalesce(sum(${mealItems.kcal}), 0)`,
        protein: sql<number>`coalesce(sum(${mealItems.protein}), 0)`,
      })
      .from(meals)
      .leftJoin(mealItems, eq(mealItems.mealId, meals.id))
      .where(and(gte(meals.eatenAt, from), eq(meals.status, "done")))
      .groupBy(meals.id),
    [from],
  );
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = addDays(today, -(days - 1) + i);
    return { day: d, key: dayKey(d), kcal: 0, protein: 0, logged: false };
  });
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const r of data ?? []) {
    const i = index.get(dayKey(new Date(r.eatenAt)));
    if (i === undefined) continue;
    buckets[i].kcal += r.kcal;
    buckets[i].protein += r.protein;
    buckets[i].logged = true;
  }
  return buckets;
}

export function useWeights(limit = 60) {
  const { data } = useLiveQuery(
    db.select().from(weights).orderBy(desc(weights.date)).limit(limit),
    [limit],
  );
  return (data ?? []).slice().reverse();
}

const signature = (m: MealWithItems) =>
  m.items
    .map((i) => i.name.trim().toLowerCase())
    .sort()
    .join("|");

/** Meals worth logging again: favorites first, then distinct meals from the last 30 days, newest first. */
export function useRepeatable() {
  const from = startOfDay(addDays(new Date(), -30));
  const { data } = useLiveQuery(
    db
      .select({ meal: meals, item: mealItems })
      .from(meals)
      .innerJoin(mealItems, eq(mealItems.mealId, meals.id))
      .where(and(eq(meals.status, "done"), or(eq(meals.favorite, true), gte(meals.eatenAt, from))))
      .orderBy(desc(meals.eatenAt), asc(mealItems.id)),
    [from],
  );
  const all = groupMeals(data ?? []);
  const seen = new Set<string>();
  const pick = (list: MealWithItems[]) =>
    list.filter((m) => {
      const s = signature(m);
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
  const favorites = pick(all.filter((m) => m.favorite));
  const recent = pick(all.filter((m) => !m.favorite)).slice(0, 15);
  return { favorites, recent };
}

export function usePendingMeals() {
  const { data } = useLiveQuery(
    db.select().from(meals).where(sql`${meals.status} != 'done'`).orderBy(asc(meals.eatenAt)),
  );
  return data ?? [];
}

/* ---------- writes ---------- */

export async function createMeal(input: { eatenAt: number; photoPath: string | null; note: string | null }) {
  const [row] = await db.insert(meals).values({ ...input, status: "pending" }).returning();
  return row;
}

export async function setMealResult(mealId: number, items: Omit<NewMealItem, "mealId">[]) {
  await db.transaction(async (tx) => {
    await tx.delete(mealItems).where(eq(mealItems.mealId, mealId));
    if (items.length) await tx.insert(mealItems).values(items.map((i) => ({ ...i, mealId })));
    await tx.update(meals).set({ status: "done", error: null }).where(eq(meals.id, mealId));
  });
}

export async function setMealFailed(mealId: number, error: string) {
  await db.update(meals).set({ status: "failed", error }).where(eq(meals.id, mealId));
}

/** Analysis hit a temporary problem (offline, rate limit): stay pending so it's retried, but remember why. */
export async function setMealWaiting(mealId: number, error: string) {
  await db.update(meals).set({ status: "pending", error }).where(eq(meals.id, mealId));
}

/** A meal that needs no analysis, e.g. a scanned product. */
export async function createMealWithItems(input: { eatenAt: number; note: string | null; items: Omit<NewMealItem, "mealId">[] }) {
  return db.transaction(async (tx) => {
    const [meal] = await tx
      .insert(meals)
      .values({ eatenAt: input.eatenAt, note: input.note, photoPath: null, status: "done" })
      .returning();
    if (input.items.length) await tx.insert(mealItems).values(input.items.map((i) => ({ ...i, mealId: meal.id })));
    return meal;
  });
}

/** Logs a copy of a meal (its items as they were saved) at `eatenAt`. The caller copies the photo file. */
export async function copyMeal(mealId: number, photoPath: string | null, eatenAt = Date.now()) {
  const src = await getMeal(mealId);
  if (!src) throw new Error("That meal no longer exists.");
  const items = await db.select().from(mealItems).where(eq(mealItems.mealId, mealId)).orderBy(asc(mealItems.id));
  return db.transaction(async (tx) => {
    const [meal] = await tx.insert(meals).values({ eatenAt, photoPath, note: src.note, status: "done" }).returning();
    if (items.length) await tx.insert(mealItems).values(items.map(({ id, ...i }) => ({ ...i, mealId: meal.id })));
    return meal;
  });
}

export async function setFavorite(mealId: number, favorite: boolean) {
  await db.update(meals).set({ favorite }).where(eq(meals.id, mealId));
}

export async function updateMealNote(mealId: number, note: string | null) {
  await db.update(meals).set({ note }).where(eq(meals.id, mealId));
}

export async function replaceItems(mealId: number, items: Omit<NewMealItem, "mealId">[]) {
  await db.transaction(async (tx) => {
    await tx.delete(mealItems).where(eq(mealItems.mealId, mealId));
    if (items.length) await tx.insert(mealItems).values(items.map((i) => ({ ...i, mealId })));
    await tx.update(meals).set({ status: "done", error: null }).where(eq(meals.id, mealId));
  });
}

export async function deleteMeal(mealId: number) {
  await db.delete(meals).where(eq(meals.id, mealId));
}

export async function getMeal(mealId: number) {
  return db.query.meals.findFirst({ where: eq(meals.id, mealId) });
}

export async function setGoal(g: { kcal: number; protein: number; carbs: number; fat: number }) {
  await db.insert(goals).values({ ...g, effectiveFrom: dayKey() });
}

export async function logWeight(kg: number, date = dayKey()) {
  await db
    .insert(weights)
    .values({ date, kg })
    .onConflictDoUpdate({ target: weights.date, set: { kg } });
}

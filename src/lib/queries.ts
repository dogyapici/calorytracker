import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, max, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, favorites, foods, profiles, recipeIngredients, savedMealItems, savedMeals, weights, type Food } from "@/db/schema";
import { today } from "./dates";
import { fetchProduct, type OffFood } from "./off";
import { computeStreak } from "./streak";

export async function getProfile(userId: number) {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  if (row) return row;
  const [created] = await db.insert(profiles).values({ userId }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(profiles).where(eq(profiles.userId, userId)))[0];
}

/** A food the user may see: shared imports or their own custom foods. */
export async function getVisibleFood(userId: number, foodId: number): Promise<Food | null> {
  const [row] = await db
    .select()
    .from(foods)
    .where(and(eq(foods.id, foodId), or(isNull(foods.ownerId), eq(foods.ownerId, userId))));
  return row ?? null;
}

export async function upsertOffFood(food: OffFood): Promise<Food> {
  const values = { ...food, source: "off" as const, ownerId: null, updatedAt: new Date() };
  const [row] = await db
    .insert(foods)
    .values(values)
    .onConflictDoUpdate({ target: foods.barcode, set: values })
    .returning();
  return row;
}

export async function findFoodByBarcode(barcode: string) {
  const [row] = await db.select().from(foods).where(eq(foods.barcode, barcode));
  return row ?? null;
}

export async function searchLocalFoods(userId: number, query: string, limit = 15) {
  const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return db
    .select()
    .from(foods)
    .where(
      and(
        or(isNull(foods.ownerId), eq(foods.ownerId, userId)),
        or(ilike(foods.name, pattern), ilike(foods.brand, pattern)),
      ),
    )
    .orderBy(desc(sql`${foods.ownerId} is not null`), asc(foods.name))
    .limit(limit);
}

export async function getRecentFoods(userId: number, limit = 15) {
  const recent = db
    .select({ foodId: entries.foodId, lastUsed: max(entries.createdAt).as("last_used") })
    .from(entries)
    .where(eq(entries.userId, userId))
    .groupBy(entries.foodId)
    .as("recent");
  return db
    .select({ food: foods })
    .from(recent)
    .innerJoin(foods, eq(foods.id, recent.foodId))
    .orderBy(desc(recent.lastUsed))
    .limit(limit)
    .then((rows) => rows.map((r) => r.food));
}

export async function getFavoriteFoods(userId: number) {
  return db
    .select({ food: foods })
    .from(favorites)
    .innerJoin(foods, eq(foods.id, favorites.foodId))
    .where(eq(favorites.userId, userId))
    .orderBy(asc(foods.name))
    .then((rows) => rows.map((r) => r.food));
}

export async function isFavorite(userId: number, foodId: number) {
  const [row] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.foodId, foodId)));
  return Boolean(row);
}

export async function getEntriesForDay(userId: number, day: string) {
  return db
    .select()
    .from(entries)
    .where(and(eq(entries.userId, userId), eq(entries.day, day)))
    .orderBy(asc(entries.createdAt));
}

export async function getDailyTotals(userId: number, from: string, to: string) {
  return db
    .select({
      day: entries.day,
      kcal: sql<number>`sum(${entries.kcal})`.mapWith(Number),
      protein: sql<number>`sum(${entries.protein})`.mapWith(Number),
      carbs: sql<number>`sum(${entries.carbs})`.mapWith(Number),
      fat: sql<number>`sum(${entries.fat})`.mapWith(Number),
    })
    .from(entries)
    .where(and(eq(entries.userId, userId), gte(entries.day, from), lte(entries.day, to)))
    .groupBy(entries.day)
    .orderBy(asc(entries.day));
}

export async function getWeights(userId: number, limit = 365) {
  return db
    .select()
    .from(weights)
    .where(eq(weights.userId, userId))
    .orderBy(desc(weights.day))
    .limit(limit);
}

export async function getLatestWeight(userId: number) {
  const [row] = await getWeights(userId, 1);
  return row ?? null;
}

export async function getRecipes(userId: number) {
  return db
    .select()
    .from(foods)
    .where(and(eq(foods.ownerId, userId), eq(foods.source, "recipe")))
    .orderBy(asc(foods.name));
}

/** A recipe owned by the user with its ingredients in order, or null. */
export async function getRecipe(userId: number, recipeId: number) {
  const [recipe] = await db
    .select()
    .from(foods)
    .where(and(eq(foods.id, recipeId), eq(foods.ownerId, userId), eq(foods.source, "recipe")));
  if (!recipe) return null;
  const ingredients = await db
    .select({ grams: recipeIngredients.grams, food: foods })
    .from(recipeIngredients)
    .innerJoin(foods, eq(foods.id, recipeIngredients.foodId))
    .where(eq(recipeIngredients.recipeId, recipeId))
    .orderBy(asc(recipeIngredients.position));
  return { recipe, ingredients };
}

/**
 * Food for a barcode: from our cache, or fetched from Open Food Facts and cached.
 * Cached products from before micronutrients were stored are refreshed once.
 * Returns null if unknown; throws if Open Food Facts is unreachable and nothing is cached.
 */
export async function getOrImportBarcode(barcode: string): Promise<Food | null> {
  const cached = await findFoodByBarcode(barcode);
  if (cached && (cached.micros || cached.source !== "off")) return cached;
  try {
    const product = await fetchProduct(barcode);
    return product ? await upsertOffFood(product) : cached;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

/** Saved meals of a user with their foods, newest first. */
export async function getSavedMeals(userId: number) {
  const meals = await db
    .select()
    .from(savedMeals)
    .where(eq(savedMeals.userId, userId))
    .orderBy(desc(savedMeals.createdAt));
  if (!meals.length) return [];
  const items = await db
    .select({ savedMealId: savedMealItems.savedMealId, grams: savedMealItems.grams, food: foods })
    .from(savedMealItems)
    .innerJoin(foods, eq(foods.id, savedMealItems.foodId))
    .where(inArray(savedMealItems.savedMealId, meals.map((m) => m.id)))
    .orderBy(asc(savedMealItems.position));
  return meals.map((m) => {
    const own = items.filter((i) => i.savedMealId === m.id);
    return { ...m, items: own, kcal: own.reduce((s, i) => s + (i.food.kcal * i.grams) / 100, 0) };
  });
}

export async function getStreak(userId: number) {
  const rows = await db
    .selectDistinct({ day: entries.day })
    .from(entries)
    .where(eq(entries.userId, userId))
    .orderBy(desc(entries.day))
    .limit(1000);
  return computeStreak(
    rows.map((r) => r.day),
    today(),
  );
}

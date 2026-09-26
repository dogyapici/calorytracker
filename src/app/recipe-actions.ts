"use server";

import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { foods, recipeIngredients, type Food } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { computeRecipe } from "@/lib/nutrition";
import { searchProducts } from "@/lib/off";
import { getOrImportBarcode, searchLocalFoods } from "@/lib/queries";
import type { FormState } from "./actions";

/** What the recipe editor needs to know about an ingredient candidate. */
export type IngredientOption = {
  foodId: number | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  servingGrams: number | null;
};

function toOption(f: Food): IngredientOption {
  return {
    foodId: f.id,
    barcode: f.barcode,
    name: f.name,
    brand: f.brand,
    kcal: f.kcal,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    servingGrams: f.servingGrams,
  };
}

export async function searchIngredients(query: string): Promise<{ items: IngredientOption[]; remoteError: boolean }> {
  const user = await requireUser();
  const q = query.trim().slice(0, 100);
  if (!q) return { items: [], remoteError: false };

  if (/^\d{8,14}$/.test(q)) {
    const food = await importBarcode(q);
    return { items: food ? [food] : [], remoteError: false };
  }

  let remoteError = false;
  const [local, remote] = await Promise.all([
    searchLocalFoods(user.id, q, 10),
    searchProducts(q, 15).catch(() => {
      remoteError = true;
      return [];
    }),
  ]);
  const known = new Set(local.map((f) => f.barcode));
  const items = [
    ...local.map(toOption),
    ...remote
      .filter((f) => !known.has(f.barcode))
      .map((f) => ({ ...f, foodId: null, servingGrams: f.servingGrams })),
  ];
  return { items, remoteError };
}

/** Looks up a barcode locally or in Open Food Facts and caches it; null if unknown. */
export async function importBarcode(barcode: string): Promise<IngredientOption | null> {
  await requireUser();
  if (!/^\d{4,14}$/.test(barcode)) return null;
  const food = await getOrImportBarcode(barcode).catch(() => null);
  return food ? toOption(food) : null;
}

const recipeSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1, "Bitte gib dem Rezept einen Namen.").max(120),
  servings: z.coerce.number().int().min(1, "Mindestens 1 Portion.").max(100),
  cookedGrams: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.replace(",", ".") : v),
    z.coerce.number().positive().max(50_000).optional(),
  ),
  ingredients: z
    .array(z.object({ foodId: z.number().int().positive(), grams: z.number().positive().max(20_000) }))
    .min(1, "Füge mindestens eine Zutat hinzu.")
    .max(60),
  day: z.string().optional(),
  meal: z.string().optional(),
});

export async function saveRecipe(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  let ingredients: unknown;
  try {
    ingredients = JSON.parse(String(formData.get("ingredients") ?? "[]"));
  } catch {
    ingredients = [];
  }
  const parsed = recipeSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    servings: formData.get("servings"),
    cookedGrams: formData.get("cookedGrams") ?? "",
    ingredients,
    day: formData.get("day") ?? undefined,
    meal: formData.get("meal") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (d.id) {
    const [own] = await db
      .select({ id: foods.id })
      .from(foods)
      .where(and(eq(foods.id, d.id), eq(foods.ownerId, user.id), eq(foods.source, "recipe")));
    if (!own) return { error: "Rezept nicht gefunden." };
  }

  // Nutrients always come from the database, never from the client.
  const ids = [...new Set(d.ingredients.map((i) => i.foodId))];
  const rows = await db
    .select()
    .from(foods)
    .where(and(inArray(foods.id, ids), or(isNull(foods.ownerId), eq(foods.ownerId, user.id))));
  const byId = new Map(rows.map((f) => [f.id, f]));
  if (d.ingredients.some((i) => !byId.has(i.foodId) || i.foodId === d.id)) {
    return { error: "Eine Zutat ist nicht mehr verfügbar. Bitte entferne sie." };
  }

  const r = computeRecipe(
    d.ingredients.map((i) => ({ per100: byId.get(i.foodId)!, grams: i.grams })),
    d.servings,
    d.cookedGrams,
  );
  const values = {
    source: "recipe" as const,
    ownerId: user.id,
    name: d.name,
    brand: null,
    ...r.per100,
    servingGrams: Math.round(r.servingGrams * 10) / 10,
    servingLabel: null,
    recipeServings: d.servings,
    recipeCookedGrams: d.cookedGrams ?? null,
    updatedAt: new Date(),
  };

  const recipeId = await db.transaction(async (tx) => {
    let id = d.id;
    if (id) {
      await tx.update(foods).set(values).where(eq(foods.id, id));
      await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
    } else {
      [{ id }] = await tx.insert(foods).values(values).returning({ id: foods.id });
    }
    await tx
      .insert(recipeIngredients)
      .values(d.ingredients.map((i, position) => ({ recipeId: id!, foodId: i.foodId, grams: i.grams, position })));
    return id!;
  });

  revalidatePath("/recipes");
  revalidatePath("/add");
  const qs = new URLSearchParams({ day: dayOrToday(d.day), meal: d.meal ?? "snack" });
  redirect(`/food/${recipeId}?${qs}`);
}

"use server";

import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { entries, foods, savedMealItems, savedMeals } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { dayOrToday, isIsoDay } from "@/lib/dates";
import { scaleFood } from "@/lib/nutrition";
import { getSavedMeals } from "@/lib/queries";
import type { FormState } from "./actions";

const meal = z.enum(["breakfast", "lunch", "dinner", "snack"]);

/** Saves the foods of one diary meal as a reusable meal. */
export async function saveMealFromDiary(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Bitte gib der Mahlzeit einen Namen.").max(80),
      day: z.string().refine(isIsoDay),
      meal,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, day, meal: m } = parsed.data;

  const source = await db
    .select({ foodId: entries.foodId, grams: entries.grams })
    .from(entries)
    .where(and(eq(entries.userId, user.id), eq(entries.day, day), eq(entries.meal, m), isNotNull(entries.foodId)))
    .orderBy(entries.createdAt);
  if (!source.length) return { error: "Diese Mahlzeit enthält keine Lebensmittel, die gespeichert werden können." };

  await db.transaction(async (tx) => {
    const [saved] = await tx.insert(savedMeals).values({ userId: user.id, name }).returning({ id: savedMeals.id });
    await tx
      .insert(savedMealItems)
      .values(source.map((s, position) => ({ savedMealId: saved.id, foodId: s.foodId!, grams: s.grams, position })));
  });
  revalidatePath("/add");
  redirect(`/?day=${day}`);
}

/** Logs every food of a saved meal into the given day and meal. */
export async function logSavedMeal(formData: FormData) {
  const user = await requireUser();
  const parsed = z
    .object({ id: z.coerce.number().int().positive(), day: z.string().refine(isIsoDay), meal })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { id, day, meal: m } = parsed.data;

  const saved = (await getSavedMeals(user.id)).find((s) => s.id === id);
  if (!saved || !saved.items.length) return;
  await db.insert(entries).values(
    saved.items.map(({ food, grams }) => ({
      userId: user.id,
      day,
      meal: m,
      foodId: food.id,
      name: food.brand ? `${food.name} (${food.brand})` : food.name,
      grams,
      ...scaleFood(food, grams),
    })),
  );
  revalidatePath("/");
  redirect(`/?day=${day}`);
}

export async function deleteSavedMeal(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  await db.delete(savedMeals).where(and(eq(savedMeals.id, id), eq(savedMeals.userId, user.id)));
  revalidatePath("/meals");
  revalidatePath("/add");
}


const mealSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1, "Bitte gib der Mahlzeit einen Namen.").max(80),
  items: z
    .array(z.object({ foodId: z.number().int().positive(), grams: z.number().positive("Jedes Lebensmittel braucht eine Menge über 0 g.").max(5000) }))
    .min(1, "Füge mindestens ein Lebensmittel hinzu.")
    .max(40),
  day: z.string().optional(),
  meal: meal.optional(),
});

/** Creates or updates a saved meal from foods picked in the meal editor. */
export async function saveMeal(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    items = [];
  }
  const parsed = mealSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    items,
    day: formData.get("day") ?? undefined,
    meal: formData.get("meal") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (d.id) {
    const [own] = await db.select({ id: savedMeals.id }).from(savedMeals).where(and(eq(savedMeals.id, d.id), eq(savedMeals.userId, user.id)));
    if (!own) return { error: "Mahlzeit nicht gefunden." };
  }
  const ids = [...new Set(d.items.map((i) => i.foodId))];
  const visible = await db
    .select({ id: foods.id })
    .from(foods)
    .where(and(inArray(foods.id, ids), or(isNull(foods.ownerId), eq(foods.ownerId, user.id))));
  if (visible.length !== ids.length) return { error: "Ein Lebensmittel ist nicht mehr verfügbar. Bitte entferne es." };

  await db.transaction(async (tx) => {
    let id = d.id;
    if (id) {
      await tx.update(savedMeals).set({ name: d.name }).where(eq(savedMeals.id, id));
      await tx.delete(savedMealItems).where(eq(savedMealItems.savedMealId, id));
    } else {
      [{ id }] = await tx.insert(savedMeals).values({ userId: user.id, name: d.name }).returning({ id: savedMeals.id });
    }
    await tx.insert(savedMealItems).values(d.items.map((i, position) => ({ savedMealId: id!, foodId: i.foodId, grams: i.grams, position })));
  });
  revalidatePath("/meals");
  revalidatePath("/add");
  redirect(`/meals?${new URLSearchParams({ day: dayOrToday(d.day), meal: d.meal ?? "breakfast" })}`);
}

"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { entries, savedMealItems, savedMeals } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isIsoDay } from "@/lib/dates";
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


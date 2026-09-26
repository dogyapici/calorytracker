"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { profiles, water } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isIsoDay } from "@/lib/dates";
import { checkMealSplit, MEALS, type MealKey } from "@/lib/nutrition";
import type { FormState } from "./actions";

/** Adds (or with a negative amount removes) water for a day; the total never drops below 0. */
export async function addWater(day: string, deltaMl: number) {
  const user = await requireUser();
  if (!isIsoDay(day) || !Number.isInteger(deltaMl) || Math.abs(deltaMl) > 2000) return;
  await db
    .insert(water)
    .values({ userId: user.id, day, ml: Math.max(0, deltaMl) })
    .onConflictDoUpdate({ target: [water.userId, water.day], set: { ml: sql`greatest(0, ${water.ml} + ${deltaMl})` } });
  revalidatePath("/");
  revalidatePath("/calendar");
}

const percent = z.preprocess((v) => (typeof v === "string" ? v.trim().replace(",", ".") : v), z.coerce.number().finite());

export async function saveTrackingGoals(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const waterTargetMl = z.coerce.number().int().min(500, "Das Wasserziel muss mindestens 500 ml sein.").max(6000, "Das Wasserziel darf höchstens 6.000 ml sein.").safeParse(formData.get("waterTargetMl"));
  if (!waterTargetMl.success) return { error: waterTargetMl.error.issues[0].message };

  const mealSplit = {} as Record<MealKey, number>;
  for (const m of MEALS) {
    const v = percent.safeParse(formData.get(`split_${m.key}`));
    if (!v.success) return { error: "Bitte gib für jede Mahlzeit einen Anteil in Prozent an." };
    mealSplit[m.key] = v.data;
  }
  const check = checkMealSplit(mealSplit);
  if (!check.ok) return { error: check.error };

  const values = { mealSplit, waterTargetMl: waterTargetMl.data };
  await db.insert(profiles).values({ userId: user.id, ...values }).onConflictDoUpdate({ target: profiles.userId, set: values });
  revalidatePath("/", "layout");
  return { ok: "Gespeichert." };
}

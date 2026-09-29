"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { workoutCategories, workoutExercises, workoutLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isIsoDay } from "@/lib/dates";
import { parseDecimal, weekStart } from "@/lib/training";
import { getCategory, getExercise } from "@/lib/training-queries";
import type { FormState } from "./actions";

const id = z.coerce.number().int().positive();
const name = (what: string) => z.string().trim().min(1, `Bitte gib ${what} einen Namen.`).max(60, "Der Name darf höchstens 60 Zeichen lang sein.");

export async function createCategory(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = name("der Kategorie").safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const [{ last }] = await db.select({ last: max(workoutCategories.position) }).from(workoutCategories).where(eq(workoutCategories.userId, user.id));
  const [created] = await db
    .insert(workoutCategories)
    .values({ userId: user.id, name: parsed.data, position: (last ?? -1) + 1 })
    .returning({ id: workoutCategories.id });
  revalidatePath("/training");
  redirect(`/training/${created.id}`);
}

export async function renameCategory(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z.object({ id, name: name("der Kategorie") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db
    .update(workoutCategories)
    .set({ name: parsed.data.name })
    .where(and(eq(workoutCategories.id, parsed.data.id), eq(workoutCategories.userId, user.id)));
  revalidatePath("/training", "layout");
  return { ok: "Gespeichert." };
}

export async function deleteCategory(formData: FormData) {
  const user = await requireUser();
  const parsed = id.safeParse(formData.get("id"));
  if (!parsed.success) return;
  await db.delete(workoutCategories).where(and(eq(workoutCategories.id, parsed.data), eq(workoutCategories.userId, user.id)));
  revalidatePath("/training");
  redirect("/training");
}

/** Adds an exercise to a category; used by the name field and by the suggestion chips. */
export async function addExercise(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z.object({ categoryId: id, name: name("der Übung") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await getCategory(user.id, parsed.data.categoryId))) return { error: "Kategorie nicht gefunden." };
  const [{ last }] = await db
    .select({ last: max(workoutExercises.position) })
    .from(workoutExercises)
    .where(eq(workoutExercises.categoryId, parsed.data.categoryId));
  await db.insert(workoutExercises).values({ userId: user.id, categoryId: parsed.data.categoryId, name: parsed.data.name, position: (last ?? -1) + 1 });
  revalidatePath(`/training/${parsed.data.categoryId}`);
  revalidatePath("/training");
  return { ok: `„${parsed.data.name}“ hinzugefügt.` };
}

export async function deleteExercise(formData: FormData) {
  const user = await requireUser();
  const parsed = id.safeParse(formData.get("id"));
  if (!parsed.success) return;
  const found = await getExercise(user.id, parsed.data);
  if (!found) return;
  await db.delete(workoutExercises).where(and(eq(workoutExercises.id, parsed.data), eq(workoutExercises.userId, user.id)));
  revalidatePath("/training", "layout");
  redirect(`/training/${found.category.id}`);
}

/** Saves weight, reps and sets of one exercise for one week; a second entry for the same week replaces it. */
export async function logWorkout(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const exerciseId = id.safeParse(formData.get("exerciseId"));
  const week = formData.get("week");
  if (!exerciseId.success || !isIsoDay(week)) return { error: "Ungültige Eingabe." };
  const weightKg = parseDecimal(formData.get("weightKg"));
  if (!(weightKg >= 0 && weightKg <= 1000)) return { error: "Bitte gib ein Gewicht zwischen 0 und 1.000 kg an." };
  const reps = Number(formData.get("reps"));
  if (!Number.isInteger(reps) || reps < 1 || reps > 500) return { error: "Bitte gib die Wiederholungen als ganze Zahl an." };
  const setsText = String(formData.get("sets") ?? "").trim();
  const sets = setsText === "" ? null : Number(setsText);
  if (sets !== null && (!Number.isInteger(sets) || sets < 1 || sets > 50)) return { error: "Bitte gib die Sätze als ganze Zahl an." };
  if (!(await getExercise(user.id, exerciseId.data))) return { error: "Übung nicht gefunden." };

  const values = { weightKg: Math.round(weightKg * 100) / 100, reps, sets, updatedAt: new Date() };
  await db
    .insert(workoutLogs)
    .values({ userId: user.id, exerciseId: exerciseId.data, week: weekStart(week), ...values })
    .onConflictDoUpdate({ target: [workoutLogs.exerciseId, workoutLogs.week], set: values });
  revalidatePath("/training", "layout");
  return { ok: "Eingetragen." };
}

export async function deleteLog(formData: FormData) {
  const user = await requireUser();
  const exerciseId = id.safeParse(formData.get("exerciseId"));
  const week = formData.get("week");
  if (!exerciseId.success || !isIsoDay(week)) return;
  await db
    .delete(workoutLogs)
    .where(and(eq(workoutLogs.exerciseId, exerciseId.data), eq(workoutLogs.week, week), eq(workoutLogs.userId, user.id)));
  revalidatePath("/training", "layout");
}

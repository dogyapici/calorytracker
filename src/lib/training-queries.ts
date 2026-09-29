import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { workoutCategories, workoutExercises, workoutLogs } from "@/db/schema";
import { exerciseProgress } from "./training";

/** The user's categories with their exercise count and the last week anything was logged in them. */
export async function getCategories(userId: number) {
  const [categories, exercises, logs] = await Promise.all([
    db.select().from(workoutCategories).where(eq(workoutCategories.userId, userId)).orderBy(asc(workoutCategories.position), asc(workoutCategories.id)),
    db.select({ id: workoutExercises.id, categoryId: workoutExercises.categoryId }).from(workoutExercises).where(eq(workoutExercises.userId, userId)),
    db.select({ exerciseId: workoutLogs.exerciseId, week: workoutLogs.week }).from(workoutLogs).where(eq(workoutLogs.userId, userId)),
  ]);
  const categoryOf = new Map(exercises.map((e) => [e.id, e.categoryId]));
  return categories.map((c) => {
    const weeks = logs.filter((l) => categoryOf.get(l.exerciseId) === c.id).map((l) => l.week);
    return {
      ...c,
      exerciseCount: exercises.filter((e) => e.categoryId === c.id).length,
      lastWeek: weeks.length ? weeks.reduce((a, b) => (a > b ? a : b)) : null,
    };
  });
}

export async function getCategory(userId: number, id: number) {
  const [row] = await db.select().from(workoutCategories).where(and(eq(workoutCategories.id, id), eq(workoutCategories.userId, userId)));
  return row ?? null;
}

/** Exercises of a category, each with its progress over the logged weeks. */
export async function getCategoryExercises(userId: number, categoryId: number) {
  const exercises = await db
    .select()
    .from(workoutExercises)
    .where(and(eq(workoutExercises.categoryId, categoryId), eq(workoutExercises.userId, userId)))
    .orderBy(asc(workoutExercises.position), asc(workoutExercises.id));
  const logs = exercises.length
    ? await db
        .select()
        .from(workoutLogs)
        .where(inArray(workoutLogs.exerciseId, exercises.map((e) => e.id)))
    : [];
  return exercises.map((e) => ({ ...e, progress: exerciseProgress(logs.filter((l) => l.exerciseId === e.id)) }));
}

export async function getExercise(userId: number, id: number) {
  const [row] = await db
    .select({ exercise: workoutExercises, category: workoutCategories })
    .from(workoutExercises)
    .innerJoin(workoutCategories, eq(workoutCategories.id, workoutExercises.categoryId))
    .where(and(eq(workoutExercises.id, id), eq(workoutExercises.userId, userId)));
  return row ?? null;
}

/** Logged weeks of an exercise, newest first. */
export async function getExerciseLogs(userId: number, exerciseId: number) {
  return db
    .select()
    .from(workoutLogs)
    .where(and(eq(workoutLogs.exerciseId, exerciseId), eq(workoutLogs.userId, userId)))
    .orderBy(desc(workoutLogs.week));
}

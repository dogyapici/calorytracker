"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { entries, favorites, foods, profiles, users, weights } from "@/db/schema";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { dayOrToday, isIsoDay, today } from "@/lib/dates";
import { scaleFood } from "@/lib/nutrition";
import { scaleMicros } from "@/lib/micros";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getLatestWeight, getVisibleFood } from "@/lib/queries";

// `values` echoes submitted fields back so a form keeps its input after a validation error
// (React resets uncontrolled forms after every action).
export type FormState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

const meal = z.enum(["breakfast", "lunch", "dinner", "snack"]);
// Accepts German decimal commas ("12,5").
const decimal = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().replace(",", ".") : v),
  z.coerce.number().finite(),
);
const optionalDecimal = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  decimal.pipe(z.number().min(0)).optional(),
);

function formObject(formData: FormData) {
  return Object.fromEntries(Array.from(formData.entries()).filter(([k]) => !k.startsWith("$ACTION")));
}

function fail(error: string, formData: FormData, omit: string[] = ["password"]): FormState {
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$ACTION") && !omit.includes(k)) values[k] = v;
  }
  return { error, values };
}

// ---------- Accounts ----------

const registerSchema = z.object({
  name: z.string().trim().min(1, "Bitte gib deinen Namen ein.").max(60),
  email: z.string().trim().toLowerCase().email("Bitte gib eine gültige E-Mail-Adresse ein."),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen haben.").max(200),
  invite: z.string().trim(),
});

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail(parsed.error.issues[0].message, formData);
  const expected = process.env.INVITE_CODE;
  if (!expected || parsed.data.invite !== expected) return fail("Der Einladungscode stimmt nicht.", formData, ["password", "invite"]);

  const [user] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
    })
    .onConflictDoNothing()
    .returning({ id: users.id });
  if (!user) return fail("Für diese E-Mail-Adresse gibt es schon ein Konto.", formData);

  await db.insert(profiles).values({ userId: user.id }).onConflictDoNothing();
  await createSession(user.id);
  redirect("/profile?welcome=1");
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail("E-Mail oder Passwort ist falsch.", formData);
  }
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ---------- Diary ----------

const addEntrySchema = z.object({
  foodId: z.coerce.number().int().positive(),
  day: z.string().refine(isIsoDay),
  meal,
  grams: decimal.pipe(z.number().positive().max(5000)),
});

export async function addEntry(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = addEntrySchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "Bitte gib eine gültige Menge ein." };
  const { foodId, day, meal: m, grams } = parsed.data;

  const food = await getVisibleFood(user.id, foodId);
  if (!food) return { error: "Lebensmittel nicht gefunden." };

  const n = scaleFood(food, grams);
  await db.insert(entries).values({
    userId: user.id,
    day,
    meal: m,
    foodId: food.id,
    name: food.brand ? `${food.name} (${food.brand})` : food.name,
    grams,
    ...n,
  });
  revalidatePath("/");
  redirect(`/?day=${day}`);
}

const updateEntrySchema = z.object({
  id: z.coerce.number().int().positive(),
  meal,
  grams: decimal.pipe(z.number().positive().max(5000)),
});

export async function updateEntry(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = updateEntrySchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "Bitte gib eine gültige Menge ein." };
  const { id, meal: m, grams } = parsed.data;

  const [entry] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, user.id)));
  if (!entry) return { error: "Eintrag nicht gefunden." };

  // Rescale the stored snapshot so edits work even if the food was deleted.
  const factor = grams / entry.grams;
  const opt = (v: number | null) => (v === null ? null : v * factor);
  await db
    .update(entries)
    .set({
      meal: m,
      grams,
      kcal: entry.kcal * factor,
      protein: entry.protein * factor,
      carbs: entry.carbs * factor,
      fat: entry.fat * factor,
      sugar: opt(entry.sugar),
      saturatedFat: opt(entry.saturatedFat),
      fiber: opt(entry.fiber),
      salt: opt(entry.salt),
      micros: scaleMicros(entry.micros, factor),
    })
    .where(eq(entries.id, id));
  revalidatePath("/");
  redirect(`/?day=${entry.day}`);
}

export async function deleteEntry(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const [deleted] = await db
    .delete(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, user.id)))
    .returning({ day: entries.day });
  revalidatePath("/");
  redirect(`/?day=${deleted?.day ?? dayOrToday(null)}`);
}

export async function copyMeal(formData: FormData) {
  const user = await requireUser();
  const parsed = z
    .object({ from: z.string().refine(isIsoDay), to: z.string().refine(isIsoDay), meal })
    .safeParse(formObject(formData));
  if (!parsed.success) return;
  const { from, to, meal: m } = parsed.data;

  const source = await db
    .select()
    .from(entries)
    .where(and(eq(entries.userId, user.id), eq(entries.day, from), eq(entries.meal, m)));
  if (source.length) {
    await db.insert(entries).values(
      source.map(({ id: _id, createdAt: _createdAt, ...e }) => ({ ...e, day: to })),
    );
  }
  revalidatePath("/");
}

// ---------- Foods ----------

export async function toggleFavorite(formData: FormData) {
  const user = await requireUser();
  const foodId = Number(formData.get("foodId"));
  const food = await getVisibleFood(user.id, foodId);
  if (!food) return;
  const removed = await db
    .delete(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.foodId, foodId)))
    .returning();
  if (!removed.length) await db.insert(favorites).values({ userId: user.id, foodId });
  revalidatePath(`/food/${foodId}`);
  revalidatePath("/add");
}

const customFoodSchema = z.object({
  name: z.string().trim().min(1, "Bitte gib einen Namen ein.").max(120),
  brand: z.string().trim().max(80).optional(),
  kcal: decimal.pipe(z.number().min(0, "Kalorien dürfen nicht negativ sein.").max(950, "Mehr als 950 kcal pro 100 g ist nicht möglich.")),
  protein: optionalDecimal,
  carbs: optionalDecimal,
  sugar: optionalDecimal,
  fat: optionalDecimal,
  fiber: optionalDecimal,
  salt: optionalDecimal,
  servingGrams: optionalDecimal,
  servingLabel: z.string().trim().max(40).optional(),
  day: z.string().optional(),
  meal: meal.optional(),
});

export async function createCustomFood(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = customFoodSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail(parsed.error.issues[0].message, formData, []);
  const d = parsed.data;

  const [food] = await db
    .insert(foods)
    .values({
      source: "custom",
      ownerId: user.id,
      name: d.name,
      brand: d.brand || null,
      kcal: d.kcal,
      protein: d.protein ?? 0,
      carbs: d.carbs ?? 0,
      sugar: d.sugar ?? null,
      fat: d.fat ?? 0,
      fiber: d.fiber ?? null,
      salt: d.salt ?? null,
      servingGrams: d.servingGrams || null,
      servingLabel: d.servingGrams ? d.servingLabel || null : null,
    })
    .returning({ id: foods.id });

  const qs = new URLSearchParams({ day: dayOrToday(d.day), meal: d.meal ?? "snack" });
  redirect(`/food/${food.id}?${qs}`);
}

export async function deleteCustomFood(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("foodId"));
  await db.delete(foods).where(and(eq(foods.id, id), eq(foods.ownerId, user.id)));
  revalidatePath("/add");
  redirect("/add");
}

// ---------- Profile & weight ----------

const profileSchema = z.object({
  name: z.string().trim().min(1).max(60),
  sex: z.enum(["male", "female"]).optional(),
  birthYear: z.coerce.number().int().min(1900).max(2030).optional(),
  heightCm: optionalDecimal,
  activityFactor: decimal.pipe(z.number().min(1).max(2.5)),
  goal: z.enum(["lose", "maintain", "gain"]),
  kcalTarget: z.coerce.number().int().min(800, "Das Kalorienziel ist zu niedrig.").max(8000),
  proteinTarget: z.coerce.number().int().min(0).max(600),
  carbsTarget: z.coerce.number().int().min(0).max(1500),
  fatTarget: z.coerce.number().int().min(0).max(600),
  weightKg: optionalDecimal.pipe(z.number().min(20).max(400).optional()),
});

export async function saveProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formObject(formData);
  for (const key of ["sex", "birthYear"]) if (raw[key] === "") delete raw[key];
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, weightKg, ...profile } = parsed.data;

  // Only log a weight when it changed, so saving the profile does not add a new data point each day.
  const latest = await getLatestWeight(user.id);
  if (weightKg && weightKg !== latest?.kg) {
    await db
      .insert(weights)
      .values({ userId: user.id, day: today(), kg: weightKg })
      .onConflictDoUpdate({ target: [weights.userId, weights.day], set: { kg: weightKg } });
  }

  await db.update(users).set({ name }).where(eq(users.id, user.id));
  await db
    .insert(profiles)
    .values({ userId: user.id, ...profile })
    .onConflictDoUpdate({ target: profiles.userId, set: profile });
  revalidatePath("/", "layout");
  return { ok: "Gespeichert." };
}

const weightSchema = z.object({
  day: z.string().refine(isIsoDay, "Ungültiges Datum."),
  kg: decimal.pipe(z.number().min(20, "Bitte gib ein gültiges Gewicht ein.").max(400, "Bitte gib ein gültiges Gewicht ein.")),
});

export async function logWeight(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = weightSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail(parsed.error.issues[0].message, formData, []);
  await db
    .insert(weights)
    .values({ userId: user.id, ...parsed.data })
    .onConflictDoUpdate({ target: [weights.userId, weights.day], set: { kg: parsed.data.kg } });
  revalidatePath("/weight");
  return { ok: "Gewicht gespeichert." };
}

export async function deleteWeight(formData: FormData) {
  const user = await requireUser();
  const day = String(formData.get("day"));
  if (!isIsoDay(day)) return;
  await db.delete(weights).where(and(eq(weights.userId, user.id), eq(weights.day, day)));
  revalidatePath("/weight");
}

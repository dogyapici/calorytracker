"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { entries } from "@/db/schema";
import { AiError, estimateMeal, estimateSchema, type MealEstimate } from "@/lib/ai-estimate";
import { requireUser } from "@/lib/auth";
import { isIsoDay } from "@/lib/dates";
import { decodePhoto } from "@/lib/photo";

export type EstimateState = { error?: string; estimate?: MealEstimate } | undefined;

export async function estimateMealPhoto(_: EstimateState, formData: FormData): Promise<EstimateState> {
  await requireUser();
  const photo = formData.get("photo");
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 500);
  if (typeof photo !== "string" || !photo) return { error: "Bitte wähle zuerst ein Foto." };
  const decoded = decodePhoto(photo);
  if ("error" in decoded) return { error: decoded.error };
  try {
    return { estimate: await estimateMeal({ image: decoded.data, mimeType: decoded.mimeType, comment }) };
  } catch (e) {
    return { error: e instanceof AiError ? e.message : "Die Schätzung hat nicht geklappt. Versuche es noch einmal." };
  }
}

const addSchema = z.object({
  day: z.string().refine(isIsoDay),
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  items: z
    .string()
    .transform((s, ctx) => {
      try {
        return JSON.parse(s);
      } catch {
        ctx.addIssue({ code: "custom" });
        return z.NEVER;
      }
    })
    .pipe(estimateSchema.shape.items.min(1)),
});

export async function addEstimatedItems(_: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = addSchema.safeParse({ day: formData.get("day"), meal: formData.get("meal"), items: formData.get("items") });
  if (!parsed.success) return { error: "Bitte prüfe die Werte: Jeder Eintrag braucht einen Namen und Zahlen ab 0." };
  const { day, meal, items } = parsed.data;
  await db.insert(entries).values(
    items
      .filter((i) => i.grams > 0)
      .map((i) => ({
        userId: user.id,
        day,
        meal,
        foodId: null,
        name: i.name,
        grams: i.grams,
        kcal: i.kcal,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat,
        sugar: i.sugar ?? null,
        fiber: i.fiber ?? null,
        saturatedFat: i.saturatedFat ?? null,
        salt: i.salt ?? null,
      })),
  );
  revalidatePath("/");
  redirect(`/?day=${day}`);
}

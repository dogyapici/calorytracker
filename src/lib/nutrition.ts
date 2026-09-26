import { scaleMicros, sumMicros, type Micros } from "./micros";

export type Sex = "male" | "female";
export type Goal = "lose" | "maintain" | "gain";

export const MEALS = [
  { key: "breakfast", label: "Frühstück", emoji: "🥣" },
  { key: "lunch", label: "Mittagessen", emoji: "🥗" },
  { key: "dinner", label: "Abendessen", emoji: "🍝" },
  { key: "snack", label: "Snacks", emoji: "🍎" },
] as const;

export const ACTIVITY_LEVELS = [
  { factor: 1.2, label: "Kaum aktiv (Bürojob, wenig Bewegung)" },
  { factor: 1.375, label: "Leicht aktiv (1–3× Sport pro Woche)" },
  { factor: 1.55, label: "Mäßig aktiv (3–5× Sport pro Woche)" },
  { factor: 1.725, label: "Sehr aktiv (6–7× Sport pro Woche)" },
  { factor: 1.9, label: "Extrem aktiv (körperliche Arbeit und Sport)" },
] as const;

export const GOALS: { key: Goal; label: string; kcalDelta: number }[] = [
  { key: "lose", label: "Abnehmen (ca. 0,5 kg pro Woche)", kcalDelta: -500 },
  { key: "maintain", label: "Gewicht halten", kcalDelta: 0 },
  { key: "gain", label: "Zunehmen / Muskelaufbau", kcalDelta: 300 },
];

export type Nutrients = { kcal: number; protein: number; carbs: number; fat: number };

/** Nutrients for `grams` of a food given its values per 100 g. */
export function scaleNutrients(per100: Nutrients, grams: number): Nutrients {
  const f = grams / 100;
  return {
    kcal: per100.kcal * f,
    protein: per100.protein * f,
    carbs: per100.carbs * f,
    fat: per100.fat * f,
  };
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  return items.reduce(
    (acc, n) => ({
      kcal: acc.kcal + n.kcal,
      protein: acc.protein + n.protein,
      carbs: acc.carbs + n.carbs,
      fat: acc.fat + n.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Basal metabolic rate via Mifflin-St Jeor. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
}

export type TargetInput = {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activityFactor: number;
  goal: Goal;
};

/**
 * Suggested daily targets. Protein scales with body weight (higher when losing, to keep muscle),
 * fat is 30 % of energy, carbs fill the rest.
 */
export function suggestTargets(input: TargetInput) {
  const tdee = bmr(input.sex, input.weightKg, input.heightCm, input.age) * input.activityFactor;
  const delta = GOALS.find((g) => g.key === input.goal)?.kcalDelta ?? 0;
  const floor = input.sex === "male" ? 1500 : 1200;
  const kcal = Math.max(floor, Math.round((tdee + delta) / 10) * 10);
  const proteinPerKg = input.goal === "maintain" ? 1.6 : 2.0;
  const protein = Math.round(input.weightKg * proteinPerKg);
  const fat = Math.round((kcal * 0.3) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { tdee: Math.round(tdee), kcal, protein, carbs, fat };
}

export function round(n: number, digits = 0) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function fmt(n: number, digits = 0) {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: digits }).format(round(n, digits));
}

export type FullNutrients = Nutrients & {
  sugar: number | null;
  saturatedFat: number | null;
  fiber: number | null;
  salt: number | null;
};

const OPTIONAL_KEYS = ["sugar", "saturatedFat", "fiber", "salt"] as const;

/**
 * Per-100 g values of a recipe from its ingredients. `cookedGrams` is the weighed result after
 * cooking (water loss or gain); without it the raw ingredient weight is used. An optional nutrient
 * is reported only if at least one ingredient knows it.
 */
export function computeRecipe(
  ingredients: { per100: FullNutrients & { micros?: Micros | null }; grams: number }[],
  servings: number,
  cookedGrams?: number | null,
) {
  const rawGrams = ingredients.reduce((s, i) => s + i.grams, 0);
  const totalGrams = cookedGrams && cookedGrams > 0 ? cookedGrams : rawGrams;
  const total = sumNutrients(ingredients.map((i) => scaleNutrients(i.per100, i.grams)));
  const f = totalGrams > 0 ? 100 / totalGrams : 0;

  const per100: FullNutrients = {
    kcal: total.kcal * f,
    protein: total.protein * f,
    carbs: total.carbs * f,
    fat: total.fat * f,
    sugar: null,
    saturatedFat: null,
    fiber: null,
    salt: null,
  };
  for (const key of OPTIONAL_KEYS) {
    const known = ingredients.filter((i) => i.per100[key] !== null);
    if (known.length) per100[key] = known.reduce((s, i) => s + (i.per100[key] as number) * (i.grams / 100), 0) * f;
  }

  const micros = scaleMicros(
    sumMicros(ingredients.map((i) => scaleMicros(i.per100.micros, i.grams / 100))),
    f,
  );

  return {
    per100: { ...per100, micros },
    total,
    totalGrams,
    servingGrams: servings > 0 ? totalGrams / servings : totalGrams,
  };
}

/** Everything an entry stores, scaled from a food's per-100 g values to `grams`. */
export function scaleFood(food: FullNutrients & { micros?: Micros | null }, grams: number) {
  const f = grams / 100;
  const opt = (v: number | null) => (v === null ? null : v * f);
  return {
    ...scaleNutrients(food, grams),
    sugar: opt(food.sugar),
    saturatedFat: opt(food.saturatedFat),
    fiber: opt(food.fiber),
    salt: opt(food.salt),
    micros: scaleMicros(food.micros, f),
  };
}

// ---------- Macro targets ----------

export type MacroMode = "percent" | "grams";
export type Macros = { protein: number; carbs: number; fat: number };

export const KCAL_PER_GRAM: Macros = { protein: 4, carbs: 4, fat: 9 };

export function kcalFromMacros(g: Macros) {
  return g.protein * KCAL_PER_GRAM.protein + g.carbs * KCAL_PER_GRAM.carbs + g.fat * KCAL_PER_GRAM.fat;
}

export function gramsFromPercent(kcal: number, pct: Macros): Macros {
  return {
    protein: Math.round((kcal * pct.protein) / 100 / KCAL_PER_GRAM.protein),
    carbs: Math.round((kcal * pct.carbs) / 100 / KCAL_PER_GRAM.carbs),
    fat: Math.round((kcal * pct.fat) / 100 / KCAL_PER_GRAM.fat),
  };
}

export function percentFromGrams(g: Macros): Macros {
  const total = kcalFromMacros(g);
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  const pct = (k: keyof Macros) => Math.round(((g[k] * KCAL_PER_GRAM[k]) / total) * 1000) / 10;
  return { protein: pct("protein"), carbs: pct("carbs"), fat: pct("fat") };
}

/** How far gram targets may miss the calorie target (rounding to whole grams alone can cost ~8 kcal). */
export function macroTolerance(kcal: number) {
  return Math.max(15, kcal * 0.01);
}

export type MacroCheck =
  | { ok: true; grams: Macros; percent: Macros }
  | { ok: false; error: string };

/**
 * Validates macro targets against the calorie target and returns both representations.
 * Percent mode: the three shares must add up to 100 %. Gram mode: the grams must add up to the
 * calorie target (within rounding tolerance). Either way the stored grams always match the kcal.
 */
export function checkMacros(kcal: number, mode: MacroMode, values: Macros): MacroCheck {
  const nums = [values.protein, values.carbs, values.fat];
  if (!(kcal > 0)) return { ok: false, error: "Bitte gib zuerst ein gültiges Kalorienziel ein." };
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) {
    return { ok: false, error: "Makroziele dürfen nicht negativ oder leer sein." };
  }

  if (mode === "percent") {
    const sum = values.protein + values.carbs + values.fat;
    if (Math.abs(sum - 100) > 0.5) {
      return { ok: false, error: `Die Anteile ergeben ${fmt(sum, 1)} %. Zusammen müssen es 100 % sein.` };
    }
    return { ok: true, grams: gramsFromPercent(kcal, values), percent: values };
  }

  const macroKcal = kcalFromMacros(values);
  const diff = macroKcal - kcal;
  if (Math.abs(diff) > macroTolerance(kcal)) {
    return {
      ok: false,
      error: `Deine Makros ergeben ${fmt(macroKcal)} kcal, dein Ziel sind ${fmt(kcal)} kcal (${diff > 0 ? "+" : ""}${fmt(diff)} kcal). Passe die Gramm an.`,
    };
  }
  return { ok: true, grams: values, percent: percentFromGrams(values) };
}

/** Gram targets with carbs changed so the total matches `kcal`; null if protein and fat alone exceed it. */
export function balanceCarbs(kcal: number, g: Macros): Macros | null {
  const carbs = Math.round((kcal - g.protein * KCAL_PER_GRAM.protein - g.fat * KCAL_PER_GRAM.fat) / KCAL_PER_GRAM.carbs);
  return carbs < 0 ? null : { ...g, carbs };
}

// ---------- Kalorienziele pro Mahlzeit ----------

export type MealKey = (typeof MEALS)[number]["key"];

/** Suggested split of the calorie target when meal targets are switched on. */
export const DEFAULT_MEAL_SPLIT: Record<MealKey, number> = { breakfast: 25, lunch: 35, dinner: 30, snack: 10 };

/** Meal shares must be whole, non-negative percentages that add up to exactly 100. */
export function checkMealSplit(split: Record<MealKey, number>): { ok: true } | { ok: false; error: string } {
  const values = Object.values(split);
  if (values.some((v) => !Number.isInteger(v) || v < 0 || v > 100)) return { ok: false, error: "Bitte gib ganze Prozentwerte zwischen 0 und 100 an." };
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum !== 100) return { ok: false, error: `Die Anteile ergeben ${sum} %, es müssen genau 100 % sein.` };
  return { ok: true };
}

export function mealTarget(kcalTarget: number, split: Record<MealKey, number> | null, meal: MealKey): number | null {
  return split ? Math.round((kcalTarget * split[meal]) / 100) : null;
}

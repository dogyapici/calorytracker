export type Sex = "male" | "female";
export type Goal = "lose" | "maintain" | "gain";

export const MEALS = [
  { key: "breakfast", label: "Frühstück" },
  { key: "lunch", label: "Mittagessen" },
  { key: "dinner", label: "Abendessen" },
  { key: "snack", label: "Snacks" },
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

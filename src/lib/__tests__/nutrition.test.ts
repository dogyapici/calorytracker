import { describe, expect, it } from "vitest";
import { balanceCarbs, bmr, checkMacros, computeRecipe, kcalFromMacros, macroTolerance, scaleFood, scaleNutrients, suggestTargets, sumNutrients } from "../nutrition";
import { addDays, isIsoDay, today } from "../dates";
import { hashPassword, verifyPassword } from "../password";

describe("nutrition", () => {
  it("computes Mifflin-St Jeor BMR", () => {
    expect(bmr("male", 80, 180, 30)).toBe(1780);
    expect(bmr("female", 60, 165, 30)).toBeCloseTo(1320.25);
  });

  it("suggests targets whose macros add up to the calorie goal", () => {
    const t = suggestTargets({ sex: "male", weightKg: 80, heightCm: 180, age: 30, activityFactor: 1.55, goal: "lose" });
    expect(t.tdee).toBe(2759);
    expect(t.kcal).toBe(2260);
    expect(t.protein).toBe(160);
    const macroKcal = t.protein * 4 + t.carbs * 4 + t.fat * 9;
    expect(Math.abs(macroKcal - t.kcal)).toBeLessThan(10);
  });

  it("never suggests below a safe minimum", () => {
    const t = suggestTargets({ sex: "female", weightKg: 45, heightCm: 150, age: 70, activityFactor: 1.2, goal: "lose" });
    expect(t.kcal).toBe(1200);
  });

  it("scales and sums nutrients", () => {
    const half = scaleNutrients({ kcal: 200, protein: 10, carbs: 20, fat: 8 }, 50);
    expect(half).toEqual({ kcal: 100, protein: 5, carbs: 10, fat: 4 });
    expect(sumNutrients([half, half]).kcal).toBe(200);
  });
});

describe("dates", () => {
  it("validates and shifts days", () => {
    expect(isIsoDay("2026-09-26")).toBe(true);
    expect(isIsoDay("2026-9-26")).toBe(false);
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("uses Berlin time for today", () => {
    expect(today(new Date("2026-09-26T22:30:00Z"))).toBe("2026-09-27");
  });
});

describe("password", () => {
  it("verifies only the right password", async () => {
    const hash = await hashPassword("geheim123");
    expect(await verifyPassword("geheim123", hash)).toBe(true);
    expect(await verifyPassword("falsch", hash)).toBe(false);
  });
});

describe("computeRecipe", () => {
  const oats = { kcal: 372, protein: 13.5, carbs: 58.7, fat: 7, sugar: 0.7, saturatedFat: null, fiber: 10, salt: 0.02 };
  const milk = { kcal: 64, protein: 3.4, carbs: 4.8, fat: 3.5, sugar: 4.8, saturatedFat: 2.3, fiber: null, salt: 0.1 };

  it("averages ingredients per 100 g and splits into portions", () => {
    const r = computeRecipe([{ per100: oats, grams: 100 }, { per100: milk, grams: 300 }], 2);
    expect(r.totalGrams).toBe(400);
    expect(r.total.kcal).toBeCloseTo(372 + 192);
    expect(r.per100.kcal).toBeCloseTo(141);
    expect(r.servingGrams).toBe(200);
    // Fiber only known for oats: 10 g in 400 g.
    expect(r.per100.fiber).toBeCloseTo(2.5);
    expect(r.per100.saturatedFat).toBeCloseTo(1.725);
  });

  it("uses the cooked weight when given", () => {
    const r = computeRecipe([{ per100: oats, grams: 100 }], 1, 250);
    expect(r.per100.kcal).toBeCloseTo(148.8);
    expect(r.total.kcal).toBeCloseTo(372);
    expect(r.servingGrams).toBe(250);
  });

  it("handles an empty recipe", () => {
    const r = computeRecipe([], 4);
    expect(r.per100.kcal).toBe(0);
    expect(r.per100.fiber).toBeNull();
  });
});

describe("scaleFood", () => {
  it("scales optional nutrients and micros, keeping unknowns null", () => {
    const food = { kcal: 64, protein: 3.4, carbs: 4.8, fat: 3.5, sugar: 4.8, saturatedFat: null, fiber: null, salt: 0.1, micros: { calcium: 120 } };
    const e = scaleFood(food, 250);
    expect(e.kcal).toBe(160);
    expect(e.sugar).toBeCloseTo(12);
    expect(e.saturatedFat).toBeNull();
    expect(e.micros).toEqual({ calcium: 300 });
  });

  it("sums recipe micros per 100 g", () => {
    const a = { kcal: 100, protein: 0, carbs: 0, fat: 0, sugar: null, saturatedFat: null, fiber: null, salt: null, micros: { iron: 4 } };
    const b = { ...a, micros: {} };
    const r = computeRecipe([{ per100: a, grams: 100 }, { per100: b, grams: 100 }], 1);
    expect(r.per100.micros).toEqual({ iron: 2 });
  });
});

describe("macro targets", () => {
  it("turns percentages into grams that match the calorie goal", () => {
    const r = checkMacros(2000, "percent", { protein: 30, carbs: 40, fat: 30 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.grams).toEqual({ protein: 150, carbs: 200, fat: 67 });
    expect(Math.abs(kcalFromMacros(r.grams) - 2000)).toBeLessThanOrEqual(macroTolerance(2000));
  });

  it("rejects percentages that do not add up to 100", () => {
    const r = checkMacros(2000, "percent", { protein: 30, carbs: 40, fat: 20 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("90 %");
  });

  it("rejects grams that do not match the calorie goal", () => {
    const r = checkMacros(2000, "grams", { protein: 150, carbs: 150, fat: 67 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("1.803 kcal");
  });

  it("accepts matching grams and derives percentages", () => {
    const r = checkMacros(2000, "grams", { protein: 150, carbs: 200, fat: 67 });
    expect(r.ok && r.percent).toEqual({ protein: 30, carbs: 39.9, fat: 30.1 });
  });

  it("rejects negative or missing values", () => {
    expect(checkMacros(2000, "grams", { protein: -1, carbs: 300, fat: 70 }).ok).toBe(false);
    expect(checkMacros(2000, "percent", { protein: NaN, carbs: 50, fat: 50 }).ok).toBe(false);
  });

  it("balances carbs to the remaining calories", () => {
    expect(balanceCarbs(2000, { protein: 150, carbs: 0, fat: 67 })).toEqual({ protein: 150, carbs: 199, fat: 67 });
    expect(balanceCarbs(1000, { protein: 200, carbs: 0, fat: 50 })).toBeNull();
  });

  it("keeps suggested targets valid", () => {
    const t = suggestTargets({ sex: "female", weightKg: 62, heightCm: 168, age: 28, activityFactor: 1.375, goal: "maintain" });
    expect(checkMacros(t.kcal, "grams", t).ok).toBe(true);
  });
});

describe("meal split", () => {
  it("accepts whole percentages adding up to 100", async () => {
    const { checkMealSplit, DEFAULT_MEAL_SPLIT, mealTarget } = await import("../nutrition");
    expect(checkMealSplit(DEFAULT_MEAL_SPLIT).ok).toBe(true);
    expect(checkMealSplit({ breakfast: 30, lunch: 30, dinner: 30, snack: 5 })).toEqual({ ok: false, error: "Die Anteile ergeben 95 %, es müssen genau 100 % sein." });
    expect(checkMealSplit({ breakfast: 25.5, lunch: 34.5, dinner: 30, snack: 10 }).ok).toBe(false);
    expect(mealTarget(2000, DEFAULT_MEAL_SPLIT, "lunch")).toBe(700);
    expect(mealTarget(2000, null, "lunch")).toBeNull();
  });
});

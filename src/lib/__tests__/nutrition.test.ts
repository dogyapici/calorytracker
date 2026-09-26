import { describe, expect, it } from "vitest";
import { bmr, computeRecipe, scaleNutrients, suggestTargets, sumNutrients } from "../nutrition";
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

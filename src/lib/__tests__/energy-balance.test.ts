import { describe, expect, it } from "vitest";
import { addDays } from "../dates";
import { energyBalance, kcalForKgPerWeek, kgPerWeekAt } from "../energy-balance";

const today = "2026-09-27";
const days = (n: number, kcal: (i: number) => number) => Array.from({ length: n }, (_, i) => ({ day: addDays(today, -(n - 1) + i), kcal: kcal(i) }));

describe("energyBalance", () => {
  it("needs enough logged days and weigh-ins", () => {
    const r = energyBalance(days(5, () => 2000), [{ day: today, kg: 80 }], today);
    expect(r).toEqual({ ok: false, loggedDays: 5, weighIns: 1 });
  });

  it("derives maintenance from intake and weight trend", () => {
    // 2000 kcal a day while losing 0.5 kg a week → maintenance ≈ 2000 + 550.
    const intake = days(28, () => 2000);
    const weights = [0, 7, 14, 21, 27].map((d) => ({ day: addDays(today, -27 + d), kg: 80 - (0.5 * d) / 7 }));
    const r = energyBalance(intake, weights, today);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kgPerWeek).toBeCloseTo(-0.5, 5);
    expect(r.maintenance).toBeCloseTo(2550, 0);
    expect(r.weeks.length).toBe(4);
  });

  it("ignores days without entries", () => {
    const intake = days(28, (i) => (i % 2 ? 0 : 2200));
    const weights = [0, 10, 20, 27].map((d) => ({ day: addDays(today, -27 + d), kg: 70 }));
    const r = energyBalance(intake, weights, today);
    expect(r.ok && r.avgKcal).toBe(2200);
    expect(r.ok && Math.round(r.maintenance)).toBe(2200);
  });
});

describe("kcal ↔ weight change", () => {
  it("converts both ways", () => {
    expect(kgPerWeekAt(2000, 2550)).toBeCloseTo(-0.5, 5);
    expect(kcalForKgPerWeek(-0.5, 2550)).toBeCloseTo(2000, 5);
  });
});

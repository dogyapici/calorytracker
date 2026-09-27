import { describe, expect, it } from "vitest";
import { bmi, weeklyTrend, weightStats } from "../weight-stats";

const series = (from: string, kgs: number[], step = 1) =>
  kgs.map((kg, i) => {
    const d = new Date(`${from}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i * step);
    return { day: d.toISOString().slice(0, 10), kg };
  });

describe("weight stats", () => {
  it("computes the weekly trend by least squares", () => {
    expect(weeklyTrend(series("2026-09-01", [80, 79.9, 79.8, 79.7, 79.6, 79.5, 79.4, 79.3]))).toBeCloseTo(-0.7);
    expect(weeklyTrend(series("2026-09-01", [80, 79]))).toBeNull();
    expect(weeklyTrend(series("2026-09-01", [80, 79.5, 79], 2))).toBeNull(); // only 4 days apart
  });

  it("classifies the BMI", () => {
    expect(bmi(80, 180)).toEqual({ value: expect.closeTo(24.69, 2), label: "Normalgewicht" });
    expect(bmi(95, 180)?.label).toBe("Übergewicht");
    expect(bmi(80, null)).toBeNull();
  });

  it("limits change, min and max to the range and looks back 7 and 30 days", () => {
    const all = series("2026-07-01", [90, 88, 86, 84, 82], 20); // 07-01, 07-21, 08-10, 08-30, 09-19
    const s = weightStats(all, "2026-09-27", 30, 180)!;
    expect(s.latest).toEqual({ day: "2026-09-19", kg: 82 });
    expect(s.inRange.map((w) => w.kg)).toEqual([84, 82]);
    expect(s.change).toBe(-2);
    expect([s.min, s.max]).toEqual([82, 84]);
    expect(s.change7).toBe(0); // last weigh-in before 09-20 is the latest itself
    expect(s.change30).toBe(-4); // on 08-28 the last weigh-in was 86 kg (08-10)
    expect(s.total).toBe(-8);
    expect(weightStats(all, "2026-09-27", null, null)!.inRange).toHaveLength(5);
    expect(weightStats([], "2026-09-27", 30, null)).toBeNull();
  });
});

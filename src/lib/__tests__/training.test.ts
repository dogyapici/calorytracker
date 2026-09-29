import { describe, expect, it } from "vitest";
import { exerciseProgress, groupsForCategory, isoWeek, parseDecimal, recentWeeks, weekLabel, weekNumberSince, weekStart } from "../training";

describe("weeks", () => {
  it("finds the Monday of a week", () => {
    expect(weekStart("2026-09-29")).toBe("2026-09-28"); // Tuesday
    expect(weekStart("2026-09-28")).toBe("2026-09-28"); // Monday
    expect(weekStart("2026-10-04")).toBe("2026-09-28"); // Sunday
  });

  it("numbers ISO weeks, also around new year", () => {
    expect(isoWeek("2026-09-28")).toBe(40);
    expect(isoWeek("2025-12-29")).toBe(1); // KW 1/2026 starts in December
    expect(isoWeek("2020-12-28")).toBe(53);
  });

  it("labels and lists weeks", () => {
    expect(weekLabel("2026-09-28")).toBe("KW 40 · 28.9.–4.10.");
    expect(recentWeeks("2026-09-30", 3)).toEqual(["2026-09-28", "2026-09-21", "2026-09-14"]);
    expect(weekNumberSince("2026-09-14", "2026-09-28")).toBe(3);
  });
});

describe("exerciseProgress", () => {
  it("compares the latest week with the one before", () => {
    const p = exerciseProgress([
      { week: "2026-09-21", weightKg: 65, reps: 8, sets: 3 },
      { week: "2026-09-14", weightKg: 60, reps: 10, sets: 3 },
      { week: "2026-09-28", weightKg: 62.5, reps: 10, sets: null },
    ])!;
    expect(p.latest.week).toBe("2026-09-28");
    expect(p.change).toBe(-2.5);
    expect(p.total).toBe(2.5);
    expect(p.best).toBe(65);
    expect(p.weeks).toBe(3);
  });

  it("has no change with one week and nothing without logs", () => {
    expect(exerciseProgress([{ week: "2026-09-28", weightKg: 60, reps: 10, sets: 3 }])!.change).toBeNull();
    expect(exerciseProgress([])).toBeNull();
  });
});

it("parses German decimals", () => {
  expect(parseDecimal("62,5")).toBe(62.5);
  expect(parseDecimal(" 60 ")).toBe(60);
  expect(parseDecimal("")).toBeNaN();
  expect(parseDecimal(null)).toBeNaN();
});

it("suggests fitting muscle groups first", () => {
  expect(groupsForCategory("Brusttraining")[0].key).toBe("chest");
  expect(groupsForCategory("Arme").slice(0, 2).map((g) => g.key)).toEqual(["biceps", "triceps"]);
  expect(groupsForCategory("Oberkörper").some((g) => g.key === "legs")).toBe(false);
  expect(groupsForCategory("Montag")).toHaveLength(8);
});

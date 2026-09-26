import { describe, expect, it } from "vitest";
import { computeStreak } from "../streak";

describe("computeStreak", () => {
  it("counts back from today", () => {
    expect(computeStreak(["2026-09-24", "2026-09-25", "2026-09-26"], "2026-09-26")).toEqual({ current: 3, longest: 3, loggedToday: true });
  });

  it("keeps yesterday's streak alive while today is still open", () => {
    expect(computeStreak(["2026-09-24", "2026-09-25"], "2026-09-26").current).toBe(2);
  });

  it("breaks after a missed day and remembers the longest run", () => {
    const r = computeStreak(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-20", "2026-09-26"], "2026-09-26");
    expect(r.current).toBe(1);
    expect(r.longest).toBe(4);
  });

  it("is zero without entries", () => {
    expect(computeStreak([], "2026-09-26")).toEqual({ current: 0, longest: 0, loggedToday: false });
  });

  it("crosses month and year boundaries", () => {
    expect(computeStreak(["2025-12-31", "2026-01-01"], "2026-01-01").current).toBe(2);
  });
});

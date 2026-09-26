import { describe, expect, it } from "vitest";
import { addMonths, dayStatus, isMonth, monthGrid } from "../calendar";

describe("calendar", () => {
  it("builds Monday-first weeks", () => {
    const weeks = monthGrid("2026-09");
    // 1 September 2026 is a Tuesday.
    expect(weeks[0]).toEqual([null, "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06"]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks.at(-1)!.at(-1)).toBeNull();
  });

  it("handles February and month steps across years", () => {
    expect(monthGrid("2028-02").flat().filter(Boolean)).toHaveLength(29);
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(isMonth("2026-13")).toBe(false);
  });

  it("rates days against the target", () => {
    expect(dayStatus(undefined, 2000)).toBe("none");
    expect(dayStatus(1850, 2000)).toBe("ok");
    expect(dayStatus(1500, 2000)).toBe("under");
    expect(dayStatus(2300, 2000)).toBe("over");
  });
});

import { addDays } from "./dates";

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Days of a month as weeks from Monday to Sunday; cells outside the month are null. */
export function monthGrid(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const last = addDays(`${addMonths(month, 1)}-01`, -1);
  const offset = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let day = first; day <= last; day = addDays(day, 1)) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

export type DayStatus = "none" | "under" | "ok" | "over";

/** How a logged day compares to the calorie target: within ±10 % counts as on target. */
export function dayStatus(kcal: number | undefined, target: number): DayStatus {
  if (kcal === undefined) return "none";
  if (kcal > target * 1.1) return "over";
  if (kcal < target * 0.9) return "under";
  return "ok";
}

import { addDays } from "./dates";

export type WeighIn = { day: string; kg: number };

export const WEIGHT_RANGES = [
  { key: "30", label: "30 T", days: 30 },
  { key: "90", label: "90 T", days: 90 },
  { key: "365", label: "1 J", days: 365 },
  { key: "all", label: "Alles", days: null },
] as const;
export type WeightRangeKey = (typeof WEIGHT_RANGES)[number]["key"];

const dayNumber = (day: string) => Date.parse(`${day}T12:00:00Z`) / 86_400_000;

/** Weight on or before a day (the last weigh-in up to then), or null. `list` is oldest first. */
function weightAt(list: WeighIn[], day: string) {
  let found: WeighIn | null = null;
  for (const w of list) {
    if (w.day > day) break;
    found = w;
  }
  return found;
}

/** Least-squares slope of kg over time, in kg per week. Needs 3 weigh-ins spread over at least a week. */
export function weeklyTrend(list: WeighIn[]): number | null {
  if (list.length < 3 || dayNumber(list[list.length - 1].day) - dayNumber(list[0].day) < 7) return null;
  const xs = list.map((w) => dayNumber(w.day));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = list.reduce((a, w) => a + w.kg, 0) / list.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (list[i].kg - my);
    den += (x - mx) ** 2;
  });
  return den ? (num / den) * 7 : null;
}

export const BMI_CLASSES = [
  { max: 18.5, label: "Untergewicht" },
  { max: 25, label: "Normalgewicht" },
  { max: 30, label: "Übergewicht" },
  { max: Infinity, label: "Adipositas" },
] as const;

export function bmi(kg: number, heightCm: number | null) {
  if (!heightCm || heightCm < 50) return null;
  const value = kg / (heightCm / 100) ** 2;
  return { value, label: BMI_CLASSES.find((c) => value < c.max)!.label };
}

/**
 * Key numbers for the weight page. `all` is every weigh-in, oldest first; the range limits
 * the chart, change, min/max and average, while the trend always looks at the last 4 weeks.
 */
export function weightStats(all: WeighIn[], today: string, rangeDays: number | null, heightCm: number | null) {
  if (!all.length) return null;
  const from = rangeDays ? addDays(today, -(rangeDays - 1)) : all[0].day;
  const inRange = all.filter((w) => w.day >= from);
  const latest = all[all.length - 1];
  const kgs = inRange.map((w) => w.kg);
  const since = (days: number) => {
    const then = weightAt(all, addDays(today, -days));
    return then ? latest.kg - then.kg : null;
  };
  return {
    latest,
    inRange,
    change: inRange.length >= 2 ? latest.kg - inRange[0].kg : null,
    min: kgs.length ? Math.min(...kgs) : null,
    max: kgs.length ? Math.max(...kgs) : null,
    avg: kgs.length ? kgs.reduce((a, b) => a + b, 0) / kgs.length : null,
    change7: since(7),
    change30: since(30),
    total: all.length >= 2 ? latest.kg - all[0].kg : null,
    trend: weeklyTrend(all.filter((w) => w.day >= addDays(today, -27))),
    bmi: bmi(latest.kg, heightCm),
  };
}

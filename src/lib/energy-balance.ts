import { addDays } from "./dates";
import { weeklyTrend, type WeighIn } from "./weight-stats";

/** Rough energy content of one kilogram of body weight. */
export const KCAL_PER_KG = 7700;
export const BALANCE_WEEKS = 8;
export const MIN_LOGGED_DAYS = 10;
export const MIN_WEIGH_INS = 3;

type DayKcal = { day: string; kcal: number };

export type BalanceWeek = { start: string; avgKcal: number; kgPerWeek: number | null };

export type EnergyBalance =
  | { ok: false; loggedDays: number; weighIns: number }
  | { ok: true; loggedDays: number; weighIns: number; avgKcal: number; kgPerWeek: number; maintenance: number; weeks: BalanceWeek[] };

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Compares what was eaten with how the weight moved over the last weeks. Whatever the weight trend
 * does not explain is the calorie need: maintenance = average intake − trend × 7700 kcal / 7 days.
 * Only days with entries count, so forgotten days don't pull the average down. `weights` is oldest first.
 */
export function energyBalance(days: DayKcal[], weights: WeighIn[], today: string, weeks = BALANCE_WEEKS): EnergyBalance {
  const from = addDays(today, -(weeks * 7 - 1));
  const logged = days.filter((d) => d.day >= from && d.day <= today && d.kcal > 0);
  const inRange = weights.filter((w) => w.day >= from && w.day <= today);
  const trend = weeklyTrend(inRange);
  if (logged.length < MIN_LOGGED_DAYS || inRange.length < MIN_WEIGH_INS || trend === null) {
    return { ok: false, loggedDays: logged.length, weighIns: inRange.length };
  }

  const avgKcal = mean(logged.map((d) => d.kcal));
  const perWeek: BalanceWeek[] = [];
  for (let i = 0; i < weeks; i++) {
    const start = addDays(from, i * 7);
    const end = addDays(start, 6);
    const week = logged.filter((d) => d.day >= start && d.day <= end);
    if (week.length < 3) continue;
    // A few days either side, so a week with weigh-ins only at its edges still gets a trend.
    const around = weights.filter((w) => w.day >= addDays(start, -3) && w.day <= addDays(end, 3));
    perWeek.push({ start, avgKcal: mean(week.map((d) => d.kcal)), kgPerWeek: weeklyTrend(around) });
  }

  return {
    ok: true,
    loggedDays: logged.length,
    weighIns: inRange.length,
    avgKcal,
    kgPerWeek: trend,
    maintenance: avgKcal - (trend * KCAL_PER_KG) / 7,
    weeks: perWeek,
  };
}

/** Expected weight change per week when eating `kcal` a day. */
export const kgPerWeekAt = (kcal: number, maintenance: number) => ((kcal - maintenance) * 7) / KCAL_PER_KG;

/** Daily calories for a wanted weight change per week. */
export const kcalForKgPerWeek = (kgPerWeek: number, maintenance: number) => maintenance + (kgPerWeek * KCAL_PER_KG) / 7;

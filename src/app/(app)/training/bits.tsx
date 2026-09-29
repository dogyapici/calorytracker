import { fmt } from "@/lib/nutrition";
import type { WorkoutLog } from "@/lib/training";

/** "65 kg × 10 · 3 Sätze" */
export function formatSet(log: WorkoutLog) {
  const sets = log.sets ? ` · ${log.sets} ${log.sets === 1 ? "Satz" : "Sätze"}` : "";
  return `${fmt(log.weightKg, 2)} kg × ${log.reps}${sets}`;
}

export const signedKg = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${fmt(Math.abs(v), 2)} kg`;

/** Weight change against the week before: more in primary, less in a neutral tone. */
export function Change({ value }: { value: number }) {
  return (
    <span className={`shrink-0 text-label font-semibold tabular-nums ${value > 0 ? "text-primary" : "text-text-secondary"}`}>{signedKg(value)}</span>
  );
}

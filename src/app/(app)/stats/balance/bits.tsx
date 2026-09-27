import { fmt } from "@/lib/nutrition";

export const signed = (v: number, digits = 1) => `${v > 0.049 ? "+" : v < -0.049 ? "−" : "±"}${fmt(Math.abs(v), digits)}`;

const SPAN = 1000;

/**
 * A horizontal scale around the maintenance calories: left is losing, right is gaining,
 * and a marker shows where the calorie target sits.
 */
export function BalanceScale({ maintenance, target }: { maintenance: number; target: number }) {
  const pos = Math.min(100, Math.max(0, ((target - (maintenance - SPAN)) / (2 * SPAN)) * 100));
  return (
    <div aria-hidden>
      <div className="relative h-3 rounded-full bg-[linear-gradient(to_right,var(--ds-macro-protein),var(--ds-surface-muted)_50%,var(--ds-macro-carbs))]">
        <span className="absolute left-1/2 top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text-tertiary" />
        <span
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-accent-calories shadow-card"
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-caption muted">
        <span>Abnehmen</span>
        <span>Halten</span>
        <span>Zunehmen</span>
      </div>
    </div>
  );
}

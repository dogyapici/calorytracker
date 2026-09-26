import { fmt } from "@/lib/nutrition";

// Balken laut DESIGN.md: 6px hoch, radius full, Track in surface-muted.
// Überschreitung eines Ziels immer in warning, nie in danger.
export function ProgressBar({
  value,
  max,
  color = "bg-primary",
  overIsBad = true,
}: {
  value: number;
  max: number;
  color?: string;
  overIsBad?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = overIsBad && max > 0 && value > max;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
      <div className={`h-full origin-left animate-grow rounded-full ${over ? "bg-warning" : color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Kalorien-Ring: ca. 14px Strich, runde Enden, Track in surface-muted,
// Fortschritt in accent-calories (bei warm-minimal mit Verlauf zu ring-end).
export function CalorieRing({ eaten, target }: { eaten: number; target: number }) {
  const size = 168;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, eaten / target) : 0;
  const remaining = target - eaten;
  const over = remaining < 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="calorie-ring" x1="1" y1="0.5" x2="0" y2="0.5">
            <stop offset="0" className="[stop-color:var(--color-accent-calories)]" />
            <stop offset="1" className="[stop-color:var(--color-ring-end)]" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={`animate-ring ${over ? "stroke-warning" : "stroke-[url(#calorie-ring)]"}`}
          style={{ ["--ring-from" as string]: c }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`text-display ${over ? "text-warning" : ""}`}>{fmt(Math.abs(remaining))}</span>
        <span className="text-caption text-text-secondary">{over ? "kcal über Ziel" : "kcal übrig"}</span>
      </div>
    </div>
  );
}

export function MacroRow({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-label">{label}</p>
      <div className="my-1.5">
        <ProgressBar value={value} max={target} color={color} />
      </div>
      <p className="truncate text-caption text-text-secondary">
        <span className="text-text-primary">{fmt(value)}</span> / {fmt(target)} g
      </p>
    </div>
  );
}

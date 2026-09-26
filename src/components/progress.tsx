import { fmt } from "@/lib/nutrition";

export function ProgressBar({ value, max, color = "bg-brand-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = max > 0 && value > max;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      <div className={`h-full rounded-full ${over ? "bg-red-500" : color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function CalorieRing({ eaten, target }: { eaten: number; target: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, eaten / target) : 0;
  const remaining = target - eaten;
  const over = remaining < 0;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-zinc-200 dark:stroke-zinc-800" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={over ? "stroke-red-500" : "stroke-brand-500"}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`text-2xl font-bold tabular-nums ${over ? "text-red-600" : ""}`}>{fmt(Math.abs(remaining))}</span>
        <span className="text-xs muted">{over ? "kcal zu viel" : "kcal übrig"}</span>
      </div>
    </div>
  );
}

export function MacroRow({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-sm">
        <span className="truncate font-medium">{label}</span>
        <span className="shrink-0 tabular-nums muted">
          {fmt(value)} / {fmt(target)} g
        </span>
      </div>
      <ProgressBar value={value} max={target} color={color} />
    </div>
  );
}

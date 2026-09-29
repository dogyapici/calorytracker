import { fmt } from "@/lib/nutrition";
import { Icon, type IconName } from "./icons";

// Balken laut DESIGN.md: 6px hoch, radius full, Track in surface-muted.
// Überschreitung eines Ziels immer in warning, nie in danger.
export function ProgressBar({
  value,
  max,
  color = "bg-primary",
  overIsBad = true,
  track = "bg-surface-muted",
}: {
  value: number;
  max: number;
  color?: string;
  overIsBad?: boolean;
  track?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = overIsBad && max > 0 && value > max;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full ${track}`}>
      <div className={`h-full origin-left animate-grow rounded-full transition-[width,background-color] duration-500 ease-out ${over ? "bg-warning" : color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Tagesziel-Ring: dicker Strich mit Verlauf, in der Mitte die übrigen kcal.
// Überschreitung wie überall in warning.
export function GoalRing({ eaten, target, size = 168 }: { eaten: number; target: number; size?: number }) {
  const stroke = 16;
  const r = (size - stroke) / 2;
  const pct = target > 0 ? eaten / target : 0;
  const over = pct > 1;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="goal-ring" x1="1" y1="0.5" x2="0" y2="0.5">
            <stop offset="0" className="[stop-color:var(--color-accent-calories)]" />
            <stop offset="1" className="[stop-color:var(--color-ring-end)]" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-muted" />
        {pct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100 100"
            strokeDashoffset={100 * (1 - Math.min(1, pct))}
            className={`animate-ring transition-[stroke-dashoffset,stroke] duration-500 ease-out ${over ? "stroke-warning" : "stroke-[url(#goal-ring)]"}`}
            style={{ ["--ring-from" as string]: 100 }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`${fmt(Math.abs(target - eaten)).length > 4 ? "text-[30px]" : "text-[36px]"} font-extrabold leading-none tabular-nums ${over ? "text-warning" : ""}`}>
          {fmt(Math.abs(target - eaten))}
        </span>
        <span className="mt-1 text-caption text-text-secondary">{over ? "kcal über Ziel" : "kcal übrig"}</span>
      </div>
    </div>
  );
}

// Makro als Pille: gefüllter Teil in der Makrofarbe, am Ende ein runder Knopf mit Icon.
export function MacroPill({ label, value, target, color, icon }: { label: string; value: number; target: number; color: string; icon: IconName }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const over = target > 0 && value > target;
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 px-2 text-center">
      <p className="truncate text-label font-semibold">{label}</p>
      <div className="relative h-9 w-full max-w-24 rounded-full bg-surface-muted" aria-hidden>
        <div
          className={`absolute inset-y-0 left-0 flex origin-left animate-grow items-center justify-end rounded-full p-1 transition-[width,background-color] duration-500 ease-out ${over ? "bg-warning" : color}`}
          style={{ width: `calc(2.25rem + (100% - 2.25rem) * ${pct})` }}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-text-primary shadow-card">
            <Icon name={icon} size={15} />
          </span>
        </div>
      </div>
      <p className="text-label tabular-nums">
        <span className={`font-semibold ${over ? "text-warning" : ""}`}>{fmt(value)}</span>
        <span className="muted">/{fmt(target)} g</span>
      </p>
    </div>
  );
}

// Ring um das Emoji einer Mahlzeit: zeigt, wie viel vom Mahlzeitziel gegessen ist.
export function MealRing({ emoji, value, target, size = 52 }: { emoji: string; value: number; target: number; size?: number }) {
  const stroke = 4.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const over = target > 0 && value > target * 1.1;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-muted" />
        {pct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            className={`animate-ring transition-[stroke-dashoffset,stroke] duration-500 ease-out ${over ? "stroke-warning" : "stroke-accent-calories"}`}
            style={{ ["--ring-from" as string]: c }}
          />
        )}
      </svg>
      <span aria-hidden className="text-[26px] leading-none">
        {emoji}
      </span>
    </span>
  );
}

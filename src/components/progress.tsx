import { fmt } from "@/lib/nutrition";

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

// Leuchtring (Entwurf G): frei stehender Kalorienring mit weichem Schein, außen drei Bögen für die Makros.
// Überschreitung wie überall in warning.
type Macro = { value: number; target: number; stroke: string };

const MACRO_ARC = 30; // Länge eines Makro-Bogens in pathLength-Einheiten (von 100), Rest sind Lücken

export function GoalRing({ eaten, target, macros }: { eaten: number; target: number; macros: Macro[] }) {
  const pct = target > 0 ? Math.min(1, eaten / target) : 0;
  const remaining = target - eaten;
  const over = remaining < 0;
  const main = over ? "stroke-warning" : "stroke-[url(#goal-ring)]";
  const label = fmt(Math.abs(remaining));
  // Vierstellige Werte ("2.000") bekommen eine kleinere Schrift, damit sie in den Ring passen.
  const size = label.length > 4 ? "text-[40px]" : "text-[52px]";
  return (
    <div className="relative mx-auto aspect-square w-full max-w-60 shrink-0">
      <svg viewBox="0 0 240 240" className="h-full w-full -rotate-90 overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="goal-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className="[stop-color:var(--color-accent-calories)]" />
            <stop offset="1" className="[stop-color:var(--color-ring-end)]" />
          </linearGradient>
          <filter id="goal-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <circle cx="120" cy="120" r="72" fill="none" strokeWidth={16} className="stroke-border" />
        {pct > 0 && (
          <>
            <circle
              cx="120"
              cy="120"
              r="72"
              fill="none"
              strokeWidth={18}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${pct * 100} 100`}
              filter="url(#goal-glow)"
              opacity={0.5}
              className={`transition-[stroke-dasharray,stroke] duration-500 ease-out ${main}`}
            />
            <circle
              cx="120"
              cy="120"
              r="72"
              fill="none"
              strokeWidth={16}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100 100"
              strokeDashoffset={100 * (1 - pct)}
              className={`animate-ring transition-[stroke-dashoffset,stroke] duration-500 ease-out ${main}`}
              style={{ ["--ring-from" as string]: 100 }}
            />
          </>
        )}
        {macros.map((m, i) => {
          const start = i * (100 / macros.length) + (100 / macros.length - MACRO_ARC) / 2;
          const len = m.target > 0 ? Math.min(1, m.value / m.target) * MACRO_ARC : 0;
          const mOver = m.target > 0 && m.value > m.target;
          return (
            <g key={i} fill="none" strokeWidth={6} strokeLinecap="round">
              <circle cx="120" cy="120" r="100" pathLength={100} strokeDasharray={`${MACRO_ARC} ${100 - MACRO_ARC}`} strokeDashoffset={-start} className="stroke-border" />
              {len > 0 && (
                <circle
                  cx="120"
                  cy="120"
                  r="100"
                  pathLength={100}
                  strokeDasharray={`${len} ${100 - len}`}
                  strokeDashoffset={-start}
                  className={`transition-[stroke-dasharray,stroke] duration-500 ease-out ${mOver ? "stroke-warning" : m.stroke}`}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`${size} font-extrabold leading-none tracking-tight tabular-nums ${over ? "text-warning" : ""}`}>{label}</span>
        <span className="mt-1 text-caption text-text-secondary">{over ? "kcal über Ziel" : "kcal übrig"}</span>
      </div>
    </div>
  );
}

// Makro unter dem Leuchtring: Label mit Farbpunkt, große Zahl, Ziel und eine kleine Fortschrittsleiste, ohne Rahmen.
export function MacroStat({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center px-2 text-center">
      <p className="flex items-center gap-1.5 truncate text-caption font-semibold text-text-secondary">
        <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
        {label}
      </p>
      <p className="text-h2 font-extrabold leading-tight tabular-nums">{fmt(value)}</p>
      <p className="truncate text-caption text-text-secondary tabular-nums">von {fmt(target)} g</p>
      <div className="mt-2 w-full max-w-20">
        <ProgressBar value={value} max={target} color={color} track="bg-border" />
      </div>
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

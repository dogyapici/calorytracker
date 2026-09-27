"use client";

import { useState } from "react";
import { formatDay } from "@/lib/dates";
import { kgPerWeekAt } from "@/lib/energy-balance";
import { fmt } from "@/lib/nutrition";

const W = 320;
const H = 160;
const PAD = { top: 12, right: 8, bottom: 22, left: 36 };

function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1;
  const step = 10 ** Math.floor(Math.log10(span / count));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((s) => span / s <= count) ?? step * 10;
  const start = Math.floor(min / nice) * nice;
  const end = Math.ceil(max / nice) * nice;
  const ticks: number[] = [];
  for (let v = start; v <= end + nice * 0.001; v += nice) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

/**
 * Makes a chart explorable: hovering, tapping or dragging picks the nearest data point
 * (by x, or by distance when `ys` is given), arrow keys step through the points.
 */
function useScrub(xs: number[], ys?: number[]) {
  const [active, setActive] = useState<number | null>(null);
  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const py = ((e.clientY - r.top) / r.height) * H;
    let best = 0;
    let bestDistance = Infinity;
    xs.forEach((x, i) => {
      const d = ys ? (x - px) ** 2 + (ys[i] - py) ** 2 : Math.abs(x - px);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    });
    setActive(best);
  };
  const svgProps = {
    tabIndex: 0,
    className: "w-full cursor-crosshair select-none outline-none focus-visible:rounded-chip focus-visible:ring-2 focus-visible:ring-primary",
    // Vertical swipes still scroll the page; horizontal drags move along the chart.
    style: { touchAction: "pan-y" },
    onPointerDown: pick,
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerType === "mouse" || e.buttons) pick(e);
    },
    onPointerLeave: (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerType === "mouse") setActive(null);
    },
    onBlur: () => setActive(null),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Escape") return setActive(null);
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      setActive((a) => Math.min(xs.length - 1, Math.max(0, a === null ? (step > 0 ? 0 : xs.length - 1) : a + step)));
    },
  } as const;
  return { active, svgProps };
}

/** Value bubble above (or, near the top edge, below) a point of the chart, kept inside its width. */
function Tip({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  const left = (x / W) * 100;
  const top = (y / H) * 100;
  const shiftX = left < 22 ? "-12%" : left > 78 ? "-88%" : "-50%";
  const shiftY = top < 35 ? "12px" : "calc(-100% - 12px)";
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 animate-fade whitespace-nowrap rounded-chip bg-inverse-surface px-2.5 py-1.5 text-caption text-inverse-text shadow-elevated"
      style={{ left: `${left}%`, top: `${top}%`, transform: `translate(${shiftX}, ${shiftY})` }}
    >
      {children}
    </div>
  );
}

/** Daily calories as bars with the target as a dashed line. */
export function CalorieBars({ days, target }: { days: { label: string; title: string; kcal: number }[]; target: number }) {
  const max = Math.max(target * 1.15, ...days.map((d) => d.kcal), 1);
  const ticks = niceTicks(0, max);
  const top = ticks[ticks.length - 1];
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + ih - (v / top) * ih;
  const slot = iw / days.length;
  const bw = Math.max(2, Math.min(24, slot * 0.7));
  const labelEvery = Math.ceil(days.length / 8);
  const center = (i: number) => PAD.left + slot * i + slot / 2;
  const { active, svgProps } = useScrub(days.map((_, i) => center(i)));
  const picked = active !== null ? days[active] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Kalorien pro Tag" {...svgProps}>
        {ticks.map((t) => (
          <g key={t}>
            <text x={PAD.left - 4} y={y(t) + 3} textAnchor="end" className="fill-text-secondary text-[9px]">
              {fmt(t)}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = PAD.left + slot * i + (slot - bw) / 2;
          const over = d.kcal > target;
          return (
            <g key={i}>
              {active === i && <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={ih} rx={3} className="fill-surface-muted" />}
              <rect
                x={x}
                y={y(d.kcal)}
                width={bw}
                height={Math.max(0, PAD.top + ih - y(d.kcal))}
                rx={Math.min(3, bw / 3)}
                className={`transition-opacity duration-150 ${over ? "fill-warning" : "fill-accent-calories"} ${active !== null && active !== i ? "opacity-40" : ""}`}
              />
              {i % labelEvery === 0 && (
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" className="fill-text-secondary text-[9px]">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + ih} y2={PAD.top + ih} className="stroke-border" />
        <line x1={PAD.left} x2={W - PAD.right} y1={y(target)} y2={y(target)} strokeDasharray="4 3" strokeWidth={1.5} className="stroke-text-tertiary" />
      </svg>
      {picked && active !== null && (
        <Tip x={center(active)} y={Math.min(y(picked.kcal), y(target))}>
          <span className="block font-semibold">{picked.title}</span>
          {picked.kcal > 0 ? (
            <span className="tabular-nums">
              {fmt(picked.kcal)} kcal · {picked.kcal > target ? `${fmt(picked.kcal - target)} über Ziel` : `${fmt(target - picked.kcal)} unter Ziel`}
            </span>
          ) : (
            <span>Nichts eingetragen</span>
          )}
        </Tip>
      )}
    </div>
  );
}

type WeightPoint = { day: string; kg: number };

/** Weight over time: line with a soft area below, spaced by date; the average as a dashed line. */
export function WeightLine({ points, average }: { points: WeightPoint[]; average?: number | null }) {
  if (points.length < 2) return null;
  return <WeightLineChart points={points} average={average} />;
}

function WeightLineChart({ points, average }: { points: WeightPoint[]; average?: number | null }) {
  const min = Math.min(...points.map((p) => p.kg));
  const max = Math.max(...points.map((p) => p.kg));
  const ticks = niceTicks(Math.floor(min - 0.5), Math.ceil(max + 0.5));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const t = (day: string) => Date.parse(`${day}T12:00:00Z`);
  const t0 = t(points[0].day);
  const span = t(points[points.length - 1].day) - t0 || 1;
  const x = (day: string) => PAD.left + ((t(day) - t0) / span) * iw;
  const y = (v: number) => PAD.top + ih - ((v - lo) / (hi - lo)) * ih;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points[points.length - 1].day).toFixed(1)},${PAD.top + ih} L${PAD.left},${PAD.top + ih} Z`;
  // Up to five date labels, but never more than there are days, so short ranges don't print one date twice.
  const steps = Math.min(4, Math.max(1, Math.round(span / 86_400_000)));
  const labels = Array.from({ length: steps + 1 }, (_, i) => new Date(t0 + (span * i) / steps).toISOString().slice(0, 10));
  const long = span > 200 * 86_400_000;
  const label = (day: string) => formatDay(day, long ? { month: "short", year: "2-digit" } : { day: "numeric", month: "numeric" });
  const last = points[points.length - 1];
  const { active, svgProps } = useScrub(points.map((p) => x(p.day)));
  const picked = active !== null ? points[active] : null;
  const change = active ? points[active].kg - points[active - 1].kg : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gewichtsverlauf" {...svgProps}>
        <defs>
          <linearGradient id="weight-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="[stop-color:var(--color-primary)]" stopOpacity="0.22" />
            <stop offset="1" className="[stop-color:var(--color-primary)]" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <text key={v} x={PAD.left - 4} y={y(v) + 3} textAnchor="end" className="fill-text-secondary text-[9px]">
            {fmt(v, 1)}
          </text>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + ih} y2={PAD.top + ih} className="stroke-border" />
        {average != null && (
          <line x1={PAD.left} x2={W - PAD.right} y1={y(average)} y2={y(average)} strokeDasharray="4 3" strokeWidth={1.2} className="stroke-text-tertiary" />
        )}
        <path d={area} fill="url(#weight-area)" />
        <path d={line} fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" className="stroke-primary" />
        {points.length <= 40 && points.map((p) => <circle key={p.day} cx={x(p.day)} cy={y(p.kg)} r={2.5} className="fill-primary" />)}
        <circle cx={x(last.day)} cy={y(last.kg)} r={4.5} strokeWidth={2.5} className="fill-surface stroke-primary" />
        {picked && (
          <g className="pointer-events-none">
            <line x1={x(picked.day)} x2={x(picked.day)} y1={PAD.top} y2={PAD.top + ih} strokeWidth={1} className="stroke-text-tertiary" />
            <circle cx={x(picked.day)} cy={y(picked.kg)} r={6} strokeWidth={3} className="fill-primary stroke-surface" />
          </g>
        )}
        {labels.map((d, i) => (
          <text key={i} x={x(d)} y={H - 6} textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"} className="fill-text-secondary text-[9px]">
            {label(d)}
          </text>
        ))}
      </svg>
      {picked && (
        <Tip x={x(picked.day)} y={y(picked.kg)}>
          <span className="block font-semibold">
            {formatDay(picked.day, { weekday: "short", day: "numeric", month: "long", ...(long && { year: "numeric" }) })}
          </span>
          <span className="tabular-nums">
            {fmt(picked.kg, 1)} kg
            {change !== null && ` · ${change > 0 ? "+" : change < 0 ? "−" : "±"}${fmt(Math.abs(change), 1)} kg`}
          </span>
        </Tip>
      )}
    </div>
  );
}

/**
 * Each week as a dot: average calories (x) against weight change (y). The line is what the energy
 * balance predicts around the estimated maintenance; the dashed vertical marks the calorie target.
 */
export function BalanceScatter({
  weeks,
  maintenance,
  target,
}: {
  weeks: { start: string; avgKcal: number; kgPerWeek: number }[];
  maintenance: number;
  target: number;
}) {
  const predict = (kcal: number) => kgPerWeekAt(kcal, maintenance);
  const kcals = [...weeks.map((w) => w.avgKcal), maintenance, target];
  const xTicks = niceTicks(Math.min(...kcals) - 150, Math.max(...kcals) + 150);
  const x0 = xTicks[0];
  const x1 = xTicks[xTicks.length - 1];
  const kgs = [...weeks.map((w) => w.kgPerWeek), predict(x0), predict(x1), 0];
  const yLimit = Math.max(0.5, ...kgs.map(Math.abs));
  const yTicks = niceTicks(-yLimit, yLimit);
  const y0 = yTicks[0];
  const y1 = yTicks[yTicks.length - 1];
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (v: number) => PAD.left + ((v - x0) / (x1 - x0)) * iw;
  const y = (v: number) => PAD.top + ih - ((v - y0) / (y1 - y0)) * ih;
  const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmt(Math.abs(v), 2)}`;
  // The weeks plus the maintenance point can be picked; the last index is maintenance.
  const { active, svgProps } = useScrub([...weeks.map((w) => x(w.avgKcal)), x(maintenance)], [...weeks.map((w) => y(w.kgPerWeek)), y(0)]);
  const week = active !== null && active < weeks.length ? weeks[active] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Kalorien und Gewichtsveränderung pro Woche" {...svgProps}>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className={v === 0 ? "stroke-text-tertiary" : "stroke-border"} strokeWidth={v === 0 ? 1 : 0.5} />
            <text x={PAD.left - 4} y={y(v) + 3} textAnchor="end" className="fill-text-secondary text-[9px]">
              {signed(v)}
            </text>
          </g>
        ))}
        {xTicks.map((v, i) => (
          <text key={v} x={x(v)} y={H - 6} textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"} className="fill-text-secondary text-[9px]">
            {fmt(v)}
          </text>
        ))}
        <line x1={x(target)} x2={x(target)} y1={PAD.top} y2={PAD.top + ih} strokeDasharray="4 3" className="stroke-accent-calories" strokeWidth={1.2} />
        <line x1={x(x0)} x2={x(x1)} y1={y(predict(x0))} y2={y(predict(x1))} className="stroke-primary" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
        <circle cx={x(maintenance)} cy={y(0)} r={active === weeks.length ? 6 : 4} className="fill-surface stroke-primary" strokeWidth={2} />
        {weeks.map((w, i) => (
          <circle
            key={w.start}
            cx={x(w.avgKcal)}
            cy={y(w.kgPerWeek)}
            r={active === i ? 7 : 4.5}
            strokeWidth={active === i ? 2.5 : 1.5}
            className={`fill-macro-carbs stroke-surface transition-opacity duration-150 ${active !== null && active !== i ? "opacity-50" : ""}`}
          />
        ))}
      </svg>
      {active !== null && (
        <Tip x={week ? x(week.avgKcal) : x(maintenance)} y={week ? y(week.kgPerWeek) : y(0)}>
          {week ? (
            <>
              <span className="block font-semibold">Woche ab {formatDay(week.start, { day: "numeric", month: "long" })}</span>
              <span className="tabular-nums">
                Ø {fmt(week.avgKcal)} kcal · {signed(week.kgPerWeek)} kg
              </span>
            </>
          ) : (
            <>
              <span className="block font-semibold">Erhaltungsbedarf</span>
              <span className="tabular-nums">ca. {fmt(Math.round(maintenance / 10) * 10)} kcal · ±0 kg</span>
            </>
          )}
        </Tip>
      )}
    </div>
  );
}

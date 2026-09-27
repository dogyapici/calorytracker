"use client";

import { useId, useOptimistic, useRef, useTransition } from "react";
import { celebrate } from "@/components/celebrate";
import { addWater } from "@/app/tracking-actions";
import { Icon } from "@/components/icons";
import { fmt } from "@/lib/nutrition";

const GLASS = 250;
// Flasche im Koordinatensystem 0..100 × 0..150; Wasser steigt von unten (y=146) bis zum Hals (y=8).
const BOTTLE = "M38 4 H62 V18 C62 27 88 29 88 46 V134 Q88 146 76 146 H24 Q12 146 12 134 V46 C12 29 38 27 38 18 Z";
const BOTTOM = 146;
const TOP = 8;
const WAVE = "M0 0 Q25 -7 50 0 T100 0 T150 0 T200 0 T250 0 T300 0 V160 H0 Z";

const liters = (ml: number) => `${fmt(ml / 1000, ml % 100 === 0 ? 1 : 2)} l`;

export function WaterTracker({ day, ml, targetMl }: { day: string; ml: number; targetMl: number }) {
  const [shown, setShown] = useOptimistic(ml, (current, delta: number) => Math.max(0, current + delta));
  const [, startTransition] = useTransition();
  const clip = useId();
  const bottle = useRef<SVGSVGElement>(null);
  const change = (delta: number) =>
    startTransition(async () => {
      if (shown < targetMl && shown + delta >= targetMl) celebrate(bottle.current, "Wasserziel erreicht 💧");
      else navigator.vibrate?.(15);
      setShown(delta);
      await addWater(day, delta);
    });

  const pct = targetMl > 0 ? Math.min(1, shown / targetMl) : 0;
  const level = pct > 0 ? BOTTOM - pct * (BOTTOM - TOP) : BOTTOM + 10;
  const done = shown >= targetMl;
  const glasses = Math.min(12, Math.max(1, Math.round(targetMl / GLASS)));
  const filled = shown / GLASS;

  return (
    <section className="card space-y-5 overflow-hidden" aria-label="Wasser">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h3">
          <span aria-hidden className="mr-1.5">💧</span>Wasser
        </h2>
        <span className={`rounded-full px-3 py-1 text-caption font-semibold ${done ? "bg-primary-soft text-primary" : "bg-surface-muted text-text-secondary"}`}>
          {done ? "Ziel erreicht 🎉" : `noch ${liters(targetMl - shown)}`}
        </span>
      </div>

      <div className="flex items-center gap-6">
        <svg ref={bottle} viewBox="0 0 100 150" className="h-44 w-auto shrink-0 text-macro-protein" aria-hidden>
          <defs>
            <clipPath id={clip}>
              <path d={BOTTLE} />
            </clipPath>
          </defs>
          <path d={BOTTLE} className="fill-surface-muted" />
          <g clipPath={`url(#${clip})`}>
            <g className="water-level" style={{ transform: `translateY(${level}px)` }}>
              <g transform="translate(0 2)">
                <path d={WAVE} className="water-wave-back fill-current opacity-35" />
              </g>
              <g transform="translate(0 5)">
                <path d={WAVE} className="water-wave fill-current opacity-90" />
              </g>
            </g>
          </g>
          <path d={BOTTLE} fill="none" strokeWidth={3} className="stroke-current opacity-40" />
          <rect x={34} y={0} width={32} height={8} rx={3} className="fill-current opacity-60" />
        </svg>

        <div className="min-w-0 flex-1 space-y-3">
          <p aria-live="polite">
            <span className="block text-display tabular-nums leading-none">{liters(shown)}</span>
            <span className="mt-1 block text-label muted">
              von {liters(targetMl)} · {fmt(pct * 100)} %
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5" aria-hidden>
            {Array.from({ length: glasses }, (_, i) => {
              const fill = Math.min(1, Math.max(0, filled - i));
              return (
                <span key={i} className="relative h-6 w-4 overflow-hidden rounded-b-[5px] rounded-t-[2px] bg-surface-muted">
                  <span className="absolute inset-x-0 bottom-0 bg-macro-protein transition-[height] duration-300 ease-out" style={{ height: `${fill * 100}%` }} />
                </span>
              );
            })}
          </div>
          <p className="text-caption muted">
            {fmt(Math.floor(filled))} von {glasses} Gläsern à 250 ml
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
        <button type="button" className="btn-secondary min-h-14 px-4" onClick={() => change(-GLASS)} disabled={shown <= 0} aria-label="Ein Glas weniger">
          <Icon name="minus" size={22} />
        </button>
        <button type="button" className="btn-secondary min-h-14 flex-col gap-0 leading-tight" onClick={() => change(GLASS)}>
          <span className="text-body font-semibold">+ Glas</span>
          <span className="text-caption muted">250 ml</span>
        </button>
        <button type="button" className="btn-secondary min-h-14 flex-col gap-0 leading-tight" onClick={() => change(500)}>
          <span className="text-body font-semibold">+ Flasche</span>
          <span className="text-caption muted">500 ml</span>
        </button>
      </div>
    </section>
  );
}

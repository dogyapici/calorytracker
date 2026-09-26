"use client";

import { useOptimistic, useTransition } from "react";
import { addWater } from "@/app/tracking-actions";
import { Icon } from "@/components/icons";
import { fmt } from "@/lib/nutrition";

const GLASS = 250;

export function WaterTracker({ day, ml, targetMl }: { day: string; ml: number; targetMl: number }) {
  const [shown, setShown] = useOptimistic(ml, (current, delta: number) => Math.max(0, current + delta));
  const [, startTransition] = useTransition();
  const change = (delta: number) =>
    startTransition(async () => {
      setShown(delta);
      await addWater(day, delta);
    });

  const glasses = Math.min(12, Math.max(1, Math.round(targetMl / GLASS)));
  const full = shown / GLASS;
  const done = shown >= targetMl;

  return (
    <section className="card space-y-4" aria-label="Wasser">
      <div className="flex items-baseline justify-between">
        <h2 className="text-h3">
          <span aria-hidden className="mr-1.5">💧</span>Wasser
        </h2>
        <p className="tabular-nums" aria-live="polite">
          <span className="text-body font-semibold">{fmt(shown / 1000, 2)}</span>
          <span className="text-caption muted"> / {fmt(targetMl / 1000, 1)} l</span>
          {done && <span className="ml-1.5" aria-label="Ziel erreicht">🎉</span>}
        </p>
      </div>

      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${glasses}, minmax(0, 1fr))` }} aria-hidden>
        {Array.from({ length: glasses }, (_, i) => {
          const fill = Math.min(1, Math.max(0, full - i));
          return (
            <div key={i} className="relative h-10 overflow-hidden rounded-b-chip rounded-t-sm border-2 border-macro-protein/40 bg-surface-muted">
              <div className="absolute inset-x-0 bottom-0 bg-macro-protein transition-[height] duration-300 ease-out" style={{ height: `${fill * 100}%` }} />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
        <button type="button" className="btn-secondary px-3" onClick={() => change(-GLASS)} disabled={shown <= 0} aria-label="Ein Glas weniger">
          <Icon name="minus" size={20} />
        </button>
        <button type="button" className="btn-secondary gap-1.5" onClick={() => change(GLASS)}>
          <Icon name="add" size={18} /> 250 ml
        </button>
        <button type="button" className="btn-secondary gap-1.5" onClick={() => change(500)}>
          <Icon name="add" size={18} /> 500 ml
        </button>
      </div>
    </section>
  );
}

"use client";

import { useActionState, useState } from "react";
import { saveTrackingGoals } from "@/app/tracking-actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import type { MealSplit } from "@/db/schema";
import { checkMealSplit, DEFAULT_MEAL_SPLIT, fmt, MEALS, type MealKey } from "@/lib/nutrition";

export function TrackingGoalsForm({ kcalTarget, mealSplit, waterTargetMl }: { kcalTarget: number; mealSplit: MealSplit | null; waterTargetMl: number }) {
  const [state, action] = useActionState(saveTrackingGoals, undefined);
  const [enabled, setEnabled] = useState(mealSplit !== null);
  const [split, setSplit] = useState<Record<MealKey, string>>(
    Object.fromEntries(MEALS.map((m) => [m.key, String((mealSplit ?? DEFAULT_MEAL_SPLIT)[m.key])])) as Record<MealKey, string>,
  );
  const numbers = Object.fromEntries(MEALS.map((m) => [m.key, Number(split[m.key].replace(",", "."))])) as Record<MealKey, number>;
  const check = checkMealSplit(numbers);

  return (
    <form action={action} className="card space-y-4">
      <h2 className="text-h3">Mahlzeiten & Wasser</h2>

      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="block font-medium">Kalorienziel pro Mahlzeit</span>
          <span className="block text-caption muted">Teilt dein Tagesziel auf, jede Mahlzeit bekommt einen eigenen Ring.</span>
        </span>
        <input type="checkbox" name="mealTargets" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-6 w-6 shrink-0 accent-[var(--color-primary)]" />
      </label>

      {enabled && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            {MEALS.map((m) => (
              <div key={m.key}>
                <label className="label" htmlFor={`split_${m.key}`}>
                  <span aria-hidden>{m.emoji}</span> {m.label} (%)
                </label>
                <input
                  className="input tabular-nums"
                  id={`split_${m.key}`}
                  name={`split_${m.key}`}
                  inputMode="numeric"
                  value={split[m.key]}
                  onChange={(e) => setSplit((s) => ({ ...s, [m.key]: e.target.value }))}
                />
                <p className="mt-1 text-xs tabular-nums muted">= {Number.isFinite(numbers[m.key]) ? fmt((kcalTarget * numbers[m.key]) / 100) : "–"} kcal</p>
              </div>
            ))}
          </div>
          <p className={`rounded-button px-3 py-2 text-sm ${check.ok ? "bg-primary-soft text-primary" : "bg-warning/10 text-warning"}`} aria-live="polite">
            {check.ok ? `Passt: zusammen 100 % von ${fmt(kcalTarget)} kcal.` : check.error}
          </p>
        </div>
      )}

      <div>
        <label className="label" htmlFor="waterTargetMl">Wasserziel pro Tag (ml)</label>
        <input className="input tabular-nums" id="waterTargetMl" name="waterTargetMl" inputMode="numeric" defaultValue={waterTargetMl} required />
      </div>

      <FormMessage state={state} />
      {!enabled || check.ok ? <SubmitButton>Speichern</SubmitButton> : <button type="button" className="btn-primary w-full" disabled>Speichern</button>}
    </form>
  );
}

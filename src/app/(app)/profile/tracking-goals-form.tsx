"use client";

import { useActionState, useState } from "react";
import { saveTrackingGoals } from "@/app/tracking-actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import type { MealSplit } from "@/db/schema";
import { checkMealSplit, DEFAULT_MEAL_SPLIT, fmt, MEALS, type MealKey } from "@/lib/nutrition";
import { ProfileSection } from "@/components/profile-section";

const WATER_PRESETS = [1500, 2000, 2500, 3000];
const toInputs = (split: Record<MealKey, number>) => Object.fromEntries(MEALS.map((m) => [m.key, String(split[m.key])])) as Record<MealKey, string>;

export function TrackingGoalsForm({ kcalTarget, mealSplit, waterTargetMl }: { kcalTarget: number; mealSplit: MealSplit | null; waterTargetMl: number }) {
  const [state, action] = useActionState(saveTrackingGoals, undefined);
  const [split, setSplit] = useState(toInputs(mealSplit ?? DEFAULT_MEAL_SPLIT));
  const [water, setWater] = useState(String(waterTargetMl));
  const numbers = Object.fromEntries(MEALS.map((m) => [m.key, Number(split[m.key].replace(",", "."))])) as Record<MealKey, number>;
  const check = checkMealSplit(numbers);
  const isDefault = MEALS.every((m) => numbers[m.key] === DEFAULT_MEAL_SPLIT[m.key]);
  const waterMl = Number(water);

  const summary = `${MEALS.map((m) => (Number.isFinite(numbers[m.key]) ? numbers[m.key] : "–")).join(" / ")} % · Wasser ${Number.isFinite(waterMl) ? fmt(waterMl / 1000, 1) : "–"} l`;

  return (
    <form action={action}>
      <ProfileSection id="meals" icon="meals" title="Mahlzeiten & Wasser" summary={summary}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Kalorienziel pro Mahlzeit</p>
              <p className="text-caption muted">So teilt sich dein Tagesziel auf die Ringe im Tagebuch auf.</p>
            </div>
            {!isDefault && (
              <button type="button" className="btn-secondary shrink-0 px-3 py-1.5 text-xs" onClick={() => setSplit(toInputs(DEFAULT_MEAL_SPLIT))}>
                Standard
              </button>
            )}
          </div>

          <ul className="divide-y divide-border rounded-button bg-surface-muted/60">
            {MEALS.map((m) => (
              <li key={m.key} className="flex items-center gap-3 px-3 py-2">
                <span aria-hidden className="text-xl">{m.emoji}</span>
                <label htmlFor={`split_${m.key}`} className="min-w-0 flex-1">
                  <span className="block text-label">{m.label}</span>
                  <span className="block text-caption tabular-nums muted">
                    {Number.isFinite(numbers[m.key]) ? fmt((kcalTarget * numbers[m.key]) / 100) : "–"} kcal
                  </span>
                </label>
                <div className="relative w-24">
                  <input
                    className="input pr-8 text-right tabular-nums"
                    id={`split_${m.key}`}
                    name={`split_${m.key}`}
                    inputMode="numeric"
                    value={split[m.key]}
                    onChange={(e) => setSplit((s) => ({ ...s, [m.key]: e.target.value }))}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-label muted">%</span>
                </div>
              </li>
            ))}
          </ul>
          <p className={`rounded-button px-3 py-2 text-sm ${check.ok ? "bg-primary-soft text-primary" : "bg-warning/10 text-warning"}`} aria-live="polite">
            {check.ok ? `Passt: zusammen 100 % von ${fmt(kcalTarget)} kcal.` : check.error}
          </p>
        </div>

        <div className="space-y-2">
          <label className="block font-medium" htmlFor="waterTargetMl">
            Wasserziel pro Tag
          </label>
          <div className="grid grid-cols-4 gap-1 rounded-button bg-surface-muted p-1" role="radiogroup" aria-label="Wasserziel wählen">
            {WATER_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={waterMl === p}
                onClick={() => setWater(String(p))}
                className={`min-h-touch rounded-chip text-label tabular-nums transition-colors duration-150 ${waterMl === p ? "bg-surface text-text-primary shadow-card" : "text-text-secondary"}`}
              >
                {fmt(p / 1000, 1)} l
              </button>
            ))}
          </div>
          <div className="relative">
            <input className="input pr-10 tabular-nums" id="waterTargetMl" name="waterTargetMl" inputMode="numeric" value={water} onChange={(e) => setWater(e.target.value)} required />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-label muted">ml</span>
          </div>
        </div>

        <FormMessage state={state} />
        {check.ok ? <SubmitButton>Speichern</SubmitButton> : <button type="button" className="btn-primary w-full" disabled>Speichern</button>}
      </ProfileSection>
    </form>
  );
}

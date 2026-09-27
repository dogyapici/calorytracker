import type { Entry, Profile } from "@/db/schema";
import { NutrientBreakdown } from "@/components/nutrient-details";
import { ProgressBar } from "@/components/progress";
import { fmt, MEALS, mealTarget, sumNutrients } from "@/lib/nutrition";

const MACROS = [
  { key: "protein", label: "Eiweiß", color: "bg-macro-protein", kcalPerGram: 4, target: (p: Profile) => p.proteinTarget },
  { key: "carbs", label: "Kohlenhydrate", color: "bg-macro-carbs", kcalPerGram: 4, target: (p: Profile) => p.carbsTarget },
  { key: "fat", label: "Fett", color: "bg-macro-fat", kcalPerGram: 9, target: (p: Profile) => p.fatTarget },
] as const;

/** Everything eaten on a day: calories, macros with their share, meals, and all other nutrients. */
export function DayNutrition({ entries, profile }: { entries: Entry[]; profile: Profile }) {
  const total = sumNutrients(entries);
  const remaining = profile.kcalTarget - total.kcal;
  const macroKcal = MACROS.reduce((s, m) => s + total[m.key] * m.kcalPerGram, 0);

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <p className="tabular-nums">
            <span className="text-display">{fmt(total.kcal)}</span>
            <span className="ml-1 text-body muted">/ {fmt(profile.kcalTarget)} kcal</span>
          </p>
          <p className={`pb-1 text-label font-semibold ${remaining < 0 ? "text-warning" : "text-primary"}`}>
            {remaining < 0 ? `${fmt(-remaining)} kcal über Ziel` : `noch ${fmt(remaining)} kcal`}
          </p>
        </div>
        <ProgressBar value={total.kcal} max={profile.kcalTarget} color="bg-accent-calories" />
      </section>

      <section className="space-y-3">
        <h3 className="text-h3">Makros</h3>
        {macroKcal > 0 && (
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
            {MACROS.map((m) => (
              <span key={m.key} className={`h-full ${m.color}`} style={{ width: `${((total[m.key] * m.kcalPerGram) / macroKcal) * 100}%` }} />
            ))}
          </div>
        )}
        <ul className="space-y-3">
          {MACROS.map((m) => {
            const target = m.target(profile);
            const value = total[m.key];
            return (
              <li key={m.key} className="rounded-button bg-surface-muted/60 px-3.5 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 text-label font-semibold">
                    <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${m.color}`} />
                    {m.label}
                  </span>
                  <span className="tabular-nums">
                    <span className="font-semibold">{fmt(value, 1)}</span>
                    <span className="text-caption muted"> / {fmt(target)} g</span>
                  </span>
                </div>
                <div className="my-2">
                  <ProgressBar value={value} max={target} color={m.color} />
                </div>
                <div className="flex justify-between text-caption tabular-nums muted">
                  <span>{target > 0 ? `${fmt((value / target) * 100)} % vom Ziel` : "–"}</span>
                  <span>
                    {fmt(value * m.kcalPerGram)} kcal · {macroKcal > 0 ? fmt(((value * m.kcalPerGram) / macroKcal) * 100) : 0} % Anteil
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-h3">Mahlzeiten</h3>
        <ul className="divide-y divide-border">
          {MEALS.map((meal) => {
            const n = sumNutrients(entries.filter((e) => e.meal === meal.key));
            const target = mealTarget(profile.kcalTarget, profile.mealSplit, meal.key);
            return (
              <li key={meal.key} className="flex items-center gap-3 py-2.5">
                <span aria-hidden className="text-xl">
                  {meal.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-label font-semibold">{meal.label}</span>
                  <span className="block text-caption tabular-nums muted">
                    E {fmt(n.protein)} g · K {fmt(n.carbs)} g · F {fmt(n.fat)} g
                  </span>
                </span>
                <span className="text-right tabular-nums">
                  <span className="block font-semibold">{fmt(n.kcal)}</span>
                  <span className="block text-caption muted">/ {fmt(target)} kcal</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-h3">Weitere Nährwerte</h3>
        {entries.length ? <NutrientBreakdown entries={entries} kcalTarget={profile.kcalTarget} /> : <p className="text-label muted">Noch nichts eingetragen.</p>}
      </section>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { createCustomFood } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";

const NUTRIENTS = [
  ["kcal", "Kalorien (kcal)", true],
  ["protein", "Eiweiß (g)", false],
  ["carbs", "Kohlenhydrate (g)", false],
  ["sugar", "davon Zucker (g)", false],
  ["fat", "Fett (g)", false],
  ["fiber", "Ballaststoffe (g)", false],
  ["salt", "Salz (g)", false],
] as const;

export function CustomFoodForm({ day, meal }: { day: string; meal: string }) {
  const [state, action] = useActionState(createCustomFood, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="meal" value={meal} />
      <div className="card space-y-3">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input className="input" id="name" name="name" defaultValue={state?.values?.name} required placeholder="z. B. Omas Linsensuppe" />
        </div>
        <div>
          <label className="label" htmlFor="brand">Marke (optional)</label>
          <input className="input" id="brand" name="brand" defaultValue={state?.values?.brand} />
        </div>
      </div>
      <div className="card space-y-3">
        <h2 className="font-semibold">Nährwerte pro 100 g</h2>
        <div className="grid grid-cols-2 gap-3">
          {NUTRIENTS.map(([key, label, required]) => (
            <div key={key}>
              <label className="label" htmlFor={key}>{label}</label>
              <input className="input tabular-nums" id={key} name={key} inputMode="decimal" required={required} defaultValue={state?.values?.[key]} />
            </div>
          ))}
        </div>
      </div>
      <div className="card space-y-3">
        <h2 className="font-semibold">Portion (optional)</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="servingGrams">Gramm pro Portion</label>
            <input className="input tabular-nums" id="servingGrams" name="servingGrams" inputMode="decimal" defaultValue={state?.values?.servingGrams} />
          </div>
          <div>
            <label className="label" htmlFor="servingLabel">Bezeichnung</label>
            <input className="input" id="servingLabel" name="servingLabel" defaultValue={state?.values?.servingLabel} placeholder="z. B. 1 Teller" />
          </div>
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton>Speichern und eintragen</SubmitButton>
    </form>
  );
}

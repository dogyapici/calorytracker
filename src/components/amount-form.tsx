"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { fmt, MEALS, scaleNutrients, type Nutrients } from "@/lib/nutrition";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  per100: Nutrients;
  hidden: Record<string, string | number>;
  initialGrams: number;
  initialMeal: string;
  serving?: { grams: number; label: string | null } | null;
  submitLabel: string;
};

function parseAmount(value: string) {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function AmountForm({ action, per100, hidden, initialGrams, initialMeal, serving, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, undefined);
  const [grams, setGrams] = useState(String(initialGrams));
  const n = scaleNutrients(per100, parseAmount(grams));

  const quick = [
    ...(serving ? [{ label: serving.label ? `1 Portion (${serving.label})` : `1 Portion (${fmt(serving.grams)} g)`, grams: serving.grams }] : []),
    { label: "50 g", grams: 50 },
    { label: "100 g", grams: 100 },
    { label: "200 g", grams: 200 },
  ];

  return (
    <form action={formAction} className="card space-y-4">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="grams">Menge (g bzw. ml)</label>
          <input
            className="input text-lg tabular-nums"
            id="grams"
            name="grams"
            inputMode="decimal"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            onFocus={(e) => e.target.select()}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="meal">Mahlzeit</label>
          <select className="input" id="meal" name="meal" defaultValue={initialMeal}>
            {MEALS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <button key={q.label} type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setGrams(String(q.grams))}>
            {q.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 rounded-button bg-surface-muted p-3 text-center">
        {[
          ["kcal", n.kcal, 0],
          ["Eiweiß", n.protein, 1],
          ["Kohlenh.", n.carbs, 1],
          ["Fett", n.fat, 1],
        ].map(([label, value, digits]) => (
          <div key={label as string}>
            <p className="text-h2">{fmt(value as number, digits as number)}</p>
            <p className="text-caption muted">{label}</p>
          </div>
        ))}
      </div>
      <FormMessage state={state} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

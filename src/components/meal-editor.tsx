"use client";

import { useActionState, useState } from "react";
import { saveMeal } from "@/app/meal-actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { IngredientPicker, parseAmount, type EditorIngredient } from "@/components/ingredient-picker";
import { fmt, scaleNutrients, sumNutrients } from "@/lib/nutrition";

type Props = {
  meal?: { id: number; name: string };
  initialItems: EditorIngredient[];
  day: string;
  mealKey: string;
};

/** Puts together a reusable meal from searched or scanned foods, without going through the diary. */
export function MealEditor({ meal, initialItems, day, mealKey }: Props) {
  const [state, action] = useActionState(saveMeal, undefined);
  const [items, setItems] = useState<EditorIngredient[]>(initialItems);
  const total = sumNutrients(items.map((i) => scaleNutrients(i, parseAmount(i.grams))));

  return (
    <form action={action} className="space-y-4">
      {meal && <input type="hidden" name="id" value={meal.id} />}
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="meal" value={mealKey} />
      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ foodId: i.foodId, grams: parseAmount(i.grams) })))} />

      <div className="card">
        <label className="label" htmlFor="name">Name</label>
        <input className="input" id="name" name="name" defaultValue={meal?.name} placeholder="z. B. Mein Frühstück mit Müsli" required maxLength={80} />
      </div>

      <IngredientPicker title="Lebensmittel" emptyText="Noch leer. Suche Lebensmittel oder scanne einen Barcode." ingredients={items} onChange={setItems} />

      {items.length > 0 && (
        <section className="card grid grid-cols-4 gap-2 text-center">
          {(
            [
              ["kcal", total.kcal, 0],
              ["Eiweiß", total.protein, 1],
              ["Kohlenh.", total.carbs, 1],
              ["Fett", total.fat, 1],
            ] as const
          ).map(([label, value, digits]) => (
            <div key={label}>
              <p className="text-h3 tabular-nums">{fmt(value, digits)}</p>
              <p className="text-caption muted">{label === "kcal" ? "kcal" : `g ${label}`}</p>
            </div>
          ))}
        </section>
      )}

      <FormMessage state={state} />
      <SubmitButton>{meal ? "Mahlzeit speichern" : "Mahlzeit anlegen"}</SubmitButton>
    </form>
  );
}

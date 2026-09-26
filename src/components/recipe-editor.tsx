"use client";

import { useActionState, useState } from "react";
import { saveRecipe } from "@/app/recipe-actions";
import { IngredientPicker, parseAmount, type EditorIngredient } from "@/components/ingredient-picker";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { fmt, scaleNutrients, sumNutrients } from "@/lib/nutrition";

export type { EditorIngredient };

type Props = {
  recipe?: { id: number; name: string; servings: number; cookedGrams: number | null };
  initialIngredients: EditorIngredient[];
  day: string;
  meal: string;
};

export function RecipeEditor({ recipe, initialIngredients, day, meal }: Props) {
  const [state, action] = useActionState(saveRecipe, undefined);
  const [name, setName] = useState(recipe?.name ?? "");
  const [servings, setServings] = useState(String(recipe?.servings ?? 4));
  const [cooked, setCooked] = useState(recipe?.cookedGrams ? String(recipe.cookedGrams) : "");
  const [ingredients, setIngredients] = useState<EditorIngredient[]>(initialIngredients);

  const rawGrams = ingredients.reduce((s, i) => s + parseAmount(i.grams), 0);
  const totalGrams = parseAmount(cooked) || rawGrams;
  const total = sumNutrients(ingredients.map((i) => scaleNutrients(i, parseAmount(i.grams))));
  const portions = Math.max(1, Math.round(parseAmount(servings)) || 1);

  return (
    <form action={action} className="space-y-4">
      {recipe && <input type="hidden" name="id" value={recipe.id} />}
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="meal" value={meal} />
      <input
        type="hidden"
        name="ingredients"
        value={JSON.stringify(ingredients.map((i) => ({ foodId: i.foodId, grams: parseAmount(i.grams) })))}
      />

      <div className="card space-y-3">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input className="input" id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Chili con Carne" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="servings">Portionen</label>
            <input className="input tabular-nums" id="servings" name="servings" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="cookedGrams">Gewicht fertig (g, optional)</label>
            <input
              className="input tabular-nums"
              id="cookedGrams"
              name="cookedGrams"
              inputMode="decimal"
              value={cooked}
              onChange={(e) => setCooked(e.target.value)}
              placeholder={rawGrams ? fmt(rawGrams) : ""}
            />
          </div>
        </div>
        <p className="text-caption muted">
          Wenn du den Topf nach dem Kochen wiegst (ohne Topf), stimmen die Werte pro 100 g genauer, weil beim Kochen Wasser verdampft.
        </p>
      </div>

      <IngredientPicker title="Zutaten" emptyText="Noch keine Zutaten. Suche unten oder scanne einen Barcode." ingredients={ingredients} onChange={setIngredients} />

      {ingredients.length > 0 && (
        <section className="card grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-h2">{fmt(total.kcal / portions)}</p>
            <p className="text-caption muted">kcal pro Portion</p>
          </div>
          <div>
            <p className="text-h2">{fmt(totalGrams / portions)} g</p>
            <p className="text-caption muted">pro Portion</p>
          </div>
          <div>
            <p className="text-h2">{fmt(totalGrams ? (total.kcal / totalGrams) * 100 : 0)}</p>
            <p className="text-caption muted">kcal / 100 g</p>
          </div>
          <p className="col-span-3 text-caption muted">
            Pro Portion: {fmt(total.protein / portions, 1)} g Eiweiß · {fmt(total.carbs / portions, 1)} g Kohlenh. · {fmt(total.fat / portions, 1)} g Fett
          </p>
        </section>
      )}

      <FormMessage state={state} />
      <SubmitButton>{recipe ? "Rezept speichern" : "Rezept anlegen"}</SubmitButton>
    </form>
  );
}

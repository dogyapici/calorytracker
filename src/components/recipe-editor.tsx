"use client";

import { useActionState, useState, useTransition } from "react";
import { importBarcode, saveRecipe, searchIngredients, type IngredientOption } from "@/app/recipe-actions";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { fmt, scaleNutrients, sumNutrients } from "@/lib/nutrition";

export type EditorIngredient = IngredientOption & { foodId: number; grams: string };

type Props = {
  recipe?: { id: number; name: string; servings: number; cookedGrams: number | null };
  initialIngredients: EditorIngredient[];
  day: string;
  meal: string;
};

function parseAmount(value: string) {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function RecipeEditor({ recipe, initialIngredients, day, meal }: Props) {
  const [state, action] = useActionState(saveRecipe, undefined);
  const [name, setName] = useState(recipe?.name ?? "");
  const [servings, setServings] = useState(String(recipe?.servings ?? 4));
  const [cooked, setCooked] = useState(recipe?.cookedGrams ? String(recipe.cookedGrams) : "");
  const [ingredients, setIngredients] = useState<EditorIngredient[]>(initialIngredients);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IngredientOption[] | null>(null);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();

  const rawGrams = ingredients.reduce((s, i) => s + parseAmount(i.grams), 0);
  const totalGrams = parseAmount(cooked) || rawGrams;
  const total = sumNutrients(ingredients.map((i) => scaleNutrients(i, parseAmount(i.grams))));
  const portions = Math.max(1, Math.round(parseAmount(servings)) || 1);

  const add = (option: IngredientOption) => {
    if (option.foodId === null) return;
    setIngredients((list) => [...list, { ...option, foodId: option.foodId!, grams: String(option.servingGrams ?? 100) }]);
    setResults(null);
    setQuery("");
    setSearchNote(null);
  };

  const pick = (option: IngredientOption) => {
    if (option.foodId !== null) return add(option);
    // Open Food Facts hit that is not cached yet: import it first so it has an id.
    startSearch(async () => {
      const food = option.barcode ? await importBarcode(option.barcode) : null;
      if (food) add(food);
      else setSearchNote("Dieses Produkt konnte nicht geladen werden.");
    });
  };

  const search = () => {
    if (!query.trim()) return;
    startSearch(async () => {
      const { items, remoteError } = await searchIngredients(query);
      setResults(items);
      setSearchNote(remoteError ? "Open Food Facts ist gerade nicht erreichbar, es werden nur bekannte Lebensmittel gezeigt." : items.length ? null : "Keine Treffer.");
    });
  };

  const onScan = (code: string) => {
    startSearch(async () => {
      const food = await importBarcode(code);
      if (food) add(food);
      else setSearchNote(`Kein Produkt mit Barcode ${code} gefunden.`);
    });
  };

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
        <p className="text-xs muted">
          Wenn du den Topf nach dem Kochen wiegst (ohne Topf), stimmen die Werte pro 100 g genauer, weil beim Kochen Wasser verdampft.
        </p>
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">Zutaten</h2>
        {ingredients.length === 0 && <p className="text-sm muted">Noch keine Zutaten. Suche unten oder scanne einen Barcode.</p>}
        <ul className="space-y-2">
          {ingredients.map((ing, idx) => (
            <li key={`${ing.foodId}-${idx}`} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ing.name}</p>
                <p className="truncate text-xs muted">
                  {[ing.brand, `${fmt(scaleNutrients(ing, parseAmount(ing.grams)).kcal)} kcal`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <input
                className="input w-20 px-2 py-1.5 text-right tabular-nums"
                aria-label={`Menge ${ing.name} in Gramm`}
                inputMode="decimal"
                value={ing.grams}
                onChange={(e) => setIngredients((list) => list.map((x, i) => (i === idx ? { ...x, grams: e.target.value } : x)))}
                onFocus={(e) => e.target.select()}
              />
              <span className="text-sm muted">g</span>
              <button
                type="button"
                className="btn px-2 py-1 text-zinc-400 hover:text-red-600"
                aria-label={`${ing.name} entfernen`}
                onClick={() => setIngredients((list) => list.filter((_, i) => i !== idx))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div className="flex gap-2">
            <input
              className="input"
              type="search"
              placeholder="Zutat suchen oder Barcode eingeben"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  search();
                }
              }}
              enterKeyHint="search"
            />
            <button type="button" className="btn-secondary" onClick={search} disabled={searching}>
              {searching ? "…" : "Suchen"}
            </button>
          </div>
          <BarcodeScanner onCode={onScan} />
          {searchNote && <p className="text-sm muted">{searchNote}</p>}
          {results && results.length > 0 && (
            <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {results.map((r) => (
                <li key={r.foodId ? `f${r.foodId}` : `o${r.barcode}`}>
                  <button type="button" className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50" onClick={() => pick(r)} disabled={searching}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.name}</span>
                      <span className="block truncate text-xs muted">{r.brand ?? " "}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums muted">{fmt(r.kcal)} kcal/100 g</span>
                    <span className="shrink-0 font-semibold text-brand-600">+</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {ingredients.length > 0 && (
        <section className="card grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold tabular-nums">{fmt(total.kcal / portions)}</p>
            <p className="text-xs muted">kcal pro Portion</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{fmt(totalGrams / portions)} g</p>
            <p className="text-xs muted">pro Portion</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{fmt(totalGrams ? (total.kcal / totalGrams) * 100 : 0)}</p>
            <p className="text-xs muted">kcal / 100 g</p>
          </div>
          <p className="col-span-3 text-xs muted">
            Pro Portion: {fmt(total.protein / portions, 1)} g Eiweiß · {fmt(total.carbs / portions, 1)} g Kohlenh. · {fmt(total.fat / portions, 1)} g Fett
          </p>
        </section>
      )}

      <FormMessage state={state} />
      <SubmitButton>{recipe ? "Rezept speichern" : "Rezept anlegen"}</SubmitButton>
    </form>
  );
}

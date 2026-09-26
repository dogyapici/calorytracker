"use client";

import { useState, useTransition } from "react";
import { importBarcode, searchIngredients, type IngredientOption } from "@/app/recipe-actions";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Icon } from "@/components/icons";
import { fmt, scaleNutrients } from "@/lib/nutrition";

export type EditorIngredient = IngredientOption & { foodId: number; grams: string };

export function parseAmount(value: string) {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** List of foods with amounts plus search and barcode scan to add more (recipes and saved meals). */
export function IngredientPicker({
  title,
  emptyText,
  ingredients,
  onChange: setIngredients,
}: {
  title: string;
  emptyText: string;
  ingredients: EditorIngredient[];
  onChange: (update: (list: EditorIngredient[]) => EditorIngredient[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IngredientOption[] | null>(null);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();

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
      <section className="card space-y-3">
        <h2 className="text-h3">{title}</h2>
        {ingredients.length === 0 && <p className="text-sm muted">{emptyText}</p>}
        <ul className="space-y-2">
          {ingredients.map((ing, idx) => (
            <li key={`${ing.foodId}-${idx}`} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ing.name}</p>
                <p className="truncate text-caption muted">
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
                className="btn px-2 py-1 text-text-tertiary hover:text-danger"
                aria-label={`${ing.name} entfernen`}
                onClick={() => setIngredients((list) => list.filter((_, i) => i !== idx))}
              >
                <Icon name="remove" size={20} />
              </button>
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t border-border pt-3">
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
            <ul className="divide-y divide-border rounded-button border border-border">
              {results.map((r) => (
                <li key={r.foodId ? `f${r.foodId}` : `o${r.barcode}`}>
                  <button type="button" className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-muted" onClick={() => pick(r)} disabled={searching}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.name}</span>
                      <span className="block truncate text-caption muted">{r.brand ?? " "}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums muted">{fmt(r.kcal)} kcal/100 g</span>
                    <span className="shrink-0 font-semibold text-primary">+</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { addEntry, deleteCustomFood, toggleFavorite } from "@/app/actions";
import { AmountForm } from "@/components/amount-form";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { MICROS } from "@/lib/micros";
import { fmt, MEALS } from "@/lib/nutrition";
import { getOrImportBarcode, getRecipe, getVisibleFood, isFavorite } from "@/lib/queries";
import { Icon } from "@/components/icons";

export const metadata = { title: "Lebensmittel" };

export default async function FoodPage({ params, searchParams }: PageProps<"/food/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  let food = await getVisibleFood(user.id, Number(id));
  if (!food) notFound();
  // Products cached before vitamins and minerals were stored get them fetched once.
  if (food.source === "off" && food.barcode && !food.micros) {
    food = (await getOrImportBarcode(food.barcode).catch(() => null)) ?? food;
  }

  const day = dayOrToday(sp.day);
  const meal = MEALS.find((m) => m.key === sp.meal)?.key ?? "snack";
  const [favorite, recipe] = await Promise.all([
    isFavorite(user.id, food.id),
    food.source === "recipe" ? getRecipe(user.id, food.id) : null,
  ]);

  const microRows = MICROS.filter((m) => food.micros?.[m.key] !== undefined).map((m) => ({ ...m, value: food.micros![m.key]! }));

  const rows: [string, number | null, string][] = [
    ["Energie", food.kcal, "kcal"],
    ["Fett", food.fat, "g"],
    ["davon gesättigte Fettsäuren", food.saturatedFat, "g"],
    ["Kohlenhydrate", food.carbs, "g"],
    ["davon Zucker", food.sugar, "g"],
    ["Ballaststoffe", food.fiber, "g"],
    ["Eiweiß", food.protein, "g"],
    ["Salz", food.salt, "g"],
  ];

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3">
        <Link href={`/add?day=${day}&meal=${meal}`} className="btn-secondary px-3" aria-label="Zurück">
          <Icon name="back" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-h2">{food.name}</h1>
          <p className="text-sm muted">{[food.brand, food.source === "custom" ? "Eigenes Lebensmittel" : food.source === "recipe" ? "Rezept" : null].filter(Boolean).join(" · ")}</p>
        </div>
        <form action={toggleFavorite}>
          <input type="hidden" name="foodId" value={food.id} />
          <button className={`btn px-3 text-xl ${favorite ? "text-macro-carbs" : "text-text-tertiary"}`} aria-label={favorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}>
            <Icon name="star" filled={favorite} />
          </button>
        </form>
      </header>

      <AmountForm
        action={addEntry}
        per100={food}
        hidden={{ foodId: food.id, day }}
        initialGrams={food.servingGrams ?? 100}
        initialMeal={meal}
        serving={food.servingGrams ? { grams: food.servingGrams, label: food.servingLabel } : null}
        submitLabel="Eintragen"
      />

      {recipe && (
        <section className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-h3">Zutaten</h2>
            <Link href={`/recipes/${food.id}?day=${day}&meal=${meal}`} className="text-sm font-semibold text-primary">
              Bearbeiten
            </Link>
          </div>
          <ul className="text-sm">
            {recipe.ingredients.map(({ food: ing, grams }, i) => (
              <li key={i} className="flex justify-between gap-3 border-t border-border py-1.5 first:border-0">
                <span className="truncate">{ing.name}</span>
                <span className="shrink-0 tabular-nums muted">{fmt(grams)} g</span>
              </li>
            ))}
          </ul>
          {food.recipeServings && food.recipeServings > 1 && (
            <p className="mt-2 text-caption muted">
              Ergibt {food.recipeServings} Portionen à {fmt(food.servingGrams ?? 0)} g.
            </p>
          )}
        </section>
      )}

      <section className="card">
        <h2 className="mb-2 text-h3">Nährwerte pro 100 g</h2>
        <table className="w-full text-sm">
          <tbody>
            {rows
              .filter(([, v]) => v !== null)
              .map(([label, value, unit]) => (
                <tr key={label} className="border-t border-border first:border-0">
                  <td className={`py-1.5 ${label.startsWith("davon") ? "pl-4 muted" : ""}`}>{label}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {fmt(value as number, 1)} {unit}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {food.barcode && (
          <p className="mt-3 text-caption muted">
            Quelle:{" "}
            <a className="underline" href={`https://de.openfoodfacts.org/produkt/${food.barcode}`} target="_blank" rel="noreferrer">
              Open Food Facts
            </a>{" "}
            (ODbL) · Barcode {food.barcode}
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="mb-1 text-h3">Vitamine und Mineralstoffe pro 100 g</h2>
        {microRows.length ? (
          <>
            <p className="mb-2 text-caption muted">Prozent vom Tagesbedarf eines Erwachsenen (DGE, gerundet).</p>
            <table className="w-full text-sm">
              <tbody>
                {microRows.map((m) => (
                  <tr key={m.key} className="border-t border-border first:border-0">
                    <td className="py-1.5">{m.label}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {fmt(m.value, m.value < 10 ? 2 : 0)} {m.unit}
                    </td>
                    <td className="w-16 py-1.5 text-right tabular-nums muted">{fmt((m.value / m.reference) * 100)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-sm muted">
            {food.source === "off"
              ? "Open Food Facts hat für dieses Produkt keine Angaben zu Vitaminen und Mineralstoffen."
              : food.source === "recipe"
                ? "Keine der Zutaten hat Angaben zu Vitaminen und Mineralstoffen."
                : "Für eigene Lebensmittel sind keine Vitamin- und Mineralstoffangaben hinterlegt."}
          </p>
        )}
      </section>

      {food.ownerId === user.id && food.source === "custom" && (
        <form action={deleteCustomFood}>
          <input type="hidden" name="foodId" value={food.id} />
          <button className="btn-danger w-full">Eigenes Lebensmittel löschen</button>
        </form>
      )}
    </div>
  );
}

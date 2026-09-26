import Link from "next/link";
import { notFound } from "next/navigation";
import { addEntry, deleteCustomFood, toggleFavorite } from "@/app/actions";
import { AmountForm } from "@/components/amount-form";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { fmt, MEALS } from "@/lib/nutrition";
import { getRecipe, getVisibleFood, isFavorite } from "@/lib/queries";

export const metadata = { title: "Lebensmittel" };

export default async function FoodPage({ params, searchParams }: PageProps<"/food/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const food = await getVisibleFood(user.id, Number(id));
  if (!food) notFound();

  const day = dayOrToday(sp.day);
  const meal = MEALS.find((m) => m.key === sp.meal)?.key ?? "snack";
  const [favorite, recipe] = await Promise.all([
    isFavorite(user.id, food.id),
    food.source === "recipe" ? getRecipe(user.id, food.id) : null,
  ]);

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
          ‹
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-tight">{food.name}</h1>
          <p className="text-sm muted">{[food.brand, food.source === "custom" ? "Eigenes Lebensmittel" : food.source === "recipe" ? "Rezept" : null].filter(Boolean).join(" · ")}</p>
        </div>
        <form action={toggleFavorite}>
          <input type="hidden" name="foodId" value={food.id} />
          <button className={`btn px-3 text-xl ${favorite ? "text-amber-500" : "text-zinc-400"}`} aria-label={favorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}>
            {favorite ? "★" : "☆"}
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
            <h2 className="font-semibold">Zutaten</h2>
            <Link href={`/recipes/${food.id}?day=${day}&meal=${meal}`} className="text-sm font-semibold text-brand-600">
              Bearbeiten
            </Link>
          </div>
          <ul className="text-sm">
            {recipe.ingredients.map(({ food: ing, grams }, i) => (
              <li key={i} className="flex justify-between gap-3 border-t border-zinc-100 py-1.5 first:border-0 dark:border-zinc-800">
                <span className="truncate">{ing.name}</span>
                <span className="shrink-0 tabular-nums muted">{fmt(grams)} g</span>
              </li>
            ))}
          </ul>
          {food.recipeServings && food.recipeServings > 1 && (
            <p className="mt-2 text-xs muted">
              Ergibt {food.recipeServings} Portionen à {fmt(food.servingGrams ?? 0)} g.
            </p>
          )}
        </section>
      )}

      <section className="card">
        <h2 className="mb-2 font-semibold">Nährwerte pro 100 g</h2>
        <table className="w-full text-sm">
          <tbody>
            {rows
              .filter(([, v]) => v !== null)
              .map(([label, value, unit]) => (
                <tr key={label} className="border-t border-zinc-100 first:border-0 dark:border-zinc-800">
                  <td className={`py-1.5 ${label.startsWith("davon") ? "pl-4 muted" : ""}`}>{label}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {fmt(value as number, 1)} {unit}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {food.barcode && (
          <p className="mt-3 text-xs muted">
            Quelle:{" "}
            <a className="underline" href={`https://de.openfoodfacts.org/produkt/${food.barcode}`} target="_blank" rel="noreferrer">
              Open Food Facts
            </a>{" "}
            (ODbL) · Barcode {food.barcode}
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

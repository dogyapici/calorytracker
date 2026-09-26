import Link from "next/link";
import { redirect } from "next/navigation";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { FoodList, type FoodListItem } from "@/components/food-list";
import type { Food } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { searchProducts, type OffFood } from "@/lib/off";
import { logSavedMeal } from "@/app/meal-actions";
import { fmt, MEALS } from "@/lib/nutrition";
import { getFavoriteFoods, getRecentFoods, getRecipes, getSavedMeals, searchLocalFoods } from "@/lib/queries";
import { Icon } from "@/components/icons";

export const metadata = { title: "Hinzufügen" };

function parseMeal(value: unknown) {
  return MEALS.find((m) => m.key === value) ?? MEALS[0];
}

export default async function AddPage({ searchParams }: PageProps<"/add">) {
  const user = await requireUser();
  const sp = await searchParams;
  const day = dayOrToday(sp.day);
  const meal = parseMeal(sp.meal);
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const ctx = `?${new URLSearchParams({ day, meal: meal.key })}`;

  if (/^\d{8,14}$/.test(q)) redirect(`/barcode/${q}${ctx}`);

  const localItem = (f: Food): FoodListItem => ({
    key: `f${f.id}`,
    href: `/food/${f.id}${ctx}`,
    name: f.name,
    brand: f.brand,
    kcal: f.kcal,
    imageUrl: f.imageUrl,
    badge: f.source === "custom" ? "Eigenes" : f.source === "recipe" ? "Rezept" : undefined,
  });

  let local: Food[] = [];
  let remote: OffFood[] = [];
  let remoteError = false;
  if (q) {
    [local, remote] = await Promise.all([
      searchLocalFoods(user.id, q),
      searchProducts(q).catch(() => {
        remoteError = true;
        return [];
      }),
    ]);
  }
  const localBarcodes = new Set(local.map((f) => f.barcode));
  const remoteItems: FoodListItem[] = remote
    .filter((f) => !localBarcodes.has(f.barcode))
    .map((f) => ({
      key: `o${f.barcode}`,
      href: `/barcode/${f.barcode}${ctx}`,
      name: f.name,
      brand: f.brand,
      kcal: f.kcal,
      imageUrl: f.imageUrl,
    }));

  const [recent, favorites, recipes, savedMeals] = q
    ? [[], [], [], []]
    : await Promise.all([getRecentFoods(user.id), getFavoriteFoods(user.id), getRecipes(user.id), getSavedMeals(user.id)]);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href={`/?day=${day}`} className="btn-secondary px-3" aria-label="Zurück">
          <Icon name="back" />
        </Link>
        <h1 className="text-h1">{meal.label} hinzufügen</h1>
      </header>

      <form className="flex gap-2" action="/add">
        <input type="hidden" name="day" value={day} />
        <input type="hidden" name="meal" value={meal.key} />
        <input className="input" name="q" type="search" defaultValue={q} placeholder="Lebensmittel suchen, z. B. Haferflocken" enterKeyHint="search" autoFocus={!q} />
        <button className="btn-primary">Suchen</button>
      </form>

      <BarcodeScanner targetBase={ctx} />

      {q ? (
        <>
          {local.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-label muted">Bereits verwendet</h2>
              <FoodList items={local.map(localItem)} />
            </section>
          )}
          <section className="space-y-2">
            <h2 className="text-label muted">Open Food Facts</h2>
            {remoteError ? (
              <p className="card text-sm">Die Datenbank ist gerade nicht erreichbar. Versuche es gleich noch einmal oder lege ein eigenes Lebensmittel an.</p>
            ) : remoteItems.length ? (
              <FoodList items={remoteItems} />
            ) : (
              <p className="card text-sm muted">Keine Treffer.</p>
            )}
          </section>
        </>
      ) : (
        <>
          {savedMeals.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-label muted">Meine Mahlzeiten</h2>
                <Link href={`/meals${ctx}`} className="text-xs font-semibold text-primary">
                  Verwalten
                </Link>
              </div>
              <ul className="card divide-y divide-border p-0">
                {savedMeals.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="truncate text-caption muted">{m.items.map((i) => i.food.name).join(", ")}</p>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums">{fmt(m.kcal)} kcal</span>
                    <form action={logSavedMeal}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="day" value={day} />
                      <input type="hidden" name="meal" value={meal.key} />
                      <button className="btn-primary px-3 py-1.5 text-xs">Eintragen</button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {favorites.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-label muted">Favoriten</h2>
              <FoodList items={favorites.map(localItem)} />
            </section>
          )}
          {recipes.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-label muted">Meine Rezepte</h2>
              <FoodList items={recipes.map(localItem)} />
            </section>
          )}
          <section className="space-y-2">
            <h2 className="text-label muted">Zuletzt gegessen</h2>
            {recent.length ? (
              <FoodList items={recent.map(localItem)} />
            ) : (
              <p className="card text-sm muted">Noch nichts erfasst. Suche ein Lebensmittel oder scanne einen Barcode.</p>
            )}
          </section>
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/foods/new${ctx}`} className="btn-secondary">
          Eigenes Lebensmittel
        </Link>
        <Link href={`/recipes${ctx}`} className="btn-secondary">
          Rezepte
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { FoodList, type FoodListItem } from "@/components/food-list";
import type { Food } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { MEALS } from "@/lib/nutrition";
import { searchProducts, type OffFood } from "@/lib/off";
import { getFavoriteFoods, getRecentFoods, searchLocalFoods } from "@/lib/queries";

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
    badge: f.source === "custom" ? "Eigenes" : undefined,
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

  const [recent, favorites] = q ? [[], []] : await Promise.all([getRecentFoods(user.id), getFavoriteFoods(user.id)]);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href={`/?day=${day}`} className="btn-secondary px-3" aria-label="Zurück">
          ‹
        </Link>
        <h1 className="text-lg font-bold">{meal.label} hinzufügen</h1>
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
              <h2 className="text-sm font-semibold muted">Bereits verwendet</h2>
              <FoodList items={local.map(localItem)} />
            </section>
          )}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold muted">Open Food Facts</h2>
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
          {favorites.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold muted">Favoriten</h2>
              <FoodList items={favorites.map(localItem)} />
            </section>
          )}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold muted">Zuletzt gegessen</h2>
            {recent.length ? (
              <FoodList items={recent.map(localItem)} />
            ) : (
              <p className="card text-sm muted">Noch nichts erfasst. Suche ein Lebensmittel oder scanne einen Barcode.</p>
            )}
          </section>
        </>
      )}

      <Link href={`/foods/new${ctx}`} className="btn-secondary w-full">
        Eigenes Lebensmittel anlegen
      </Link>
    </div>
  );
}

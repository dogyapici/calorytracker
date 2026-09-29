import Form from "next/form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { FoodList, type FoodListItem } from "@/components/food-list";
import type { Food } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { searchProducts, type OffFood } from "@/lib/off";
import { MEALS } from "@/lib/nutrition";
import { getFavoriteFoods, getFrequentFoods, getRecentFoods, searchLocalFoods } from "@/lib/queries";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

import { PendingButton } from "@/components/form-bits";
import { ListFilter } from "./list-filter";
import { LISTS, type ListKey } from "./lists";

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
  // Treffer merken sich die Suche, damit „Zurück“ auf der Produktseite wieder hierher führt.
  const resultCtx = q ? `?${new URLSearchParams({ day, meal: meal.key, q })}` : ctx;

  if (/^\d{8,14}$/.test(q)) redirect(`/barcode/${q}${ctx}`);

  const localItem = (f: Food): FoodListItem => ({
    key: `f${f.id}`,
    href: `/food/${f.id}${resultCtx}`,
    name: f.name,
    brand: f.brand,
    kcal: f.kcal,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
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
      href: `/barcode/${f.barcode}${resultCtx}`,
      name: f.name,
      brand: f.brand,
      kcal: f.kcal,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      }));

  const list: ListKey = LISTS.find((l) => l.key === sp.list)?.key ?? "recent";
  const listItems: FoodListItem[] = q
    ? []
    : list === "frequent"
      ? (await getFrequentFoods(user.id)).map(({ food, uses }) => ({ ...localItem(food), badge: `${uses}× gegessen` }))
      : (await (list === "favorites" ? getFavoriteFoods(user.id) : getRecentFoods(user.id))).map(localItem);

  return (
    <div className="space-y-4">
      <PageHeader
        back={`/?day=${day}`}
        eyebrow="Hinzufügen zu"
        title={
          <>
            <span aria-hidden className="mr-2">{meal.emoji}</span>
            {meal.label}
          </>
        }
      />

      <Form className="flex gap-2" action="/add" role="search">
        <input type="hidden" name="day" value={day} />
        <input type="hidden" name="meal" value={meal.key} />
        <div className="relative flex-1">
          <Icon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            className="input h-button pl-10 text-body"
            name="q"
            type="search"
            aria-label="Lebensmittel suchen"
            defaultValue={q}
            placeholder="z. B. Haferflocken"
            enterKeyHint="search"
            autoFocus={!q}
          />
        </div>
        <PendingButton className="btn-primary h-button">Suchen</PendingButton>
      </Form>

      <div className="grid grid-cols-2 gap-3">
        <BarcodeScanner targetBase={ctx} variant="tile" autoOpen={sp.scan === "1"} />
        <Link href={`/add/photo${ctx}`} className="card flex flex-col items-start gap-3 p-4 transition-transform active:scale-[0.97]">
          <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-2xl">📸</span>
          <span>
            <span className="block text-h3">Foto schätzen</span>
            <span className="block text-caption muted">KI schätzt die Nährwerte</span>
          </span>
        </Link>
      </div>

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
        <section className="space-y-3">
          <ListFilter value={list} />
          {listItems.length ? (
            <FoodList items={listItems} />
          ) : (
            <p className="card text-sm muted">
              {list === "favorites"
                ? "Noch keine Favoriten. Tippe auf einem Lebensmittel auf den Stern, um es hier zu sammeln."
                : "Noch nichts erfasst. Suche ein Lebensmittel oder scanne einen Barcode."}
            </p>
          )}
        </section>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Link href={`/foods/new${ctx}`} className="btn-secondary flex-col gap-0.5 px-2 py-2.5 text-label">
          <span aria-hidden>✏️</span> Eigenes
        </Link>
        <Link href={`/recipes${ctx}`} className="btn-secondary flex-col gap-0.5 px-2 py-2.5 text-label">
          <span aria-hidden>🍲</span> Rezepte
        </Link>
        <Link href={`/meals${ctx}`} className="btn-secondary flex-col gap-0.5 px-2 py-2.5 text-label">
          <span aria-hidden>🍱</span> Mahlzeiten
        </Link>
      </div>
    </div>
  );
}

import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { entries } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { dayOrToday, formatDay } from "@/lib/dates";
import { fmt, MEALS } from "@/lib/nutrition";
import { SaveMealForm } from "./save-meal-form";
import { Icon } from "@/components/icons";

export const metadata = { title: "Mahlzeit speichern" };

export default async function SaveMealPage({ searchParams }: PageProps<"/meals/new">) {
  const user = await requireUser();
  const sp = await searchParams;
  const day = dayOrToday(sp.day);
  const meal = MEALS.find((m) => m.key === sp.meal) ?? MEALS[0];
  const items = await db
    .select()
    .from(entries)
    .where(and(eq(entries.userId, user.id), eq(entries.day, day), eq(entries.meal, meal.key)))
    .orderBy(entries.createdAt);
  const kcal = items.reduce((s, e) => s + e.kcal, 0);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href={`/?day=${day}`} className="btn-secondary px-3" aria-label="Zurück">
          <Icon name="back" />
        </Link>
        <h1 className="text-h1">Mahlzeit speichern</h1>
      </header>
      <section className="card">
        <p className="mb-2 text-sm muted">
          {meal.label} vom {formatDay(day, { day: "numeric", month: "long" })} · {fmt(kcal)} kcal
        </p>
        <ul className="text-sm">
          {items.map((e) => (
            <li key={e.id} className="flex justify-between gap-3 border-t border-border py-1.5 first:border-0">
              <span className="truncate">{e.name}</span>
              <span className="shrink-0 tabular-nums muted">{fmt(e.grams)} g</span>
            </li>
          ))}
        </ul>
      </section>
      <SaveMealForm day={day} meal={meal.key} defaultName={`Mein ${meal.label}`} />
      <p className="text-caption muted">
        Danach findest du die Mahlzeit beim Hinzufügen unter „Meine Mahlzeiten“ und trägst alles mit einem Tipp ein.
      </p>
    </div>
  );
}

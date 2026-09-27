import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { deleteSavedMeal } from "@/app/meal-actions";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { fmt, MEALS } from "@/lib/nutrition";
import { getSavedMeals } from "@/lib/queries";
import { Icon } from "@/components/icons";

import { PendingButton } from "@/components/form-bits";

export const metadata = { title: "Meine Mahlzeiten" };

export default async function MealsPage({ searchParams }: PageProps<"/meals">) {
  const user = await requireUser();
  const sp = await searchParams;
  const day = dayOrToday(sp.day);
  const meal = MEALS.find((m) => m.key === sp.meal)?.key ?? "breakfast";
  const meals = await getSavedMeals(user.id);

  return (
    <div className="space-y-4">
      <PageHeader back={`/add?day=${day}&meal=${meal}`} eyebrow="Gespeicherte Mahlzeiten" title="Mahlzeiten" />
      <Link href={`/meals/create?day=${day}&meal=${meal}`} className="btn-primary w-full">
        <Icon name="add" size={20} /> Neue Mahlzeit
      </Link>
      {meals.length === 0 ? (
        <p className="card text-sm muted">
          Noch keine Mahlzeiten. Stell hier eine zusammen oder tippe im Tagebuch bei einer Mahlzeit auf „Als Mahlzeit speichern“.
        </p>
      ) : (
        <ul className="space-y-3">
          {meals.map((m) => (
            <li key={m.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/meals/${m.id}?day=${day}&meal=${meal}`} className="min-w-0 flex-1">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-caption muted">{fmt(m.kcal)} kcal · {m.items.map((i) => i.food.name).join(", ")}</p>
                </Link>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/meals/${m.id}?day=${day}&meal=${meal}`} className="btn-secondary px-3 py-1.5 text-xs">
                    Bearbeiten
                  </Link>
                  <form action={deleteSavedMeal}>
                    <input type="hidden" name="id" value={m.id} />
                    <PendingButton className="btn-danger px-3 py-1.5 text-xs">Löschen</PendingButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

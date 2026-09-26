import Link from "next/link";
import { deleteSavedMeal } from "@/app/meal-actions";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { fmt, MEALS } from "@/lib/nutrition";
import { getSavedMeals } from "@/lib/queries";
import { Icon } from "@/components/icons";

export const metadata = { title: "Meine Mahlzeiten" };

export default async function MealsPage({ searchParams }: PageProps<"/meals">) {
  const user = await requireUser();
  const sp = await searchParams;
  const day = dayOrToday(sp.day);
  const meal = MEALS.find((m) => m.key === sp.meal)?.key ?? "breakfast";
  const meals = await getSavedMeals(user.id);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href={`/add?day=${day}&meal=${meal}`} className="btn-secondary px-3" aria-label="Zurück">
          <Icon name="back" />
        </Link>
        <h1 className="text-h1">Meine Mahlzeiten</h1>
      </header>
      {meals.length === 0 ? (
        <p className="card text-sm muted">
          Noch keine gespeicherten Mahlzeiten. Stell eine Mahlzeit im Tagebuch zusammen und tippe dort auf „Als Mahlzeit speichern“.
        </p>
      ) : (
        <ul className="space-y-3">
          {meals.map((m) => (
            <li key={m.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-caption muted">{fmt(m.kcal)} kcal · {m.items.map((i) => i.food.name).join(", ")}</p>
                </div>
                <form action={deleteSavedMeal}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="btn-danger px-2 py-1 text-xs">Löschen</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

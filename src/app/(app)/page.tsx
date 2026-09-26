import Link from "next/link";
import { copyMeal } from "@/app/actions";
import { NutrientDetails } from "@/components/nutrient-details";
import { CalorieRing, MacroRow } from "@/components/progress";
import { requireUser } from "@/lib/auth";
import { addDays, dayOrToday, formatDay, today } from "@/lib/dates";
import { fmt, MEALS, sumNutrients } from "@/lib/nutrition";
import { getEntriesForDay, getProfile, getStreak } from "@/lib/queries";

export const metadata = { title: "Tagebuch" };

export default async function DiaryPage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const { day: dayParam } = await searchParams;
  const day = dayOrToday(dayParam);
  const [profile, dayEntries, streak] = await Promise.all([
    getProfile(user.id),
    getEntriesForDay(user.id, day),
    getStreak(user.id),
  ]);
  const total = sumNutrients(dayEntries);
  const isToday = day === today();
  const yesterday = addDays(day, -1);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <Link href={`/?day=${addDays(day, -1)}`} className="btn-secondary px-3" aria-label="Vorheriger Tag">
          ‹
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-bold">{isToday ? "Heute" : formatDay(day)}</h1>
          {isToday ? (
            <p className="text-xs muted">{formatDay(day)}</p>
          ) : (
            <Link href="/" className="text-xs font-semibold text-brand-600">
              Zu heute
            </Link>
          )}
        </div>
        <Link href={`/?day=${addDays(day, 1)}`} className="btn-secondary px-3" aria-label="Nächster Tag">
          ›
        </Link>
      </header>

      {isToday && streak.current > 0 && (
        <p className="flex items-center justify-center gap-2 text-sm">
          <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
            🔥 {streak.current} {streak.current === 1 ? "Tag" : "Tage"} in Folge
          </span>
          {!streak.loggedToday && <span className="muted">Trag heute etwas ein, um sie zu halten.</span>}
        </p>
      )}

      <section className="card flex items-center gap-5">
        <CalorieRing eaten={total.kcal} target={profile.kcalTarget} />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm muted">
            <span className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">{fmt(total.kcal)}</span> von{" "}
            {fmt(profile.kcalTarget)} kcal
          </p>
          <MacroRow label="Eiweiß" value={total.protein} target={profile.proteinTarget} color="bg-sky-500" />
          <MacroRow label="Kohlenh." value={total.carbs} target={profile.carbsTarget} color="bg-amber-500" />
          <MacroRow label="Fett" value={total.fat} target={profile.fatTarget} color="bg-rose-500" />
        </div>
      </section>

      <NutrientDetails entries={dayEntries} kcalTarget={profile.kcalTarget} />

      {MEALS.map((meal) => {
        const items = dayEntries.filter((e) => e.meal === meal.key);
        const mealKcal = items.reduce((s, e) => s + e.kcal, 0);
        const addHref = `/add?day=${day}&meal=${meal.key}`;
        return (
          <section key={meal.key} className="card p-0">
            <div className="flex items-center justify-between px-4 pt-3">
              <h2 className="font-semibold">{meal.label}</h2>
              <span className="text-sm tabular-nums muted">{fmt(mealKcal)} kcal</span>
            </div>
            {items.length > 0 && (
              <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                {items.map((e) => (
                  <li key={e.id}>
                    <Link href={`/entry/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{e.name}</p>
                        <p className="text-xs muted">
                          {fmt(e.grams)} g · E {fmt(e.protein, 1)} · K {fmt(e.carbs, 1)} · F {fmt(e.fat, 1)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm tabular-nums">{fmt(e.kcal)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2 px-2 py-2">
              <Link href={addHref} className="btn flex-1 justify-start text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-700/20">
                + Hinzufügen
              </Link>
              {items.length > 0 && (
                <Link href={`/meals/new?day=${day}&meal=${meal.key}`} className="btn text-xs muted hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  Als Mahlzeit speichern
                </Link>
              )}
              {items.length === 0 && (
                <form action={copyMeal}>
                  <input type="hidden" name="from" value={yesterday} />
                  <input type="hidden" name="to" value={day} />
                  <input type="hidden" name="meal" value={meal.key} />
                  <button className="btn text-xs muted hover:bg-zinc-100 dark:hover:bg-zinc-800">Wie gestern</button>
                </form>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

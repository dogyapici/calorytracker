import { cookies } from "next/headers";
import Link from "next/link";
import { copyMeal } from "@/app/actions";
import { CalorieRing, MacroRow, MealRing } from "@/components/progress";
import { requireUser } from "@/lib/auth";
import { addDays, dayOrToday, formatDay, today } from "@/lib/dates";
import { fmt, MEALS, mealTarget, sumNutrients } from "@/lib/nutrition";
import { getEntriesForDay, getProfile, getStreak, getWater } from "@/lib/queries";
import { Icon } from "@/components/icons";

import { PendingButton } from "@/components/form-bits";
import { CollapsibleMeal } from "./_diary/collapsible-meal";
import { DaySwipe } from "./_diary/day-swipe";
import { CLOSED_MEALS_COOKIE } from "./_diary/constants";
import { SwipeToDelete } from "./_diary/swipe-to-delete";
import { WaterTracker } from "./_diary/water-tracker";
import { DayNutrition } from "./_diary/day-nutrition";
import { DaySummary } from "./_diary/day-summary";

export const metadata = { title: "Tagebuch" };

/** „Heute“, „Gestern“, „Morgen“ or the weekday: short enough to never wrap next to the arrows. */
function dayTitle(day: string, now: string) {
  if (day === now) return "Heute";
  if (day === addDays(now, -1)) return "Gestern";
  if (day === addDays(now, 1)) return "Morgen";
  return formatDay(day, { weekday: "long" });
}

export default async function DiaryPage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const { day: dayParam } = await searchParams;
  const day = dayOrToday(dayParam);
  const [profile, dayEntries, streak, waterMl] = await Promise.all([
    getProfile(user.id),
    getEntriesForDay(user.id, day),
    getStreak(user.id),
    getWater(user.id, day),
  ]);
  const closedMeals = new Set(decodeURIComponent((await cookies()).get(CLOSED_MEALS_COOKIE)?.value ?? "").split(","));
  const total = sumNutrients(dayEntries);
  const isToday = day === today();
  const yesterday = addDays(day, -1);

  return (
    <DaySwipe key={day} day={day} prev={addDays(day, -1)} next={addDays(day, 1)}>
      <div className="space-y-4">
        <header className="flex items-center justify-between">
          <Link href={`/?day=${addDays(day, -1)}`} prefetch className="btn-round" aria-label="Vorheriger Tag">
            <Icon name="back" />
          </Link>
          <div className="flex min-w-0 flex-col items-center">
            <Link
              href={`/calendar?month=${day.slice(0, 7)}`}
              className="flex flex-col items-center rounded-button px-3 py-1 transition-colors duration-150 active:bg-surface-muted"
              aria-label={`${formatDay(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, Kalender öffnen`}
            >
              <h1 className="whitespace-nowrap text-h2">{dayTitle(day, today())}</h1>
              <span className="flex items-center gap-1 whitespace-nowrap text-label muted">
                <Icon name="calendar" size={15} />
                {formatDay(day, { day: "numeric", month: "long", ...(day.slice(0, 4) !== today().slice(0, 4) && { year: "numeric" }) })}
              </span>
            </Link>
            {!isToday && (
              <Link href="/" className="mt-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-caption font-semibold text-primary">
                Zu heute
              </Link>
            )}
          </div>
          <Link href={`/?day=${addDays(day, 1)}`} prefetch className="btn-round" aria-label="Nächster Tag">
            <Icon name="forward" />
          </Link>
        </header>

        {isToday && streak.current > 0 && (
          <p className="flex items-center justify-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-label font-semibold text-primary">
              <span aria-hidden>🔥</span> {streak.current} {streak.current === 1 ? "Tag" : "Tage"} in Folge
            </span>
            {!streak.loggedToday && <span className="muted">Trag heute etwas ein, um sie zu halten.</span>}
          </p>
        )}

        <DaySummary
          day={day}
          isToday={isToday}
          eaten={total.kcal}
          target={profile.kcalTarget}
          title={formatDay(day, { weekday: "long", day: "numeric", month: "long" })}
          details={<DayNutrition entries={dayEntries} profile={profile} />}
        >
          <div className="flex flex-col items-center gap-2">
            <div data-ring>
              <CalorieRing eaten={total.kcal} target={profile.kcalTarget} />
            </div>
            <p className="text-label muted">
              <span className="text-text-primary">{fmt(total.kcal)}</span> von {fmt(profile.kcalTarget)}
              <span className="ml-0.5 text-caption">kcal</span> gegessen
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <MacroRow label="Eiweiß" value={total.protein} target={profile.proteinTarget} color="bg-macro-protein" />
            <MacroRow label="Kohlenh." value={total.carbs} target={profile.carbsTarget} color="bg-macro-carbs" />
            <MacroRow label="Fett" value={total.fat} target={profile.fatTarget} color="bg-macro-fat" />
          </div>
        </DaySummary>

        {MEALS.map((meal) => {
          const items = dayEntries.filter((e) => e.meal === meal.key);
          const mealKcal = items.reduce((s, e) => s + e.kcal, 0);
          const addHref = `/add?day=${day}&meal=${meal.key}`;
          const target = mealTarget(profile.kcalTarget, profile.mealSplit, meal.key);
          return (
            <CollapsibleMeal
              key={meal.key}
              mealKey={meal.key}
              initialOpen={!closedMeals.has(meal.key)}
              title={
                <span className="flex items-center gap-3">
                  <MealRing emoji={meal.emoji} value={mealKcal} target={target} />
                  <span className="min-w-0">
                    <span className="block">{meal.label}</span>
                    <span className="block text-caption font-normal tabular-nums muted">
                      {mealKcal > target ? `${fmt(mealKcal - target)} kcal über Ziel` : `noch ${fmt(target - mealKcal)} kcal`}
                    </span>
                  </span>
                </span>
              }
              summary={
                <span className="text-right tabular-nums">
                  <span className="block text-body font-semibold">{fmt(mealKcal)}</span>
                  <span className="block text-caption font-normal muted">/ {fmt(target)} kcal</span>
                </span>
              }
            >
              {items.length > 0 ? (
                <ul className="divide-y divide-border px-card">
                  {items.map((e) => (
                    <li key={e.id}>
                      <SwipeToDelete id={e.id} name={e.name}>
                        <Link href={`/entry/${e.id}`} draggable={false} className="flex items-center justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="truncate">{e.name}</p>
                            <p className="text-caption muted">
                              {fmt(e.grams)} g · E {fmt(e.protein, 1)} · K {fmt(e.carbs, 1)} · F {fmt(e.fat, 1)}
                            </p>
                          </div>
                          <span className="shrink-0">
                            {fmt(e.kcal)}
                            <span className="ml-0.5 text-caption muted">kcal</span>
                          </span>
                        </Link>
                      </SwipeToDelete>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-card pt-1 text-label muted">Noch nichts eingetragen.</p>
              )}
              <div className="flex items-center gap-2 px-3 pb-3 pt-2">
                <Link href={addHref} className="btn-ghost flex-1 justify-start">
                  <Icon name="add" size={20} /> Hinzufügen
                </Link>
                {items.length > 0 && (
                  <Link href={`/meals/new?day=${day}&meal=${meal.key}`} className="btn whitespace-nowrap text-label muted hover:bg-surface-muted" aria-label="Als Mahlzeit speichern">
                    Als Mahlzeit
                  </Link>
                )}
                {items.length === 0 && (
                  <form action={copyMeal}>
                    <input type="hidden" name="from" value={yesterday} />
                    <input type="hidden" name="to" value={day} />
                    <input type="hidden" name="meal" value={meal.key} />
                    <PendingButton className="btn whitespace-nowrap text-label muted hover:bg-surface-muted">Wie gestern</PendingButton>
                  </form>
                )}
              </div>
            </CollapsibleMeal>
          );
        })}

        <WaterTracker day={day} ml={waterMl} targetMl={profile.waterTargetMl} />
      </div>
    </DaySwipe>
  );
}

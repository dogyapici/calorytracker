import Link from "next/link";
import { GoalRing, MacroStat, MealRing } from "@/components/progress";
import { requireUser } from "@/lib/auth";
import { addDays, dayOrToday, formatDay, today } from "@/lib/dates";
import { fmt, MEALS, mealTarget, sumNutrients } from "@/lib/nutrition";
import { getEntriesForDay, getProfile, getStreak, getWater } from "@/lib/queries";
import { Icon } from "@/components/icons";

import { DaySwipe } from "./_diary/day-swipe";
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
  const total = sumNutrients(dayEntries);
  const isToday = day === today();

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
          <div className="flex flex-col items-center gap-1">
            <div data-ring className="w-full">
              <GoalRing
                eaten={total.kcal}
                target={profile.kcalTarget}
                macros={[
                  { value: total.protein, target: profile.proteinTarget, stroke: "stroke-macro-protein" },
                  { value: total.carbs, target: profile.carbsTarget, stroke: "stroke-macro-carbs" },
                  { value: total.fat, target: profile.fatTarget, stroke: "stroke-macro-fat" },
                ]}
              />
            </div>
            <p className="text-label muted">
              <span className="text-text-primary">{fmt(total.kcal)}</span> von {fmt(profile.kcalTarget)}
              <span className="ml-0.5 text-caption">kcal</span> gegessen
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border">
            <MacroStat label="Eiweiß" value={total.protein} target={profile.proteinTarget} color="bg-macro-protein" />
            <MacroStat label="Kohlenh." value={total.carbs} target={profile.carbsTarget} color="bg-macro-carbs" />
            <MacroStat label="Fett" value={total.fat} target={profile.fatTarget} color="bg-macro-fat" />
          </div>
        </DaySummary>

        {MEALS.map((meal) => {
          const items = dayEntries.filter((e) => e.meal === meal.key);
          const mealKcal = items.reduce((s, e) => s + e.kcal, 0);
          const target = mealTarget(profile.kcalTarget, profile.mealSplit, meal.key);
          return (
            <section key={meal.key} className="card animate-enter flex items-center gap-2 p-0 pr-3">
              <Link
                href={`/diary/${meal.key}?day=${day}`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-card py-3.5 pl-card pr-1 transition-colors duration-150 active:bg-surface-muted"
              >
                <MealRing emoji={meal.emoji} value={mealKcal} target={target} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-h3">{meal.label}</span>
                  <span className="block truncate text-caption tabular-nums muted">
                    {items.length === 0 ? "Noch leer" : `${items.length} ${items.length === 1 ? "Eintrag" : "Einträge"}`}
                  </span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className={`block text-body font-semibold ${mealKcal > target ? "text-warning" : ""}`}>{fmt(mealKcal)}</span>
                  <span className="block text-caption muted">/ {fmt(target)} kcal</span>
                </span>
              </Link>
              <Link
                href={`/add?day=${day}&meal=${meal.key}`}
                aria-label={`Zu ${meal.label} hinzufügen`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition duration-150 ease-out active:scale-95 motion-reduce:transition-none"
              >
                <Icon name="add" size={22} />
              </Link>
            </section>
          );
        })}

        <WaterTracker day={day} ml={waterMl} targetMl={profile.waterTargetMl} />
      </div>
    </DaySwipe>
  );
}

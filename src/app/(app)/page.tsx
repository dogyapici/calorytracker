import Link from "next/link";
import { GoalRing, MacroPill, MealRing } from "@/components/progress";
import { requireUser } from "@/lib/auth";
import { addDays, dayOrToday, formatDay, today } from "@/lib/dates";
import { fmt, MEALS, mealTarget, sumNutrients } from "@/lib/nutrition";
import { getDailyTotals, getEntriesForDay, getProfile, getStreak, getWater } from "@/lib/queries";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";

import { DaySwipe } from "./_diary/day-swipe";
import { WaterTracker } from "./_diary/water-tracker";
import { DayNutrition } from "./_diary/day-nutrition";
import { DaySummary } from "./_diary/day-summary";
import { WeekStrip } from "./_diary/week-strip";
import { weekStart } from "@/lib/training";

export const metadata = { title: "Tagebuch" };

export default async function DiaryPage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const { day: dayParam } = await searchParams;
  const day = dayOrToday(dayParam);
  const monday = weekStart(day);
  const [profile, dayEntries, streak, waterMl, weekTotals] = await Promise.all([
    getProfile(user.id),
    getEntriesForDay(user.id, day),
    getStreak(user.id),
    getWater(user.id, day),
    getDailyTotals(user.id, monday, addDays(monday, 6)),
  ]);
  const total = sumNutrients(dayEntries);
  const isToday = day === today();

  return (
    <DaySwipe key={day} day={day} prev={addDays(day, -1)} next={addDays(day, 1)}>
      <div className="space-y-4">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Logo size={34} className="shrink-0" />
              <h1 className="whitespace-nowrap text-h2 leading-none">CalTracker</h1>
            </div>
            {!isToday && (
              <Link href="/" className="shrink-0 rounded-full bg-primary-soft px-3 py-1.5 text-caption font-semibold text-primary">
                Zu heute
              </Link>
            )}
          </div>
          <WeekStrip day={day} today={today()} logged={new Set(weekTotals.filter((t) => t.kcal > 0).map((t) => t.day))} />
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
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-button border border-border bg-surface text-accent-calories shadow-card">
              <Icon name="flame" size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="text-h3 font-bold">Ernährung</h2>
              <p className="text-caption muted">Deine Werte für {isToday ? "heute" : "diesen Tag"}</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div data-ring>
              <GoalRing eaten={total.kcal} target={profile.kcalTarget} />
            </div>
            <p className="flex items-center gap-2 text-label tabular-nums text-text-secondary">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent-calories" />
              <span>
                <span className="font-semibold text-text-primary">{fmt(total.kcal)}</span> von {fmt(profile.kcalTarget)} kcal gegessen
              </span>
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border">
            <MacroPill label="Eiweiß" value={total.protein} target={profile.proteinTarget} color="bg-macro-protein" icon="protein" />
            <MacroPill label="Kohlenh." value={total.carbs} target={profile.carbsTarget} color="bg-macro-carbs" icon="carbs" />
            <MacroPill label="Fett" value={total.fat} target={profile.fatTarget} color="bg-macro-fat" icon="fat" />
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition duration-150 ease-out active:scale-95 motion-reduce:transition-none"
              >
                <Icon name="add" size={18} />
              </Link>
            </section>
          );
        })}

        <WaterTracker day={day} ml={waterMl} targetMl={profile.waterTargetMl} />
      </div>
    </DaySwipe>
  );
}

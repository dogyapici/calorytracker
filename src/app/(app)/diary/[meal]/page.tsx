import Link from "next/link";
import { notFound } from "next/navigation";
import { copyMeal } from "@/app/actions";
import { PendingButton } from "@/components/form-bits";
import { Icon } from "@/components/icons";
import { NutrientBreakdown } from "@/components/nutrient-details";
import { PageHeader } from "@/components/page-header";
import { MealRing } from "@/components/progress";
import { requireUser } from "@/lib/auth";
import { addDays, dayOrToday, formatDay } from "@/lib/dates";
import { fmt, MEALS, mealTarget, sumNutrients } from "@/lib/nutrition";
import { getEntriesForDay, getProfile } from "@/lib/queries";
import { SwipeToDelete } from "../../_diary/swipe-to-delete";

const MACROS = [
  { key: "protein", label: "Eiweiß", color: "bg-macro-protein", kcalPerGram: 4 },
  { key: "carbs", label: "Kohlenh.", color: "bg-macro-carbs", kcalPerGram: 4 },
  { key: "fat", label: "Fett", color: "bg-macro-fat", kcalPerGram: 9 },
] as const;

export async function generateMetadata({ params }: PageProps<"/diary/[meal]">) {
  const { meal } = await params;
  return { title: MEALS.find((m) => m.key === meal)?.label ?? "Mahlzeit" };
}

/** One meal of a day: everything eaten in it with its nutrients, plus adding more. */
export default async function MealPage({ params, searchParams }: PageProps<"/diary/[meal]">) {
  const user = await requireUser();
  const { meal: mealParam } = await params;
  const meal = MEALS.find((m) => m.key === mealParam);
  if (!meal) notFound();
  const { day: dayParam } = await searchParams;
  const day = dayOrToday(dayParam);
  const [profile, dayEntries] = await Promise.all([getProfile(user.id), getEntriesForDay(user.id, day)]);
  const items = dayEntries.filter((e) => e.meal === meal.key);
  const total = sumNutrients(items);
  const target = mealTarget(profile.kcalTarget, profile.mealSplit, meal.key);
  const remaining = target - total.kcal;
  const macroKcal = MACROS.reduce((s, m) => s + total[m.key] * m.kcalPerGram, 0);
  const addHref = `/add?day=${day}&meal=${meal.key}`;

  return (
    <div className="space-y-4">
      <PageHeader
        back={`/?day=${day}`}
        backLabel="Zurück zum Tagebuch"
        eyebrow={formatDay(day, { weekday: "long", day: "numeric", month: "long" })}
        title={meal.label}
        action={
          <Link href={addHref} aria-label={`Zu ${meal.label} hinzufügen`} className="btn-round border-0 bg-primary text-on-primary">
            <Icon name="add" />
          </Link>
        }
      />

      <section className="card space-y-4" aria-label="Kalorien und Makros">
        <div className="flex items-center gap-4">
          <MealRing emoji={meal.emoji} value={total.kcal} target={target} size={64} />
          <div className="min-w-0 flex-1">
            <p className="tabular-nums">
              <span className="text-display">{fmt(total.kcal)}</span>
              <span className="ml-1 text-body muted">/ {fmt(target)} kcal</span>
            </p>
            <p className={`text-label font-semibold ${remaining < 0 ? "text-warning" : "text-primary"}`}>
              {remaining < 0 ? `${fmt(-remaining)} kcal über dem Mahlzeitziel` : `noch ${fmt(remaining)} kcal`}
            </p>
          </div>
        </div>

        {macroKcal > 0 && (
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
            {MACROS.map((m) => (
              <span key={m.key} className={`h-full ${m.color}`} style={{ width: `${((total[m.key] * m.kcalPerGram) / macroKcal) * 100}%` }} />
            ))}
          </div>
        )}
        <dl className="grid grid-cols-3 divide-x divide-border">
          {MACROS.map((m) => (
            <div key={m.key} className="flex min-w-0 flex-col items-center px-2 text-center">
              <dt className="flex items-center gap-1.5 truncate text-caption font-semibold text-text-secondary">
                <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${m.color}`} />
                {m.label}
              </dt>
              <dd className="text-h2 font-extrabold leading-tight tabular-nums">
                {fmt(total[m.key], 1)}
                <span className="ml-0.5 text-caption font-normal muted">g</span>
              </dd>
              <dd className="text-caption tabular-nums muted">{macroKcal > 0 ? `${fmt(((total[m.key] * m.kcalPerGram) / macroKcal) * 100)} % der kcal` : "–"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card space-y-1 p-0" aria-labelledby="meal-entries">
        <h2 id="meal-entries" className="px-card pt-4 text-h3">
          Eingetragen
        </h2>
        {items.length > 0 ? (
          <ul className="divide-y divide-border px-card">
            {items.map((e) => (
              <li key={e.id}>
                <SwipeToDelete id={e.id} name={e.name}>
                  <Link href={`/entry/${e.id}`} draggable={false} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate">{e.name}</p>
                      <p className="text-caption tabular-nums muted">
                        {fmt(e.grams)} g · E {fmt(e.protein, 1)} · K {fmt(e.carbs, 1)} · F {fmt(e.fat, 1)}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums">
                      {fmt(e.kcal)}
                      <span className="ml-0.5 text-caption muted">kcal</span>
                    </span>
                  </Link>
                </SwipeToDelete>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-card py-2 text-label muted">Noch nichts eingetragen.</p>
        )}
        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
          <Link href={addHref} className="btn-ghost flex-1 justify-start">
            <Icon name="add" size={20} /> Hinzufügen
          </Link>
          {items.length > 0 ? (
            <Link href={`/meals/new?day=${day}&meal=${meal.key}`} className="btn whitespace-nowrap text-label muted hover:bg-surface-muted">
              Als Mahlzeit speichern
            </Link>
          ) : (
            <form action={copyMeal}>
              <input type="hidden" name="from" value={addDays(day, -1)} />
              <input type="hidden" name="to" value={day} />
              <input type="hidden" name="meal" value={meal.key} />
              <PendingButton className="btn whitespace-nowrap text-label muted hover:bg-surface-muted">Wie gestern</PendingButton>
            </form>
          )}
        </div>
      </section>

      {items.length > 0 && (
        <section className="card space-y-3">
          <div>
            <h2 className="text-h3">Weitere Nährwerte</h2>
            <p className="text-caption muted">Die Balken zeigen, wie viel diese Mahlzeit zu deinem Tagesbedarf beiträgt.</p>
          </div>
          <NutrientBreakdown entries={items} kcalTarget={profile.kcalTarget} />
        </section>
      )}

    </div>
  );
}

import { and, eq, gte, lte } from "drizzle-orm";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { db } from "@/db";
import { water, weights } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { addMonths, dayStatus, isMonth, monthGrid, type DayStatus } from "@/lib/calendar";
import { addDays, today } from "@/lib/dates";
import { fmt } from "@/lib/nutrition";
import { getDailyTotals, getProfile, getStreak } from "@/lib/queries";

export const metadata = { title: "Kalender" };

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const STATUS_STYLE: Record<DayStatus, string> = {
  none: "text-text-secondary",
  under: "bg-macro-carbs/40 text-text-primary font-semibold",
  ok: "bg-primary text-on-primary font-semibold",
  over: "bg-warning/35 text-text-primary font-semibold",
};

const LEGEND: [DayStatus, string][] = [
  ["ok", "Im Ziel (±10 %)"],
  ["under", "Unter dem Ziel"],
  ["over", "Über dem Ziel"],
];

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const user = await requireUser();
  const sp = await searchParams;
  const now = today();
  const month = isMonth(sp.month) ? sp.month : now.slice(0, 7);
  const from = `${month}-01`;
  const to = addDays(`${addMonths(month, 1)}-01`, -1);

  const [profile, totals, waterRows, weightRows, streak] = await Promise.all([
    getProfile(user.id),
    getDailyTotals(user.id, from, to),
    db.select({ day: water.day, ml: water.ml }).from(water).where(and(eq(water.userId, user.id), gte(water.day, from), lte(water.day, to))),
    db.select({ day: weights.day }).from(weights).where(and(eq(weights.userId, user.id), gte(weights.day, from), lte(weights.day, to))),
    getStreak(user.id),
  ]);
  const kcalByDay = new Map(totals.map((t) => [t.day, t.kcal]));
  const waterDone = new Set(waterRows.filter((w) => w.ml >= profile.waterTargetMl).map((w) => w.day));
  const weighed = new Set(weightRows.map((w) => w.day));
  const tracked = totals.length;
  const onTarget = totals.filter((t) => dayStatus(t.kcal, profile.kcalTarget) === "ok").length;
  const avg = tracked ? totals.reduce((s, t) => s + t.kcal, 0) / tracked : 0;
  const title = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${from}T12:00:00Z`));

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href="/" className="btn-secondary px-3" aria-label="Zurück zum Tagebuch">
          <Icon name="back" />
        </Link>
        <h1 className="text-h1">Kalender</h1>
      </header>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <Link href={`/calendar?month=${addMonths(month, -1)}`} className="btn-ghost px-2" aria-label="Vorheriger Monat">
            <Icon name="back" />
          </Link>
          <h2 className="text-h3">{title}</h2>
          <Link href={`/calendar?month=${addMonths(month, 1)}`} className="btn-ghost px-2" aria-label="Nächster Monat">
            <Icon name="forward" />
          </Link>
        </div>

        <table className="w-full table-fixed border-separate border-spacing-1 text-center">
          <thead>
            <tr>
              {WEEKDAYS.map((d) => (
                <th key={d} scope="col" className="text-caption font-medium muted">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthGrid(month).map((week, i) => (
              <tr key={i}>
                {week.map((day, j) => {
                  if (!day) return <td key={j} />;
                  const kcal = kcalByDay.get(day);
                  const status = dayStatus(kcal, profile.kcalTarget);
                  const future = day > now;
                  const label = [
                    new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`)),
                    kcal !== undefined ? `${fmt(kcal)} kcal` : "nichts eingetragen",
                    waterDone.has(day) ? "Wasserziel erreicht" : null,
                    weighed.has(day) ? "gewogen" : null,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <td key={day} className="p-0">
                      <Link
                        href={`/?day=${day}`}
                        aria-label={label}
                        className={`relative flex aspect-square flex-col items-center justify-center rounded-button text-label tabular-nums transition-transform active:scale-95 ${STATUS_STYLE[status]} ${future ? "opacity-40" : ""} ${day === now ? "ring-2 ring-primary" : ""}`}
                      >
                        {Number(day.slice(8))}
                        <span className="absolute bottom-1 flex h-1.5 gap-0.5" aria-hidden>
                          {waterDone.has(day) && <span className="h-1.5 w-1.5 rounded-full bg-macro-protein" />}
                          {weighed.has(day) && <span className="h-1.5 w-1.5 rounded-full bg-text-secondary" />}
                        </span>
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-caption text-text-secondary">
          {LEGEND.map(([status, text]) => (
            <li key={status} className="flex items-center gap-1.5">
              <span aria-hidden className={`h-3 w-3 rounded ${STATUS_STYLE[status]}`} />
              {text}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-macro-protein" /> Wasserziel
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-text-secondary" /> Gewogen
          </li>
        </ul>
      </section>

      <section className="card grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-h2 tabular-nums">{tracked}</p>
          <p className="text-caption muted">Tage getrackt</p>
        </div>
        <div>
          <p className="text-h2 tabular-nums">{onTarget}</p>
          <p className="text-caption muted">im Ziel</p>
        </div>
        <div>
          <p className="text-h2 tabular-nums">{tracked ? fmt(avg) : "–"}</p>
          <p className="text-caption muted">Ø kcal</p>
        </div>
        <p className="col-span-3 text-caption muted">
          <span aria-hidden>🔥</span> Aktuelle Serie {streak.current} {streak.current === 1 ? "Tag" : "Tage"} · längste {streak.longest}
        </p>
      </section>
    </div>
  );
}

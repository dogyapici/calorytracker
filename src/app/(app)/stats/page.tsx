import Link from "next/link";
import { CalorieBars } from "@/components/charts";
import { requireUser } from "@/lib/auth";
import { addDays, formatDay, today } from "@/lib/dates";
import { fmt } from "@/lib/nutrition";
import { getDailyTotals, getProfile, getStreak, getWeights } from "@/lib/queries";

export const metadata = { title: "Statistik" };

const RANGES = [7, 30, 90] as const;

export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const user = await requireUser();
  const sp = await searchParams;
  const range = RANGES.find((r) => String(r) === sp.range) ?? 7;
  const to = today();
  const from = addDays(to, -(range - 1));

  const [profile, totals, weights, streak] = await Promise.all([
    getProfile(user.id),
    getDailyTotals(user.id, from, to),
    getWeights(user.id, 400),
    getStreak(user.id),
  ]);

  const byDay = new Map(totals.map((t) => [t.day, t]));
  const days = Array.from({ length: range }, (_, i) => addDays(from, i));
  const series = days.map((d) => ({
    label: formatDay(d, range === 7 ? { weekday: "short" } : { day: "numeric", month: "numeric" }),
    kcal: byDay.get(d)?.kcal ?? 0,
  }));

  const logged = totals.filter((t) => t.kcal > 0);
  const avg = (key: "kcal" | "protein" | "carbs" | "fat") => (logged.length ? logged.reduce((s, t) => s + t[key], 0) / logged.length : 0);
  const avgKcal = avg("kcal");
  const macroKcal = avg("protein") * 4 + avg("carbs") * 4 + avg("fat") * 9 || 1;
  const onTarget = logged.filter((t) => Math.abs(t.kcal - profile.kcalTarget) <= profile.kcalTarget * 0.1).length;

  const inRange = weights.filter((w) => w.day >= from);
  const weightChange = inRange.length >= 2 ? inRange[0].kg - inRange[inRange.length - 1].kg : null;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Statistik</h1>
        <div className="flex rounded-xl border border-zinc-300 p-0.5 dark:border-zinc-700">
          {RANGES.map((r) => (
            <Link key={r} href={`/stats?range=${r}`} className={`rounded-lg px-3 py-1 text-sm font-medium ${r === range ? "bg-brand-600 text-white" : ""}`}>
              {r} T
            </Link>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <div className="card p-3">
          <p className="text-xs muted">Ø kcal</p>
          <p className="text-xl font-bold tabular-nums">{fmt(avgKcal)}</p>
          <p className="text-xs muted">Ziel {fmt(profile.kcalTarget)}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs muted">Im Ziel ±10 %</p>
          <p className="text-xl font-bold tabular-nums">
            {onTarget}/{logged.length}
          </p>
          <p className="text-xs muted">erfasste Tage</p>
        </div>
        <div className="card p-3">
          <p className="text-xs muted">Gewicht</p>
          <p className="text-xl font-bold tabular-nums">{weightChange === null ? "–" : `${weightChange > 0 ? "+" : ""}${fmt(weightChange, 1)}`}</p>
          <p className="text-xs muted">kg im Zeitraum</p>
        </div>
      </section>

      <section className="card flex items-center justify-around text-center">
        <div>
          <p className="text-2xl font-bold tabular-nums">🔥 {streak.current}</p>
          <p className="text-xs muted">Tage in Folge</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{streak.longest}</p>
          <p className="text-xs muted">Längste Serie</p>
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Kalorien pro Tag</h2>
        <CalorieBars days={series} target={profile.kcalTarget} />
        <p className="text-xs muted">Gestrichelt: dein Tagesziel. Rot: über dem Ziel.</p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Ø Makronährstoffe pro erfasstem Tag</h2>
        <div className="flex h-3 overflow-hidden rounded-full">
          <div className="bg-sky-500" style={{ width: `${((avg("protein") * 4) / macroKcal) * 100}%` }} />
          <div className="bg-amber-500" style={{ width: `${((avg("carbs") * 4) / macroKcal) * 100}%` }} />
          <div className="bg-rose-500" style={{ width: `${((avg("fat") * 9) / macroKcal) * 100}%` }} />
        </div>
        <div className="grid grid-cols-3 text-sm">
          {(
            [
              ["Eiweiß", "protein", "bg-sky-500", profile.proteinTarget],
              ["Kohlenh.", "carbs", "bg-amber-500", profile.carbsTarget],
              ["Fett", "fat", "bg-rose-500", profile.fatTarget],
            ] as const
          ).map(([label, key, color, target]) => (
            <div key={key}>
              <p className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                {label}
              </p>
              <p className="font-semibold tabular-nums">{fmt(avg(key))} g</p>
              <p className="text-xs muted">Ziel {target} g</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { CalorieBars } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { addDays, formatDay, today } from "@/lib/dates";
import { fmt } from "@/lib/nutrition";
import { getDailyTotals, getProfile, getStreak, getWeights } from "@/lib/queries";
import { BALANCE_WEEKS, energyBalance } from "@/lib/energy-balance";
import { BalanceSummary } from "./balance-summary";

export const metadata = { title: "Statistik" };

const RANGES = [7, 30, 90] as const;

export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const user = await requireUser();
  const sp = await searchParams;
  const range = RANGES.find((r) => String(r) === sp.range) ?? 7;
  const to = today();
  const from = addDays(to, -(range - 1));

  const [profile, totals, weights, streak, balanceTotals] = await Promise.all([
    getProfile(user.id),
    getDailyTotals(user.id, from, to),
    getWeights(user.id, 400),
    getStreak(user.id),
    getDailyTotals(user.id, addDays(to, -(BALANCE_WEEKS * 7 - 1)), to),
  ]);
  const balance = energyBalance(balanceTotals, [...weights].reverse(), to);

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
      <PageHeader title="Statistik" subtitle={`Letzte ${range} Tage`} />

      <div className="grid grid-cols-3 gap-1 rounded-button bg-surface-muted p-1" role="tablist" aria-label="Zeitraum">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/stats?range=${r}`}
            scroll={false}
            role="tab"
            aria-selected={r === range}
            className={`flex min-h-10 items-center justify-center rounded-chip text-label transition-colors duration-150 ${r === range ? "bg-surface font-semibold text-text-primary shadow-card" : "text-text-secondary"}`}
          >
            {r} Tage
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-label muted">Ø pro Tag</p>
          <p className="mt-1 tabular-nums">
            <span className="text-h1">{fmt(avgKcal)}</span> <span className="text-caption muted">kcal</span>
          </p>
          <p className="text-caption muted">Ziel {fmt(profile.kcalTarget)} kcal</p>
        </div>
        <div className="card p-4">
          <p className="text-label muted">Im Ziel (±10 %)</p>
          <p className="mt-1 tabular-nums">
            <span className="text-h1">{onTarget}</span> <span className="text-caption muted">von {logged.length} Tagen</span>
          </p>
          <p className="text-caption muted">erfasste Tage</p>
        </div>
        <div className="card p-4">
          <p className="text-label muted">Serie</p>
          <p className="mt-1 tabular-nums">
            <span className="text-h1">
              <span aria-hidden>🔥</span> {streak.current}
            </span>{" "}
            <span className="text-caption muted">{streak.current === 1 ? "Tag" : "Tage"}</span>
          </p>
          <p className="text-caption muted">Rekord {streak.longest} Tage</p>
        </div>
        <Link href="/weight" className="card pressable block p-4">
          <p className="text-label muted">Gewicht</p>
          <p className="mt-1 tabular-nums">
            <span className="text-h1">{weightChange === null ? "–" : `${weightChange > 0 ? "+" : weightChange < 0 ? "−" : "±"}${fmt(Math.abs(weightChange), 1)}`}</span>{" "}
            <span className="text-caption muted">kg</span>
          </p>
          <p className="text-caption font-semibold text-primary">Details ›</p>
        </Link>
      </div>

      <BalanceSummary balance={balance} target={profile.kcalTarget} />

      <section className="card space-y-2">
        <h2 className="text-h3">Kalorien pro Tag</h2>
        <CalorieBars days={series} target={profile.kcalTarget} />
        <p className="text-caption muted">Gestrichelt: dein Tagesziel. Tage über dem Ziel sind ocker markiert.</p>
      </section>

      <section className="card space-y-3">
        <h2 className="text-h3">Ø Makros pro Tag</h2>
        <div className="flex h-3 overflow-hidden rounded-full">
          <div className="bg-macro-protein" style={{ width: `${((avg("protein") * 4) / macroKcal) * 100}%` }} />
          <div className="bg-macro-carbs" style={{ width: `${((avg("carbs") * 4) / macroKcal) * 100}%` }} />
          <div className="bg-macro-fat" style={{ width: `${((avg("fat") * 9) / macroKcal) * 100}%` }} />
        </div>
        <div className="grid grid-cols-3 text-sm">
          {(
            [
              ["Eiweiß", "protein", "bg-macro-protein", profile.proteinTarget],
              ["Kohlenh.", "carbs", "bg-macro-carbs", profile.carbsTarget],
              ["Fett", "fat", "bg-macro-fat", profile.fatTarget],
            ] as const
          ).map(([label, key, color, target]) => (
            <div key={key}>
              <p className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                {label}
              </p>
              <p className="font-semibold tabular-nums">{fmt(avg(key))} g</p>
              <p className="text-caption muted">Ziel {target} g</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

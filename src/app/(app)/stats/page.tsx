import Link from "next/link";
import { CalorieBars, WeightLine } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { addDays, formatDay, today } from "@/lib/dates";
import { fmt } from "@/lib/nutrition";
import { Icon, type IconName } from "@/components/icons";
import { ProgressBar } from "@/components/progress";
import { weightStats } from "@/lib/weight-stats";
import { getDailyTotals, getProfile, getStreak, getWeights } from "@/lib/queries";
import { BALANCE_WEEKS, energyBalance } from "@/lib/energy-balance";
import { BalanceSummary } from "./balance-summary";

export const metadata = { title: "Statistik" };

const RANGES = [7, 30, 90] as const;

const VIEWS: { key: string; label: string; icon: IconName }[] = [
  { key: "kcal", label: "Kalorien", icon: "flame" },
  { key: "macros", label: "Makros", icon: "protein" },
  { key: "weight", label: "Gewicht", icon: "weight" },
];

const signed = (v: number, digits = 1) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${fmt(Math.abs(v), digits)}`;

export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const user = await requireUser();
  const sp = await searchParams;
  const range = RANGES.find((r) => String(r) === sp.range) ?? 7;
  const view = VIEWS.find((v) => v.key === sp.view)?.key ?? "kcal";
  const href = (params: { range?: number; view?: string }) => {
    const q = new URLSearchParams();
    const r = params.range ?? range;
    const v = params.view ?? view;
    if (r !== 7) q.set("range", String(r));
    if (v !== "kcal") q.set("view", v);
    return q.size ? `/stats?${q}` : "/stats";
  };
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
    title: formatDay(d, { weekday: "short", day: "numeric", month: "long" }),
    kcal: byDay.get(d)?.kcal ?? 0,
  }));

  const logged = totals.filter((t) => t.kcal > 0);
  const avg = (key: "kcal" | "protein" | "carbs" | "fat") => (logged.length ? logged.reduce((s, t) => s + t[key], 0) / logged.length : 0);
  const avgKcal = avg("kcal");
  const macroKcal = avg("protein") * 4 + avg("carbs") * 4 + avg("fat") * 9 || 1;
  const onTarget = logged.filter((t) => Math.abs(t.kcal - profile.kcalTarget) <= profile.kcalTarget * 0.1).length;

  const wStats = weightStats([...weights].reverse().map((w) => ({ day: w.day, kg: w.kg })), to, range, profile.heightCm);
  const macros = [
    { key: "protein", label: "Eiweiß", color: "bg-macro-protein", target: profile.proteinTarget, kcalPerGram: 4 },
    { key: "carbs", label: "Kohlenhydrate", color: "bg-macro-carbs", target: profile.carbsTarget, kcalPerGram: 4 },
    { key: "fat", label: "Fett", color: "bg-macro-fat", target: profile.fatTarget, kcalPerGram: 9 },
  ] as const;
  // Ein Makro gilt an einem Tag als erreicht, wenn mindestens 90 % des Ziels gegessen wurden.
  const macroDays = (key: "protein" | "carbs" | "fat", target: number) => logged.filter((t) => t[key] >= target * 0.9).length;

  return (
    <div className="space-y-4">
      <PageHeader title="Statistik" subtitle={`Letzte ${range} Tage`} />

      <nav className="flex gap-2" aria-label="Statistik wählen">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={href({ view: v.key })}
            scroll={false}
            aria-current={v.key === view ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border text-label font-semibold transition-[background-color,color,transform] duration-200 active:scale-95 ${v.key === view ? "border-primary bg-primary text-on-primary shadow-card" : "border-border bg-surface text-text-secondary"}`}
          >
            <Icon name={v.icon} size={18} />
            {v.label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-3 gap-1 rounded-full bg-surface-muted p-1" role="tablist" aria-label="Zeitraum">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={href({ range: r })}
            scroll={false}
            role="tab"
            aria-selected={r === range}
            className={`flex min-h-9 items-center justify-center rounded-full text-label transition-colors duration-150 ${r === range ? "bg-surface font-semibold text-text-primary shadow-card" : "text-text-secondary"}`}
          >
            {r} Tage
          </Link>
        ))}
      </div>

      {view === "kcal" && (
        <>
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
          </div>

          <section className="card space-y-2">
            <h2 className="text-h3">Kalorien pro Tag</h2>
            <CalorieBars days={series} target={profile.kcalTarget} />
            <p className="text-caption muted">Gestrichelt: dein Tagesziel. Tage über dem Ziel sind ocker markiert.</p>
          </section>

          <div className="card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-label muted">Serie</p>
              <p className="tabular-nums">
                <span className="text-h2">
                  <span aria-hidden>🔥</span> {streak.current}
                </span>{" "}
                <span className="text-caption muted">{streak.current === 1 ? "Tag" : "Tage"} am Stück eingetragen</span>
              </p>
            </div>
            <p className="text-caption muted">Rekord {streak.longest}</p>
          </div>

          <BalanceSummary balance={balance} target={profile.kcalTarget} />
        </>
      )}

      {view === "macros" && (
        <>
          <section className="card space-y-4">
            <div>
              <h2 className="text-h3">Ø Makros pro Tag</h2>
              <p className="text-caption muted">{logged.length ? `Aus ${logged.length} erfassten ${logged.length === 1 ? "Tag" : "Tagen"}` : "Noch keine Einträge in diesem Zeitraum"}</p>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
              {logged.length > 0 && macros.map((m) => <div key={m.key} className={m.color} style={{ width: `${((avg(m.key) * m.kcalPerGram) / macroKcal) * 100}%` }} />)}
            </div>
            <ul className="space-y-4">
              {macros.map((m) => (
                <li key={m.key} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="flex items-center gap-2 font-semibold">
                      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${m.color}`} />
                      {m.label}
                    </p>
                    <p className="tabular-nums">
                      <span className="font-semibold">{fmt(avg(m.key))}</span>
                      <span className="text-caption muted"> / {m.target} g</span>
                    </p>
                  </div>
                  <ProgressBar value={avg(m.key)} max={m.target} color={m.color} />
                  <p className="text-caption tabular-nums muted">
                    {logged.length ? `${fmt(((avg(m.key) * m.kcalPerGram) / macroKcal) * 100)} % der kcal` : "–"}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="card space-y-3">
            <div>
              <h2 className="text-h3">Ziel erreicht</h2>
              <p className="text-caption muted">Tage, an denen du mindestens 90 % des Ziels gegessen hast.</p>
            </div>
            <dl className="grid grid-cols-3 divide-x divide-border">
              {macros.map((m) => (
                <div key={m.key} className="flex min-w-0 flex-col items-center px-2 text-center">
                  <dt className="truncate text-caption font-semibold text-text-secondary">{m.label}</dt>
                  <dd className="tabular-nums">
                    <span className="text-h2 font-extrabold">{macroDays(m.key, m.target)}</span>
                    <span className="text-caption muted"> / {logged.length}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}

      {view === "weight" &&
        (wStats ? (
          <section className="card space-y-5" aria-label="Gewichtsstatistik">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-label muted">Aktuell</p>
                <p className="tabular-nums">
                  <span className="text-display">{fmt(wStats.latest.kg, 1)}</span>
                  <span className="ml-1 text-body muted">kg</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-label muted">Im Zeitraum</p>
                <p className="text-h3 tabular-nums">
                  {wStats.change === null ? "–" : signed(wStats.change)} <span className="text-caption muted">kg</span>
                </p>
              </div>
            </div>
            {wStats.inRange.length >= 2 ? (
              <WeightLine points={wStats.inRange} average={wStats.avg} />
            ) : (
              <p className="rounded-button bg-surface-muted px-4 py-6 text-center text-label muted">Für eine Kurve brauchst du mindestens zwei Einträge in diesem Zeitraum.</p>
            )}
            <dl className="grid grid-cols-2 gap-2">
              {[
                { label: "Trend", value: wStats.trend === null ? "–" : `${signed(wStats.trend, 2)} kg/Woche` },
                { label: "Min / Max", value: wStats.min === null ? "–" : `${fmt(wStats.min, 1)} / ${fmt(wStats.max!, 1)} kg` },
                { label: "Ø im Zeitraum", value: wStats.avg === null ? "–" : `${fmt(wStats.avg, 1)} kg` },
                { label: "BMI", value: wStats.bmi ? `${fmt(wStats.bmi.value, 1)} · ${wStats.bmi.label}` : "–" },
              ].map((s) => (
                <div key={s.label} className="rounded-button bg-surface-muted px-3 py-2.5">
                  <dt className="text-caption muted">{s.label}</dt>
                  <dd className="font-semibold tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
            <Link href="/weight" className="btn-secondary w-full rounded-full">
              Alle Details und Eintragen
            </Link>
          </section>
        ) : (
          <div className="card space-y-3 text-center">
            <p className="text-label muted">Du hast noch kein Gewicht eingetragen.</p>
            <Link href="/weight?add=1" className="btn-primary rounded-full">
              Gewicht eintragen
            </Link>
          </div>
        ))}
    </div>
  );
}

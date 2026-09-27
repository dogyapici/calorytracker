import Link from "next/link";
import { BalanceScatter } from "@/components/charts";
import { BALANCE_WEEKS, kcalForKgPerWeek, kgPerWeekAt, MIN_LOGGED_DAYS, MIN_WEIGH_INS, type EnergyBalance } from "@/lib/energy-balance";
import { fmt } from "@/lib/nutrition";

const signed = (v: number, digits = 1) => `${v > 0.049 ? "+" : v < -0.049 ? "−" : "±"}${fmt(Math.abs(v), digits)}`;
const round10 = (v: number) => Math.round(v / 10) * 10;

/** Kalorien gegen Gewicht: estimated maintenance and what other calorie levels would do. */
export function BalanceCard({ balance, target }: { balance: EnergyBalance; target: number }) {
  if (!balance.ok) {
    return (
      <section className="card space-y-3">
        <h2 className="text-h3">Kalorien & Gewicht</h2>
        <p className="text-label muted">
          Sobald genug Daten da sind, siehst du hier, wie sich dein Gewicht bei deiner Kalorienmenge verändert und welches Ziel zu dir passt.
        </p>
        <ul className="space-y-2">
          {[
            { label: "Tage mit Einträgen", have: balance.loggedDays, need: MIN_LOGGED_DAYS },
            { label: "Wiegungen über mind. eine Woche", have: balance.weighIns, need: MIN_WEIGH_INS },
          ].map((r) => (
            <li key={r.label}>
              <div className="mb-1 flex justify-between text-label">
                <span>{r.label}</span>
                <span className="tabular-nums muted">
                  {Math.min(r.have, r.need)} von {r.need}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (r.have / r.need) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="text-caption muted">Gezählt werden die letzten {BALANCE_WEEKS} Wochen.</p>
      </section>
    );
  }

  const maintenance = round10(balance.maintenance);
  const atTarget = kgPerWeekAt(target, balance.maintenance);
  const levels = [-0.75, -0.5, -0.25, 0, 0.25, 0.5].map((kg) => ({ kg, kcal: round10(kcalForKgPerWeek(kg, balance.maintenance)) }));
  // The row nearest to the current target is highlighted, so the user sees where they stand.
  const closest = levels.reduce((a, b) => (Math.abs(b.kg - atTarget) < Math.abs(a.kg - atTarget) ? b : a));
  const weeks = balance.weeks.filter((w): w is typeof w & { kgPerWeek: number } => w.kgPerWeek !== null);

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-h3">Kalorien & Gewicht</h2>
        <p className="text-caption muted">
          Aus {balance.loggedDays} Tagen mit Einträgen und {balance.weighIns} Wiegungen der letzten {BALANCE_WEEKS} Wochen
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Ø gegessen", value: fmt(balance.avgKcal), unit: "kcal", note: "pro Tag" },
          { label: "Gewichtstrend", value: signed(balance.kgPerWeek, 2), unit: "kg", note: "pro Woche" },
        ].map((t) => (
          <div key={t.label} className="rounded-button bg-surface-muted px-3.5 py-3">
            <p className="text-caption muted">{t.label}</p>
            <p className="text-h3 tabular-nums">
              {t.value} <span className="text-caption muted">{t.unit}</span>
            </p>
            <p className="text-caption muted">{t.note}</p>
          </div>
        ))}
      </div>

      <div className="rounded-button bg-primary-soft px-4 py-3">
        <p className="text-caption font-semibold text-primary">Dein Erhaltungsbedarf</p>
        <p className="text-h2 tabular-nums">ca. {fmt(maintenance)} kcal</p>
        <p className="text-label">
          Mit deinem Ziel von {fmt(target)} kcal: <strong className="tabular-nums">{signed(atTarget, 2)} kg pro Woche</strong>
          <span className="muted"> (≈ {signed(atTarget * 4.3)} kg im Monat)</span>
        </p>
      </div>

      <div>
        <p className="mb-1 text-label font-semibold">So viel pro Tag für …</p>
        <table className="w-full text-label tabular-nums">
          <tbody className="divide-y divide-border">
            {levels.map((l) => {
              const near = l === closest;
              return (
                <tr key={l.kg} className={near ? "font-semibold text-primary" : ""}>
                  <td className="py-2">{l.kg === 0 ? "Gewicht halten" : `${signed(l.kg, 2)} kg pro Woche`}</td>
                  <td className="py-2 text-right">{fmt(l.kcal)} kcal</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Link href="/profile#goals" className="mt-2 inline-block text-label font-semibold text-primary">
          Kalorienziel anpassen ›
        </Link>
      </div>

      {weeks.length >= 2 && (
        <div className="space-y-1">
          <p className="text-label font-semibold">Deine Wochen</p>
          <BalanceScatter weeks={weeks} maintenance={balance.maintenance} target={target} predict={(k) => kgPerWeekAt(k, balance.maintenance)} />
          <p className="text-caption muted">
            Jeder Punkt ist eine Woche: Ø Kalorien (unten) und Gewichtsveränderung pro Woche (links). Die Linie zeigt die Erwartung, gestrichelt dein Ziel.
          </p>
        </div>
      )}

      <p className="text-caption muted">
        Schätzung mit 7.700 kcal pro kg. Sie wird genauer, je vollständiger du einträgst und je öfter du dich wiegst. Wasser und Verdauung lassen das Gewicht kurzfristig schwanken.
      </p>
    </section>
  );
}

import { BalanceScatter } from "@/components/charts";
import { Disclosure } from "@/components/collapse";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { addDays, today } from "@/lib/dates";
import { BALANCE_WEEKS, energyBalance, kgPerWeekAt, MIN_LOGGED_DAYS, MIN_WEIGH_INS } from "@/lib/energy-balance";
import { fmt } from "@/lib/nutrition";
import { getDailyTotals, getProfile, getWeights } from "@/lib/queries";
import { BalanceScale, signed } from "./bits";
import { BalanceCalculator } from "./calculator";

export const metadata = { title: "Kalorien & Gewicht" };

export default async function BalancePage() {
  const user = await requireUser();
  const to = today();
  const [profile, totals, weights] = await Promise.all([
    getProfile(user.id),
    getDailyTotals(user.id, addDays(to, -(BALANCE_WEEKS * 7 - 1)), to),
    getWeights(user.id, 200),
  ]);
  const balance = energyBalance(totals, [...weights].reverse(), to);
  const target = profile.kcalTarget;

  const header = <PageHeader title="Kalorien & Gewicht" back="/stats" backLabel="Zur Statistik" eyebrow="Statistik" />;

  if (!balance.ok) {
    return (
      <div className="space-y-4">
        {header}
        <section className="card space-y-4">
          <p>
            Hier siehst du bald, <strong>wie viele Kalorien du essen kannst, um dein Gewicht zu halten</strong>, und was dein Kalorienziel pro Woche
            bewirkt. Dafür vergleicht die App, was du isst, mit deinem Gewicht.
          </p>
          <ul className="space-y-3">
            {[
              { label: "Tage mit Einträgen", have: balance.loggedDays, need: MIN_LOGGED_DAYS },
              { label: "Wiegungen (über mind. eine Woche)", have: balance.weighIns, need: MIN_WEIGH_INS },
            ].map((r) => (
              <li key={r.label}>
                <div className="mb-1 flex justify-between text-label">
                  <span>{r.label}</span>
                  <span className="tabular-nums muted">
                    {Math.min(r.have, r.need)} von {r.need}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (r.have / r.need) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-caption muted">Gezählt werden die letzten {BALANCE_WEEKS} Wochen.</p>
        </section>
      </div>
    );
  }

  const maintenance = Math.round(balance.maintenance / 10) * 10;
  const atTarget = kgPerWeekAt(target, balance.maintenance);
  const weeks = balance.weeks.filter((w): w is typeof w & { kgPerWeek: number } => w.kgPerWeek !== null);
  const verdict =
    Math.abs(atTarget) < 0.05
      ? "Damit hältst du dein Gewicht etwa."
      : atTarget < 0
        ? `Damit nimmst du etwa ${fmt(-atTarget, 2)} kg pro Woche ab.`
        : `Damit nimmst du etwa ${fmt(atTarget, 2)} kg pro Woche zu.`;

  return (
    <div className="space-y-4">
      {header}

      <section className="card space-y-4">
        <div>
          <p className="text-label muted">Dein Erhaltungsbedarf</p>
          <p className="tabular-nums">
            <span className="text-display">{fmt(maintenance)}</span> <span className="text-body muted">kcal pro Tag</span>
          </p>
          <p className="mt-1 text-label muted">So viel kannst du essen, ohne zu- oder abzunehmen.</p>
        </div>
        <div className="rounded-button bg-primary-soft px-4 py-3">
          <p className="text-label">
            Dein Ziel sind <strong className="tabular-nums">{fmt(target)} kcal</strong>. {verdict}
          </p>
        </div>
        <BalanceScale maintenance={balance.maintenance} target={target} />
      </section>

      <BalanceCalculator maintenance={balance.maintenance} target={target} latestKg={weights[0]?.kg ?? null} />

      {weeks.length >= 2 && (
        <section className="card space-y-3">
          <div>
            <h2 className="text-h3">Deine Wochen</h2>
            <p className="text-caption muted">Jeder Punkt ist eine Woche. Je weiter rechts, desto mehr hast du gegessen; je höher, desto mehr hast du zugenommen.</p>
          </div>
          <BalanceScatter weeks={weeks} maintenance={balance.maintenance} target={target} />
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption muted">
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-macro-carbs" /> Woche
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-primary opacity-60" /> Erwartung
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-primary" /> Erhaltungsbedarf
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-3 w-0 border-l-2 border-dashed border-accent-calories" /> dein Ziel
            </li>
          </ul>
        </section>
      )}

      <Disclosure title="Wie wird das berechnet?">
        <div className="space-y-2 text-label muted">
          <p>
            In den letzten {BALANCE_WEEKS} Wochen hast du an {balance.loggedDays} Tagen im Schnitt <strong>{fmt(balance.avgKcal)} kcal</strong> gegessen. Dein
            Gewicht hat sich laut {balance.weighIns} Wiegungen um <strong>{signed(balance.kgPerWeek, 2)} kg pro Woche</strong> verändert.
          </p>
          <p>
            Ein Kilo Körpergewicht entspricht etwa 7.700 kcal. Was du über oder unter deinem Bedarf isst, zeigt sich also in der Waage. Daraus
            ergibt sich dein Erhaltungsbedarf.
          </p>
          <p>
            Tage ohne Einträge zählen nicht mit. Wenn du an manchen Tagen nur einen Teil einträgst, wirkt dein Bedarf kleiner, als er ist. Wasser und
            Verdauung lassen das Gewicht von Tag zu Tag schwanken, deshalb wird die Schätzung mit jeder Woche genauer.
          </p>
        </div>
      </Disclosure>
    </div>
  );
}

import Link from "next/link";
import { Icon } from "@/components/icons";
import { kgPerWeekAt, MIN_LOGGED_DAYS, MIN_WEIGH_INS, type EnergyBalance } from "@/lib/energy-balance";
import { fmt } from "@/lib/nutrition";
import { BalanceScale, signed } from "./balance/bits";

/** Small "Kalorien & Gewicht" card for the stats page; the whole card leads to the detail page. */
export function BalanceSummary({ balance, target }: { balance: EnergyBalance; target: number }) {
  return (
    <Link href="/stats/balance" className="card pressable block space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h3">Kalorien & Gewicht</h2>
        <Icon name="forward" size={20} className="shrink-0 text-text-tertiary" />
      </div>
      {balance.ok ? (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-caption muted">Erhaltungsbedarf</p>
              <p className="tabular-nums">
                <span className="text-h1">{fmt(Math.round(balance.maintenance / 10) * 10)}</span> <span className="text-caption muted">kcal</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-caption muted">Mit deinem Ziel</p>
              <p className="text-h3 tabular-nums">
                {signed(kgPerWeekAt(target, balance.maintenance), 2)} <span className="text-caption muted">kg/Woche</span>
              </p>
            </div>
          </div>
          <BalanceScale maintenance={balance.maintenance} target={target} />
        </>
      ) : (
        <>
          <p className="text-label muted">Zeigt bald, wie viel du essen kannst, um dein Gewicht zu halten, ab- oder zuzunehmen.</p>
          <p className="text-caption tabular-nums muted">
            Noch nötig: {Math.max(0, MIN_LOGGED_DAYS - balance.loggedDays)} Tage mit Einträgen · {Math.max(0, MIN_WEIGH_INS - balance.weighIns)} Wiegungen
          </p>
        </>
      )}
    </Link>
  );
}

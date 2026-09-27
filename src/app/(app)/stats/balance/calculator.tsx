"use client";

import { useState } from "react";
import Link from "next/link";
import { Slider } from "@/components/slider";
import { kcalForKgPerWeek, kgPerWeekAt } from "@/lib/energy-balance";
import { fmt } from "@/lib/nutrition";

const round10 = (v: number) => Math.round(v / 10) * 10;
const signed = (v: number, digits = 1) => `${v > 0.049 ? "+" : v < -0.049 ? "−" : "±"}${fmt(Math.abs(v), digits)}`;

const PRESETS = [
  { label: "−0,5 kg", kg: -0.5 },
  { label: "−0,25 kg", kg: -0.25 },
  { label: "Halten", kg: 0 },
  { label: "+0,25 kg", kg: 0.25 },
];

/** "What if I ate …": a slider over daily calories that shows the expected weight change. */
export function BalanceCalculator({ maintenance, target, latestKg }: { maintenance: number; target: number; latestKg: number | null }) {
  const min = round10(maintenance - 1000);
  const max = round10(maintenance + 750);
  const [kcal, setKcal] = useState(Math.min(max, Math.max(min, round10(target))));
  const perWeek = kgPerWeekAt(kcal, maintenance);
  const in12 = latestKg !== null ? latestKg + perWeek * 12 : null;

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-h3">Was wäre, wenn …</h2>
        <p className="text-caption muted">Schieb, wie viel du pro Tag essen würdest.</p>
      </div>

      <div className="text-center">
        <p className="tabular-nums">
          <span className="text-display">{fmt(kcal)}</span> <span className="text-body muted">kcal pro Tag</span>
        </p>
      </div>
      <Slider aria-label="Kalorien pro Tag" min={min} max={max} step={10} value={kcal} onChange={setKcal} color="var(--ds-accent-calories)" />

      <div className="grid grid-cols-4 gap-1 rounded-button bg-surface-muted p-1">
        {PRESETS.map((p) => {
          const value = round10(kcalForKgPerWeek(p.kg, maintenance));
          const active = Math.abs(kcal - value) < 10;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => setKcal(Math.min(max, Math.max(min, value)))}
              className={`min-h-10 rounded-chip text-caption transition-colors duration-150 ${active ? "bg-surface font-semibold text-text-primary shadow-card" : "text-text-secondary"}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center" aria-live="polite">
        {[
          { label: "pro Woche", value: signed(perWeek, 2) },
          { label: "pro Monat", value: signed(perWeek * 4.35) },
          { label: "in 12 Wo.", value: in12 !== null ? fmt(in12, 1) : "–" },
        ].map((t) => (
          <div key={t.label} className="rounded-button bg-surface-muted px-2 py-3">
            <dt className="text-caption muted">{t.label}</dt>
            <dd className="whitespace-nowrap tabular-nums">
              <span className="text-h3">{t.value}</span> <span className="text-caption muted">kg</span>
            </dd>
          </div>
        ))}
      </dl>

      {kcal !== round10(target) && (
        <p className="text-label muted">
          Dein aktuelles Ziel sind {fmt(target)} kcal.{" "}
          <Link href="/profile#goals" className="font-semibold text-primary">
            Ziel anpassen ›
          </Link>
        </p>
      )}
    </section>
  );
}

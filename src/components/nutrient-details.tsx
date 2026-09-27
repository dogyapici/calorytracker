import type { Entry } from "@/db/schema";
import { EXTRA_LIMITS, MICROS, sumMicros } from "@/lib/micros";
import { fmt } from "@/lib/nutrition";
import { ProgressBar } from "./progress";

function sumKnown(entries: Entry[], key: "sugar" | "saturatedFat" | "fiber" | "salt") {
  const known = entries.filter((e) => e[key] !== null);
  return { value: known.reduce((s, e) => s + (e[key] as number), 0), known: known.length };
}

/** Sugar, fiber, saturated fat, salt, vitamins and minerals of a set of entries. */
export function NutrientBreakdown({ entries, kcalTarget }: { entries: Entry[]; kcalTarget: number }) {
  const micros = sumMicros(entries.map((e) => e.micros));
  const withMicros = entries.filter((e) => e.micros && Object.keys(e.micros).length > 0).length;
  const satFatMax = (kcalTarget * EXTRA_LIMITS.saturatedFat.maxShareOfKcal) / 9;

  const extras = [
    { ...sumKnown(entries, "fiber"), label: EXTRA_LIMITS.fiber.label, target: EXTRA_LIMITS.fiber.min, kind: "min" as const },
    { ...sumKnown(entries, "sugar"), label: EXTRA_LIMITS.sugar.label, target: EXTRA_LIMITS.sugar.max, kind: "max" as const },
    { ...sumKnown(entries, "saturatedFat"), label: EXTRA_LIMITS.saturatedFat.label, target: satFatMax, kind: "max" as const },
    { ...sumKnown(entries, "salt"), label: EXTRA_LIMITS.salt.label, target: EXTRA_LIMITS.salt.max, kind: "max" as const },
  ];

  return (
    <div className="space-y-3">
      {extras.map((x) => (
        <div key={x.label}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="font-medium">{x.label}</span>
            <span className="shrink-0 tabular-nums muted">
              {fmt(x.value, 1)} g {x.kind === "min" ? "von mind." : "von max."} {fmt(x.target)} g
            </span>
          </div>
          <ProgressBar value={x.value} max={x.target} color={x.kind === "min" ? "bg-primary" : "bg-text-tertiary"} overIsBad={x.kind === "max"} />
          {x.known < entries.length && (
            <p className="mt-0.5 text-caption muted">
              bei {entries.length - x.known} von {entries.length} Einträgen unbekannt
            </p>
          )}
        </div>
      ))}

      <div className="border-t border-border pt-3">
        <h3 className="mb-1 text-sm font-semibold">Vitamine und Mineralstoffe</h3>
        <p className="mb-2 text-caption muted">
          Nur aus Produkten, die diese Werte angeben ({withMicros} von {entries.length} Einträgen). Prozent vom Tagesbedarf
          eines Erwachsenen (DGE, gerundet).
        </p>
        {withMicros === 0 ? (
          <p className="text-sm muted">Heute keine Angaben vorhanden.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
            {MICROS.filter((m) => micros[m.key] !== undefined).map((m) => {
              const value = micros[m.key] ?? 0;
              return (
                <li key={m.key}>
                  <div className="flex justify-between text-xs">
                    <span>{m.label}</span>
                    <span className="tabular-nums muted">{fmt((value / m.reference) * 100)} %</span>
                  </div>
                  <ProgressBar value={value} max={m.reference} color="bg-primary" overIsBad={false} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

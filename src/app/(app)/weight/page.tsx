import { deleteWeight, deleteWeightPhoto } from "@/app/actions";
import { WeightLine } from "@/components/charts";
import type { weights } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDay, today } from "@/lib/dates";
import { fmt } from "@/lib/nutrition";
import { getPhotoVersions, getProfile, getWeights } from "@/lib/queries";
import { WEIGHT_RANGES, weightStats } from "@/lib/weight-stats";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { WeightForm } from "./weight-form";
import { QuickWeight, QuickWeightButton } from "./quick-weight";
import { Icon } from "@/components/icons";

import { PendingButton } from "@/components/form-bits";

export const metadata = { title: "Gewicht" };

type Weight = typeof weights.$inferSelect;

const MEASURES = [
  { key: "waistCm", label: "Taille", unit: "cm" },
  { key: "hipCm", label: "Hüfte", unit: "cm" },
  { key: "chestCm", label: "Brust", unit: "cm" },
  { key: "armCm", label: "Oberarm", unit: "cm" },
  { key: "thighCm", label: "Oberschenkel", unit: "cm" },
  { key: "bodyFatPct", label: "Körperfett", unit: "%" },
] as const;

const photoUrl = (day: string, version: number) => `/api/photos/${day}?v=${version}`;

const signed = (v: number, digits = 1) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${fmt(Math.abs(v), digits)}`;
// Abnehmen ist nicht für jeden das Ziel, deshalb färben wir Veränderungen neutral ein.
const Delta = ({ value, unit = "kg" }: { value: number | null; unit?: string }) =>
  value === null ? <span className="muted">–</span> : <span className="tabular-nums">{signed(value)} <span className="text-caption muted">{unit}</span></span>;

export default async function WeightPage({ searchParams }: PageProps<"/weight">) {
  const user = await requireUser();
  const { range: rangeParam, add } = await searchParams;
  const range = WEIGHT_RANGES.find((r) => r.key === rangeParam) ?? WEIGHT_RANGES[1];
  const [list, photos, profile] = await Promise.all([getWeights(user.id, 2000), getPhotoVersions(user.id), getProfile(user.id)]);
  const latest = list[0];
  const stats = weightStats([...list].reverse().map((w) => ({ day: w.day, kg: w.kg })), today(), range.days, profile.heightCm);

  // Latest value per measurement and its change since the first time it was measured.
  const measureSummary = MEASURES.map((m) => {
    const measured = list.filter((w) => w[m.key] !== null) as (Weight & Record<typeof m.key, number>)[];
    if (!measured.length) return null;
    const newest = measured[0];
    const oldest = measured[measured.length - 1];
    return { ...m, value: newest[m.key], diff: measured.length > 1 ? newest[m.key] - oldest[m.key] : null };
  }).filter((x) => x !== null);

  const gallery = list.filter((w) => photos.has(w.day)).slice(0, 12);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Gewicht"
        subtitle={latest ? `Zuletzt gewogen am ${formatDay(latest.day, { day: "numeric", month: "long" })}` : "Trag dein erstes Gewicht ein"}
        action={<QuickWeightButton />}
      />
      <QuickWeight today={today()} lastKg={latest?.kg ?? null} weighedToday={latest?.day === today()} openOnLoad={add === "1"} />

      {stats && (
        <section className="card space-y-5" aria-label="Gewichtsstatistik">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-label muted">Aktuell</p>
              <p className="tabular-nums">
                <span className="text-display">{fmt(stats.latest.kg, 1)}</span>
                <span className="ml-1 text-body muted">kg</span>
              </p>
            </div>
            {stats.trend !== null && (
              <div className="text-right">
                <p className="text-label muted">Trend</p>
                <p className="text-h3 tabular-nums">
                  {signed(stats.trend, 2)} <span className="text-caption muted">kg/Woche</span>
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1 rounded-button bg-surface-muted p-1" role="tablist" aria-label="Zeitraum">
            {WEIGHT_RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/weight?range=${r.key}`}
                scroll={false}
                role="tab"
                aria-selected={r.key === range.key}
                className={`flex min-h-10 items-center justify-center rounded-chip text-label transition-colors duration-150 ${r.key === range.key ? "bg-surface font-semibold text-text-primary shadow-card" : "text-text-secondary"}`}
              >
                {r.label}
              </Link>
            ))}
          </div>

          {stats.inRange.length >= 2 ? (
            <WeightLine points={stats.inRange} average={stats.avg} />
          ) : (
            <p className="rounded-button bg-surface-muted px-4 py-6 text-center text-label muted">Für eine Kurve brauchst du mindestens zwei Einträge in diesem Zeitraum.</p>
          )}

          <dl className="grid grid-cols-2 gap-2">
            {[
              { label: "Im Zeitraum", value: <Delta value={stats.change} /> },
              { label: "Seit Beginn", value: <Delta value={stats.total} /> },
              { label: "Letzte 7 Tage", value: <Delta value={stats.change7} /> },
              { label: "Letzte 30 Tage", value: <Delta value={stats.change30} /> },
              {
                label: "Min / Max",
                value: (
                  <span className="tabular-nums">
                    {fmt(stats.min!, 1)} / {fmt(stats.max!, 1)} <span className="text-caption muted">kg</span>
                  </span>
                ),
              },
              {
                label: "BMI",
                value: stats.bmi ? (
                  <span className="tabular-nums">
                    {fmt(stats.bmi.value, 1)} <span className="text-caption muted">{stats.bmi.label}</span>
                  </span>
                ) : (
                  <Link href="/profile" className="text-label font-semibold text-primary">
                    Größe eintragen
                  </Link>
                ),
              },
            ].map((t) => (
              <div key={t.label} className="rounded-button bg-surface-muted px-3.5 py-3">
                <dt className="text-caption muted">{t.label}</dt>
                <dd className="mt-0.5 text-h3">{t.value}</dd>
              </div>
            ))}
          </dl>
          {stats.avg !== null && stats.inRange.length >= 2 && <p className="text-caption muted">Gestrichelt: dein Durchschnitt im Zeitraum ({fmt(stats.avg, 1)} kg).</p>}
        </section>
      )}

      <WeightForm today={today()} lastKg={latest?.kg ?? null} />

      {measureSummary.length > 0 && (
        <section className="card space-y-2">
          <h2 className="text-h3">Körpermaße</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {measureSummary.map((m) => (
              <li key={m.key}>
                <p className="text-caption muted">{m.label}</p>
                <p className="font-semibold tabular-nums">
                  {fmt(m.value, 1)} {m.unit}
                  {m.diff !== null && m.diff !== 0 && (
                    <span className={`ml-1 text-xs ${m.diff < 0 ? "text-primary" : "text-warning"}`}>
                      {m.diff > 0 ? "+" : ""}
                      {fmt(m.diff, 1)}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-caption muted">Veränderung seit der ersten Messung.</p>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="card space-y-2">
          <h2 className="text-h3">Fortschrittsfotos</h2>
          <ul className="grid grid-cols-3 gap-2">
            {gallery.map((w) => (
              <li key={w.day}>
                <a href={photoUrl(w.day, photos.get(w.day)!)} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(w.day, photos.get(w.day)!)} alt={`Foto vom ${formatDay(w.day)}`} className="aspect-[3/4] w-full rounded-chip bg-surface-muted object-cover" loading="lazy" />
                  <span className="mt-1 block text-center text-[11px] tabular-nums muted">
                    {formatDay(w.day, { day: "numeric", month: "numeric", year: "2-digit" })} · {fmt(w.kg, 1)} kg
                  </span>
                </a>
                <form action={deleteWeightPhoto} className="text-center">
                  <input type="hidden" name="day" value={w.day} />
                  <PendingButton className="text-[11px] text-text-tertiary hover:text-danger" aria-label={`Foto vom ${formatDay(w.day)} löschen`}>
                    Foto löschen
                  </PendingButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {list.length > 0 && (
        <ul className="card divide-y divide-border p-0">
          {list.slice(0, 60).map((w) => {
            const measures = MEASURES.filter((m) => w[m.key] !== null)
              .map((m) => `${m.label} ${fmt(w[m.key]!, 1)} ${m.unit}`)
              .join(" · ");
            const version = photos.get(w.day);
            return (
              <li key={w.day} className="flex items-center gap-3 py-2.5 pl-card pr-2">
                {version ? (
                  <a href={photoUrl(w.day, version)} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl(w.day, version)} alt="" className="h-10 w-10 rounded-chip object-cover" loading="lazy" />
                  </a>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate">{formatDay(w.day, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
                  {measures && <p className="truncate text-caption muted">{measures}</p>}
                </div>
                <span className="text-body font-semibold tabular-nums">{fmt(w.kg, 1)} <span className="text-caption font-normal muted">kg</span></span>
                <form action={deleteWeight}>
                  <input type="hidden" name="day" value={w.day} />
                  <PendingButton className="btn px-2 py-1 text-text-tertiary hover:text-danger" aria-label="Eintrag löschen">
                    <Icon name="remove" size={20} />
                  </PendingButton>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

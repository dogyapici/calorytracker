import { deleteWeight, deleteWeightPhoto } from "@/app/actions";
import { WeightLine } from "@/components/charts";
import type { weights } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDay, today } from "@/lib/dates";
import { fmt } from "@/lib/nutrition";
import { getPhotoVersions, getWeights } from "@/lib/queries";
import { WeightForm } from "./weight-form";

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

export default async function WeightPage() {
  const user = await requireUser();
  const [list, photos] = await Promise.all([getWeights(user.id), getPhotoVersions(user.id)]);
  const chronological = [...list].reverse().slice(-90);
  const latest = list[0];
  const first = chronological[0];
  const change = latest && first ? latest.kg - first.kg : 0;

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
      <h1 className="text-lg font-bold">Gewicht</h1>
      <WeightForm today={today()} lastKg={latest?.kg ?? null} />

      {chronological.length >= 2 && (
        <section className="card space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Verlauf</h2>
            <span className={`text-sm font-semibold tabular-nums ${change <= 0 ? "text-brand-600" : "text-amber-600"}`}>
              {change > 0 ? "+" : ""}
              {fmt(change, 1)} kg
            </span>
          </div>
          <WeightLine points={chronological.map((w) => ({ label: formatDay(w.day, { day: "numeric", month: "numeric" }), kg: w.kg }))} />
        </section>
      )}

      {measureSummary.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-semibold">Körpermaße</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {measureSummary.map((m) => (
              <li key={m.key}>
                <p className="text-xs muted">{m.label}</p>
                <p className="font-semibold tabular-nums">
                  {fmt(m.value, 1)} {m.unit}
                  {m.diff !== null && m.diff !== 0 && (
                    <span className={`ml-1 text-xs ${m.diff < 0 ? "text-brand-600" : "text-amber-600"}`}>
                      {m.diff > 0 ? "+" : ""}
                      {fmt(m.diff, 1)}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs muted">Veränderung seit der ersten Messung.</p>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-semibold">Fortschrittsfotos</h2>
          <ul className="grid grid-cols-3 gap-2">
            {gallery.map((w) => (
              <li key={w.day}>
                <a href={photoUrl(w.day, photos.get(w.day)!)} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(w.day, photos.get(w.day)!)} alt={`Foto vom ${formatDay(w.day)}`} className="aspect-[3/4] w-full rounded-lg bg-zinc-100 object-cover dark:bg-zinc-800" loading="lazy" />
                  <span className="mt-1 block text-center text-[11px] tabular-nums muted">
                    {formatDay(w.day, { day: "numeric", month: "numeric", year: "2-digit" })} · {fmt(w.kg, 1)} kg
                  </span>
                </a>
                <form action={deleteWeightPhoto} className="text-center">
                  <input type="hidden" name="day" value={w.day} />
                  <button className="text-[11px] text-zinc-400 hover:text-red-600" aria-label={`Foto vom ${formatDay(w.day)} löschen`}>
                    Foto löschen
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {list.length > 0 && (
        <ul className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
          {list.slice(0, 60).map((w) => {
            const measures = MEASURES.filter((m) => w[m.key] !== null)
              .map((m) => `${m.label} ${fmt(w[m.key]!, 1)} ${m.unit}`)
              .join(" · ");
            const version = photos.get(w.day);
            return (
              <li key={w.day} className="flex items-center gap-3 px-4 py-2">
                {version ? (
                  <a href={photoUrl(w.day, version)} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl(w.day, version)} alt="" className="h-10 w-10 rounded-lg object-cover" loading="lazy" />
                  </a>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{formatDay(w.day, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
                  {measures && <p className="truncate text-xs muted">{measures}</p>}
                </div>
                <span className="font-semibold tabular-nums">{fmt(w.kg, 1)} kg</span>
                <form action={deleteWeight}>
                  <input type="hidden" name="day" value={w.day} />
                  <button className="btn px-2 py-1 text-zinc-400 hover:text-red-600" aria-label="Eintrag löschen">
                    ×
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

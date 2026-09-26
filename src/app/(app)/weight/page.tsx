import { deleteWeight } from "@/app/actions";
import { WeightLine } from "@/components/charts";
import { requireUser } from "@/lib/auth";
import { formatDay, today } from "@/lib/dates";
import { fmt } from "@/lib/nutrition";
import { getWeights } from "@/lib/queries";
import { WeightForm } from "./weight-form";

export const metadata = { title: "Gewicht" };

export default async function WeightPage() {
  const user = await requireUser();
  const list = await getWeights(user.id);
  const chronological = [...list].reverse().slice(-90);
  const latest = list[0];
  const first = chronological[0];
  const change = latest && first ? latest.kg - first.kg : 0;

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

      {list.length > 0 && (
        <ul className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
          {list.slice(0, 60).map((w) => (
            <li key={w.day} className="flex items-center justify-between px-4 py-2">
              <span className="text-sm">{formatDay(w.day, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
              <span className="flex items-center gap-2">
                <span className="font-semibold tabular-nums">{fmt(w.kg, 1)} kg</span>
                <form action={deleteWeight}>
                  <input type="hidden" name="day" value={w.day} />
                  <button className="btn px-2 py-1 text-zinc-400 hover:text-red-600" aria-label="Löschen">
                    ×
                  </button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

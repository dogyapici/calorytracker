import { notFound } from "next/navigation";
import { deleteExercise, deleteLog } from "@/app/training-actions";
import { WeightLine } from "@/components/charts";
import { Disclosure } from "@/components/collapse";
import { PendingButton } from "@/components/form-bits";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { today } from "@/lib/dates";
import { fmt } from "@/lib/nutrition";
import { exerciseProgress, recentWeeks, weekLabel, weekNumberSince } from "@/lib/training";
import { getExercise, getExerciseLogs } from "@/lib/training-queries";
import { Change, formatSet, signedKg } from "../../bits";
import { LogForm } from "./log-form";

export default async function ExercisePage({ params }: PageProps<"/training/exercise/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const found = Number.isInteger(id) ? await getExercise(user.id, id) : null;
  if (!found) notFound();
  const { exercise, category } = found;
  const logs = await getExerciseLogs(user.id, exercise.id);
  const progress = exerciseProgress(logs);
  const weeks = recentWeeks(today());
  const oldestFirst = [...logs].reverse();

  return (
    <div className="space-y-4">
      <PageHeader back={`/training/${category.id}`} backLabel={`Zurück zu ${category.name}`} eyebrow={category.name} title={exercise.name} />

      <LogForm
        exerciseId={exercise.id}
        weeks={weeks.map((w) => ({ week: w, label: weekLabel(w) }))}
        logs={logs.map((l) => ({ week: l.week, weightKg: l.weightKg, reps: l.reps, sets: l.sets }))}
      />

      {progress && (
        <section className="card space-y-5" aria-label="Fortschritt">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-label muted">Zuletzt</p>
              <p className="tabular-nums">
                <span className="text-display">{fmt(progress.latest.weightKg, 2)}</span>
                <span className="ml-1 text-body muted">kg × {progress.latest.reps}</span>
              </p>
            </div>
            {progress.change !== null && (
              <div className="text-right">
                <p className="text-label muted">Zur Vorwoche</p>
                <p className="text-h3">
                  <Change value={progress.change} />
                </p>
              </div>
            )}
          </div>

          {logs.length >= 2 && <WeightLine points={oldestFirst.map((l) => ({ day: l.week, kg: l.weightKg }))} />}

          <dl className="grid grid-cols-3 gap-2">
            {[
              { label: "Bestwert", value: `${fmt(progress.best, 2)} kg` },
              { label: "Seit Start", value: progress.total === null ? "–" : signedKg(progress.total) },
              { label: "Wochen", value: String(progress.weeks) },
            ].map((t) => (
              <div key={t.label} className="rounded-button bg-surface-muted px-3 py-3">
                <dt className="text-caption muted">{t.label}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{t.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {logs.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-h3">Verlauf</h2>
          <ul className="card divide-y divide-border p-0">
            {logs.map((l, i) => {
              const before = logs[i + 1];
              return (
                <li key={l.week} className="flex items-center gap-3 py-3 pl-card pr-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      Woche {weekNumberSince(progress!.first.week, l.week)}
                      <span className="ml-2 text-caption font-normal muted">{weekLabel(l.week)}</span>
                    </p>
                    <p className="text-label tabular-nums muted">{formatSet(l)}</p>
                  </div>
                  {before && <Change value={l.weightKg - before.weightKg} />}
                  <form action={deleteLog}>
                    <input type="hidden" name="exerciseId" value={exercise.id} />
                    <input type="hidden" name="week" value={l.week} />
                    <PendingButton className="btn px-2 py-1 text-text-tertiary hover:text-danger" aria-label={`${weekLabel(l.week)} löschen`}>
                      <Icon name="remove" size={20} />
                    </PendingButton>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Disclosure title="Übung bearbeiten">
        <form action={deleteExercise}>
          <input type="hidden" name="id" value={exercise.id} />
          <PendingButton className="btn-danger w-full">Übung mit Verlauf löschen</PendingButton>
        </form>
      </Disclosure>
    </div>
  );
}

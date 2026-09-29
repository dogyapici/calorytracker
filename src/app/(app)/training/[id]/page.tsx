import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCategory } from "@/app/training-actions";
import { Disclosure } from "@/components/collapse";
import { PendingButton } from "@/components/form-bits";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { today } from "@/lib/dates";
import { groupsForCategory, weekStart } from "@/lib/training";
import { getCategory, getCategoryExercises } from "@/lib/training-queries";
import { formatSet, signedKg } from "../bits";
import { ExercisePicker } from "./exercise-picker";
import { RenameCategory } from "./rename-category";

export default async function CategoryPage({ params }: PageProps<"/training/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const category = Number.isInteger(id) ? await getCategory(user.id, id) : null;
  if (!category) notFound();
  const exercises = await getCategoryExercises(user.id, category.id);
  const thisWeek = weekStart(today());
  const groups = groupsForCategory(category.name).map((g) => ({ key: g.key, label: g.label, exercises: [...g.exercises] }));

  return (
    <div className="space-y-4">
      <PageHeader back="/training" eyebrow="Training" title={category.name} subtitle={exercises.length === 1 ? "1 Übung" : `${exercises.length} Übungen`} />

      {exercises.length > 0 ? (
        <ul className="card divide-y divide-border p-0">
          {exercises.map((e) => {
            const p = e.progress;
            const done = p?.latest.week === thisWeek;
            return (
              <li key={e.id}>
                <Link href={`/training/exercise/${e.id}`} className="flex min-h-touch items-center gap-3 px-card py-3.5 transition-colors active:bg-surface-muted">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{e.name}</span>
                    <span className="block text-caption muted">
                      {p ? (
                        <>
                          <span className="tabular-nums">{formatSet(p.latest)}</span>
                          {p.change != null && p.change !== 0 && (
                            <>
                              {" · "}
                              <span className={`font-semibold tabular-nums ${p.change > 0 ? "text-primary" : ""}`}>{signedKg(p.change)}</span>
                            </>
                          )}
                        </>
                      ) : (
                        "Noch nichts eingetragen"
                      )}
                    </span>
                  </span>
                  {done ? (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary" title="Diese Woche eingetragen">
                      <Icon name="check" size={18} />
                      <span className="sr-only">Diese Woche eingetragen</span>
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1.5 text-caption font-semibold text-primary">Eintragen</span>
                  )}
                  <Icon name="forward" size={20} className="shrink-0 text-text-tertiary" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="card text-label muted">Noch keine Übungen. Wähl unten welche aus der Liste oder gib einen eigenen Namen ein.</p>
      )}

      <ExercisePicker categoryId={category.id} groups={groups} existing={exercises.map((e) => e.name)} />

      <Disclosure title="Kategorie bearbeiten">
        <div className="space-y-4">
          <RenameCategory id={category.id} name={category.name} />
          <form action={deleteCategory}>
            <input type="hidden" name="id" value={category.id} />
            <PendingButton className="btn-danger w-full">Kategorie mit allen Übungen löschen</PendingButton>
          </form>
        </div>
      </Disclosure>
    </div>
  );
}

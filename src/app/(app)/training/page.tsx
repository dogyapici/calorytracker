import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { today } from "@/lib/dates";
import { weekLabel, weekStart } from "@/lib/training";
import { getCategories } from "@/lib/training-queries";
import { NewCategory } from "./new-category";

export const metadata = { title: "Training" };

export default async function TrainingPage() {
  const user = await requireUser();
  const categories = await getCategories(user.id);
  const thisWeek = weekStart(today());

  return (
    <div className="space-y-4">
      <PageHeader title="Training" subtitle={`Diese Woche: ${weekLabel(thisWeek)}`} />

      {categories.length === 0 ? (
        <section className="card space-y-2 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon name="training" size={28} />
          </span>
          <h2 className="text-h3">Leg deine erste Kategorie an</h2>
          <p className="text-label muted">Zum Beispiel „Brusttraining“. Darin sammelst du deine Übungen und trägst jede Woche Gewicht und Wiederholungen ein.</p>
        </section>
      ) : (
        <ul className="space-y-3">
          {categories.map((c) => {
            const done = c.lastWeek === thisWeek;
            return (
              <li key={c.id}>
                <Link href={`/training/${c.id}`} className="card pressable flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Icon name="training" size={24} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-h3">{c.name}</span>
                    <span className="block text-caption muted">
                      {c.exerciseCount === 1 ? "1 Übung" : `${c.exerciseCount} Übungen`}
                      {c.lastWeek && (done ? " · diese Woche" : ` · zuletzt ${weekLabel(c.lastWeek).split(" · ")[0]}`)}
                    </span>
                  </span>
                  {done && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary" title="Diese Woche trainiert">
                      <Icon name="check" size={18} />
                    </span>
                  )}
                  <Icon name="forward" size={20} className="shrink-0 text-text-tertiary" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <NewCategory existing={categories.map((c) => c.name)} />
    </div>
  );
}

"use client";

import { useActionState, useState, useTransition } from "react";
import { addExercise } from "@/app/training-actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { Icon } from "@/components/icons";

type Group = { key: string; label: string; exercises: string[] };

/**
 * Adds exercises to a category: a free name field plus the exercise library by muscle group,
 * where one tap on a suggestion adds it. The groups that fit the category name come first.
 */
export function ExercisePicker({ categoryId, groups, existing }: { categoryId: number; groups: Group[]; existing: string[] }) {
  const [state, action] = useActionState(addExercise, undefined);
  const [group, setGroup] = useState(groups[0].key);
  const [adding, setAdding] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  const shown = groups.find((g) => g.key === group) ?? groups[0];

  const add = (name: string) => {
    const data = new FormData();
    data.set("categoryId", String(categoryId));
    data.set("name", name);
    setAdding(name);
    startTransition(async () => {
      await action(data);
      setAdding(null);
    });
  };

  return (
    <section className="card space-y-4">
      <h2 className="text-h3">Übung hinzufügen</h2>
      <form action={action} className="flex gap-2">
        <input type="hidden" name="categoryId" value={categoryId} />
        <input name="name" placeholder="Eigene Übung" aria-label="Name der Übung" maxLength={60} className="input flex-1" autoComplete="off" />
        <SubmitButton className="btn-primary shrink-0" pendingText="…">
          Hinzufügen
        </SubmitButton>
      </form>

      <div className="space-y-3">
        <p className="text-label muted">Oder aus der Liste wählen:</p>
        <div className="-mx-card flex gap-2 overflow-x-auto px-card pb-1 [scrollbar-width:none]" role="tablist" aria-label="Muskelgruppe">
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              role="tab"
              aria-selected={g.key === shown.key}
              onClick={() => setGroup(g.key)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-label font-semibold transition-colors duration-150 ${g.key === shown.key ? "bg-primary text-on-primary" : "bg-surface-muted text-text-secondary"}`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <ul className="flex flex-wrap gap-2">
          {shown.exercises.map((name) => {
            const has = taken.has(name.toLowerCase());
            return (
              <li key={name}>
                <button
                  type="button"
                  disabled={has || adding !== null}
                  onClick={() => add(name)}
                  className={`pressable flex items-center gap-1.5 rounded-full border px-3 py-2 text-label ${has ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-text-primary"} ${adding === name ? "animate-pulse" : ""} disabled:cursor-default`}
                >
                  <Icon name={has ? "check" : "add"} size={16} />
                  {name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <FormMessage state={state} />
    </section>
  );
}

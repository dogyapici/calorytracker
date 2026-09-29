"use client";

import { useActionState, useState } from "react";
import { createCategory } from "@/app/training-actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { CATEGORY_SUGGESTIONS } from "@/lib/training";

/** Name field for a new category, with common names to pick from. */
export function NewCategory({ existing }: { existing: string[] }) {
  const [state, action] = useActionState(createCategory, undefined);
  const [name, setName] = useState("");
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  const suggestions = CATEGORY_SUGGESTIONS.filter((s) => !taken.has(s.toLowerCase()));

  return (
    <form action={action} className="card space-y-3">
      <h2 className="text-h3">Neue Kategorie</h2>
      <div className="flex gap-2">
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Brusttraining"
          aria-label="Name der Kategorie"
          maxLength={60}
          className="input flex-1"
          autoComplete="off"
        />
        <SubmitButton className="btn-primary shrink-0" pendingText="…">
          Anlegen
        </SubmitButton>
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setName(s)}
              className={`pressable rounded-full px-3.5 py-2 text-label ${name === s ? "bg-primary text-on-primary" : "bg-surface-muted text-text-primary"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <FormMessage state={state} />
    </form>
  );
}

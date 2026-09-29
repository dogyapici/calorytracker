"use client";

import { useActionState } from "react";
import { renameCategory } from "@/app/training-actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";

export function RenameCategory({ id, name }: { id: number; name: string }) {
  const [state, action] = useActionState(renameCategory, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <label className="label" htmlFor="category-name">
        Name
      </label>
      <div className="flex gap-2">
        <input id="category-name" name="name" defaultValue={name} maxLength={60} className="input flex-1" autoComplete="off" />
        <SubmitButton className="btn-secondary shrink-0" pendingText="…">
          Speichern
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

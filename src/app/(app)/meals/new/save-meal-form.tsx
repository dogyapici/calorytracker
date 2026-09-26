"use client";

import { useActionState } from "react";
import { saveMealFromDiary } from "@/app/meal-actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";

export function SaveMealForm({ day, meal, defaultName }: { day: string; meal: string; defaultName: string }) {
  const [state, action] = useActionState(saveMealFromDiary, undefined);
  return (
    <form action={action} className="card space-y-3">
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="meal" value={meal} />
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input className="input" id="name" name="name" defaultValue={defaultName} required maxLength={80} />
      </div>
      <FormMessage state={state} />
      <SubmitButton>Mahlzeit speichern</SubmitButton>
    </form>
  );
}

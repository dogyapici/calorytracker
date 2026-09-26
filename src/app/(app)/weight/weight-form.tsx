"use client";

import { useActionState } from "react";
import { logWeight } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";

export function WeightForm({ today, lastKg }: { today: string; lastKg: number | null }) {
  const [state, action] = useActionState(logWeight, undefined);
  return (
    <form action={action} className="card space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="kg">Gewicht (kg)</label>
          <input className="input text-lg tabular-nums" id="kg" name="kg" defaultValue={state?.values?.kg} inputMode="decimal" placeholder={lastKg ? String(lastKg).replace(".", ",") : "z. B. 75,5"} required />
        </div>
        <div>
          <label className="label" htmlFor="day">Datum</label>
          <input className="input" id="day" name="day" type="date" defaultValue={state?.values?.day ?? today} max={today} required />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton>Eintragen</SubmitButton>
    </form>
  );
}

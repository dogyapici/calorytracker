"use client";

import { useActionState } from "react";
import { register } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";

export function RegisterForm() {
  const [state, action] = useActionState(register, undefined);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input className="input" id="name" name="name" defaultValue={state?.values?.name} autoComplete="given-name" required />
      </div>
      <div>
        <label className="label" htmlFor="email">E-Mail</label>
        <input className="input" id="email" name="email" defaultValue={state?.values?.email} type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Passwort (mind. 8 Zeichen)</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <label className="label" htmlFor="invite">Einladungscode</label>
        <input className="input" id="invite" name="invite" defaultValue={state?.values?.invite} autoComplete="off" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Konto wird erstellt…">Konto erstellen</SubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="email">E-Mail</label>
        <input className="input" id="email" name="email" defaultValue={state?.values?.email} type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Passwort</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Anmelden…">Anmelden</SubmitButton>
    </form>
  );
}

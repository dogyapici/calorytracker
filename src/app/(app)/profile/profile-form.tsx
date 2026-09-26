"use client";

import { useActionState, useState } from "react";
import { saveProfile } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import type { Profile } from "@/db/schema";
import { ACTIVITY_LEVELS, fmt, GOALS, suggestTargets, type Goal, type Sex } from "@/lib/nutrition";

export function ProfileForm({ name, profile, weightKg }: { name: string; profile: Profile; weightKg: number | null }) {
  const [state, action] = useActionState(saveProfile, undefined);
  const [sex, setSex] = useState<string>(profile.sex ?? "");
  const [birthYear, setBirthYear] = useState(profile.birthYear ? String(profile.birthYear) : "");
  const [height, setHeight] = useState(profile.heightCm ? String(profile.heightCm) : "");
  const [weight, setWeight] = useState(weightKg ? String(weightKg) : "");
  const [activity, setActivity] = useState(String(profile.activityFactor));
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [targets, setTargets] = useState({
    kcalTarget: String(profile.kcalTarget),
    proteinTarget: String(profile.proteinTarget),
    carbsTarget: String(profile.carbsTarget),
    fatTarget: String(profile.fatTarget),
  });

  const num = (v: string) => Number(v.replace(",", "."));
  const canSuggest = sex && num(birthYear) > 1900 && num(height) > 50 && num(weight) > 20;
  const suggestion = canSuggest
    ? suggestTargets({
        sex: sex as Sex,
        age: new Date().getFullYear() - num(birthYear),
        heightCm: num(height),
        weightKg: num(weight),
        activityFactor: num(activity),
        goal,
      })
    : null;

  return (
    <form action={action} className="space-y-4">
      <div className="card space-y-3">
        <h2 className="font-semibold">Über dich</h2>
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input className="input" id="name" name="name" defaultValue={name} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="sex">Geschlecht</label>
            <select className="input" id="sex" name="sex" value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">–</option>
              <option value="female">weiblich</option>
              <option value="male">männlich</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="birthYear">Geburtsjahr</label>
            <input className="input" id="birthYear" name="birthYear" inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="heightCm">Größe (cm)</label>
            <input className="input" id="heightCm" name="heightCm" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="weightKg">Gewicht (kg)</label>
            <input className="input" id="weightKg" name="weightKg" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="activityFactor">Aktivität</label>
          <select className="input" id="activityFactor" name="activityFactor" value={activity} onChange={(e) => setActivity(e.target.value)}>
            {ACTIVITY_LEVELS.map((a) => (
              <option key={a.factor} value={a.factor}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="goal">Ziel</label>
          <select className="input" id="goal" name="goal" value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
            {GOALS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Tagesziele</h2>
          {suggestion && (
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              onClick={() =>
                setTargets({
                  kcalTarget: String(suggestion.kcal),
                  proteinTarget: String(suggestion.protein),
                  carbsTarget: String(suggestion.carbs),
                  fatTarget: String(suggestion.fat),
                })
              }
            >
              Vorschlag übernehmen
            </button>
          )}
        </div>
        {suggestion ? (
          <p className="text-sm muted">
            Dein Gesamtumsatz liegt bei etwa {fmt(suggestion.tdee)} kcal. Vorschlag: {fmt(suggestion.kcal)} kcal, {suggestion.protein} g Eiweiß,{" "}
            {suggestion.carbs} g Kohlenhydrate, {suggestion.fat} g Fett.
          </p>
        ) : (
          <p className="text-sm muted">Fülle Geschlecht, Geburtsjahr, Größe und Gewicht aus, dann berechne ich dir einen Vorschlag.</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["kcalTarget", "Kalorien (kcal)"],
              ["proteinTarget", "Eiweiß (g)"],
              ["carbsTarget", "Kohlenhydrate (g)"],
              ["fatTarget", "Fett (g)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="label" htmlFor={key}>{label}</label>
              <input
                className="input tabular-nums"
                id={key}
                name={key}
                inputMode="numeric"
                value={targets[key]}
                onChange={(e) => setTargets((t) => ({ ...t, [key]: e.target.value }))}
                required
              />
            </div>
          ))}
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton>Speichern</SubmitButton>
    </form>
  );
}

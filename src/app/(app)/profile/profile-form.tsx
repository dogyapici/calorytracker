"use client";

import { useActionState, useState } from "react";
import { saveProfile } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import type { Profile } from "@/db/schema";
import {
  ACTIVITY_LEVELS,
  balanceCarbs,
  checkMacros,
  fmt,
  gramsFromPercent,
  GOALS,
  kcalFromMacros,
  percentFromGrams,
  suggestTargets,
  type Goal,
  type MacroMode,
  type Macros,
  type Sex,
} from "@/lib/nutrition";

const MACROS = [
  { key: "protein", label: "Eiweiß" },
  { key: "carbs", label: "Kohlenh." },
  { key: "fat", label: "Fett" },
] as const;

type MacroInputs = Record<keyof Macros, string>;

const toInputs = (m: Macros): MacroInputs => ({ protein: String(m.protein), carbs: String(m.carbs), fat: String(m.fat) });

export function ProfileForm({ name, profile, weightKg }: { name: string; profile: Profile; weightKg: number | null }) {
  const [state, action] = useActionState(saveProfile, undefined);
  const [sex, setSex] = useState<string>(profile.sex ?? "");
  const [birthYear, setBirthYear] = useState(profile.birthYear ? String(profile.birthYear) : "");
  const [height, setHeight] = useState(profile.heightCm ? String(profile.heightCm) : "");
  const [weight, setWeight] = useState(weightKg ? String(weightKg) : "");
  const [activity, setActivity] = useState(String(profile.activityFactor));
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [kcal, setKcal] = useState(String(profile.kcalTarget));
  const [mode, setMode] = useState<MacroMode>(profile.macroMode);
  const savedGrams = { protein: profile.proteinTarget, carbs: profile.carbsTarget, fat: profile.fatTarget };
  const [macros, setMacros] = useState<MacroInputs>(
    profile.macroMode === "percent" && profile.proteinPct !== null
      ? toInputs({ protein: profile.proteinPct, carbs: profile.carbsPct ?? 0, fat: profile.fatPct ?? 0 })
      : toInputs(savedGrams),
  );

  const num = (v: string) => (v.trim() === "" ? NaN : Number(v.replace(",", ".")));
  const kcalNum = num(kcal);
  const values: Macros = { protein: num(macros.protein), carbs: num(macros.carbs), fat: num(macros.fat) };
  const check = checkMacros(kcalNum, mode, values);
  const grams = mode === "grams" ? values : gramsFromPercent(kcalNum || 0, values);
  const percent = mode === "percent" ? values : percentFromGrams(values);

  const switchMode = (next: MacroMode) => {
    if (next === mode) return;
    // Convert what is on screen so switching never loses or distorts the targets.
    if (next === "percent") setMacros(toInputs(percentFromGrams(values)));
    else setMacros(toInputs(gramsFromPercent(kcalNum || 0, values)));
    setMode(next);
  };

  const applySuggestion = (s: { kcal: number; protein: number; carbs: number; fat: number }) => {
    setKcal(String(s.kcal));
    setMacros(toInputs(mode === "grams" ? s : percentFromGrams(s)));
  };

  const balance = () => {
    const b = balanceCarbs(kcalNum, values);
    if (b) setMacros(toInputs(b));
  };
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
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => applySuggestion(suggestion)}>
              Vorschlag übernehmen
            </button>
          )}
        </div>
        {suggestion ? (
          <p className="text-sm muted">
            Nach der Mifflin-St-Jeor-Formel liegt dein Gesamtumsatz bei etwa {fmt(suggestion.tdee)} kcal. Vorschlag für dein Ziel:{" "}
            {fmt(suggestion.kcal)} kcal, {suggestion.protein} g Eiweiß, {suggestion.carbs} g Kohlenhydrate, {suggestion.fat} g Fett.
          </p>
        ) : (
          <p className="text-sm muted">Fülle Geschlecht, Geburtsjahr, Größe und Gewicht aus, dann berechne ich dir einen Vorschlag.</p>
        )}

        <div>
          <label className="label" htmlFor="kcalTarget">Kalorien (kcal)</label>
          <input className="input tabular-nums" id="kcalTarget" name="kcalTarget" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} required />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Makros angeben in</span>
          <input type="hidden" name="macroMode" value={mode} />
          <div className="flex rounded-xl border border-zinc-300 p-0.5 dark:border-zinc-700" role="radiogroup" aria-label="Makros angeben in">
            {(
              [
                ["percent", "Prozent"],
                ["grams", "Gramm"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => switchMode(m)}
                className={`rounded-lg px-3 py-1 text-sm font-medium ${mode === m ? "bg-brand-600 text-white" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {MACROS.map(({ key, label }) => (
            <div key={key}>
              <label className="label" htmlFor={key}>
                {label} ({mode === "percent" ? "%" : "g"})
              </label>
              <input
                className="input tabular-nums"
                id={key}
                name={key}
                inputMode="decimal"
                value={macros[key]}
                onChange={(e) => setMacros((m) => ({ ...m, [key]: e.target.value }))}
                required
              />
              <p className="mt-1 text-xs tabular-nums muted">
                {mode === "percent" ? `= ${Number.isFinite(grams[key]) ? fmt(grams[key]) : "–"} g` : `= ${Number.isFinite(percent[key]) ? fmt(percent[key], 1) : "–"} %`}
              </p>
            </div>
          ))}
        </div>

        <div
          className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${check.ok ? "bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100" : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"}`}
          aria-live="polite"
        >
          <span>
            {check.ok
              ? `Passt: ${fmt(kcalFromMacros(check.grams))} kcal aus Makros bei ${fmt(kcalNum)} kcal Ziel.`
              : check.error}
          </span>
          {!check.ok && mode === "grams" && balanceCarbs(kcalNum, values) && (
            <button type="button" className="btn-secondary shrink-0 px-3 py-1 text-xs" onClick={balance}>
              Ausgleichen
            </button>
          )}
        </div>
      </div>
      <FormMessage state={state} />
      {check.ok ? <SubmitButton>Speichern</SubmitButton> : <button type="button" className="btn-primary w-full" disabled>Speichern</button>}
    </form>
  );
}

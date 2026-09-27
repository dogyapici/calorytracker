"use client";

import { useActionState, useState } from "react";
import { saveProfile } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import type { Profile } from "@/db/schema";
import { ProfileSection } from "@/components/profile-section";
import { Icon } from "@/components/icons";
import { Slider } from "@/components/slider";
import {
  ACTIVITY_LEVELS,
  balanceCarbs,
  checkMacros,
  fmt,
  gramsFromPercent,
  GOALS,
  KCAL_PER_GRAM,
  kcalFromMacros,
  percentFromGrams,
  setMacro,
  suggestTargets,
  type Goal,
  type MacroMode,
  type Macros,
  type Sex,
} from "@/lib/nutrition";

const MACROS = [
  { key: "protein", label: "Eiweiß", color: "var(--ds-macro-protein)" },
  { key: "carbs", label: "Kohlenhydrate", color: "var(--ds-macro-carbs)" },
  { key: "fat", label: "Fett", color: "var(--ds-macro-fat)" },
] as const;

const KCAL_MIN = 1000;
const KCAL_MAX = 4500;

type MacroInputs = Record<keyof Macros, string>;

const text = (n: number) => String(n).replace(".", ",");
const toInputs = (m: Macros): MacroInputs => ({ protein: text(m.protein), carbs: text(m.carbs), fat: text(m.fat) });

export function ProfileForm({ name, profile, weightKg, open }: { name: string; profile: Profile; weightKg: number | null; open: boolean }) {
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

  // Sliders keep the macros consistent by moving the difference into a partner macro.
  const slideMacro = (key: keyof Macros, next: number) => {
    if (!(kcalNum > 0) || !Object.values(values).every(Number.isFinite)) return setMacros((m) => ({ ...m, [key]: String(next) }));
    setMacros(toInputs(setMacro(kcalNum, mode, values, key, next)));
  };
  // Typing keeps the raw text (so "30," survives) and only rebalances the partner.
  const typeMacro = (key: keyof Macros, text: string) => {
    const next = num(text);
    const all = { ...values, [key]: next };
    if (!(kcalNum > 0) || !Object.values(all).every(Number.isFinite)) return setMacros((m) => ({ ...m, [key]: text }));
    const balanced = setMacro(kcalNum, mode, values, key, next);
    setMacros({ ...toInputs(balanced), [key]: text });
  };
  const changeKcal = (next: number | string) => {
    const text = typeof next === "number" ? String(Math.max(0, Math.round(next))) : next;
    setKcal(text);
    // Gram targets follow the new calorie target through the carbs; percentages stay as they are.
    const b = mode === "grams" ? balanceCarbs(num(text), values) : null;
    if (b) setMacros(toInputs(b));
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

  const matchesSuggestion =
    suggestion !== null && kcalNum === suggestion.kcal && Math.abs(grams.protein - suggestion.protein) <= 1 && Math.abs(grams.fat - suggestion.fat) <= 1;

  const aboutSummary =
    [
      sex === "female" ? "weiblich" : sex === "male" ? "männlich" : null,
      num(birthYear) > 1900 ? `${new Date().getFullYear() - num(birthYear)} Jahre` : null,
      num(height) > 0 ? `${fmt(num(height))} cm` : null,
      num(weight) > 0 ? `${fmt(num(weight), 1)} kg` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Noch nicht ausgefüllt";
  const goalsSummary = check.ok
    ? `${fmt(kcalNum)} kcal · E ${fmt(check.grams.protein)} g · K ${fmt(check.grams.carbs)} g · F ${fmt(check.grams.fat)} g`
    : "Bitte prüfen";
  const save = (
    <>
      <FormMessage state={state} />
      {check.ok ? <SubmitButton>Speichern</SubmitButton> : <button type="button" className="btn-primary w-full" disabled>Speichern</button>}
    </>
  );

  return (
    // React resets a form after its action runs, which puts the selects back to their first option
    // although the state still holds the saved value. The state is the source of truth here, so skip the reset.
    <form action={action} onReset={(e) => e.preventDefault()} className="space-y-4">
      <ProfileSection id="about" icon="profile" title="Über dich" summary={aboutSummary} open={open}>
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
        {save}
      </ProfileSection>

      <ProfileSection id="goals" icon="target" title="Tagesziele" summary={goalsSummary} open={open}>
        {suggestion ? (
          <div className="space-y-1 rounded-button bg-primary-soft px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-caption font-semibold text-primary">Vorschlag für dich</p>
                <p className="text-h3 tabular-nums">{fmt(suggestion.kcal)} kcal</p>
              </div>
              <button type="button" className="btn-primary shrink-0 px-3.5" onClick={() => applySuggestion(suggestion)} disabled={matchesSuggestion}>
                {matchesSuggestion ? "Übernommen" : "Übernehmen"}
              </button>
            </div>
            <p className="text-caption tabular-nums muted">
              E {suggestion.protein} g · K {suggestion.carbs} g · F {suggestion.fat} g · Gesamtumsatz ca. {fmt(suggestion.tdee)} kcal
            </p>
          </div>
        ) : (
          <p className="rounded-button bg-surface-muted px-4 py-3 text-label muted">
            Fülle unter „Über dich“ Geschlecht, Geburtsjahr, Größe und Gewicht aus, dann berechne ich dir einen Vorschlag.
          </p>
        )}

        <div className="space-y-2">
          <label className="text-label font-semibold" htmlFor="kcalTarget">
            Kalorien pro Tag
          </label>
          <div className="flex items-center justify-between gap-3">
            <button type="button" className="btn-round" aria-label="50 kcal weniger" onClick={() => changeKcal((kcalNum || 0) - 50)}>
              <Icon name="minus" size={22} />
            </button>
            <div className="flex min-w-0 items-baseline justify-center gap-1.5">
              <input
                style={{ width: `${Math.max(3, kcal.length) + 0.6}ch` }}
                className="rounded-chip bg-transparent text-center text-display tabular-nums outline-none focus:bg-surface-muted"
                id="kcalTarget"
                name="kcalTarget"
                inputMode="numeric"
                value={kcal}
                onChange={(e) => changeKcal(e.target.value)}
                required
              />
              <span className="text-body muted">kcal</span>
            </div>
            <button type="button" className="btn-round" aria-label="50 kcal mehr" onClick={() => changeKcal((kcalNum || 0) + 50)}>
              <Icon name="add" size={22} />
            </button>
          </div>
          <Slider aria-label="Kalorien pro Tag" min={KCAL_MIN} max={Math.max(KCAL_MAX, kcalNum || 0)} step={10} value={kcalNum} onChange={changeKcal} />
          <div className="flex justify-between text-caption tabular-nums text-text-tertiary">
            <span>{fmt(KCAL_MIN)}</span>
            <span>{fmt(Math.max(KCAL_MAX, kcalNum || 0))}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-label font-semibold">Makros</p>
            <input type="hidden" name="macroMode" value={mode} />
            <div className="grid grid-cols-2 gap-1 rounded-button bg-surface-muted p-1" role="radiogroup" aria-label="Makros angeben in">
              {(
                [
                  ["percent", "%"],
                  ["grams", "Gramm"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  aria-label={m === "percent" ? "Prozent" : "Gramm"}
                  onClick={() => switchMode(m)}
                  className={`min-h-9 rounded-chip px-3 text-label transition-colors duration-150 ${mode === m ? "bg-surface font-semibold text-text-primary shadow-card" : "text-text-secondary"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex h-3 overflow-hidden rounded-full bg-border" aria-hidden>
            {MACROS.map(({ key, color }) => (
              <span
                key={key}
                className="h-full transition-[width] duration-300 ease-out motion-reduce:transition-none"
                style={{ width: `${Number.isFinite(percent[key]) ? Math.min(100, percent[key]) : 0}%`, background: color }}
              />
            ))}
          </div>

          <ul className="space-y-1">
            {MACROS.map(({ key, label, color }) => {
              const max = mode === "percent" ? 80 : Math.max(Math.round(((kcalNum || 0) * 0.8) / KCAL_PER_GRAM[key]), values[key] || 0);
              return (
                <li key={key} className="rounded-button bg-surface-muted/60 px-3.5 pb-1.5 pt-3">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                    <label htmlFor={key} className="flex-1 text-label font-semibold">
                      {label}
                    </label>
                    <span className="text-caption tabular-nums muted">
                      {mode === "percent" ? `${Number.isFinite(grams[key]) ? fmt(grams[key]) : "–"} g` : `${Number.isFinite(percent[key]) ? fmt(percent[key]) : "–"} %`}
                    </span>
                    <span className="relative">
                      <input
                        className="h-9 w-[4.75rem] rounded-chip bg-surface pl-2 pr-7 text-right text-[16px] font-semibold tabular-nums outline-none focus:ring-2 focus:ring-primary"
                        id={key}
                        name={key}
                        inputMode="decimal"
                        value={macros[key]}
                        onChange={(e) => typeMacro(key, e.target.value)}
                        required
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-caption muted">{mode === "percent" ? "%" : "g"}</span>
                    </span>
                  </div>
                  <Slider aria-label={`${label} in ${mode === "percent" ? "Prozent" : "Gramm"}`} min={0} max={max} step={1} color={color} value={values[key]} onChange={(v) => slideMacro(key, v)} />
                </li>
              );
            })}
          </ul>
          <p className="text-caption muted">Beim Schieben passen sich die Kohlenhydrate an, damit die Summe stimmt (bei den Kohlenhydraten das Fett).</p>
        </div>

        <div
          className={`flex items-center justify-between gap-3 rounded-button px-3 py-2 text-sm ${check.ok ? "bg-primary-soft text-primary" : "bg-warning/10 text-warning"}`}
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
        {save}
      </ProfileSection>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { logWorkout } from "@/app/training-actions";
import type { FormState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { Icon } from "@/components/icons";
import { parseDecimal, type WorkoutLog } from "@/lib/training";

const show = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

function Stepper({
  label,
  name,
  value,
  onChange,
  step,
  unit,
  decimal = false,
  optional = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  step: number;
  unit?: string;
  decimal?: boolean;
  optional?: boolean;
}) {
  const bump = (dir: 1 | -1) => {
    const n = decimal ? parseDecimal(value) : Number(value);
    const base = Number.isFinite(n) && value.trim() !== "" ? n : 0;
    onChange(show(Math.max(0, base + dir * step)));
  };
  return (
    <div>
      <label htmlFor={`log-${name}`} className="label">
        {label}
        {optional && <span className="text-text-tertiary"> (optional)</span>}
      </label>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => bump(-1)} className="btn-round h-11 w-11 shadow-none" aria-label={`${label} verringern`}>
          <Icon name="minus" size={20} />
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            id={`log-${name}`}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode={decimal ? "decimal" : "numeric"}
            autoComplete="off"
            className={`input text-center font-semibold tabular-nums ${unit ? "pr-9" : ""}`}
          />
          {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-caption muted">{unit}</span>}
        </div>
        <button type="button" onClick={() => bump(1)} className="btn-round h-11 w-11 shadow-none" aria-label={`${label} erhöhen`}>
          <Icon name="add" size={20} />
        </button>
      </div>
    </div>
  );
}

/**
 * The week's entry for one exercise. Picking a week shows what is saved for it; a new week starts
 * with last time's values, so progressing is usually one tap on +.
 */
export function LogForm({ exerciseId, weeks, logs }: { exerciseId: number; weeks: { week: string; label: string }[]; logs: WorkoutLog[] }) {
  const [week, setWeek] = useState(weeks[0].week);
  const valuesFor = (w: string) => {
    const log = logs.find((l) => l.week === w) ?? logs.find((l) => l.week < w) ?? logs[0];
    return { weight: log ? show(log.weightKg) : "", reps: log ? String(log.reps) : "10", sets: log?.sets ? String(log.sets) : "3" };
  };
  const [values, setValues] = useState(() => valuesFor(weeks[0].week));
  const saved = logs.some((l) => l.week === week);

  const [state, action] = useActionState(async (prev: FormState, data: FormData) => {
    const result = await logWorkout(prev, data);
    if (result?.ok) navigator.vibrate?.(15);
    return result;
  }, undefined);

  const pickWeek = (w: string) => {
    setWeek(w);
    setValues(valuesFor(w));
  };
  const set = (key: keyof typeof values) => (v: string) => setValues((old) => ({ ...old, [key]: v }));

  return (
    <form action={action} className="card space-y-4" onReset={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h3">{saved ? "Eintrag ändern" : "Eintragen"}</h2>
        {saved && <span className="rounded-full bg-primary-soft px-2.5 py-1 text-caption font-semibold text-primary">Gespeichert</span>}
      </div>
      <input type="hidden" name="exerciseId" value={exerciseId} />
      <div>
        <label htmlFor="log-week" className="label">
          Woche
        </label>
        <select id="log-week" name="week" value={week} onChange={(e) => pickWeek(e.target.value)} className="input">
          {weeks.map((w, i) => (
            <option key={w.week} value={w.week}>
              {i === 0 ? `Diese Woche (${w.label.split(" · ")[0]})` : i === 1 ? `Letzte Woche (${w.label.split(" · ")[0]})` : w.label}
            </option>
          ))}
        </select>
      </div>
      <Stepper label="Gewicht" name="weightKg" value={values.weight} onChange={set("weight")} step={2.5} unit="kg" decimal />
      <div className="grid grid-cols-2 gap-3">
        <Stepper label="Wiederholungen" name="reps" value={values.reps} onChange={set("reps")} step={1} />
        <Stepper label="Sätze" name="sets" value={values.sets} onChange={set("sets")} step={1} optional />
      </div>
      <SubmitButton>{saved ? "Aktualisieren" : "Eintragen"}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

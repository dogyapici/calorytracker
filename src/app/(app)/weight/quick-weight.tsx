"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { logWeight, type FormState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { Icon } from "@/components/icons";
import { Slider } from "@/components/slider";
import { addDays, formatDay } from "@/lib/dates";

const OPEN_EVENT = "quick-weight:open";

/** Round + button for the page header that opens the quick weight sheet. */
export function QuickWeightButton() {
  return (
    <button
      type="button"
      className="btn-round border-primary bg-primary text-on-primary"
      aria-label="Gewicht eintragen"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    >
      <Icon name="add" size={24} />
    </button>
  );
}

const show = (kg: number) => kg.toFixed(1).replace(".", ",");
const parse = (text: string) =>
  text.trim() === "" ? NaN : Number(text.replace(",", "."));

/**
 * Quick weight entry: a round + button (or any trigger) opens a bottom sheet with the last weight
 * preset, so a new value is usually one or two taps on − / + or a short slide away.
 */
export function QuickWeight({
  today,
  lastKg,
  weighedToday,
  openOnLoad = false,
}: {
  today: string;
  lastKg: number | null;
  weighedToday: boolean;
  openOnLoad?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const start = lastKg ?? 75;
  const [kg, setKgText] = useState(show(start));
  // The slider spans ±5 kg around this value and moves along when a typed value leaves that span.
  const [center, setCenter] = useState(start);
  const lo = Math.floor(center) - 5;
  const hi = Math.ceil(center) + 5;
  const setKg = (text: string) => {
    setKgText(text);
    const n = parse(text);
    if (n >= 20 && n <= 400 && (n < lo || n > hi)) setCenter(n);
  };
  const [day, setDay] = useState(today);
  const [otherDay, setOtherDay] = useState(false);

  const [state, action] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const result = await logWeight(prev, formData);
      if (result?.ok) {
        navigator.vibrate?.(15);
        dialog.current?.close();
      }
      return result;
    },
    undefined,
  );

  const open = () => {
    setKgText(show(start));
    setCenter(start);
    setDay(today);
    setOtherDay(false);
    dialog.current?.showModal();
  };

  // The + in the page header lives in another component and asks for the sheet through this event.
  useEffect(() => {
    const onOpen = () => open();
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  });
  useEffect(() => {
    if (openOnLoad) dialog.current?.showModal();
  }, [openOnLoad]);

  const value = parse(kg);
  const step = (delta: number) =>
    setKg(
      show(
        Math.min(
          400,
          Math.max(20, (Number.isFinite(value) ? value : start) + delta),
        ),
      ),
    );
  const diff =
    lastKg !== null && Number.isFinite(value)
      ? Math.round((value - lastKg) * 10) / 10
      : null;
  const yesterday = addDays(today, -1);

  return (
    <>
      {weighedToday ? null : (
        <button
          type="button"
          onClick={open}
          className="pressable card flex w-full items-center gap-4 border-primary/40 text-left"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
            <Icon name="weight" size={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-h3">Heute schon gewogen?</span>
            <span className="block text-label muted">
              {lastKg
                ? `Zuletzt ${show(lastKg)} kg, tippen zum Eintragen`
                : "Tippen zum Eintragen"}
            </span>
          </span>
          <Icon name="add" size={24} className="shrink-0 text-primary" />
        </button>
      )}

      <dialog
        ref={dialog}
        className="sheet"
        aria-labelledby="quick-weight-title"
        onClick={(e) => {
          // A tap on the dimmed backdrop (the dialog itself, outside its content) closes the sheet.
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <form
          action={action}
          className="space-y-5 px-gutter pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3"
        >
          <span
            aria-hidden
            className="mx-auto block h-1.5 w-10 rounded-full bg-border"
          />
          <div className="flex items-center justify-between gap-3">
            <h2 id="quick-weight-title" className="text-h2">
              Gewicht eintragen
            </h2>
            <button
              type="button"
              className="btn-round h-10 w-10 shadow-none"
              aria-label="Schließen"
              onClick={() => dialog.current?.close()}
            >
              <Icon name="remove" size={20} />
            </button>
          </div>

          <input type="hidden" name="day" value={day} />
          <div
            className="grid grid-cols-3 gap-1 rounded-button bg-surface-muted p-1"
            role="radiogroup"
            aria-label="Tag"
          >
            {(
              [
                ["today", "Heute"],
                ["yesterday", "Gestern"],
                ["other", "Anderer Tag"],
              ] as const
            ).map(([key, label]) => {
              const checked =
                key === "other"
                  ? otherDay
                  : !otherDay && day === (key === "today" ? today : yesterday);
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => {
                    setOtherDay(key === "other");
                    if (key !== "other")
                      setDay(key === "today" ? today : yesterday);
                  }}
                  className={`min-h-10 rounded-chip text-label transition-colors duration-150 ${checked ? "bg-surface font-semibold text-text-primary shadow-card" : "text-text-secondary"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {otherDay && (
            <input
              className="input animate-enter"
              type="date"
              aria-label="Datum"
              value={day}
              max={today}
              onChange={(e) => setDay(e.target.value)}
              required
            />
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="btn-round"
                aria-label="0,1 kg weniger"
                onClick={() => step(-0.1)}
              >
                <Icon name="minus" size={22} />
              </button>
              <div className="flex min-w-0 items-baseline justify-center gap-1.5">
                <input
                  className="rounded-chip bg-transparent text-center text-display tabular-nums outline-none focus:bg-surface-muted"
                  style={{ width: `${Math.max(3, kg.length) + 0.6}ch` }}
                  name="kg"
                  aria-label="Gewicht in kg"
                  inputMode="decimal"
                  value={kg}
                  onChange={(e) => setKg(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  required
                />
                <span className="text-body muted">kg</span>
              </div>
              <button
                type="button"
                className="btn-round"
                aria-label="0,1 kg mehr"
                onClick={() => step(0.1)}
              >
                <Icon name="add" size={22} />
              </button>
            </div>
            <p
              className="h-5 text-center text-label tabular-nums muted"
              aria-live="polite"
            >
              {diff === null
                ? ""
                : diff === 0
                  ? "Gleich wie zuletzt"
                  : `${diff > 0 ? "+" : "−"}${show(Math.abs(diff))} kg seit dem letzten Eintrag`}
            </p>
            <Slider
              aria-label="Gewicht"
              min={lo}
              max={hi}
              step={0.1}
              value={value}
              onChange={(v) => setKg(show(v))}
            />
            <div className="flex justify-between text-caption tabular-nums text-text-tertiary">
              <span>{lo} kg</span>
              <span>{hi} kg</span>
            </div>
          </div>

          <FormMessage state={state?.error ? state : undefined} />
          <SubmitButton>
            {day === today
              ? "Für heute speichern"
              : `Für ${formatDay(day, { day: "numeric", month: "long" })} speichern`}
          </SubmitButton>
        </form>
      </dialog>
    </>
  );
}

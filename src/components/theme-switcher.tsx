"use client";

import { useSyncExternalStore } from "react";
import { MODES, readTheme, saveTheme, subscribeTheme, THEMES, type ModeKey, type ThemeKey } from "@/lib/theme";

function Segmented<K extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { key: K; label: string }[];
  value: K | undefined;
  onChange: (key: K) => void;
}) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="grid gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={value === o.key}
            onClick={() => onChange(o.key)}
            className={`rounded-lg px-2 py-2 text-sm font-medium transition ${
              value === o.key ? "bg-white shadow-sm dark:bg-zinc-900" : "muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// Vorläufiger Theme-Umschalter laut DESIGN.md Abschnitt 8. Die Auswahl
// wird nur in diesem Browser gespeichert.
export function ThemeSwitcher() {
  // Auf dem Server gibt es kein localStorage; dort rendert der Umschalter
  // ohne Auswahl, im Browser sofort mit der gespeicherten.
  const current = useSyncExternalStore(
    subscribeTheme,
    () => `${readTheme().theme}|${readTheme().mode}`,
    () => null,
  );
  const [theme, mode] = (current?.split("|") ?? []) as [ThemeKey?, ModeKey?];

  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">Darstellung</h2>
      <Segmented label="Theme" options={THEMES} value={theme} onChange={(t) => saveTheme(t, mode ?? "system")} />
      <Segmented label="Modus" options={MODES} value={mode} onChange={(m) => saveTheme(theme ?? THEMES[0].key, m)} />
    </section>
  );
}

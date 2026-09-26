"use client";

import { useSyncExternalStore } from "react";
import { ProfileSection } from "@/components/profile-section";
import { MODES, readMode, saveMode, subscribeMode } from "@/lib/theme";

// Hell / Dunkel / System, gespeichert nur in diesem Browser.
export function ThemeSwitcher() {
  // Auf dem Server gibt es kein localStorage; dort rendert der Umschalter
  // ohne Auswahl, im Browser sofort mit der gespeicherten.
  const mode = useSyncExternalStore(subscribeMode, readMode, () => null);

  return (
    <ProfileSection id="theme" icon="palette" title="Darstellung" summary={MODES.find((m) => m.key === mode)?.label ?? "\u00a0"}>
      <div className="grid grid-cols-3 gap-1 rounded-button bg-surface-muted p-1" role="radiogroup" aria-label="Darstellung">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={mode === m.key}
            onClick={() => saveMode(m.key)}
            className={`min-h-touch rounded-chip px-2 text-label transition-colors duration-150 ${
              mode === m.key ? "bg-surface text-text-primary shadow-card" : "text-text-secondary"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </ProfileSection>
  );
}

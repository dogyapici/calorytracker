// Theme und Hell/Dunkel. Die Farben stehen in src/styles/tokens.css.
// Die App nutzt ein festes Theme (warm-minimal); ein anderes Theme ist ein
// eigener Token-Block in tokens.css plus Änderung von THEME hier.
// Wählbar ist nur der Modus: Hell, Dunkel oder System (Standard).

export const THEME = "warm-minimal";

export const MODES = [
  { key: "light", label: "Hell" },
  { key: "dark", label: "Dunkel" },
  { key: "system", label: "System" },
] as const;

export type ModeKey = (typeof MODES)[number]["key"];

export const DEFAULT_MODE: ModeKey = "system";

const MODE_KEY = "ct-mode";
const CHANGE_EVENT = "ct-mode-change";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

function isMode(value: unknown): value is ModeKey {
  return MODES.some((m) => m.key === value);
}

export function readMode(): ModeKey {
  try {
    const mode = localStorage.getItem(MODE_KEY);
    return isMode(mode) ? mode : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

// Setzt data-mode und das aufgelöste data-scheme (light/dark) auf <html>.
export function applyMode() {
  const mode = readMode();
  const dark = mode === "dark" || (mode === "system" && window.matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  root.setAttribute("data-theme", THEME);
  root.setAttribute("data-mode", mode);
  root.setAttribute("data-scheme", dark ? "dark" : "light");
}

export function saveMode(mode: ModeKey) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {}
  applyMode();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Für useSyncExternalStore: meldet Änderungen aus diesem und aus anderen Tabs.
export function subscribeMode(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Dieselbe Logik wie applyMode, als Inline-Skript im <head>, damit der
// gespeicherte Modus vor dem ersten Paint greift (kein Aufblitzen).
export const themeScript = `(function(){var M=${JSON.stringify(MODES.map((m) => m.key))},m="${DEFAULT_MODE}";try{var b=localStorage.getItem("${MODE_KEY}");if(M.indexOf(b)>=0)m=b}catch(e){}var d=m==="dark"||(m==="system"&&window.matchMedia("${DARK_QUERY}").matches),r=document.documentElement;r.setAttribute("data-theme","${THEME}");r.setAttribute("data-mode",m);r.setAttribute("data-scheme",d?"dark":"light")})()`;

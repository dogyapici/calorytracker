// Theme-Auswahl laut DESIGN.md Abschnitt 8. Die Farben selbst stehen in
// src/styles/tokens.css; hier wird nur entschieden, welches Token-Set aktiv ist.
// Ein neues Theme braucht einen Eintrag in THEMES und einen Block in tokens.css.

export const THEMES = [
  { key: "monochrome-luxe", label: "Monochrome Luxe" },
  { key: "warm-minimal", label: "Warm Minimal" },
] as const;

export const MODES = [
  { key: "light", label: "Hell" },
  { key: "dark", label: "Dunkel" },
  { key: "system", label: "System" },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];
export type ModeKey = (typeof MODES)[number]["key"];

export const DEFAULT_THEME: ThemeKey = "monochrome-luxe";
export const DEFAULT_MODE: ModeKey = "system";

const THEME_KEY = "ct-theme";
const MODE_KEY = "ct-mode";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

function isTheme(value: unknown): value is ThemeKey {
  return THEMES.some((t) => t.key === value);
}

function isMode(value: unknown): value is ModeKey {
  return MODES.some((m) => m.key === value);
}

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readTheme(): { theme: ThemeKey; mode: ModeKey } {
  const theme = stored(THEME_KEY);
  const mode = stored(MODE_KEY);
  return { theme: isTheme(theme) ? theme : DEFAULT_THEME, mode: isMode(mode) ? mode : DEFAULT_MODE };
}

// Setzt data-theme, data-mode und das aufgelöste data-scheme (light/dark) auf <html>.
export function applyTheme() {
  const { theme, mode } = readTheme();
  const dark = mode === "dark" || (mode === "system" && window.matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-mode", mode);
  root.setAttribute("data-scheme", dark ? "dark" : "light");
}

export function saveTheme(theme: ThemeKey, mode: ModeKey) {
  try {
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(MODE_KEY, mode);
  } catch {}
  applyTheme();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const CHANGE_EVENT = "ct-theme-change";

// Für useSyncExternalStore: meldet Änderungen aus diesem und aus anderen Tabs.
export function subscribeTheme(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Dieselbe Logik wie applyTheme, als Inline-Skript im <head>, damit das
// gespeicherte Theme vor dem ersten Paint greift (kein Aufblitzen).
export const themeScript = `(function(){var T=${JSON.stringify(THEMES.map((t) => t.key))},M=${JSON.stringify(
  MODES.map((m) => m.key),
)},t="${DEFAULT_THEME}",m="${DEFAULT_MODE}";try{var a=localStorage.getItem("${THEME_KEY}"),b=localStorage.getItem("${MODE_KEY}");if(T.indexOf(a)>=0)t=a;if(M.indexOf(b)>=0)m=b}catch(e){}var d=m==="dark"||(m==="system"&&window.matchMedia("${DARK_QUERY}").matches),r=document.documentElement;r.setAttribute("data-theme",t);r.setAttribute("data-mode",m);r.setAttribute("data-scheme",d?"dark":"light")})()`;

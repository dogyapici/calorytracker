// Kleiner Erfolgseffekt: Konfetti aus einem Element heraus, ein Hinweis oben und ein kurzes Vibrieren.
// Bewusst ohne React-State, damit er auch direkt aus Klick-Handlern heraus funktioniert.

const COLORS = ["var(--ds-primary)", "var(--ds-macro-protein)", "var(--ds-macro-carbs)", "var(--ds-macro-fat)", "var(--ds-accent-calories)"];
const PIECES = 36;
const DURATION = 2400;

export function celebrate(anchor: Element | null, message: string) {
  if (typeof document === "undefined") return;
  navigator.vibrate?.([20, 50, 30]);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rect = anchor?.getBoundingClientRect();
  const cx = rect ? rect.left + rect.width / 2 : innerWidth / 2;
  const cy = rect ? rect.top + rect.height / 2 : innerHeight / 3;

  const layer = document.createElement("div");
  layer.className = "celebrate";
  layer.setAttribute("aria-hidden", "true");
  if (!reduced) {
    for (let i = 0; i < PIECES; i++) {
      const piece = document.createElement("span");
      const angle = (i / PIECES) * Math.PI * 2 + Math.random() * 0.4;
      const distance = 90 + Math.random() * 110;
      piece.className = "confetti";
      piece.style.left = `${cx}px`;
      piece.style.top = `${cy}px`;
      piece.style.background = COLORS[i % COLORS.length];
      piece.style.width = `${5 + Math.random() * 4}px`;
      piece.style.height = `${8 + Math.random() * 6}px`;
      piece.style.animationDelay = `${Math.random() * 90}ms`;
      piece.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
      // Etwas nach unten versetzt, damit es wie fallendes Konfetti wirkt.
      piece.style.setProperty("--y", `${Math.sin(angle) * distance + 70}px`);
      piece.style.setProperty("--r", `${Math.round(Math.random() * 720 - 360)}deg`);
      layer.append(piece);
    }
  }

  const toast = document.createElement("div");
  toast.className = "celebrate-toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;

  if (anchor instanceof HTMLElement) {
    anchor.classList.remove("celebrate-pulse");
    void anchor.offsetWidth; // Animation neu starten, falls sie noch läuft.
    anchor.classList.add("celebrate-pulse");
  }
  document.body.append(layer, toast);
  setTimeout(() => {
    layer.remove();
    toast.remove();
    anchor?.classList.remove("celebrate-pulse");
  }, DURATION);
}

/** Celebrates a goal once per key (e.g. per day), remembered in localStorage. */
export function celebrateOnce(key: string, anchor: Element | null, message: string) {
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    // Ohne Speicher lieber einmal zu oft feiern als gar nicht.
  }
  celebrate(anchor, message);
}

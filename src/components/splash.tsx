// Startbildschirm beim Öffnen der App: Logo mit sich füllendem Kalorien-Ring, danach blendet er aus.
// Reines HTML/CSS, damit er sofort mit dem ersten Paint erscheint; pro Sitzung nur einmal
// (splashScript setzt sonst data-splash="off" auf <html>).
export const splashScript = `(function(){try{var s=sessionStorage;if(s.getItem("ct-splash"))document.documentElement.setAttribute("data-splash","off");else s.setItem("ct-splash","1")}catch(e){}})()`;

export function Splash() {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="splash" aria-hidden>
      <svg viewBox="0 0 120 120" className="splash-logo">
        <defs>
          <linearGradient id="splash-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className="[stop-color:var(--color-accent-calories)]" />
            <stop offset="1" className="[stop-color:var(--color-ring-end)]" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" className="stroke-surface-muted" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          className="splash-ring stroke-[url(#splash-ring)]"
          style={{ ["--ring-len" as string]: c }}
          transform="rotate(-90 60 60)"
        />
        <path d="M60 42c-10 7-15 15-13 25 2 7 7 11 13 13 6-2 11-6 13-13 2-10-3-18-13-25z" className="fill-primary" />
      </svg>
      <p className="splash-name">Kalorientracker</p>
    </div>
  );
}

// App-Logo ohne Kachel-Hintergrund: Kalorien-Ring mit Blatt, Farben aus den Tokens,
// damit es in Hell und Dunkel passt.
export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="83 83 346 346" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="[stop-color:var(--color-accent-calories)]" />
          <stop offset="1" className="[stop-color:var(--color-ring-end)]" />
        </linearGradient>
      </defs>
      <circle cx="256" cy="256" r="150" fill="none" strokeWidth="46" className="stroke-surface-muted" />
      <path d="M256 106A150 150 0 1 1 111.1 217.2" fill="none" stroke="url(#logo-ring)" strokeWidth="46" strokeLinecap="round" />
      <path d="M256 188c-40 26-58 60-50 98 6 28 26 44 50 50 24-6 44-22 50-50 8-38-10-72-50-98z" className="fill-primary" />
      <path d="M256 222v104" strokeWidth="8" strokeLinecap="round" className="stroke-bg" />
    </svg>
  );
}

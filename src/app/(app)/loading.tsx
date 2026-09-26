// Sofort sichtbarer Platzhalter beim Seitenwechsel. Next.js lädt ihn beim
// Prefetch der Links schon vorab, sodass ein Tab-Wechsel ohne Warten reagiert.
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Wird geladen">
      <div className="h-9 w-40 animate-pulse rounded-chip bg-surface-muted motion-reduce:animate-none" />
      <div className="card h-56 animate-pulse motion-reduce:animate-none" />
      <div className="card h-32 animate-pulse motion-reduce:animate-none" />
      <div className="card h-32 animate-pulse motion-reduce:animate-none" />
    </div>
  );
}

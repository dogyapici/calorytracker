import Link from "next/link";
import { fmt } from "@/lib/nutrition";

export type FoodListItem = {
  key: string;
  href: string;
  name: string;
  brand: string | null;
  kcal: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  badge?: string;
};

const MACROS = [
  { key: "protein", label: "E", color: "bg-macro-protein" },
  { key: "carbs", label: "K", color: "bg-macro-carbs" },
  { key: "fat", label: "F", color: "bg-macro-fat" },
] as const;

export function FoodList({ items }: { items: FoodListItem[] }) {
  return (
    <ul className="card divide-y divide-border p-0">
      {items.map((f) => (
        <li key={f.key}>
          <Link href={f.href} className="flex items-center gap-3 px-card py-3.5 transition-colors hover:bg-surface-muted active:bg-surface-muted">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="line-clamp-2 text-body font-medium">{f.name}</p>
              {(f.brand || f.badge) && <p className="truncate text-caption muted">{[f.brand, f.badge].filter(Boolean).join(" · ")}</p>}
              {f.protein !== undefined && (
                <p className="flex gap-3 text-caption tabular-nums text-text-secondary">
                  {MACROS.map((m) => (
                    <span key={m.key} className="flex items-center gap-1">
                      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${m.color}`} />
                      <span className="sr-only">{m.key === "protein" ? "Eiweiß" : m.key === "carbs" ? "Kohlenhydrate" : "Fett"}</span>
                      <span aria-hidden>{m.label}</span> {fmt(f[m.key] ?? 0, 1)}
                    </span>
                  ))}
                </p>
              )}
            </div>
            <span className="shrink-0 text-right tabular-nums">
              <span className="text-h3">{fmt(f.kcal)}</span>
              <span className="block text-caption muted">kcal/100 g</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

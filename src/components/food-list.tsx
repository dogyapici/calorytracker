import Link from "next/link";
import { fmt } from "@/lib/nutrition";

export type FoodListItem = {
  key: string;
  href: string;
  name: string;
  brand: string | null;
  kcal: number;
  imageUrl?: string | null;
  badge?: string;
};

export function FoodList({ items }: { items: FoodListItem[] }) {
  return (
    <ul className="card divide-y divide-border p-0">
      {items.map((f) => (
        <li key={f.key}>
          <Link href={f.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-muted">
            {f.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-chip bg-surface object-contain" loading="lazy" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-chip bg-primary-soft text-primary">
                {f.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{f.name}</p>
              <p className="truncate text-caption muted">
                {[f.brand, f.badge].filter(Boolean).join(" · ") || " "}
              </p>
            </div>
            <span className="shrink-0 text-right text-sm tabular-nums">
              {fmt(f.kcal)}
              <span className="block text-caption muted">kcal/100 g</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

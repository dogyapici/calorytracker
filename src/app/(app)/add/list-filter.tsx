"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons";
import { LISTS, type ListKey } from "./lists";

/** Dropdown above the food list on the add page; the choice lives in the URL (?list=). */
export function ListFilter({ value }: { value: ListKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const change = (next: string) => {
    const sp = new URLSearchParams(params);
    if (next === "recent") sp.delete("list");
    else sp.set("list", next);
    router.replace(`${pathname}?${sp}`, { scroll: false });
  };

  return (
    <div className="relative w-fit">
      <select
        aria-label="Liste auswählen"
        value={value}
        onChange={(e) => change(e.target.value)}
        className="h-10 cursor-pointer appearance-none rounded-full border border-border bg-surface py-0 pl-4 pr-10 text-label font-semibold text-text-primary shadow-card outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {LISTS.map((l) => (
          <option key={l.key} value={l.key}>
            {l.label}
          </option>
        ))}
      </select>
      <Icon name="expand" size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" />
    </div>
  );
}

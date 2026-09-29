"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { MealKey } from "@/lib/nutrition";
import { Icon, type IconName } from "./icons";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Tagebuch", icon: "diary" },
  { href: "/stats", label: "Statistik", icon: "stats" },
  { href: "/weight", label: "Gewicht", icon: "weight" },
  { href: "/profile", label: "Profil", icon: "profile" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/diary") || pathname.startsWith("/add") || pathname.startsWith("/food") || pathname.startsWith("/entry");
  return pathname.startsWith(href);
}

/** The meal that fits the time of day, so the quick actions land in the right place. */
function mealNow(): MealKey {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 22) return "dinner";
  return "snack";
}

const ACTIONS: { label: string; icon: IconName; href: (meal: MealKey) => string }[] = [
  { label: "Gewicht eintragen", icon: "weight", href: () => "/weight?add=1" },
  { label: "Foto schätzen", icon: "camera", href: (meal) => `/add/photo?meal=${meal}` },
  { label: "Barcode scannen", icon: "barcode", href: (meal) => `/add?meal=${meal}&scan=1` },
  { label: "Essen suchen", icon: "search", href: (meal) => `/add?meal=${meal}` },
];

function NavLink({ item, active }: { item: (typeof ITEMS)[number]; active: boolean }) {
  return (
    <Link
      href={item.href}
      prefetch
      aria-current={active ? "page" : undefined}
      className={`group flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors duration-200 ${active ? "text-primary" : "text-text-tertiary"}`}
    >
      <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-[background-color,transform] duration-300 ease-out group-active:scale-90 ${active ? "scale-100 bg-primary-soft" : "scale-90 bg-transparent"}`}>
        <Icon name={item.icon} size={22} />
      </span>
      {item.label}
    </Link>
  );
}

// Schwebende Leiste: abgerundet, vom Rand eingerückt, leicht transparent mit Blur.
// In der Mitte ein Plus, das Schnellaktionen nach oben aufklappt.
export function BottomNav() {
  const pathname = usePathname();
  // The menu remembers the page it was opened on, so going to another page closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);
  const [meal, setMeal] = useState<MealKey>("breakfast");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    setMeal(mealNow());
    setOpen(!open);
  };

  return (
    <>
      {open && <button type="button" aria-label="Menü schließen" className="quick-backdrop fixed inset-0 z-20 bg-black/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />}

      <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-md">
        {open && (
          <ul id="quick-actions" className="absolute inset-x-0 bottom-full mb-3 flex flex-col items-center gap-2.5">
            {ACTIONS.map((a, i) => (
              <li key={a.label} className="quick-item" style={{ animationDelay: `${(ACTIONS.length - 1 - i) * 40}ms` }}>
                <Link
                  href={a.href(meal)}
                  onClick={() => setOpen(false)}
                  className="flex w-60 items-center gap-3 rounded-full border border-border bg-surface py-2 pl-2 pr-5 text-label font-semibold text-text-primary shadow-elevated transition-transform duration-150 active:scale-95"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Icon name={a.icon} size={20} />
                  </span>
                  {a.label}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <ul className="grid grid-cols-5 items-center rounded-[28px] border border-border bg-surface/75 px-1.5 py-1 shadow-elevated backdrop-blur-xl">
          {ITEMS.slice(0, 2).map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={isActive(pathname, item.href)} />
            </li>
          ))}
          <li className="flex justify-center">
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-controls="quick-actions"
              aria-label={open ? "Schnellaktionen schließen" : "Schnellaktionen öffnen"}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-card transition-transform duration-200 ease-out active:scale-90"
            >
              <Icon name="add" size={26} className={`transition-transform duration-300 ease-out ${open ? "rotate-45" : ""}`} />
            </button>
          </li>
          {ITEMS.slice(2).map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={isActive(pathname, item.href)} />
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

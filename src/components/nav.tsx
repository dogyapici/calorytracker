"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Tagebuch", icon: "M4 5h16M4 12h16M4 19h10" },
  { href: "/stats", label: "Statistik", icon: "M5 20V10M12 20V4M19 20v-7" },
  { href: "/weight", label: "Gewicht", icon: "M6 7h12l2 13H4L6 7zm6-3a3 3 0 0 1 3 3H9a3 3 0 0 1 3-3z" },
  { href: "/profile", label: "Profil", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/add") || pathname.startsWith("/food") || pathname.startsWith("/entry");
  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
      <ul className="mx-auto grid max-w-2xl grid-cols-4">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium ${active ? "text-brand-600" : "text-zinc-500"}`}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

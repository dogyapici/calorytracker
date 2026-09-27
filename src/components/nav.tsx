"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Tagebuch", icon: "diary" },
  { href: "/stats", label: "Statistik", icon: "stats" },
  { href: "/weight", label: "Gewicht", icon: "weight" },
  { href: "/profile", label: "Profil", icon: "profile" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/add") || pathname.startsWith("/food") || pathname.startsWith("/entry");
  return pathname.startsWith(href);
}

// Bottom Navigation: surface mit leichtem Blur, 1px border oben. Aktives Icon
// in primary auf primary-soft-Pill, inaktive in text-tertiary.
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <ul className="mx-auto grid max-w-2xl grid-cols-4 px-2">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-touch flex-col items-center gap-0.5 pb-2 pt-1.5 text-caption transition-colors duration-200 ${active ? "text-primary" : "text-text-tertiary"}`}
              >
                <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-[background-color,transform] duration-300 ease-out group-active:scale-90 ${active ? "scale-100 bg-primary-soft" : "scale-90 bg-transparent"}`}>
                  <Icon name={item.icon} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

import Link from "next/link";
import { addDays, formatDay } from "@/lib/dates";
import { weekStart } from "@/lib/training";

/**
 * Wochenleiste Mo–So: der gewählte Tag hebt sich als Karte ab, heute ist grün,
 * Tage mit Einträgen tragen einen Punkt.
 */
export function WeekStrip({ day, today, logged }: { day: string; today: string; logged: Set<string> }) {
  const monday = weekStart(day);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return (
    <nav aria-label="Woche" className="grid grid-cols-7 gap-1">
      {days.map((d) => {
        const selected = d === day;
        const isToday = d === today;
        return (
          <Link
            key={d}
            href={d === today ? "/" : `/?day=${d}`}
            prefetch
            scroll={false}
            aria-current={selected ? "date" : undefined}
            aria-label={formatDay(d, { weekday: "long", day: "numeric", month: "long" })}
            className={`flex flex-col items-center gap-1 rounded-button py-2.5 transition-[background-color,box-shadow,transform] duration-200 ease-out active:scale-95 ${selected ? "bg-surface shadow-card" : ""}`}
          >
            <span className={`text-caption ${selected ? "font-semibold text-text-primary" : isToday ? "font-semibold text-primary" : "text-text-secondary"}`}>
              {formatDay(d, { weekday: "short" }).replace(".", "")}
            </span>
            <span className={`text-[17px] leading-6 tabular-nums ${selected ? "font-bold text-text-primary" : isToday ? "font-bold text-primary" : d > today ? "font-medium text-text-secondary" : "font-medium text-text-primary"}`}>
              {Number(d.slice(8))}
            </span>
            <span aria-hidden className={`h-1 w-1 rounded-full ${logged.has(d) ? "bg-primary" : "bg-transparent"}`} />
          </Link>
        );
      })}
    </nav>
  );
}

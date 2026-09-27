"use client";

import { useEffect, useRef } from "react";
import { celebrateOnce } from "@/components/celebrate";
import { Icon } from "@/components/icons";

/**
 * The calorie card at the top of the diary. Tapping it opens a sheet with every nutrient of the day;
 * landing inside the calorie target (±10 %) today plays the success effect once.
 */
export function DaySummary({
  day,
  isToday,
  eaten,
  target,
  title,
  details,
  children,
}: {
  day: string;
  isToday: boolean;
  eaten: number;
  target: number;
  title: string;
  details: React.ReactNode;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const reached = target > 0 && eaten >= target * 0.9 && eaten <= target * 1.1;

  useEffect(() => {
    if (isToday && reached) celebrateOnce(`ct-goal-kcal-${day}`, card.current?.querySelector("[data-ring]") ?? card.current, "Kalorienziel erreicht 🎉");
  }, [day, isToday, reached]);

  const open = () => dialog.current?.showModal();

  return (
    <>
      <div
        ref={card}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label="Alle Nährwerte des Tages anzeigen"
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        className="card pressable block cursor-pointer space-y-5 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {children}
        <p className="-mb-1 flex items-center justify-center gap-0.5 text-caption font-semibold text-primary">
          Alle Nährwerte <Icon name="forward" size={14} />
        </p>
      </div>

      <dialog
        ref={dialog}
        className="sheet"
        aria-labelledby="day-details-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="space-y-5 px-gutter pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <span aria-hidden className="mx-auto block h-1.5 w-10 rounded-full bg-border" />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-label font-semibold text-primary">Nährwerte</p>
              <h2 id="day-details-title" className="truncate text-h2">
                {title}
              </h2>
            </div>
            <button type="button" className="btn-round h-10 w-10 shadow-none" aria-label="Schließen" onClick={() => dialog.current?.close()}>
              <Icon name="remove" size={20} />
            </button>
          </div>
          {details}
        </div>
      </dialog>
    </>
  );
}

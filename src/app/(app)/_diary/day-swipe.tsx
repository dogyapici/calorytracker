"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Welcher Tag zuletzt gezeigt wurde, damit der neue Tag von der richtigen Seite hereingleitet
// (auch wenn man die Pfeile statt Wischen benutzt).
let lastDay: string | null = null;

const THRESHOLD = 70;
const EDGE = 24; // Wischen vom linken Rand gehört der Zurück-Geste des Browsers.

/** Swipe the diary left or right to go to the next or previous day. */
export function DaySwipe({ day, prev, next, children }: { day: string; prev: string; next: string; children: React.ReactNode }) {
  const router = useRouter();
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<"prev" | "next" | null>(null);
  const [enter, setEnter] = useState<"prev" | "next" | null>(null);
  const [, startTransition] = useTransition();
  const start = useRef<{ x: number; y: number; t: number; horizontal: boolean | null } | null>(null);

  // Before the first paint, so the new day never flashes in place before sliding in.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (lastDay && lastDay !== day) setEnter(day > lastDay ? "next" : "prev");
    lastDay = day;
  }, [day]);

  const go = (dir: "prev" | "next") => {
    navigator.vibrate?.(10);
    setLeaving(dir);
    startTransition(() => router.push(`/?day=${dir === "prev" ? prev : next}`, { scroll: false }));
  };

  const offset = leaving ? (leaving === "next" ? -1 : 1) * 60 : dx;

  return (
    <div
      className={`${enter === "next" ? "animate-day-next" : enter === "prev" ? "animate-day-prev" : ""}`}
      style={{ touchAction: "pan-y" }}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" || leaving) return;
        if (e.clientX < EDGE || (e.target as Element).closest("[data-swipe-row], input, textarea, select")) return;
        start.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, horizontal: null };
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        const x = e.clientX - s.x;
        const y = e.clientY - s.y;
        if (s.horizontal === null) {
          if (Math.abs(x) < 10 && Math.abs(y) < 10) return;
          s.horizontal = Math.abs(x) > Math.abs(y) * 1.3;
          if (!s.horizontal) return (start.current = null);
          setDragging(true);
        }
        // Resistance: the content follows the finger, but less and less.
        setDx(Math.sign(x) * Math.min(120, Math.abs(x) * 0.6));
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        setDragging(false);
        if (!s?.horizontal) return;
        const x = e.clientX - s.x;
        const fast = Math.abs(x) / Math.max(1, e.timeStamp - s.t) > 0.5 && Math.abs(x) > 30;
        setDx(0);
        if (Math.abs(x) > THRESHOLD || fast) go(x < 0 ? "next" : "prev");
      }}
      onPointerCancel={() => {
        start.current = null;
        setDragging(false);
        setDx(0);
      }}
      onClickCapture={(e) => {
        if (dragging || leaving) e.preventDefault();
      }}
    >
      <div
        className={dragging ? "" : "transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none"}
        style={{ transform: offset ? `translateX(${offset}px)` : undefined, opacity: leaving ? 0 : 1 - Math.abs(dx) / 400 }}
      >
        {children}
      </div>
    </div>
  );
}

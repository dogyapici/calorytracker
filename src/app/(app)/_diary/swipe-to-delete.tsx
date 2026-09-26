"use client";

import { useEffect, useRef, useState } from "react";
import { removeEntry } from "@/app/actions";

const REVEAL = 88;
const UNDO_MS = 4000;

/**
 * Swipe a diary row to the left: a short swipe reveals „Löschen“, a long one deletes.
 * The delete waits a few seconds so it can be undone.
 */
export function SwipeToDelete({ id, name, children }: { id: number; name: string; children: React.ReactNode }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; horizontal: boolean | null } | null>(null);
  const moved = useRef(false);
  const width = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = () => {
    if (!pending.current) return;
    clearTimeout(pending.current);
    pending.current = null;
    removeEntry(id);
  };

  // Leaves the page before the undo time ran out: delete anyway.
  useEffect(() => commit, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = () => {
    setDeleted(true);
    setDx(0);
    navigator.vibrate?.(30);
    pending.current = setTimeout(commit, UNDO_MS);
  };

  const undo = () => {
    if (pending.current) clearTimeout(pending.current);
    pending.current = null;
    setDeleted(false);
  };

  if (deleted) {
    return (
      <div className="flex items-center justify-between gap-3 py-3 text-label" role="status">
        <span className="min-w-0 truncate muted">„{name}“ gelöscht</span>
        <button type="button" className="shrink-0 font-semibold text-primary" onClick={undo}>
          Rückgängig
        </button>
      </div>
    );
  }

  return (
    <div className="relative -mx-card overflow-hidden">
      <button
        type="button"
        onClick={remove}
        tabIndex={dx < 0 ? 0 : -1}
        aria-label={`${name} löschen`}
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-danger pr-5 text-label font-semibold text-white"
        style={{ width: Math.max(REVEAL, -dx) }}
      >
        Löschen
      </button>
      <div
        className={`relative bg-surface px-card ${dragging ? "" : "transition-transform duration-200 ease-out"}`}
        style={{ transform: `translateX(${dx}px)`, touchAction: "pan-y" }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          start.current = { x: e.clientX, y: e.clientY, base: dx, horizontal: null };
          width.current = e.currentTarget.offsetWidth;
          moved.current = false;
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          const x = e.clientX - s.x;
          const y = e.clientY - s.y;
          if (s.horizontal === null) {
            if (Math.abs(x) < 8 && Math.abs(y) < 8) return;
            s.horizontal = Math.abs(x) > Math.abs(y);
            if (!s.horizontal) return (start.current = null);
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
          }
          moved.current = true;
          setDx(Math.min(0, s.base + x));
        }}
        onPointerUp={() => {
          const s = start.current;
          start.current = null;
          setDragging(false);
          if (!s?.horizontal) return;
          if (-dx > width.current * 0.55) remove();
          else setDx(-dx > REVEAL / 2 ? -REVEAL : 0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
          setDx(0);
        }}
        onClickCapture={(e) => {
          // A swipe is not a tap on the entry; a tap on an opened row closes it.
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          } else if (dx !== 0) {
            e.preventDefault();
            e.stopPropagation();
            setDx(0);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

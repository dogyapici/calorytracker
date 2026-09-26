"use client";

import { useState } from "react";
import { Collapse } from "@/components/collapse";
import { Icon } from "@/components/icons";
import { CLOSED_MEALS_COOKIE } from "./constants";


/** Meal card whose entries fold away; the choice is kept in a cookie so the server renders it right away. */
export function CollapsibleMeal({
  mealKey,
  initialOpen,
  title,
  summary,
  children,
}: {
  mealKey: string;
  initialOpen: boolean;
  title: React.ReactNode;
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(initialOpen);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    const current = document.cookie.match(new RegExp(`(?:^|; )${CLOSED_MEALS_COOKIE}=([^;]*)`))?.[1] ?? "";
    const closed = new Set(decodeURIComponent(current).split(",").filter(Boolean));
    if (next) closed.delete(mealKey);
    else closed.add(mealKey);
    document.cookie = `${CLOSED_MEALS_COOKIE}=${encodeURIComponent([...closed].join(","))}; path=/; max-age=31536000; samesite=lax`;
  };

  const id = `meal-${mealKey}`;
  return (
    <section className="card animate-enter p-0">
      <h2 className="text-h3">
        <button type="button" onClick={toggle} aria-expanded={open} aria-controls={id} className="flex w-full items-center gap-3 rounded-card px-card py-3.5 text-left transition-colors duration-150 active:bg-surface-muted">
          <span className="flex-1">{title}</span>
          {summary}
          <Icon name="expand" size={20} className={`shrink-0 text-text-tertiary transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`} />
        </button>
      </h2>
      <Collapse id={id} open={open}>
        {children}
      </Collapse>
    </section>
  );
}

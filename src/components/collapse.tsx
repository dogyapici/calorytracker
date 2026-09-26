"use client";

import { useState } from "react";
import { Icon } from "./icons";

/** Content that folds open and shut smoothly (height and opacity); closed content is inert. */
export function Collapse({ open, id, className = "", children }: { open: boolean; id?: string; className?: string; children: React.ReactNode }) {
  return (
    <div
      id={id}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">
        <div className={className}>{children}</div>
      </div>
    </div>
  );
}

/** A card with a heading button that folds its content. */
export function Disclosure({ title, className = "", children }: { title: React.ReactNode; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`card ${className}`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left font-semibold">
        {title}
        <Icon name="expand" size={20} className={`shrink-0 text-text-secondary transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`} />
      </button>
      <Collapse open={open} className="pt-3">
        {children}
      </Collapse>
    </section>
  );
}

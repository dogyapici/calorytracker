"use client";

import { useId, useState } from "react";
import { Collapse } from "./collapse";
import { Icon, type IconName } from "./icons";

/** A foldable profile card: icon, title and a one-line summary; the settings open below. */
export function ProfileSection({
  id,
  icon,
  title,
  summary,
  open: initialOpen = false,
  children,
}: {
  id: string;
  icon: IconName;
  title: string;
  summary: React.ReactNode;
  open?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(initialOpen);
  const contentId = useId();
  return (
    <section id={id} className="card scroll-mt-4 p-0">
      <h2>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex w-full items-center gap-3 rounded-card px-card py-4 text-left transition-colors duration-150 active:bg-surface-muted"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon name={icon} size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-h3">{title}</span>
            <span className="block truncate text-caption muted">{summary}</span>
          </span>
          <Icon name="expand" size={20} className={`shrink-0 text-text-tertiary transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`} />
        </button>
      </h2>
      <Collapse id={contentId} open={open}>
        <div className="space-y-4 border-t border-border px-card pb-card pt-4">{children}</div>
      </Collapse>
    </section>
  );
}

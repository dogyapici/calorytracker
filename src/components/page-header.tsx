import Link from "next/link";
import { Icon } from "./icons";

/**
 * Title area of a sub page: optional round back button, a small eyebrow line above the title,
 * a subtitle below and an action on the right. Long titles drop to h2 and wrap evenly.
 */
export function PageHeader({
  title,
  back,
  backLabel = "Zurück",
  eyebrow,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  back?: string;
  backLabel?: string;
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const long = typeof title === "string" && title.length > 24;
  return (
    <header className="flex items-center gap-3 pb-1">
      {back && (
        <Link
          href={back}
          aria-label={backLabel}
          className="btn-round"
        >
          <Icon name="back" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-label font-semibold text-primary">{eyebrow}</p>}
        <h1 className={`${long ? "text-h2" : "text-h1"} text-balance break-words [hyphens:auto]`}>{title}</h1>
        {subtitle && <p className="mt-0.5 text-label muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

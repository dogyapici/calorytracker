import { Icon, type IconName } from "@/components/icons";

/** A foldable profile card: icon, title and a one-line summary; the settings open below. */
export function ProfileSection({
  id,
  icon,
  title,
  summary,
  open = false,
  children,
}: {
  id: string;
  icon: IconName;
  title: string;
  summary: React.ReactNode;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details id={id} open={open} className="group card scroll-mt-4 p-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-card py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon name={icon} size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-h3">{title}</span>
          <span className="block truncate text-caption muted">{summary}</span>
        </span>
        <Icon name="expand" size={20} className="shrink-0 text-text-tertiary transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-border px-card pb-card pt-4">{children}</div>
    </details>
  );
}

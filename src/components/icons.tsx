import {
  Camera,
  ChartNoAxesColumn,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  NotebookText,
  Plus,
  Scale,
  ScanBarcode,
  Star,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

// Ein Icon-Set für die ganze App (DESIGN.md: Lucide, 1.75px Strich, 24px Standard).
const ICONS = {
  back: ChevronLeft,
  forward: ChevronRight,
  expand: ChevronDown,
  barcode: ScanBarcode,
  camera: Camera,
  star: Star,
  remove: X,
  add: Plus,
  diary: NotebookText,
  stats: ChartNoAxesColumn,
  weight: Scale,
  profile: UserRound,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24, filled = false, className }: { name: IconName; size?: number; filled?: boolean; className?: string }) {
  const Component = ICONS[name];
  return <Component size={size} strokeWidth={1.75} fill={filled ? "currentColor" : "none"} className={className} aria-hidden />;
}

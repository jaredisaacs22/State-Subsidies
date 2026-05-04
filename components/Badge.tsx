import { cn } from "@/lib/utils";
import { INCENTIVE_TYPE_LABELS, JURISDICTION_LABELS, INCENTIVE_TYPE_COLORS, JURISDICTION_COLORS } from "@/lib/types";
import type { IncentiveType, JurisdictionLevel } from "@/lib/types";

interface IncentiveTypeBadgeProps {
  type: IncentiveType;
  className?: string;
}

export function IncentiveTypeBadge({ type, className }: IncentiveTypeBadgeProps) {
  return (
    <span className={cn("badge", INCENTIVE_TYPE_COLORS[type], className)}>
      {INCENTIVE_TYPE_LABELS[type]}
    </span>
  );
}

interface JurisdictionBadgeProps {
  level: JurisdictionLevel;
  name?: string;
  className?: string;
}

export function JurisdictionBadge({ level, name, className }: JurisdictionBadgeProps) {
  return (
    <span className={cn("badge", JURISDICTION_COLORS[level], className)}>
      {name ? name : JURISDICTION_LABELS[level]}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    ACTIVE:    "bg-green-100 text-green-800",
    CLOSED:    "bg-slate-100 text-slate-600",
    UPCOMING:  "bg-amber-100 text-amber-800",
    SUSPENDED: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    ACTIVE:    "Active",
    CLOSED:    "Closed",
    UPCOMING:  "Upcoming",
    SUSPENDED: "Suspended",
  };
  return (
    <span className={cn("badge", colors[status] ?? "bg-slate-100 text-slate-600", className)}>
      {labels[status] ?? status}
    </span>
  );
}

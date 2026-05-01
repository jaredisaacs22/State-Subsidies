import { clsx, type ClassValue } from "clsx";
import type { Incentive } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number | null): string {
  if (amount === null) return "Varies";
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

/** Compact money formatter for headline stat figures. Caps at 4 visible
 *  digits: $1.5B, $42.5B, $425M, $25M, $500K. Anything >= $1B uses the
 *  billions tier so we never print things like "$42450M". */
export function fmtMoney(amount: number | null | undefined): string {
  if (amount == null) return "—";
  if (amount >= 1_000_000_000) {
    const b = amount / 1_000_000_000;
    return `$${b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${Math.round(amount).toLocaleString()}`;
}

export function formatDeadline(deadline: string | null): string {
  if (!deadline) return "Rolling / No deadline";
  const d = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const formatted = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (diffDays < 0) return `Closed (${formatted})`;
  if (diffDays <= 7) return `Closing in ${diffDays}d (${formatted})`;
  if (diffDays <= 30) return `${diffDays} days left (${formatted})`;
  return formatted;
}

/** Cast a raw Prisma row to the typed Incentive shape. */
export function parseIncentive(raw: Record<string, unknown>): Incentive {
  return raw as unknown as Incentive;
}

/** Build a /api/redirect proxy URL that live-checks the source and falls back to Google */
export function sourceRedirectUrl(incentive: Pick<Incentive, "sourceUrl" | "title" | "managingAgency">): string {
  const params = new URLSearchParams({
    url: incentive.sourceUrl,
    title: incentive.title,
    agency: incentive.managingAgency,
  });
  return `/api/redirect?${params.toString()}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

import { clsx, type ClassValue } from "clsx";
import type { Incentive } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number | null): string {
  if (amount === null) return "Varies";
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
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
  if (diffDays <= 7) return `⚠ Closing in ${diffDays}d (${formatted})`;
  if (diffDays <= 30) return `${diffDays} days left (${formatted})`;
  return formatted;
}

/** Parse raw DB row's JSON strings into typed arrays */
export function parseIncentive(raw: Record<string, unknown>): Incentive {
  return {
    ...(raw as unknown as Incentive),
    keyRequirements:
      typeof raw.keyRequirements === "string"
        ? JSON.parse(raw.keyRequirements)
        : (raw.keyRequirements as string[]),
    industryCategories:
      typeof raw.industryCategories === "string"
        ? JSON.parse(raw.industryCategories)
        : (raw.industryCategories as string[]),
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

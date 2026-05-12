import { DollarSign, Calendar, Clock, Layers, ClipboardList } from "lucide-react";
import { formatCurrency, formatDeadline } from "@/lib/utils";
import { INCENTIVE_TYPE_LABELS } from "@/lib/types";
import type { Incentive } from "@/lib/types";

/**
 * Five-cell quick-scan strip. Designed to answer the most-asked questions
 * before the user reads any prose:
 *   - How much can I get?
 *   - What kind of incentive is it?
 *   - When does it close?
 *   - How long to decide / apply?
 *   - How hard is it?
 */
export function AtAGlance({ incentive }: { incentive: Incentive }) {
  const complexity = getComplexity(incentive);
  const timing = getTiming(incentive);

  const items = [
    {
      icon: <DollarSign size={16} className="text-emerald-600" />,
      label: "Max funding",
      value: formatCurrency(incentive.fundingAmount),
      sub: incentive.fundingAmount ? "per applicant" : "Amount varies",
    },
    {
      icon: <Layers size={16} className="text-sky-600" />,
      label: "Type",
      value: INCENTIVE_TYPE_LABELS[incentive.incentiveType],
      sub: typeShortLabel(incentive.incentiveType),
    },
    {
      icon: <Calendar size={16} className="text-amber-600" />,
      label: "Deadline",
      value: incentive.deadline ? formatDeadline(incentive.deadline) : "Rolling",
      sub: incentive.deadline ? "Apply before this date" : "No fixed cutoff",
    },
    {
      icon: <Clock size={16} className="text-violet-600" />,
      label: "Timing",
      value: timing.label,
      sub: timing.sub,
    },
    {
      icon: <ClipboardList size={16} className="text-slate-600" />,
      label: "Complexity",
      value: complexity.label,
      sub: complexity.sub,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-4 bg-slate-50 rounded-xl border border-slate-200 px-5 py-4">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            {it.icon}
            {it.label}
          </div>
          <p className="text-[15px] font-semibold text-slate-900 leading-tight truncate" title={it.value}>
            {it.value}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{it.sub}</p>
        </div>
      ))}
    </div>
  );
}

function typeShortLabel(type: Incentive["incentiveType"]): string {
  switch (type) {
    case "GRANT": return "Cash award, application-based";
    case "TAX_CREDIT": return "Reduces tax liability";
    case "POINT_OF_SALE_REBATE": return "Discount at purchase";
    case "SUBSIDY": return "Ongoing cost support";
    case "LOAN": return "Below-market financing";
    case "VOUCHER": return "Pre-funded toward purchase";
    default: return "";
  }
}

function getTiming(inc: Incentive): { label: string; sub: string } {
  if (inc.deadline) {
    const days = Math.ceil(
      (new Date(inc.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (days < 0) return { label: "Closed", sub: "Past deadline" };
    if (days < 30) return { label: "Closing soon", sub: `${days} day${days === 1 ? "" : "s"} left` };
    return { label: "Cycle-based", sub: `${days} days to deadline` };
  }
  // No deadline — infer from type
  switch (inc.incentiveType) {
    case "TAX_CREDIT":     return { label: "Annual tax return", sub: "Claim with year-end filing" };
    case "POINT_OF_SALE_REBATE": return { label: "Instant", sub: "Applied at purchase" };
    case "LOAN":           return { label: "Rolling", sub: "Apply when you're ready" };
    case "VOUCHER":        return { label: "Rolling", sub: "Available while funds last" };
    case "GRANT":          return { label: "Rolling", sub: "Or check for open cycles" };
    default:               return { label: "Rolling", sub: "No fixed cutoff" };
  }
}

function getComplexity(inc: Incentive): { label: string; sub: string } {
  const { incentiveType, jurisdictionLevel } = inc;
  if (incentiveType === "POINT_OF_SALE_REBATE" || incentiveType === "VOUCHER") {
    return { label: "Simple", sub: "Short form or instant" };
  }
  if (incentiveType === "TAX_CREDIT") {
    return { label: "Moderate", sub: "File with tax return" };
  }
  if (jurisdictionLevel === "FEDERAL" && incentiveType === "GRANT") {
    return { label: "Extensive", sub: "Detailed federal app" };
  }
  if (incentiveType === "LOAN") {
    return { label: "Moderate", sub: "Underwriting required" };
  }
  return { label: "Moderate", sub: "Standard state application" };
}

"use client";

import Link from "next/link";
import { ExternalLink, Calendar, DollarSign, CheckCircle2, Building2 } from "lucide-react";
import { IncentiveTypeBadge, JurisdictionBadge, StatusBadge } from "./Badge";
import { formatCurrency, formatDeadline, cn } from "@/lib/utils";
import { INCENTIVE_TYPE_BORDER, INDUSTRY_COLORS } from "@/lib/types";
import type { Incentive } from "@/lib/types";

interface IncentiveCardProps {
  incentive: Incentive;
  className?: string;
}

export function IncentiveCard({ incentive, className }: IncentiveCardProps) {
  const isClosingSoon =
    incentive.deadline !== null &&
    new Date(incentive.deadline).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  return (
    <article
      className={cn(
        "card flex flex-col p-5 animate-fade-in border-l-4",
        INCENTIVE_TYPE_BORDER[incentive.incentiveType],
        incentive.status === "CLOSED" && "opacity-60",
        className
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-1.5">
          <IncentiveTypeBadge type={incentive.incentiveType} />
          <JurisdictionBadge level={incentive.jurisdictionLevel} />
          {incentive.status !== "ACTIVE" && <StatusBadge status={incentive.status} />}
          {incentive.isVerified && (
            <span className="badge bg-slate-100 text-slate-600 gap-1">
              <CheckCircle2 size={11} />
              Verified
            </span>
          )}
        </div>
        <a
          href={incentive.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 text-slate-400 hover:text-brand-600 transition-colors"
          title="View official source"
        >
          <ExternalLink size={16} />
        </a>
      </div>

      {/* ── Title & Agency ──────────────────────────────────────────────── */}
      <Link href={`/incentives/${incentive.slug}`} className="group mb-1">
        <h2 className="font-semibold text-slate-900 text-base leading-snug group-hover:text-brand-700 transition-colors line-clamp-2">
          {incentive.title}
        </h2>
      </Link>

      <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
        <Building2 size={12} className="flex-shrink-0" />
        {incentive.managingAgency}
        {incentive.agencyAcronym && incentive.agencyAcronym !== incentive.managingAgency && (
          <span className="text-slate-400">({incentive.agencyAcronym})</span>
        )}
      </p>

      {/* ── Short Summary ───────────────────────────────────────────────── */}
      <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-3 flex-grow">
        {incentive.shortSummary}
      </p>

      {/* ── Key Requirements ────────────────────────────────────────────── */}
      <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Key Requirements
        </p>
        <ul className="space-y-1">
          {incentive.keyRequirements.slice(0, 3).map((req, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
              <span className="text-brand-500 mt-0.5 flex-shrink-0">•</span>
              <span>{req}</span>
            </li>
          ))}
          {incentive.keyRequirements.length > 3 && (
            <li className="text-xs text-slate-400 pl-3">
              +{incentive.keyRequirements.length - 3} more requirements
            </li>
          )}
        </ul>
      </div>

      {/* ── Industry Tags ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 mb-4">
        {incentive.industryCategories.map((cat) => (
          <span
            key={cat}
            className={cn("badge text-xs font-normal", INDUSTRY_COLORS[cat] ?? "bg-slate-100 text-slate-600")}
          >
            {cat}
          </span>
        ))}
      </div>

      {/* ── Footer: Amount & Deadline ───────────────────────────────────── */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
        <div className="flex items-center gap-1 text-sm font-bold text-emerald-700">
          <DollarSign size={14} className="text-emerald-600" />
          {formatCurrency(incentive.fundingAmount)}
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-xs",
            isClosingSoon ? "text-amber-600 font-medium" : "text-slate-500"
          )}
        >
          <Calendar size={12} />
          {formatDeadline(incentive.deadline)}
        </div>
      </div>
    </article>
  );
}

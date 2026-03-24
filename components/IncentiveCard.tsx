"use client";

import Link from "next/link";
import { ExternalLink, Calendar, MapPin, ArrowRight, Bookmark } from "lucide-react";
import { IncentiveTypeBadge, JurisdictionBadge, StatusBadge } from "./Badge";
import { formatCurrency, formatDeadline, cn } from "@/lib/utils";
import { INCENTIVE_TYPE_BORDER, INDUSTRY_COLORS } from "@/lib/types";
import { useBookmarks } from "@/lib/useBookmarks";
import type { Incentive } from "@/lib/types";

interface IncentiveCardProps {
  incentive: Incentive;
  className?: string;
}

export function IncentiveCard({ incentive, className }: IncentiveCardProps) {
  const { isBookmarked, toggle } = useBookmarks();
  const bookmarked = isBookmarked(incentive.slug);
  const isClosingSoon =
    incentive.deadline !== null &&
    new Date(incentive.deadline).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  return (
    <article
      className={cn(
        "card group flex flex-col animate-fade-in border-l-4",
        INCENTIVE_TYPE_BORDER[incentive.incentiveType],
        incentive.status === "CLOSED" && "opacity-60",
        className
      )}
    >
      <div className="px-5 pt-4 pb-3">
        {/* Badges + external link */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1.5">
            <IncentiveTypeBadge type={incentive.incentiveType} />
            <JurisdictionBadge level={incentive.jurisdictionLevel} />
            {incentive.status !== "ACTIVE" && <StatusBadge status={incentive.status} />}
          </div>
          <a
            href={incentive.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 p-1.5 rounded-md text-slate-300 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="View official source"
          >
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Title */}
        <Link href={`/incentives/${incentive.slug}`} className="block mb-1.5">
          <h2 className="font-semibold text-slate-900 text-[15px] leading-snug group-hover:text-brand-700 transition-colors line-clamp-2">
            {incentive.title}
          </h2>
        </Link>

        {/* Agency · Location */}
        <p className="text-xs text-slate-400 flex items-center gap-1 mb-3 truncate">
          <MapPin size={11} className="flex-shrink-0" />
          {incentive.agencyAcronym && incentive.agencyAcronym !== incentive.managingAgency
            ? incentive.agencyAcronym
            : incentive.managingAgency}
          {" · "}
          {incentive.jurisdictionName}
        </p>

        {/* Summary */}
        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
          {incentive.shortSummary}
        </p>
      </div>

      {/* Industry tags */}
      <div className="px-5 pb-3 flex flex-wrap gap-1">
        {incentive.industryCategories.slice(0, 3).map((cat) => (
          <span
            key={cat}
            className={cn("badge text-[11px] font-normal py-0.5", INDUSTRY_COLORS[cat] ?? "bg-slate-100 text-slate-600")}
          >
            {cat}
          </span>
        ))}
        {incentive.industryCategories.length > 3 && (
          <span className="badge text-[11px] font-normal py-0.5 bg-slate-100 text-slate-400">
            +{incentive.industryCategories.length - 3}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-emerald-700">
            {formatCurrency(incentive.fundingAmount)}
          </span>
          {incentive.deadline && (
            <span className={cn(
              "flex items-center gap-1 text-xs",
              isClosingSoon ? "text-amber-600 font-medium" : "text-slate-400"
            )}>
              <Calendar size={11} />
              {formatDeadline(incentive.deadline)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(incentive.slug); }}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              bookmarked
                ? "text-brand-600 bg-brand-50"
                : "text-slate-300 hover:text-brand-500 hover:bg-brand-50"
            )}
            title={bookmarked ? "Remove bookmark" : "Save program"}
          >
            <Bookmark size={13} className={bookmarked ? "fill-current" : ""} />
          </button>
          <Link
            href={`/incentives/${incentive.slug}`}
            className="flex items-center gap-1 text-xs text-brand-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Details <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </article>
  );
}

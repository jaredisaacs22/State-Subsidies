"use client";

import Link from "next/link";
import { ExternalLink, Calendar, MapPin, ArrowRight, Bookmark, CheckCircle2 } from "lucide-react";
import { IncentiveTypeBadge, JurisdictionBadge, StatusBadge } from "./Badge";
import { formatCurrency, formatDeadline, cn } from "@/lib/utils";
import { INCENTIVE_TYPE_BORDER, INDUSTRY_COLORS } from "@/lib/types";
import { useBookmarks } from "@/lib/useBookmarks";
import type { Incentive } from "@/lib/types";

// Only show "New" for programs added after launch (not seeded baseline data)
const LAUNCH_DATE = new Date("2026-04-01T00:00:00Z");
const NEW_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function isNewProgram(createdAt: string): boolean {
  const created = new Date(createdAt);
  return created >= LAUNCH_DATE && Date.now() - created.getTime() < NEW_THRESHOLD_MS;
}

function Highlight({ text, query }: { text: string; query?: string }) {
  if (!query || query.trim().length < 2) return <>{text}</>;
  const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-100 text-amber-900 rounded-[2px] px-0.5 not-italic">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function getComplexity(incentive: Incentive): { label: string; color: string; title: string } {
  const { incentiveType, jurisdictionLevel } = incentive;
  if (incentiveType === "POINT_OF_SALE_REBATE" || incentiveType === "VOUCHER") {
    return { label: "Simple", color: "text-emerald-600 bg-emerald-50", title: "Minimal paperwork — point of sale or short application" };
  }
  if (jurisdictionLevel === "FEDERAL" && incentiveType === "GRANT") {
    return { label: "Extensive", color: "text-amber-700 bg-amber-50", title: "Federal grant — detailed application, compliance requirements" };
  }
  return { label: "Moderate", color: "text-sky-700 bg-sky-50", title: "Standard state or agency application process" };
}

interface IncentiveCardProps {
  incentive: Incentive;
  className?: string;
  searchQuery?: string;
}

export function IncentiveCard({ incentive, className, searchQuery }: IncentiveCardProps) {
  const { isBookmarked, toggle } = useBookmarks();
  const bookmarked = isBookmarked(incentive.slug);
  const complexity = getComplexity(incentive);
  const isNew = isNewProgram(incentive.createdAt);
  const isClosingSoon =
    incentive.deadline !== null &&
    new Date(incentive.deadline).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  return (
    <article
      className={cn(
        "card group flex flex-col animate-fade-in border-l-4",
        "hover:shadow-[0_4px_20px_rgba(26,92,56,0.12)]",
        INCENTIVE_TYPE_BORDER[incentive.incentiveType],
        incentive.status === "CLOSED" && "opacity-50",
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
            {isNew && (
              <span className="badge bg-forest-700 text-white text-[10px] px-2 py-0.5 animate-fade-in">
                New
              </span>
            )}
            {incentive.isVerified && (
              <span className="badge bg-emerald-50 text-emerald-700 gap-0.5 text-[10px]" title="Verified program">
                <CheckCircle2 size={10} />
                Verified
              </span>
            )}
          </div>
          <a
            href={incentive.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 p-1.5 rounded-md text-slate-300 hover:text-forest-700 hover:bg-forest-50 transition-colors"
            title="View official source"
          >
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Title */}
        <Link href={`/incentives/${incentive.slug}`} className="block mb-1.5">
          <h2 className="font-semibold text-slate-900 text-[16px] leading-snug group-hover:text-forest-700 transition-colors line-clamp-2">
            <Highlight text={incentive.title} query={searchQuery} />
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
          <Highlight text={incentive.shortSummary} query={searchQuery} />
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
        <div className="flex items-center gap-2">
          {incentive.fundingAmount && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
              {formatCurrency(incentive.fundingAmount)}
            </span>
          )}
          {incentive.deadline && (
            <span className={cn(
              "flex items-center gap-1 text-xs",
              isClosingSoon ? "text-amber-600 font-semibold" : "text-slate-400"
            )}>
              <Calendar size={11} />
              {formatDeadline(incentive.deadline)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span
            title={complexity.title}
            className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", complexity.color)}
          >
            {complexity.label}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(incentive.slug); }}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              bookmarked
                ? "text-forest-700 bg-forest-50"
                : "text-slate-300 hover:text-forest-700 hover:bg-forest-50"
            )}
            title={bookmarked ? "Remove bookmark" : "Save program"}
          >
            <Bookmark size={13} className={bookmarked ? "fill-current" : ""} />
          </button>
          <Link
            href={`/incentives/${incentive.slug}`}
            className="flex items-center gap-1 text-xs text-forest-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Details <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </article>
  );
}

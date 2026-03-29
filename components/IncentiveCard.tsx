"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Calendar, MapPin, ArrowRight, Bookmark, CheckCircle2, ClipboardCheck, X, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { IncentiveTypeBadge, JurisdictionBadge, StatusBadge } from "./Badge";
import { formatCurrency, formatDeadline, cn } from "@/lib/utils";
import { INCENTIVE_TYPE_BORDER, INDUSTRY_COLORS } from "@/lib/types";
import { useBookmarks } from "@/lib/useBookmarks";
import type { Incentive } from "@/lib/types";

// Only show "New" for programs added after launch (not seeded baseline data)
const LAUNCH_DATE = new Date("2026-04-01T00:00:00Z");
const NEW_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;

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

function getComplexity(incentive: Incentive): { label: string; color: string; description: string } {
  const { incentiveType, jurisdictionLevel } = incentive;
  if (incentiveType === "POINT_OF_SALE_REBATE" || incentiveType === "VOUCHER") {
    return { label: "Simple", color: "text-emerald-600 bg-emerald-50", description: "Minimal paperwork — point of sale or short application" };
  }
  if (jurisdictionLevel === "FEDERAL" && incentiveType === "GRANT") {
    return { label: "Extensive", color: "text-amber-700 bg-amber-50", description: "Federal grant — detailed application and compliance requirements" };
  }
  return { label: "Moderate", color: "text-sky-700 bg-sky-50", description: "Standard state or agency application process" };
}

// ── Eligibility Checker ────────────────────────────────────────────────────────
type Answer = "yes" | "no" | "unsure" | null;

function EligibilityChecker({ incentive, onClose }: { incentive: Incentive; onClose: () => void }) {
  const questions = incentive.keyRequirements.slice(0, 5);
  const [answers, setAnswers] = useState<Answer[]>(questions.map(() => null));

  const answeredCount = answers.filter(a => a !== null).length;
  const yesCount = answers.filter(a => a === "yes").length;
  const noCount = answers.filter(a => a === "no").length;
  const allAnswered = answeredCount === questions.length;

  const score = allAnswered ? Math.round((yesCount / questions.length) * 100) : null;
  const confidence: "HIGH" | "MEDIUM" | "LOW" | null =
    score === null ? null :
    noCount >= 2 ? "LOW" :
    score >= 75 ? "HIGH" :
    score >= 40 ? "MEDIUM" : "LOW";

  const confidenceStyle = {
    HIGH: { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Strong match" },
    MEDIUM: { bar: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Possible match — verify a few things" },
    LOW: { bar: "bg-red-400", text: "text-red-700", bg: "bg-red-50 border-red-200", label: "May not qualify — review requirements carefully" },
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold text-slate-700 flex items-center gap-1.5">
          <ClipboardCheck size={13} className="text-forest-600" aria-hidden />
          Eligibility Check
        </p>
        <button
          onClick={onClose}
          aria-label="Close eligibility checker"
          className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors">
          <X size={13} aria-hidden />
        </button>
      </div>

      <p className="text-[11px] text-slate-500 mb-3">
        Answer each question to estimate your fit. Can you meet this requirement?
      </p>

      <div className="space-y-3">
        {questions.map((req, i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 px-3 py-2.5">
            <p className="text-[12px] text-slate-700 leading-snug mb-1.5">{req}</p>
            <p className="text-[10px] text-slate-400 mb-2">Do you meet this requirement?</p>
            <div className="flex gap-2" role="group" aria-label={`Requirement ${i + 1} of ${questions.length}`}>
              {(["yes", "no", "unsure"] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    const updated = [...answers];
                    updated[i] = answers[i] === val ? null : val;
                    setAnswers(updated);
                  }}
                  aria-pressed={answers[i] === val}
                  className={cn(
                    "flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all",
                    answers[i] === val
                      ? val === "yes" ? "bg-emerald-600 text-white border-emerald-600"
                        : val === "no" ? "bg-red-500 text-white border-red-500"
                        : "bg-slate-400 text-white border-slate-400"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                  )}>
                  {val === "yes" ? <CheckCircle size={10} aria-hidden /> : val === "no" ? <XCircle size={10} aria-hidden /> : <HelpCircle size={10} aria-hidden />}
                  {val === "yes" ? "Yes" : val === "no" ? "No" : "Not sure"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      {!allAnswered && answeredCount > 0 && (
        <p className="text-[11px] text-slate-400 mt-3 text-center">
          {answeredCount} of {questions.length} answered
        </p>
      )}

      {/* Result */}
      {confidence && (
        <div className={cn("mt-4 rounded-lg border px-4 py-3", confidenceStyle[confidence].bg)}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[12px] font-bold", confidenceStyle[confidence].text)}>
              {confidence} confidence — {confidenceStyle[confidence].label}
            </span>
            <span className={cn("text-[12px] font-bold tabular-nums", confidenceStyle[confidence].text)}>
              {score}%
            </span>
          </div>
          {/* Bar */}
          <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mb-3">
            <div
              className={cn("h-full rounded-full transition-all duration-500", confidenceStyle[confidence].bar)}
              style={{ width: `${score}%` }}
              role="progressbar"
              aria-valuenow={score ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Eligibility score: ${score}%`}
            />
          </div>
          {confidence === "HIGH" && (
            <p className="text-[11px] text-emerald-700">
              You appear to meet the key requirements. Review the full program details and apply directly through the agency.
            </p>
          )}
          {confidence === "MEDIUM" && (
            <p className="text-[11px] text-amber-700">
              You likely meet most requirements. Check the ones you marked "No" or "Not sure" — those are your eligibility risks.
            </p>
          )}
          {confidence === "LOW" && (
            <p className="text-[11px] text-red-700">
              You may not meet enough requirements. Read the full program details carefully or use the AI advisor to find better-fit alternatives.
            </p>
          )}
          <a
            href={`/incentives/${incentive.slug}`}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700 hover:text-forest-800 transition-colors">
            View full requirements <ArrowRight size={10} aria-hidden />
          </a>
          <p className="mt-2 text-[9px] text-slate-400 leading-snug italic">
            This is an informal self-assessment only — not a guarantee of eligibility. Final determinations are made by the administering agency. Always verify requirements directly with the program before applying.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────
interface IncentiveCardProps {
  incentive: Incentive;
  className?: string;
  searchQuery?: string;
}

export function IncentiveCard({ incentive, className, searchQuery }: IncentiveCardProps) {
  const { isBookmarked, toggle } = useBookmarks();
  const bookmarked = isBookmarked(incentive.slug);
  const isNew = isNewProgram(incentive.createdAt);
  const isClosingSoon =
    incentive.deadline !== null &&
    new Date(incentive.deadline).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
  const [showEligibility, setShowEligibility] = useState(false);

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
              <span className="badge bg-emerald-50 text-emerald-700 gap-0.5 text-[10px]" aria-label="Verified program">
                <CheckCircle2 size={10} aria-hidden />
                Verified
              </span>
            )}
          </div>
          <a
            href={incentive.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 p-1.5 rounded-md text-slate-300 hover:text-forest-700 hover:bg-forest-50 transition-colors focus:outline-none focus:ring-2 focus:ring-forest-500"
            aria-label={`View official source for ${incentive.title} (opens in new tab)`}
          >
            <ExternalLink size={14} aria-hidden />
          </a>
        </div>

        {/* Title */}
        <Link href={`/incentives/${incentive.slug}`} className="block mb-1.5">
          <h2 className="font-semibold text-slate-900 text-[15px] leading-snug group-hover:text-forest-700 transition-colors line-clamp-2">
            <Highlight text={incentive.title} query={searchQuery} />
          </h2>
        </Link>

        {/* Agency · Location */}
        <p className="text-xs text-slate-400 flex items-center gap-1 mb-3 truncate">
          <MapPin size={11} className="flex-shrink-0" aria-hidden />
          <span>
            {incentive.agencyAcronym && incentive.agencyAcronym !== incentive.managingAgency
              ? incentive.agencyAcronym
              : incentive.managingAgency}
            {" · "}
            {incentive.jurisdictionName}
          </span>
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

      {/* Eligibility checker panel */}
      {showEligibility && (
        <EligibilityChecker
          incentive={incentive}
          onClose={() => setShowEligibility(false)}
        />
      )}

      {/* Footer */}
      <div className="mt-auto border-t border-slate-100">
        {/* Meta row: funding + deadline + bookmark */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {incentive.fundingAmount && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 whitespace-nowrap" title="Maximum per applicant">
                Up to {formatCurrency(incentive.fundingAmount)}
                <span className="font-normal text-emerald-500 text-[10px]">/ applicant</span>
              </span>
            )}
            {incentive.deadline && (
              <span className={cn(
                "flex items-center gap-1 text-xs whitespace-nowrap",
                isClosingSoon ? "text-amber-600 font-semibold" : "text-slate-400"
              )}>
                <Calendar size={11} aria-hidden />
                {formatDeadline(incentive.deadline)}
              </span>
            )}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(incentive.slug); }}
            className={cn(
              "p-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-forest-500 flex-shrink-0",
              bookmarked
                ? "text-forest-700 bg-forest-50"
                : "text-slate-300 hover:text-forest-700 hover:bg-forest-50"
            )}
            aria-label={bookmarked ? `Remove ${incentive.title} from saved` : `Save ${incentive.title}`}
            aria-pressed={bookmarked}
          >
            <Bookmark size={13} className={bookmarked ? "fill-current" : ""} aria-hidden />
          </button>
        </div>

        {/* Action row: Do I qualify + Details */}
        <div className="px-5 pb-3 flex items-center gap-2">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowEligibility((v) => !v); }}
            aria-expanded={showEligibility}
            aria-label={showEligibility ? "Close eligibility checker" : "Check if you qualify for this program"}
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all",
              showEligibility
                ? "bg-forest-700 text-white border-forest-700"
                : "bg-white text-forest-700 border-forest-300 hover:bg-forest-50 hover:border-forest-500"
            )}
          >
            <ClipboardCheck size={11} aria-hidden />
            {showEligibility ? "Hide checker" : "Do I qualify?"}
          </button>
          <Link
            href={`/incentives/${incentive.slug}`}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-forest-700 font-medium transition-colors ml-auto"
            aria-label={`View full details for ${incentive.title}`}
          >
            Details <ArrowRight size={11} aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

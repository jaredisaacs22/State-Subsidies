"use client";

import { useState } from "react";
import { ClipboardCheck, X, CheckCircle, XCircle, HelpCircle, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Incentive } from "@/lib/types";
import {
  scoreEligibility,
  requirementsFromKeyRequirements,
  type EligibilityAnswer,
  type EligibilityTier,
} from "@/lib/eligibility";

// SS-006: rules-engine verdicts, never a percentage. A percentage on a
// hard-requirement miss was the exact defect this component shipped with
// (LESSONS.md #14) — do not reintroduce score math here.
const TIER_STYLE: Record<
  EligibilityTier,
  { text: string; bg: string; heading: string }
> = {
  HIGH: {
    text: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    heading: "Likely match",
  },
  MEDIUM: {
    text: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    heading: "Likely match — pending confirmation",
  },
  LOW: {
    text: "text-red-700",
    bg: "bg-red-50 border-red-200",
    heading: "You don't currently qualify",
  },
};

interface EligibilityCheckerProps {
  incentive: Incentive;
  /**
   * "compact" — original inline card variant with slate-50 background, dense type.
   * "expanded" — detail-page variant: more breathing room, larger type, white card.
   */
  variant?: "compact" | "expanded";
  /** Show the close (X) button. Default: true on compact, false on expanded. */
  onClose?: () => void;
  /** Hide the "View full requirements" link (already on the detail page). Default: true on compact. */
  showDetailsLink?: boolean;
}

export function EligibilityChecker({
  incentive,
  variant = "compact",
  onClose,
  showDetailsLink,
}: EligibilityCheckerProps) {
  // Use up to 5 questions on compact, up to 8 on the detail page where there's more room.
  const limit = variant === "expanded" ? 8 : 5;
  // SS-006 §9 step 2 conservative default: every requirement is MUST until
  // per-requirement SME tiering lands (see lib/eligibility.ts).
  const requirements = requirementsFromKeyRequirements(incentive.keyRequirements, limit);
  const [answers, setAnswers] = useState<Record<string, EligibilityAnswer | null>>({});

  const answeredCount = requirements.filter((r) => answers[r.id] != null).length;
  const verdict = scoreEligibility(answers, requirements);
  // A disqualifying MUST-No surfaces immediately; otherwise the verdict
  // appears once every question is answered.
  const showVerdict = verdict.tier !== null;

  const showLink = showDetailsLink ?? variant === "compact";
  const isExpanded = variant === "expanded";

  const resetAll = () => setAnswers({});

  return (
    <div
      className={cn(
        isExpanded
          ? "card p-6 sm:p-7"
          : "border-t border-slate-100 bg-slate-50 px-5 py-4"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p
            className={cn(
              "font-semibold text-slate-900 flex items-center gap-2",
              isExpanded ? "text-base" : "text-[12px]"
            )}
          >
            <Sparkles size={isExpanded ? 16 : 13} className="text-forest-600" aria-hidden />
            Do I qualify?
          </p>
          {isExpanded && (
            <p className="text-[13px] text-slate-500 mt-1 leading-snug">
              Answer the questions below for a rules-based self-assessment of your fit for this
              program. This is informational — final determinations are made by the administering
              agency.
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isExpanded && answeredCount > 0 && (
            <button
              onClick={resetAll}
              className="text-[11px] text-slate-400 hover:text-slate-700 underline underline-offset-2 transition-colors"
            >
              Reset
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close eligibility checker"
              className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={isExpanded ? 16 : 13} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {!isExpanded && (
        <p className="text-[11px] text-slate-500 mb-3">
          Answer each question: can you meet this requirement?
        </p>
      )}

      {/* Progress bar (expanded only — completion progress, never a score) */}
      {isExpanded && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
            <span>
              {answeredCount} of {requirements.length} answered
            </span>
            {answeredCount === requirements.length && (
              <span className="text-forest-700 font-semibold">Complete</span>
            )}
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-forest-600 transition-all duration-300 rounded-full"
              style={{ width: `${(answeredCount / Math.max(requirements.length, 1)) * 100}%` }}
              role="progressbar"
              aria-valuenow={answeredCount}
              aria-valuemin={0}
              aria-valuemax={requirements.length}
              aria-label={`${answeredCount} of ${requirements.length} questions answered`}
            />
          </div>
        </div>
      )}

      {/* Questions */}
      <div className={cn("space-y-3", isExpanded && "space-y-3.5")}>
        {requirements.map((req, i) => (
          <div
            key={req.id}
            className={cn(
              "rounded-lg border",
              isExpanded
                ? "border-slate-200 bg-white px-4 py-3"
                : "border-slate-200 bg-white px-3 py-2.5"
            )}
          >
            <p
              className={cn(
                "text-slate-800 leading-snug mb-2",
                isExpanded ? "text-[14px]" : "text-[12px]"
              )}
            >
              <span className="text-slate-400 mr-1.5">{i + 1}.</span>
              {req.text}
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={`Requirement ${i + 1} of ${requirements.length}`}
            >
              {(["YES", "NO", "UNSURE"] as const).map((val) => (
                <button
                  key={val}
                  onClick={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [req.id]: prev[req.id] === val ? null : val,
                    }))
                  }
                  aria-pressed={answers[req.id] === val}
                  className={cn(
                    "flex items-center gap-1.5 font-medium border rounded-md transition-all",
                    isExpanded ? "text-[12px] px-3 py-1.5" : "text-[11px] px-2.5 py-1",
                    answers[req.id] === val
                      ? val === "YES"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : val === "NO"
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-slate-400 text-white border-slate-400"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                  )}
                >
                  {val === "YES" ? <CheckCircle size={isExpanded ? 12 : 10} aria-hidden /> :
                   val === "NO" ? <XCircle size={isExpanded ? 12 : 10} aria-hidden /> :
                                  <HelpCircle size={isExpanded ? 12 : 10} aria-hidden />}
                  {val === "YES" ? "Yes" : val === "NO" ? "No" : "Not sure"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Progress (compact only — expanded shows it at the top) */}
      {!isExpanded && !showVerdict && answeredCount > 0 && (
        <p className="text-[11px] text-slate-400 mt-3 text-center">
          {answeredCount} of {requirements.length} answered
        </p>
      )}

      {/* Verdict */}
      {showVerdict && verdict.tier && (
        <div
          className={cn(
            "rounded-lg border",
            isExpanded ? "mt-5 px-5 py-4" : "mt-4 px-4 py-3",
            TIER_STYLE[verdict.tier].bg
          )}
        >
          {/* Disclaimer ABOVE the verdict (SS-006 §4 / SS-008), at a readable size. */}
          <p className="text-sm text-slate-500 leading-snug mb-2">
            Informal self-assessment — not a guarantee of eligibility, and not legal or tax
            advice. The administering agency makes the final determination.{" "}
            <a
              href="/methodology#how-we-verify"
              className="underline underline-offset-2 hover:text-slate-700"
            >
              Methodology
            </a>
          </p>

          <p
            className={cn(
              "font-bold",
              isExpanded ? "text-[14px]" : "text-[13px]",
              TIER_STYLE[verdict.tier].text
            )}
          >
            {TIER_STYLE[verdict.tier].heading}
          </p>

          {/* Per-requirement reasons — every verdict explains itself. */}
          <ul
            className={cn(
              "mt-2 space-y-1",
              isExpanded ? "text-[12.5px]" : "text-[11px]",
              TIER_STYLE[verdict.tier].text
            )}
          >
            {verdict.reasons.map((reason) => (
              <li key={reason} className="flex gap-1.5 leading-snug">
                <span aria-hidden>•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>

          {verdict.tier === "LOW" && (
            <p className={cn(isExpanded ? "text-[12.5px]" : "text-[11px]", "mt-2 text-red-700 leading-snug")}>
              Programs change; recheck when your circumstances do. Some requirements (like income
              limits or geography) can&apos;t be worked around, but others may be addressable.
            </p>
          )}
          {verdict.tier === "MEDIUM" && (
            <p className={cn(isExpanded ? "text-[12.5px]" : "text-[11px]", "mt-2 text-amber-700 leading-snug")}>
              Verify the unconfirmed items directly with the agency before investing time in an
              application — they decide, not this checker.
            </p>
          )}
          {verdict.tier === "HIGH" && (
            <p className={cn(isExpanded ? "text-[12.5px]" : "text-[11px]", "mt-2 text-emerald-700 leading-snug")}>
              Based on your answers you meet every listed requirement. Review the full program
              details and apply directly through the agency using the &ldquo;Go to official
              source&rdquo; button.
            </p>
          )}

          {showLink && (
            <a
              href={`/incentives/${incentive.slug}`}
              className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-forest-700 hover:text-forest-800 transition-colors"
            >
              View full requirements <ArrowRight size={11} aria-hidden />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Default-export the icon used by callers that want to render their own
 * "Check eligibility" CTA outside the checker (e.g., a button in the sidebar).
 */
export { ClipboardCheck as EligibilityIcon };

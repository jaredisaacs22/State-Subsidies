"use client";

import { useState } from "react";
import { ClipboardCheck, X, CheckCircle, XCircle, HelpCircle, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Incentive } from "@/lib/types";

type Answer = "yes" | "no" | "unsure" | null;

const CONFIDENCE_STYLE = {
  HIGH:   { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Strong match" },
  MEDIUM: { bar: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50 border-amber-200",     label: "Possible match — verify a few things" },
  LOW:    { bar: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50 border-red-200",         label: "May not qualify — review requirements carefully" },
} as const;

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
  const questions = incentive.keyRequirements.slice(0, limit);
  const [answers, setAnswers] = useState<Answer[]>(questions.map(() => null));

  const answeredCount = answers.filter((a) => a !== null).length;
  const yesCount = answers.filter((a) => a === "yes").length;
  const noCount = answers.filter((a) => a === "no").length;
  const allAnswered = answeredCount === questions.length;
  const score = allAnswered ? Math.round((yesCount / questions.length) * 100) : null;
  const confidence: "HIGH" | "MEDIUM" | "LOW" | null =
    score === null ? null :
    noCount >= 2 ? "LOW" :
    score >= 75 ? "HIGH" :
    score >= 40 ? "MEDIUM" : "LOW";

  const showLink = showDetailsLink ?? variant === "compact";
  const isExpanded = variant === "expanded";

  // Reset all answers — only useful on the expanded variant
  const resetAll = () => setAnswers(questions.map(() => null));

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
              Answer the questions below to get an instant self-assessment of your fit for this program.
              This is informational — final determinations are made by the administering agency.
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
          Answer each question to estimate your fit. Can you meet this requirement?
        </p>
      )}

      {/* Progress bar (expanded only — gives a sense of completion) */}
      {isExpanded && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
            <span>
              {answeredCount} of {questions.length} answered
            </span>
            {allAnswered && (
              <span className="text-forest-700 font-semibold">Complete</span>
            )}
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-forest-600 transition-all duration-300 rounded-full"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              role="progressbar"
              aria-valuenow={answeredCount}
              aria-valuemin={0}
              aria-valuemax={questions.length}
            />
          </div>
        </div>
      )}

      {/* Questions */}
      <div className={cn("space-y-3", isExpanded && "space-y-3.5")}>
        {questions.map((req, i) => (
          <div
            key={i}
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
              {req}
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={`Requirement ${i + 1} of ${questions.length}`}
            >
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
                    "flex items-center gap-1.5 font-medium border rounded-md transition-all",
                    isExpanded ? "text-[12px] px-3 py-1.5" : "text-[11px] px-2.5 py-1",
                    answers[i] === val
                      ? val === "yes"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : val === "no"
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-slate-400 text-white border-slate-400"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                  )}
                >
                  {val === "yes" ? <CheckCircle size={isExpanded ? 12 : 10} aria-hidden /> :
                   val === "no" ? <XCircle size={isExpanded ? 12 : 10} aria-hidden /> :
                                  <HelpCircle size={isExpanded ? 12 : 10} aria-hidden />}
                  {val === "yes" ? "Yes" : val === "no" ? "No" : "Not sure"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Progress (compact only — expanded shows it at the top) */}
      {!isExpanded && !allAnswered && answeredCount > 0 && (
        <p className="text-[11px] text-slate-400 mt-3 text-center">
          {answeredCount} of {questions.length} answered
        </p>
      )}

      {/* Result */}
      {confidence && (
        <div
          className={cn(
            "rounded-lg border",
            isExpanded ? "mt-5 px-5 py-4" : "mt-4 px-4 py-3",
            CONFIDENCE_STYLE[confidence].bg
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={cn(
                "font-bold",
                isExpanded ? "text-[13px]" : "text-[12px]",
                CONFIDENCE_STYLE[confidence].text
              )}
            >
              {confidence} confidence — {CONFIDENCE_STYLE[confidence].label}
            </span>
            <span
              className={cn(
                "font-bold tabular-nums",
                isExpanded ? "text-[14px]" : "text-[12px]",
                CONFIDENCE_STYLE[confidence].text
              )}
            >
              {score}%
            </span>
          </div>
          <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mb-3">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                CONFIDENCE_STYLE[confidence].bar
              )}
              style={{ width: `${score}%` }}
              role="progressbar"
              aria-valuenow={score ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Eligibility score: ${score}%`}
            />
          </div>
          {confidence === "HIGH" && (
            <p className={cn(isExpanded ? "text-[12.5px]" : "text-[11px]", "text-emerald-700 leading-snug")}>
              You appear to meet the key requirements. Review the full program details and apply directly through the agency using the &ldquo;Go to official source&rdquo; button.
            </p>
          )}
          {confidence === "MEDIUM" && (
            <p className={cn(isExpanded ? "text-[12.5px]" : "text-[11px]", "text-amber-700 leading-snug")}>
              You likely meet most requirements. The ones you marked &ldquo;No&rdquo; or &ldquo;Not sure&rdquo; are your eligibility risks — verify those directly with the agency before applying.
            </p>
          )}
          {confidence === "LOW" && (
            <p className={cn(isExpanded ? "text-[12.5px]" : "text-[11px]", "text-red-700 leading-snug")}>
              You may not meet enough requirements as-is. Review the full program details — some requirements (like income limits or geography) can&apos;t be worked around, but others may be addressable.
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
          <p
            className={cn(
              "leading-snug italic",
              isExpanded ? "mt-3 text-[10.5px]" : "mt-2 text-[9px]",
              "text-slate-400"
            )}
          >
            This is an informal self-assessment only — not a guarantee of eligibility. Final determinations are made by the administering agency. Always verify requirements directly with the program before applying.
          </p>
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

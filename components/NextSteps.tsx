import { ExternalLink, ListChecks, Sparkles } from "lucide-react";
import { sourceRedirectUrl } from "@/lib/utils";
import type { Incentive } from "@/lib/types";

/**
 * Concrete actionable next steps a user can take RIGHT NOW. Replaces vague
 * "apply or learn more" prose with three numbered actions calibrated to the
 * incentive type (e.g., rebates trigger at purchase, tax credits at filing,
 * grants require pre-approval).
 */
export function NextSteps({ incentive }: { incentive: Incentive }) {
  const steps = getStepsFor(incentive);
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
        <ListChecks size={15} className="text-forest-600" aria-hidden />
        How to apply
      </h2>
      <p className="text-[11px] text-slate-500 mb-4 leading-snug">
        Quick path to claim this incentive.
      </p>
      <ol className="space-y-3 mb-5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-forest-50 text-forest-700 text-[12px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div className="text-[13px] leading-snug">
              <p className="text-slate-800 font-medium">{s.title}</p>
              <p className="text-slate-500 text-[12px] mt-0.5">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <a
        href={sourceRedirectUrl(incentive)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary w-full justify-center gap-2"
      >
        Go to official source
        <ExternalLink size={14} aria-hidden />
      </a>
      <p className="text-[10px] text-slate-400 mt-2 mb-3 text-center leading-snug">
        Opens {(() => { try { return new URL(incentive.sourceUrl).hostname.replace("www.", ""); } catch { return incentive.sourceUrl; } })()} in a new tab
      </p>
      {/* Secondary CTA — jumps to the interactive Eligibility Checker on the same page */}
      <a
        href="#eligibility-checker"
        className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-forest-700 hover:text-forest-800 border border-forest-200 hover:border-forest-400 hover:bg-forest-50 rounded-lg px-3 py-2 transition-colors w-full"
      >
        <Sparkles size={12} aria-hidden />
        Am I eligible?
      </a>
    </div>
  );
}

type Step = { title: string; detail: string };

function getStepsFor(inc: Incentive): Step[] {
  switch (inc.incentiveType) {
    case "POINT_OF_SALE_REBATE":
      return [
        { title: "Verify eligibility", detail: "Confirm you meet the requirements listed on this page." },
        { title: "Buy from an approved vendor", detail: "Check the program's approved equipment or contractor list before purchasing." },
        { title: "Submit rebate within window", detail: "Most rebates require submission 30–90 days after purchase with receipts." },
      ];
    case "TAX_CREDIT":
      return [
        { title: "Verify eligibility", detail: "Confirm the equipment, income limits, and any caps apply to your situation." },
        { title: "Keep documentation", detail: "Save invoices, manufacturer certifications, and proof of installation." },
        { title: "Claim at tax filing", detail: "Use the appropriate IRS or state form when filing your annual return." },
      ];
    case "GRANT":
      return [
        { title: "Read the full RFP", detail: "Federal grants have detailed requirements; review the latest Notice of Funding Opportunity (NOFO)." },
        { title: "Prepare your application", detail: "Most grants require an organizational profile, project narrative, budget, and letters of support." },
        { title: "Submit before deadline", detail: inc.deadline ? "Submit through the agency portal well before the deadline shown above." : "Apply during the next open cycle — check the agency page for dates." },
      ];
    case "LOAN":
      return [
        { title: "Confirm eligibility", detail: "Loan programs typically require credit review, project feasibility, and matching equity." },
        { title: "Prepare project documentation", detail: "Most loans require a business plan, financials, and engineering or contractor estimates." },
        { title: "Apply through the agency", detail: "Loan processing typically takes 30–90 days from a complete application." },
      ];
    case "VOUCHER":
      return [
        { title: "Apply for a voucher", detail: "Pre-qualify through the program's online portal — you'll receive a voucher to use at point of sale." },
        { title: "Redeem at participating vendor", detail: "Use the voucher with an approved dealer or contractor within the redemption window." },
        { title: "Complete program reporting", detail: "Some voucher programs require follow-up reporting of installation or use." },
      ];
    case "SUBSIDY":
    default:
      return [
        { title: "Confirm eligibility", detail: "Review the eligibility criteria and required documentation on this page." },
        { title: "Visit the official source", detail: "The agency page has current application forms, deadlines, and contact info." },
        { title: "Submit your application", detail: "Apply directly to the agency. Most programs respond within 30–90 days." },
      ];
  }
}

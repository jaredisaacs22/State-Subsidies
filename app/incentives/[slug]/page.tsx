import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, ArrowLeft, Building2, Calendar, DollarSign, CheckCircle2, Globe } from "lucide-react";
import { IncentiveTypeBadge, JurisdictionBadge, StatusBadge } from "@/components/Badge";
import { formatCurrency, formatDeadline, parseIncentive } from "@/lib/utils";
import { prisma } from "@/lib/db";
import type { Incentive } from "@/lib/types";
import type { Metadata } from "next";

// Always server-render at request time — never try to pre-render at build
// (Prisma/DB is not available during Vercel build)
export const dynamic = "force-dynamic";

async function getIncentive(slug: string): Promise<Incentive | null> {
  try {
    const raw = await prisma.incentive.findUnique({ where: { slug } });
    if (!raw) return null;
    return parseIncentive(raw as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const incentive = await getIncentive(params.slug);
  if (!incentive) return { title: "Incentive Not Found" };
  return {
    title: `${incentive.title} | SubsidyFinder`,
    description: incentive.shortSummary,
  };
}

export default async function IncentiveDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const incentive = await getIncentive(params.slug);
  if (!incentive) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to all incentives
      </Link>

      {/* Header Card */}
      <div className="card p-6 sm:p-8 mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          <IncentiveTypeBadge type={incentive.incentiveType} />
          <JurisdictionBadge level={incentive.jurisdictionLevel} name={incentive.jurisdictionName} />
          <StatusBadge status={incentive.status} />
          {incentive.isVerified && (
            <span className="badge bg-slate-100 text-slate-600 gap-1">
              <CheckCircle2 size={11} />
              Verified
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-3">
          {incentive.title}
        </h1>

        <div className="flex items-center gap-2 text-slate-500 mb-5">
          <Building2 size={15} />
          <span className="text-sm">
            {incentive.managingAgency}
            {incentive.agencyAcronym && ` (${incentive.agencyAcronym})`}
          </span>
          {incentive.programCode && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
              {incentive.programCode}
            </span>
          )}
        </div>

        {/* Key Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
          <Stat
            icon={<DollarSign size={16} className="text-emerald-600" />}
            label="Max Funding"
            value={formatCurrency(incentive.fundingAmount)}
          />
          <Stat
            icon={<Calendar size={16} className="text-amber-600" />}
            label="Deadline"
            value={formatDeadline(incentive.deadline)}
          />
          <Stat
            icon={<Globe size={16} className="text-brand-600" />}
            label="Jurisdiction"
            value={incentive.jurisdictionName}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              About This Program
            </h2>
            <p className="text-slate-700 leading-relaxed">{incentive.shortSummary}</p>
          </div>

          {/* Key Requirements */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Key Requirements & Eligibility
            </h2>
            <ul className="space-y-3">
              {incentive.keyRequirements.map((req, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center flex-shrink-0 font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-slate-700 text-sm leading-relaxed">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Apply CTA */}
          <div className="card p-5 bg-brand-50 border-brand-100">
            <p className="text-sm font-semibold text-brand-900 mb-3">Apply or Learn More</p>
            <p className="text-xs text-brand-700 mb-4 leading-relaxed">
              Visit the official government page to review full eligibility requirements and apply.
            </p>
            <a
              href={incentive.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full justify-center gap-2"
            >
              Official Source
              <ExternalLink size={14} />
            </a>
          </div>

          {/* Industries */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Applicable Industries
            </p>
            <div className="flex flex-wrap gap-1.5">
              {incentive.industryCategories.map((cat) => (
                <span key={cat} className="badge bg-slate-100 text-slate-700">
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {/* Dates */}
          {incentive.applicationOpenDate && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Application Window
              </p>
              <div className="text-sm text-slate-700 space-y-1">
                <p>
                  <span className="text-slate-500">Opens:</span>{" "}
                  {new Date(incentive.applicationOpenDate).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                {incentive.deadline && (
                  <p>
                    <span className="text-slate-500">Closes:</span>{" "}
                    {new Date(incentive.deadline).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
          )}

          {incentive.scrapedAt && (
            <p className="text-xs text-slate-400 text-center">
              Data last updated{" "}
              {new Date(incentive.scrapedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

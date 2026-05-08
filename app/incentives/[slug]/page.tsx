import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, ArrowLeft, Building2, Calendar, DollarSign, CheckCircle2, Globe } from "lucide-react";
import { IncentiveTypeBadge, JurisdictionBadge, StatusBadge } from "@/components/Badge";
import { IncentiveCard } from "@/components/IncentiveCard";
import { BookmarkButton } from "@/components/BookmarkButton";
import { ShareButtons } from "@/components/ShareButtons";
import { ProvenancePanel } from "@/components/ProvenancePanel";
import { formatCurrency, formatDeadline, parseIncentive, sourceRedirectUrl } from "@/lib/utils";
import { INDUSTRY_COLORS } from "@/lib/types";
import { prisma } from "@/lib/db";
import type { Incentive } from "@/lib/types";
import type { Metadata } from "next";

// Always server-render at request time — never try to pre-render at build
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

async function getRelated(incentive: Incentive): Promise<Incentive[]> {
  try {
    // Find programs in same state OR same first industry category, excluding current
    const firstIndustry = incentive.industryCategories[0];
    const rows = await prisma.incentive.findMany({
      where: {
        slug: { not: incentive.slug },
        status: "ACTIVE",
        OR: [
          { jurisdictionName: incentive.jurisdictionName },
          ...(firstIndustry ? [{ industryCategories: { has: firstIndustry } }] : []),
        ],
      },
      take: 3,
      orderBy: [{ isVerified: "desc" }, { fundingAmount: "desc" }],
    });
    return rows.map((r) => parseIncentive(r as unknown as Record<string, unknown>));
  } catch {
    return [];
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
    title: `${incentive.title} | StateSubsidies`,
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

  const related = await getRelated(incentive);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "GovernmentService",
    "name": incentive.title,
    "description": incentive.shortSummary,
    "provider": {
      "@type": "GovernmentOrganization",
      "name": incentive.managingAgency,
    },
    "serviceType": incentive.incentiveType.replace(/_/g, " ").toLowerCase(),
    "areaServed": incentive.jurisdictionName,
    "url": incentive.sourceUrl,
    ...(incentive.fundingAmount ? { "offers": { "@type": "Offer", "price": incentive.fundingAmount, "priceCurrency": "USD" } } : {}),
    ...(incentive.deadline ? { "validThrough": incentive.deadline } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-forest-700 mb-6 transition-colors"
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
            <span className="badge bg-emerald-50 text-emerald-700 gap-1">
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
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign size={16} className="text-emerald-600" />
              <span className="text-xs text-slate-500 font-medium">Max per Applicant</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{formatCurrency(incentive.fundingAmount)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Maximum a single org can receive</p>
          </div>
          <Stat
            icon={<Calendar size={16} className="text-amber-600" />}
            label="Deadline"
            value={formatDeadline(incentive.deadline)}
          />
          <Stat
            icon={<Globe size={16} className="text-forest-700" />}
            label="Jurisdiction"
            value={incentive.jurisdictionName}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary — prefer detailedSummary when present, otherwise fall back to short. */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              About This Program
            </h2>
            <p className="text-slate-700 leading-relaxed">{incentive.shortSummary}</p>
            {incentive.detailedSummary && incentive.detailedSummary !== incentive.shortSummary && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Program Details
                </h3>
                <div className="text-slate-700 leading-relaxed text-[15px] whitespace-pre-line">
                  {incentive.detailedSummary}
                </div>
              </div>
            )}
          </div>

          {/* Key Requirements */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Key Requirements & Eligibility
            </h2>
            <ul className="space-y-3">
              {incentive.keyRequirements.map((req, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full bg-forest-50 text-forest-700 text-xs flex items-center justify-center flex-shrink-0 font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-slate-700 text-sm leading-relaxed">{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Related Programs */}
          {related.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Related Programs
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                {related.map((r) => (
                  <IncentiveCard key={r.slug} incentive={r} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Apply CTA */}
          <div className="card p-5 bg-forest-50 border-forest-100">
            <p className="text-sm font-semibold text-forest-900 mb-1">Apply or Learn More</p>
            <p className="text-xs text-forest-700/70 mb-3 leading-relaxed">
              Visit the official agency page to view requirements and apply.
            </p>
            <a
              href={sourceRedirectUrl(incentive)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full justify-center gap-2 mb-3"
            >
              Official Source
              <ExternalLink size={14} />
            </a>
            <BookmarkButton slug={incentive.slug} />
            <p className="text-[10px] text-slate-400 mt-2 text-center leading-snug">
              via {(() => { try { return new URL(incentive.sourceUrl).hostname.replace("www.", ""); } catch { return incentive.sourceUrl; } })()}
            </p>
          </div>

          {/* Share */}
          <div className="card p-4">
            <ShareButtons title={incentive.title} />
          </div>

          {/* Industries */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Applicable Industries
            </p>
            <div className="flex flex-wrap gap-1.5">
              {incentive.industryCategories.map((cat) => (
                <span key={cat} className={`badge ${INDUSTRY_COLORS[cat] ?? "bg-slate-100 text-slate-700"}`}>
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

          {/* SS-003: provenance panel */}
          <ProvenancePanel incentive={incentive} />
        </div>
      </div>
      {/* Mobile sticky apply bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <a
          href={sourceRedirectUrl(incentive)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex-1 justify-center gap-2 py-2.5"
        >
          Official Source
          <ExternalLink size={14} />
        </a>
        <BookmarkButton slug={incentive.slug} />
      </div>
      {/* Spacer so content isn't hidden behind sticky bar on mobile */}
      <div className="h-20 lg:hidden" />
    </div>
    </>
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

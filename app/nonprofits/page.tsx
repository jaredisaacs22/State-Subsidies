import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Landmark, Building2, ArrowRight, ShieldCheck, Palette, Home, Leaf, HandHeart, GraduationCap } from "lucide-react";

export const metadata: Metadata = {
  title: "Grants & Funding for Nonprofits — StateSubsidies",
  description:
    "Free directory of government grants, foundation funding, and corporate giving programs for 501(c)(3) nonprofits and NGOs. " +
    "Federal, state, and private funding opportunities in one place.",
  keywords: ["nonprofit grants", "501c3 grants", "foundation grants", "NGO funding", "corporate giving", "nonprofit funding opportunities"],
};

const FUNDING_SOURCES = [
  {
    icon: Landmark,
    title: "Government grants",
    description:
      "Federal agencies like FEMA, HUD, NEA, and USDA — plus state arts councils and health departments — fund nonprofits directly. Many programs you'd assume are business-only accept 501(c)(3) applicants.",
    href: "/?applicantType=NONPROFIT&funderType=GOVERNMENT#browse",
    cta: "Browse government programs",
  },
  {
    icon: Heart,
    title: "Foundation funding",
    description:
      "National foundations like MacArthur, Kellogg, and Kresge, and place-based funders like The California Endowment and The New York Community Trust, make grants from $10K to $100M.",
    href: "/?applicantType=NONPROFIT&funderType=FOUNDATION#browse",
    cta: "Browse foundation grants",
  },
  {
    icon: Building2,
    title: "Corporate giving",
    description:
      "Walmart, Bank of America, Google, Patagonia, and Home Depot run structured giving programs — from $250 local grants to $10K/month in donated advertising.",
    href: "/?applicantType=NONPROFIT&funderType=CORPORATE#browse",
    cta: "Browse corporate programs",
  },
];

const CAUSE_AREAS = [
  { icon: HandHeart, label: "Human Services", category: "Human Services" },
  { icon: Palette, label: "Arts & Culture", category: "Arts & Culture" },
  { icon: Home, label: "Housing & Homelessness", category: "Housing & Homelessness" },
  { icon: Leaf, label: "Environment & Conservation", category: "Environment & Conservation" },
  { icon: GraduationCap, label: "Education", category: "Education" },
  { icon: ShieldCheck, label: "Community Development", category: "Community Development" },
];

export default function NonprofitsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-section relative text-white pt-16 pb-14 overflow-hidden">
        <div className="hero-grid absolute inset-0 pointer-events-none" />
        <div className="hero-glow absolute inset-0 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] leading-[1.06] mb-4 text-balance">
            Funding for nonprofits<br className="hidden sm:block" /> &amp; NGOs
          </h1>
          <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Government grants, foundation funding, and corporate giving programs for 501(c)(3)
            organizations — searchable in one free directory.
          </p>
          <Link
            href="/?applicantType=NONPROFIT#browse"
            className="btn-primary inline-flex text-base px-6 py-3"
          >
            See all nonprofit-eligible programs
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Three funding sources ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6 text-center">
          Three places nonprofit money comes from
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FUNDING_SOURCES.map(({ icon: Icon, title, description, href, cta }) => (
            <div key={title} className="card p-6 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-forest-50 border border-forest-100 flex items-center justify-center mb-4">
                <Icon size={20} className="text-forest-700" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed flex-1">{description}</p>
              <Link
                href={href}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-800 transition-colors"
              >
                {cta}
                <ArrowRight size={13} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Browse by cause ──────────────────────────────────────────────── */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6 text-center">
            Browse by cause area
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CAUSE_AREAS.map(({ icon: Icon, label, category }) => (
              <Link
                key={label}
                href={`/?applicantType=NONPROFIT&industryCategory=${encodeURIComponent(category)}#browse`}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-forest-400 hover:bg-forest-50 transition-all group"
              >
                <Icon size={18} className="text-slate-400 group-hover:text-forest-600 transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-forest-800 leading-tight">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works for nonprofits ──────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6 text-center">
          Before you apply
        </h2>
        <div className="space-y-4">
          {[
            {
              n: "1",
              title: "Confirm your eligibility basics",
              text: "Most programs require current 501(c)(3) status. If you're not yet incorporated, many funders accept applications through a fiscal sponsor — the listing requirements note when that's possible.",
            },
            {
              n: "2",
              title: "Match the funder's strategy, not just the dollar amount",
              text: "Foundations fund work aligned with their published program areas. A smaller grant from an aligned funder beats a rejected application to a large one. Each listing links to the funder's own guidelines.",
            },
            {
              n: "3",
              title: "Note the application route",
              text: "Some programs run open annual competitions (FEMA NSGP, NEA), some accept rolling applications (Kellogg, Walmart), and some work by invitation or letter of inquiry (Ford, Mott). Listings state which applies.",
            },
          ].map(({ n, title, text }) => (
            <div key={n} className="card p-5 flex gap-4">
              <span className="w-7 h-7 rounded-full bg-forest-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {n}
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/?applicantType=NONPROFIT#browse" className="btn-primary inline-flex px-6 py-3">
            Start browsing nonprofit funding
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}

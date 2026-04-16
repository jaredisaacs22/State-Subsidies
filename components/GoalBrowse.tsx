"use client";

import { Zap, Truck, Building2, Wheat, FlaskConical, Banknote, HardHat, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncentiveFilters } from "@/lib/types";

const GOALS: { icon: LucideIcon; title: string; desc: string; filters: Partial<IncentiveFilters> }[] = [
  {
    icon: Zap,
    title: "Reduce Energy Bills",
    desc: "Rebates & credits for efficiency upgrades, HVAC, insulation, and smart controls",
    filters: { industryCategory: "Energy Management" },
  },
  {
    icon: Truck,
    title: "Go Electric or EV Fleet",
    desc: "Vouchers and point-of-sale rebates for electric trucks, vans, and chargers",
    filters: { industryCategory: "EV Charging" },
  },
  {
    icon: Building2,
    title: "Expand or Upgrade Facilities",
    desc: "Grants, loans, and tax credits for construction, equipment, and infrastructure",
    filters: { incentiveType: "GRANT" },
  },
  {
    icon: Wheat,
    title: "Agriculture & Farming",
    desc: "USDA programs, state ag grants, and rural development funding",
    filters: { industryCategory: "Agriculture" },
  },
  {
    icon: FlaskConical,
    title: "Research & Development",
    desc: "R&D tax credits and grants for innovation, prototyping, and new products",
    filters: { industryCategory: "Research & Development" },
  },
  {
    icon: Banknote,
    title: "Get a Low-Interest Loan",
    desc: "State and federal loan programs with below-market rates for capital needs",
    filters: { incentiveType: "LOAN" },
  },
  {
    icon: HardHat,
    title: "Construction & Real Estate",
    desc: "PACE financing, brownfield credits, and property improvement programs",
    filters: { industryCategory: "Real Estate" },
  },
  {
    icon: Sun,
    title: "Clean Energy & Solar",
    desc: "Solar, wind, battery storage, and clean tech investment incentives",
    filters: { industryCategory: "Clean Technology" },
  },
];

const TYPE_EXPLAINER = [
  { type: "Grant",      color: "bg-emerald-50 border-emerald-200 text-emerald-800", desc: "Free money — no repayment required. Usually tied to job creation, capital investment, or a specific project." },
  { type: "Tax Credit", color: "bg-violet-50 border-violet-200 text-violet-800",   desc: "Reduces your tax bill dollar-for-dollar. You invest or spend, then claim it on your return." },
  { type: "Loan",       color: "bg-yellow-50 border-yellow-200 text-yellow-800",   desc: "Below-market interest rate financing from state or federal programs. Must be repaid, but at better terms than banks." },
  { type: "Rebate",     color: "bg-orange-50 border-orange-200 text-orange-800",   desc: "Instant or mail-in discount when you buy qualifying equipment — reduces your purchase price upfront." },
  { type: "Voucher",    color: "bg-pink-50 border-pink-200 text-pink-800",         desc: "A prepaid certificate that covers part of the cost of approved equipment or services at the point of purchase." },
];

interface GoalBrowseProps {
  onSelect: (filters: Partial<IncentiveFilters>) => void;
}

export function GoalBrowse({ onSelect }: GoalBrowseProps) {
  return (
    <div className="space-y-8 mb-10">
      {/* Goal cards */}
      <div>
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-base font-semibold text-slate-800">What are you looking for?</h2>
          <span className="text-xs text-slate-400">Pick a goal to filter programs</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {GOALS.map((g) => {
            const Icon = g.icon;
            return (
              <button
                key={g.title}
                onClick={() => onSelect(g.filters)}
                className="text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-forest-400 hover:shadow-sm hover:bg-forest-50/40 transition-all group"
              >
                <div className="mb-2.5">
                  <Icon size={16} className="text-slate-400 group-hover:text-forest-600 transition-colors" />
                </div>
                <div className="font-semibold text-sm text-slate-800 group-hover:text-forest-700 leading-snug mb-1">
                  {g.title}
                </div>
                <div className="text-[11px] text-slate-400 leading-snug">{g.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Type explainer */}
      <div>
        <div className="flex items-baseline gap-3 mb-3">
          <h2 className="text-base font-semibold text-slate-800">Types of incentives explained</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {TYPE_EXPLAINER.map((t) => (
            <div key={t.type} className={cn("rounded-xl border px-3.5 py-3", t.color)}>
              <div className="font-semibold text-[13px] mb-1">{t.type}</div>
              <div className="text-[11px] leading-relaxed opacity-80">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

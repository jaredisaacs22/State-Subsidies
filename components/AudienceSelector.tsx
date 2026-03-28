"use client";

import { cn } from "@/lib/utils";
import type { IncentiveFilters } from "@/lib/types";

export type AudienceId =
  | "small_business"
  | "startup"
  | "enterprise"
  | "nonprofit"
  | "government"
  | "educator"
  | "farmer"
  | "researcher";

interface Audience {
  id: AudienceId;
  label: string;
  description: string;
  emoji: string;
  filterPreset: Partial<IncentiveFilters>;
}

export const AUDIENCES: Audience[] = [
  {
    id: "small_business",
    label: "Small Business",
    description: "Under 500 employees, any sector",
    emoji: "🏢",
    filterPreset: { incentiveType: undefined, jurisdictionLevel: undefined },
  },
  {
    id: "startup",
    label: "Startup",
    description: "Early-stage, R&D, tech ventures",
    emoji: "🚀",
    filterPreset: { industryCategory: "Technology" },
  },
  {
    id: "enterprise",
    label: "Enterprise",
    description: "Large-scale operations, multi-site",
    emoji: "🏭",
    filterPreset: { jurisdictionLevel: "FEDERAL" },
  },
  {
    id: "nonprofit",
    label: "Nonprofit",
    description: "501(c)(3) organizations and charities",
    emoji: "🤝",
    filterPreset: { industryCategory: "Government & Nonprofit" },
  },
  {
    id: "government",
    label: "Government",
    description: "Municipalities, agencies, public entities",
    emoji: "🏛️",
    filterPreset: { jurisdictionLevel: "AGENCY" },
  },
  {
    id: "educator",
    label: "Educator / School",
    description: "K–12, districts, community colleges",
    emoji: "🎓",
    filterPreset: { industryCategory: "Education" },
  },
  {
    id: "farmer",
    label: "Agriculture",
    description: "Farms, ranches, food producers",
    emoji: "🌾",
    filterPreset: { industryCategory: "Agriculture" },
  },
  {
    id: "researcher",
    label: "Research / University",
    description: "Academic research teams and labs",
    emoji: "🔬",
    filterPreset: { industryCategory: "Research & Development" },
  },
];

interface AudienceSelectorProps {
  onSelect: (filters: Partial<IncentiveFilters>, audienceId: AudienceId) => void;
  selectedId?: AudienceId | null;
  onClear?: () => void;
  className?: string;
}

export function AudienceSelector({ onSelect, selectedId, onClear, className }: AudienceSelectorProps) {
  return (
    <div className={cn("", className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Who are you looking for programs for?
        </p>
        {selectedId && onClear && (
          <button
            onClick={onClear}
            className="text-[11px] text-forest-700 hover:text-forest-800 font-medium underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {AUDIENCES.map((a) => {
          const active = selectedId === a.id;
          return (
            <button
              key={a.id}
              onClick={() => onSelect(a.filterPreset, a.id)}
              className={cn(
                "text-left p-3 rounded-xl border transition-all group",
                active
                  ? "border-forest-600 bg-forest-50 shadow-sm ring-1 ring-forest-600/20"
                  : "border-slate-200 bg-white hover:border-forest-500 hover:bg-forest-50 hover:shadow-sm"
              )}
            >
              <div className="text-xl mb-1.5">{a.emoji}</div>
              <div className={cn(
                "font-semibold text-[12px] leading-tight",
                active ? "text-forest-800" : "text-slate-800 group-hover:text-forest-800"
              )}>
                {a.label}
              </div>
              <div className="text-[10px] text-slate-400 leading-snug mt-0.5 hidden lg:block">
                {a.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

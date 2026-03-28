"use client";

import { cn } from "@/lib/utils";
import type { IncentiveFilters } from "@/lib/types";

const STORAGE_KEY = "ss_audience_v1";

export type AudienceId = "small_business" | "nonprofit" | "educator" | "farmer" | "researcher";

interface Audience {
  id: AudienceId;
  label: string;
  description: string;
  emoji: string; // simple visual, no complex SVG needed
  filterPreset: Partial<IncentiveFilters>;
}

const AUDIENCES: Audience[] = [
  {
    id: "small_business",
    label: "Small Business",
    description: "Contractors, retail, services, restaurants",
    emoji: "🏢",
    filterPreset: {},
  },
  {
    id: "nonprofit",
    label: "Nonprofit",
    description: "501(c)(3) organizations and charities",
    emoji: "🤝",
    filterPreset: { industryCategory: "Government & Nonprofit" },
  },
  {
    id: "educator",
    label: "Educator / School",
    description: "K-12 teachers, schools, districts",
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
  className?: string;
}

export function AudienceSelector({ onSelect, className }: AudienceSelectorProps) {
  // No local selected state — parent controls filters
  // Just renders the audience tiles
  return (
    <div className={cn("", className)}>
      <p className="text-sm font-medium text-slate-500 mb-3">Who are you?</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {AUDIENCES.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelect(a.filterPreset, a.id)}
            className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-forest-600 hover:bg-forest-50 hover:shadow-sm transition-all group"
          >
            <div className="text-xl mb-1.5">{a.emoji}</div>
            <div className="font-semibold text-sm text-slate-800 group-hover:text-forest-800 leading-tight">
              {a.label}
            </div>
            <div className="text-[11px] text-slate-400 leading-snug mt-0.5">{a.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Export AUDIENCES for use in parent
export { AUDIENCES };

"use client";

import { cn } from "@/lib/utils";
import type { IncentiveFilters } from "@/lib/types";

const STORAGE_KEY = "ss_audience_v1";

export type AudienceId =
  | "small_business"
  | "nonprofit"
  | "educator"
  | "farmer"
  | "researcher"
  | "startup"
  | "enterprise"
  | "government";

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
    description: "Contractors, retail, services, restaurants",
    emoji: "🏢",
    filterPreset: {},
  },
  {
    id: "startup",
    label: "Startup",
    description: "Early-stage companies & founders",
    emoji: "🚀",
    filterPreset: { industryCategory: "Technology" },
  },
  {
    id: "enterprise",
    label: "Enterprise",
    description: "Large manufacturers, fleet operators",
    emoji: "🏭",
    filterPreset: { industryCategory: "Manufacturing" },
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
    filterPreset: { jurisdictionLevel: "CITY" },
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
  selectedId?: AudienceId | null;
  className?: string;
}

export function AudienceSelector({ onSelect, selectedId, className }: AudienceSelectorProps) {
  return (
    <div className={cn("", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
        I&apos;m looking for programs for a…
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {AUDIENCES.map((a) => {
          const active = selectedId === a.id;
          return (
            <button
              key={a.id}
              onClick={() => onSelect(a.filterPreset, a.id)}
              className={cn(
                "text-left p-3 rounded-xl border transition-all group",
                active
                  ? "border-forest-600 bg-forest-50 shadow-sm"
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
              <div className="text-[10px] text-slate-400 leading-snug mt-0.5 hidden sm:block">
                {a.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

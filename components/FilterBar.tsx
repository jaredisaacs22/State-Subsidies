"use client";

import { ChevronDown, X } from "lucide-react";
import {
  JURISDICTION_LABELS,
  INCENTIVE_TYPE_LABELS,
  INDUSTRY_CATEGORY_GROUPS,
} from "@/lib/types";
import type { IncentiveFilters } from "@/lib/types";
import { cn } from "@/lib/utils";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming",
];

interface FilterBarProps {
  filters: IncentiveFilters;
  onChange: (filters: Partial<IncentiveFilters>) => void;
  totalResults: number;
  className?: string;
}

export function FilterBar({ filters, onChange, totalResults, className }: FilterBarProps) {
  const activeFilterCount = [
    filters.jurisdictionLevel,
    filters.jurisdictionName,
    filters.incentiveType,
    filters.industryCategory,
  ].filter(Boolean).length;

  const clearAll = () =>
    onChange({
      jurisdictionLevel: undefined,
      jurisdictionName: undefined,
      incentiveType: undefined,
      industryCategory: undefined,
    });

  return (
    <div className={cn("flex items-center gap-2 flex-wrap sm:flex-nowrap", className)}>
      {/* Industry — grouped optgroup select */}
      <div className="relative">
        <select
          value={filters.industryCategory ?? ""}
          onChange={(e) => onChange({ industryCategory: e.target.value || undefined })}
          className={cn(
            "appearance-none text-xs border rounded-full pl-3 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer transition-all min-w-0",
            filters.industryCategory
              ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          )}
        >
          <option value="">Industry</option>
          {INDUSTRY_CATEGORY_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown size={11} className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none", filters.industryCategory ? "text-brand-500" : "text-slate-400")} />
      </div>

      {/* State */}
      <FilterPill
        label="State"
        value={filters.jurisdictionName ?? ""}
        onChange={(v) => onChange({ jurisdictionName: v || undefined })}
        options={US_STATES.map((s) => ({ value: s, label: s }))}
        active={!!filters.jurisdictionName}
      />

      {/* Incentive type */}
      <FilterPill
        label="Type"
        value={filters.incentiveType ?? ""}
        onChange={(v) => onChange({ incentiveType: (v as IncentiveFilters["incentiveType"]) || undefined })}
        options={Object.entries(INCENTIVE_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        active={!!filters.incentiveType}
      />

      {/* Jurisdiction level */}
      <FilterPill
        label="Scope"
        value={filters.jurisdictionLevel ?? ""}
        onChange={(v) => onChange({ jurisdictionLevel: (v as IncentiveFilters["jurisdictionLevel"]) || undefined })}
        options={Object.entries(JURISDICTION_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        active={!!filters.jurisdictionLevel}
      />

      {/* Spacer */}
      <div className="flex-1 hidden sm:block" />

      {/* Right side: clear + count + sort */}
      <div className="flex items-center gap-2 ml-auto sm:ml-0">
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors whitespace-nowrap"
          >
            <X size={11} />
            Clear {activeFilterCount > 1 ? `(${activeFilterCount})` : ""}
          </button>
        )}

        {(activeFilterCount > 0 || filters.search) && (
          <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
            <span className="font-semibold text-slate-600">{totalResults.toLocaleString()}</span> results
          </span>
        )}

        {/* Sort */}
        <div className="relative">
          <select
            value={`${filters.sortBy ?? "createdAt"}_${filters.sortOrder ?? "desc"}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split("_");
              onChange({
                sortBy: sortBy as IncentiveFilters["sortBy"],
                sortOrder: sortOrder as "asc" | "desc",
              });
            }}
            className="appearance-none text-xs text-slate-600 bg-transparent border border-slate-200 rounded-full px-3 py-1.5 pr-7 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer"
          >
            <option value="createdAt_desc">Newest</option>
            <option value="createdAt_asc">Oldest</option>
            <option value="fundingAmount_desc">Highest $</option>
            <option value="fundingAmount_asc">Lowest $</option>
            <option value="deadline_asc">Deadline ↑</option>
            <option value="deadline_desc">Deadline ↓</option>
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

interface FilterPillProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  active: boolean;
}

function FilterPill({ label, value, onChange, options, active }: FilterPillProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none text-xs border rounded-full pl-3 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer transition-all",
          active
            ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
        )}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown
        size={11}
        className={cn(
          "absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none",
          active ? "text-brand-500" : "text-slate-400"
        )}
      />
    </div>
  );
}

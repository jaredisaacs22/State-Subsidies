"use client";

import { useState } from "react";
import { ChevronDown, X, ChevronRight } from "lucide-react";
import {
  JURISDICTION_LABELS,
  INCENTIVE_TYPE_LABELS,
  INDUSTRY_CATEGORIES,
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

// Most searched / high-value categories shown by default
const FEATURED_CATEGORIES = [
  "Clean Technology","EV Charging","Manufacturing","Energy Storage",
  "Agriculture","Real Estate","Research & Development","Healthcare",
  "Construction","Technology",
] as const;

interface FilterBarProps {
  filters: IncentiveFilters;
  onChange: (filters: Partial<IncentiveFilters>) => void;
  totalResults: number;
  className?: string;
}

export function FilterBar({ filters, onChange, totalResults, className }: FilterBarProps) {
  const [showAllCategories, setShowAllCategories] = useState(false);

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

  const visibleCategories = showAllCategories
    ? INDUSTRY_CATEGORIES
    : FEATURED_CATEGORIES;

  return (
    <div className={cn("space-y-2.5", className)}>
      {/* Industry quick-filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => onChange({ industryCategory: undefined })}
          className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all",
            !filters.industryCategory
              ? "bg-brand-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          All
        </button>
        {visibleCategories.map((cat) => {
          const active = filters.industryCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onChange({ industryCategory: active ? undefined : cat })}
              className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all",
                active
                  ? "bg-brand-600 text-white shadow-sm ring-2 ring-brand-300 ring-offset-1"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {cat}
            </button>
          );
        })}
        <button
          onClick={() => setShowAllCategories((p) => !p)}
          className="inline-flex items-center gap-0.5 px-3 py-1 rounded-full text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
        >
          {showAllCategories ? (
            <>Less <ChevronDown size={11} className="rotate-180" /></>
          ) : (
            <>+{INDUSTRY_CATEGORIES.length - FEATURED_CATEGORIES.length} more <ChevronRight size={11} /></>
          )}
        </button>
      </div>

      {/* Dropdowns row */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill
          label="State"
          value={filters.jurisdictionName ?? ""}
          onChange={(v) => onChange({ jurisdictionName: v || undefined })}
          options={US_STATES.map((s) => ({ value: s, label: s }))}
        />
        <FilterPill
          label="Jurisdiction"
          value={filters.jurisdictionLevel ?? ""}
          onChange={(v) =>
            onChange({ jurisdictionLevel: (v as IncentiveFilters["jurisdictionLevel"]) || undefined })
          }
          options={Object.entries(JURISDICTION_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        />
        <FilterPill
          label="Type"
          value={filters.incentiveType ?? ""}
          onChange={(v) =>
            onChange({ incentiveType: (v as IncentiveFilters["incentiveType"]) || undefined })
          }
          options={Object.entries(INCENTIVE_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        />

        {/* Result count + clear — pushed right */}
        <div className="ml-auto flex items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
            >
              <X size={11} />
              Clear {activeFilterCount}
            </button>
          )}
          {(activeFilterCount > 0 || filters.search) && (
            <span className="text-xs text-slate-500 tabular-nums">
              <span className="font-semibold text-slate-700">{totalResults}</span> result{totalResults !== 1 ? "s" : ""}
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
              className="appearance-none text-xs text-slate-600 bg-transparent border border-slate-200 rounded-full px-3 py-1 pr-7 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer"
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
    </div>
  );
}

interface FilterPillProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

function FilterPill({ label, value, onChange, options }: FilterPillProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none text-xs border rounded-full pl-3 pr-7 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer transition-all",
          value
            ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
        )}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={11}
        className={cn(
          "absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none",
          value ? "text-brand-500" : "text-slate-400"
        )}
      />
    </div>
  );
}

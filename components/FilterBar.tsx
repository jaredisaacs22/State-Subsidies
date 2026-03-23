"use client";

import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import {
  JURISDICTION_LABELS,
  INCENTIVE_TYPE_LABELS,
  INDUSTRY_CATEGORIES,
  INDUSTRY_COLORS,
} from "@/lib/types";
import type { IncentiveFilters } from "@/lib/types";

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
import { cn } from "@/lib/utils";

interface FilterBarProps {
  filters: IncentiveFilters;
  onChange: (filters: Partial<IncentiveFilters>) => void;
  totalResults: number;
  className?: string;
}

export function FilterBar({ filters, onChange, totalResults, className }: FilterBarProps) {
  const activeFilterCount = [
    filters.jurisdictionLevel,
    filters.incentiveType,
    filters.industryCategory,
  ].filter(Boolean).length;

  const clearAll = () =>
    onChange({ jurisdictionLevel: undefined, incentiveType: undefined, industryCategory: undefined });

  return (
    <div className={cn("space-y-3", className)}>
      {/* Industry chip row */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 w-max">
          <button
            onClick={() => onChange({ industryCategory: undefined })}
            className={cn(
              "badge whitespace-nowrap px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              !filters.industryCategory ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            All Industries
          </button>
          {INDUSTRY_CATEGORIES.map((cat) => {
            const active = filters.industryCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onChange({ industryCategory: active ? undefined : cat })}
                className={cn(
                  "badge whitespace-nowrap px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                  active ? "ring-2 ring-brand-500 ring-offset-1 " + (INDUSTRY_COLORS[cat] ?? "bg-slate-200 text-slate-700") : (INDUSTRY_COLORS[cat] ?? "bg-slate-100 text-slate-600") + " hover:opacity-80"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* State */}
        <FilterSelect
          label="State"
          value={filters.jurisdictionName ?? ""}
          onChange={(v) => onChange({ jurisdictionName: v || undefined })}
          options={US_STATES.map((s) => ({ value: s, label: s }))}
        />

        {/* Jurisdiction */}
        <FilterSelect
          label="Jurisdiction"
          value={filters.jurisdictionLevel ?? ""}
          onChange={(v) => onChange({ jurisdictionLevel: v as IncentiveFilters["jurisdictionLevel"] || undefined })}
          options={Object.entries(JURISDICTION_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        />

        {/* Incentive Type */}
        <FilterSelect
          label="Incentive Type"
          value={filters.incentiveType ?? ""}
          onChange={(v) => onChange({ incentiveType: v as IncentiveFilters["incentiveType"] || undefined })}
          options={Object.entries(INCENTIVE_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        />

        {/* Sort */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:inline">Sort:</span>
          <select
            value={`${filters.sortBy ?? "createdAt"}_${filters.sortOrder ?? "desc"}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split("_");
              onChange({
                sortBy: sortBy as IncentiveFilters["sortBy"],
                sortOrder: sortOrder as "asc" | "desc",
              });
            }}
            className="select text-xs py-1.5 pl-2 pr-7 h-8 w-auto"
          >
            <option value="createdAt_desc">Newest</option>
            <option value="createdAt_asc">Oldest</option>
            <option value="fundingAmount_desc">Highest Amount</option>
            <option value="fundingAmount_asc">Lowest Amount</option>
            <option value="deadline_asc">Deadline (Soonest)</option>
            <option value="deadline_desc">Deadline (Latest)</option>
          </select>
        </div>
      </div>

      {/* Active filter summary */}
      {(activeFilterCount > 0 || filters.search) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">
            <span className="font-medium text-slate-800">{totalResults}</span>{" "}
            result{totalResults !== 1 ? "s" : ""}
          </span>

          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium"
            >
              <X size={12} />
              Clear {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <div className="relative">
      <div className="flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "select text-sm py-2 pl-3 pr-8 h-9",
            value ? "border-brand-500 ring-1 ring-brand-500 text-brand-700 font-medium" : ""
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
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>
    </div>
  );
}

// Unused import cleanup
void SlidersHorizontal;

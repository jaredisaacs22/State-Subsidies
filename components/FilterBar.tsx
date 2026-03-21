"use client";

import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import {
  JURISDICTION_LABELS,
  INCENTIVE_TYPE_LABELS,
  INDUSTRY_CATEGORIES,
} from "@/lib/types";
import type { IncentiveFilters } from "@/lib/types";
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
      <div className="flex flex-wrap items-center gap-2">
        {/* Jurisdiction */}
        <FilterSelect
          label="Jurisdiction"
          value={filters.jurisdictionLevel ?? ""}
          onChange={(v) => onChange({ jurisdictionLevel: v as IncentiveFilters["jurisdictionLevel"] || undefined })}
          options={Object.entries(JURISDICTION_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        />

        {/* Industry Category */}
        <FilterSelect
          label="Industry"
          value={filters.industryCategory ?? ""}
          onChange={(v) => onChange({ industryCategory: v || undefined })}
          options={INDUSTRY_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
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

"use client";

import { IncentiveCard } from "./IncentiveCard";
import type { Incentive } from "@/lib/types";

interface ResultsGridProps {
  incentives: Incentive[];
  loading?: boolean;
  error?: string | null;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  searchQuery?: string;
}

export function ResultsGrid({
  incentives,
  loading,
  error,
  hasActiveFilters,
  onClearFilters,
  searchQuery,
}: ResultsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          className="mb-4 text-slate-300"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-base font-medium text-slate-700">Something went wrong</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  if (incentives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          className="mb-4 text-slate-300"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
          <path d="M8 11h6M11 8v6" strokeLinecap="round" />
        </svg>
        {hasActiveFilters ? (
          <>
            <p className="text-base font-medium text-slate-700">No programs match your filters</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">
              Try broadening your search or removing a filter.
            </p>
            {onClearFilters && (
              <button
                onClick={onClearFilters}
                className="text-sm text-forest-700 hover:text-forest-800 font-medium underline underline-offset-2 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-base font-medium text-slate-700">No programs found</p>
            <p className="text-sm text-slate-400 mt-1">
              Try a different search term, or{" "}
              <span className="text-forest-700 font-medium">browse all programs</span> by
              clearing your search.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {incentives.map((incentive) => (
        <IncentiveCard key={incentive.id} incentive={incentive} searchQuery={searchQuery} />
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col border-l-4 border-l-slate-200 overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        {/* Badge row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex gap-1.5">
            <div className="skeleton-shimmer h-5 w-16 rounded-full" />
            <div className="skeleton-shimmer h-5 w-14 rounded-full" />
          </div>
          <div className="skeleton-shimmer h-6 w-6 rounded-md" />
        </div>
        {/* Title */}
        <div className="skeleton-shimmer h-4 w-4/5 rounded mb-1.5" />
        <div className="skeleton-shimmer h-4 w-3/5 rounded mb-3" />
        {/* Agency */}
        <div className="skeleton-shimmer h-3 w-2/5 rounded mb-3" />
        {/* Summary lines */}
        <div className="space-y-1.5">
          <div className="skeleton-shimmer h-3 w-full rounded" />
          <div className="skeleton-shimmer h-3 w-11/12 rounded" />
        </div>
      </div>
      {/* Industry tags */}
      <div className="px-5 pb-3 flex gap-1.5">
        <div className="skeleton-shimmer h-5 w-20 rounded-full" />
        <div className="skeleton-shimmer h-5 w-16 rounded-full" />
      </div>
      {/* Footer */}
      <div className="mt-auto px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="skeleton-shimmer h-5 w-16 rounded-md" />
        <div className="skeleton-shimmer h-4 w-10 rounded" />
      </div>
    </div>
  );
}

"use client";

import { IncentiveCard } from "./IncentiveCard";
import type { Incentive } from "@/lib/types";

interface ResultsGridProps {
  incentives: Incentive[];
  loading?: boolean;
  error?: string | null;
}

export function ResultsGrid({ incentives, loading, error }: ResultsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium text-red-600">Something went wrong</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  if (incentives.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-lg font-medium text-slate-700">No incentives found</p>
        <p className="text-sm text-slate-500 mt-1">
          Try adjusting your search or filters to see more results.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {incentives.map((incentive) => (
        <IncentiveCard key={incentive.id} incentive={incentive} />
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3 animate-pulse">
      <div className="flex gap-2">
        <div className="h-5 w-20 bg-slate-200 rounded-full" />
        <div className="h-5 w-16 bg-slate-200 rounded-full" />
      </div>
      <div className="h-5 bg-slate-200 rounded w-3/4" />
      <div className="h-4 bg-slate-100 rounded w-1/2" />
      <div className="space-y-2">
        <div className="h-3 bg-slate-100 rounded" />
        <div className="h-3 bg-slate-100 rounded w-5/6" />
        <div className="h-3 bg-slate-100 rounded w-4/5" />
      </div>
      <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
        <div className="h-3 bg-slate-200 rounded w-1/3" />
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-5/6" />
        <div className="h-3 bg-slate-100 rounded w-4/6" />
      </div>
      <div className="flex justify-between pt-2 border-t border-slate-100">
        <div className="h-4 w-16 bg-slate-200 rounded" />
        <div className="h-4 w-24 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

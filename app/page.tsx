"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SearchBar } from "@/components/SearchBar";
import { FilterBar } from "@/components/FilterBar";
import { ResultsGrid } from "@/components/ResultsGrid";
import type { Incentive, IncentiveFilters, PaginatedResponse } from "@/lib/types";

const DEFAULT_FILTERS: IncentiveFilters = {
  search: "",
  status: "ACTIVE",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  pageSize: 12,
};

export default function HomePage() {
  const [filters, setFilters] = useState<IncentiveFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<PaginatedResponse<Incentive> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchIncentives = useCallback(async (f: IncentiveFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.search) params.set("search", f.search);
      if (f.jurisdictionLevel) params.set("jurisdictionLevel", f.jurisdictionLevel);
      if (f.incentiveType) params.set("incentiveType", f.incentiveType);
      if (f.industryCategory) params.set("industryCategory", f.industryCategory);
      if (f.status) params.set("status", f.status);
      if (f.sortBy) params.set("sortBy", f.sortBy);
      if (f.sortOrder) params.set("sortOrder", f.sortOrder);
      params.set("page", String(f.page ?? 1));
      params.set("pageSize", String(f.pageSize ?? 12));

      const res = await fetch(`/api/incentives?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load incentives");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search, immediate for other filters
  const handleFilterChange = useCallback(
    (partial: Partial<IncentiveFilters>) => {
      const newFilters = { ...filters, ...partial, page: 1 };
      setFilters(newFilters);

      if ("search" in partial) {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => fetchIncentives(newFilters), 300);
      } else {
        fetchIncentives(newFilters);
      }
    },
    [filters, fetchIncentives]
  );

  useEffect(() => {
    fetchIncentives(DEFAULT_FILTERS);
  }, [fetchIncentives]);

  return (
    <div className="min-h-screen">
      {/* ── Hero / Search Header ─────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 text-white pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Live data from federal, state & agency programs
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-balance">
            Find the right government incentive for your business
          </h1>
          <p className="text-brand-200 text-lg mb-8 max-w-2xl mx-auto text-balance">
            Search grants, tax credits, rebates, and vouchers across Federal, State, City, and Agency programs.
            Filter by industry, then click through to the official source.
          </p>

          {/* Main search */}
          <SearchBar
            value={filters.search ?? ""}
            onChange={(search) => handleFilterChange({ search })}
            placeholder="Search programs, agencies, industries…"
            className="max-w-2xl mx-auto"
          />

          {/* Quick stats */}
          <div className="mt-8 flex justify-center gap-8 text-sm text-brand-300">
            <span><strong className="text-white">Federal</strong> programs</span>
            <span>·</span>
            <span><strong className="text-white">State</strong> programs</span>
            <span>·</span>
            <span><strong className="text-white">Agency</strong> programs (CARB, WAZIP, CalTrans)</span>
          </div>
        </div>
      </section>

      {/* ── Filter & Results ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <FilterBar
          filters={filters}
          onChange={handleFilterChange}
          totalResults={results?.total ?? 0}
          className="mb-6"
        />

        <ResultsGrid
          incentives={results?.data ?? []}
          loading={loading}
          error={error}
        />

        {/* Pagination */}
        {results && results.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            <button
              disabled={filters.page === 1}
              onClick={() => {
                const newFilters = { ...filters, page: (filters.page ?? 1) - 1 };
                setFilters(newFilters);
                fetchIncentives(newFilters);
              }}
              className="btn-ghost disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="flex items-center text-sm text-slate-600 px-4">
              Page {filters.page} of {results.totalPages}
            </span>
            <button
              disabled={filters.page === results.totalPages}
              onClick={() => {
                const newFilters = { ...filters, page: (filters.page ?? 1) + 1 };
                setFilters(newFilters);
                fetchIncentives(newFilters);
              }}
              className="btn-ghost disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

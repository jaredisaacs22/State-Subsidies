"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SearchBar } from "@/components/SearchBar";
import { FilterBar } from "@/components/FilterBar";
import { ResultsGrid } from "@/components/ResultsGrid";
import { BusinessIntakeChat } from "@/components/BusinessIntakeChat";
import { GoalBrowse } from "@/components/GoalBrowse";
import type { Incentive, IncentiveFilters, PaginatedResponse } from "@/lib/types";


interface Stats { total: number; federal: number; state: number; }

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
  const [stats, setStats] = useState<Stats>({ total: 0, federal: 0, state: 0 });
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchIncentives = useCallback(async (f: IncentiveFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.search) params.set("search", f.search);
      if (f.jurisdictionLevel) params.set("jurisdictionLevel", f.jurisdictionLevel);
      if (f.jurisdictionName) params.set("jurisdictionName", f.jurisdictionName);
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
    Promise.all([
      fetch("/api/incentives?pageSize=1&status=ACTIVE").then((r) => r.json()),
      fetch("/api/incentives?pageSize=1&status=ACTIVE&jurisdictionLevel=FEDERAL").then((r) => r.json()),
      fetch("/api/incentives?pageSize=1&status=ACTIVE&jurisdictionLevel=STATE").then((r) => r.json()),
    ]).then(([all, federal, state]) => {
      setStats({ total: all.total ?? 0, federal: federal.total ?? 0, state: state.total ?? 0 });
    }).catch(() => {});
  }, [fetchIncentives]);

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative text-white pt-16 pb-0 overflow-hidden"
        style={{background:"radial-gradient(ellipse 70% 60% at 10% 0%,rgba(13,32,82,0.9) 0%,transparent 60%),radial-gradient(ellipse 60% 50% at 90% 100%,rgba(26,92,56,0.3) 0%,transparent 65%),radial-gradient(ellipse 80% 80% at 50% 50%,rgba(22,56,132,0.6) 0%,transparent 80%),#0a1a40"}}
      >
        {/* Subtle forest horizon at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-forest-900/20 to-transparent pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-7 backdrop-blur-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Free resource · all 50 states · updated daily
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-[1.08] mb-5 text-balance">
            The government has money
            <span className="block text-forest-300 mt-1">for your industry.</span>
          </h1>

          <p className="text-white/55 text-lg mb-9 max-w-xl mx-auto leading-relaxed">
            Grants, tax credits, loans, and rebates from federal, state, and local programs — most businesses never hear about them.
          </p>

          {/* Search — larger, elevated */}
          <div className="max-w-2xl mx-auto mb-5">
            <SearchBar
              value={filters.search ?? ""}
              onChange={(search) => handleFilterChange({ search })}
              placeholder="Search programs, agencies, industries…"
              className="shadow-[0_4px_32px_rgba(0,0,0,0.35)] rounded-xl"
            />
          </div>

          <BusinessIntakeChat />

          <div className="mb-10" />
        </div>
      </section>

      {/* ── Sticky Filter Bar ────────────────────────────────────────────── */}
      <div className="sticky top-16 z-40 bg-white/97 backdrop-blur border-b border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <FilterBar
            filters={filters}
            onChange={handleFilterChange}
            totalResults={results?.total ?? 0}
          />
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Goal browse — shown when no filters active */}
        {!filters.industryCategory && !filters.incentiveType && !filters.jurisdictionLevel && !filters.jurisdictionName && !filters.search && (
          <GoalBrowse onSelect={handleFilterChange} />
        )}

        <ResultsGrid
          incentives={results?.data ?? []}
          loading={loading}
          error={error}
        />

        {/* Pagination row */}
        {results && (
          <div className="flex items-center justify-between mt-10">
            {/* Per-page toggle — bottom left */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Per page:</span>
              {[12, 24, 48].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    const newFilters = { ...filters, pageSize: n, page: 1 };
                    setFilters(newFilters);
                    fetchIncentives(newFilters);
                  }}
                  className={`px-3 py-1 rounded-md border text-sm transition-colors ${
                    (filters.pageSize ?? 12) === n
                      ? "bg-brand-600 text-white border-brand-600"
                      : "border-slate-200 hover:border-brand-400 hover:text-brand-600"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Prev / Next — bottom right */}
            {results.totalPages > 1 ? (
              <div className="flex items-center gap-3">
                <button
                  disabled={filters.page === 1}
                  onClick={() => {
                    const newFilters = { ...filters, page: (filters.page ?? 1) - 1 };
                    setFilters(newFilters);
                    fetchIncentives(newFilters);
                  }}
                  className="btn-ghost border border-slate-200 disabled:opacity-40 text-sm px-4"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate-500 tabular-nums">
                  {filters.page} / {results.totalPages}
                </span>
                <button
                  disabled={filters.page === results.totalPages}
                  onClick={() => {
                    const newFilters = { ...filters, page: (filters.page ?? 1) + 1 };
                    setFilters(newFilters);
                    fetchIncentives(newFilters);
                  }}
                  className="btn-ghost border border-slate-200 disabled:opacity-40 text-sm px-4"
                >
                  Next →
                </button>
              </div>
            ) : <div />}
          </div>
        )}
      </section>
    </div>
  );
}

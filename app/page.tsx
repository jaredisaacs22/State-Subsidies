"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SearchBar } from "@/components/SearchBar";
import { FilterBar } from "@/components/FilterBar";
import { ResultsGrid } from "@/components/ResultsGrid";
import { BusinessIntakeChat } from "@/components/BusinessIntakeChat";
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
      <section className="relative bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 text-white pt-14 pb-16 overflow-hidden">
        {/* Subtle dot-grid pattern */}
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",backgroundSize:"28px 28px"}} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Live data · all 50 states · 144+ programs
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-balance">
            Find government incentives<br className="hidden sm:block" /> for your business
          </h1>
          <p className="text-brand-200 text-lg mb-7 max-w-xl mx-auto text-balance">
            Grants, tax credits, loans & rebates — Federal, State, City, and Agency programs in one place.
          </p>

          <SearchBar
            value={filters.search ?? ""}
            onChange={(search) => handleFilterChange({ search })}
            placeholder="Search programs, agencies, industries…"
            className="max-w-2xl mx-auto"
          />

          <BusinessIntakeChat />

          {/* Stats */}
          <div className="mt-7 flex flex-wrap justify-center gap-3 text-sm">
            {[
              { value: stats.total || "144+", label: "Programs" },
              { value: stats.federal || "34+", label: "Federal" },
              { value: stats.state || "100+", label: "State & Local" },
              { value: "$100B+", label: "Est. Available" },
            ].map(({ value, label }) => (
              <span key={label} className="glass-overlay px-4 py-2 flex items-baseline gap-1.5">
                <strong className="text-white text-lg font-bold">{value}</strong>
                <span className="text-brand-300 text-xs">{label}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sticky Filter Bar ────────────────────────────────────────────── */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
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

        <ResultsGrid
          incentives={results?.data ?? []}
          loading={loading}
          error={error}
        />

        {/* Pagination */}
        {results && results.totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-10">
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
        )}
      </section>
    </div>
  );
}

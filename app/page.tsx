"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { FilterSidebar } from "@/components/FilterSidebar";
import { ResultsGrid } from "@/components/ResultsGrid";
import { BusinessIntakeChat } from "@/components/BusinessIntakeChat";
import { cn } from "@/lib/utils";
import type { Incentive, IncentiveFilters, PaginatedResponse } from "@/lib/types";

const DEFAULT_FILTERS: IncentiveFilters = {
  search: "",
  status: "ACTIVE",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  pageSize: 24,
};

// ── Inline sort select ────────────────────────────────────────────────────────
function SortSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 pr-7 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-forest-700 cursor-pointer"
      >
        <option value="createdAt_desc">Newest</option>
        <option value="createdAt_asc">Oldest</option>
        <option value="fundingAmount_desc">Highest $</option>
        <option value="fundingAmount_asc">Lowest $</option>
        <option value="deadline_asc">Deadline ↑</option>
        <option value="deadline_desc">Deadline ↓</option>
      </select>
      <ChevronDown
        size={11}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
    </div>
  );
}

export default function HomePage() {
  const [filters, setFilters] = useState<IncentiveFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<PaginatedResponse<Incentive> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      params.set("pageSize", String(f.pageSize ?? 24));

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

  const clearAllFilters = useCallback(() => {
    handleFilterChange({
      jurisdictionLevel: undefined,
      jurisdictionName: undefined,
      incentiveType: undefined,
      industryCategory: undefined,
    });
  }, [handleFilterChange]);

  useEffect(() => {
    fetchIncentives(DEFAULT_FILTERS);
  }, [fetchIncentives]);

  const sortValue = `${filters.sortBy ?? "createdAt"}_${filters.sortOrder ?? "desc"}`;
  const handleSortChange = (v: string) => {
    const [sortBy, sortOrder] = v.split("_");
    handleFilterChange({
      sortBy: sortBy as IncentiveFilters["sortBy"],
      sortOrder: sortOrder as "asc" | "desc",
    });
  };

  const activeFilterCount = [
    filters.jurisdictionLevel,
    filters.jurisdictionName,
    filters.incentiveType,
    filters.industryCategory,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0 || !!filters.search;

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-section relative text-white pt-16 pb-0 overflow-hidden">
        {/* Forest horizon */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-forest-900/20 to-transparent pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-7 backdrop-blur-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Free resource · all 50 states · updated daily
          </div>

          {/* H1 */}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.08] mb-4 text-balance">
            Search government programs
          </h1>

          <p className="text-white/55 text-lg mb-9 max-w-xl mx-auto leading-relaxed">
            Grants, credits, loans &amp; rebates — all 50 states.
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto mb-2">
            <SearchBar
              value={filters.search ?? ""}
              onChange={(search) => handleFilterChange({ search })}
              placeholder="Search programs, agencies, industries…"
              className="shadow-[0_4px_32px_rgba(0,0,0,0.35)] rounded-xl"
            />
          </div>

          {/* Inline AI intake */}
          <BusinessIntakeChat />

          {/* Stats strip */}
          <div className="mt-10 -mx-4 sm:-mx-6 lg:-mx-8 bg-black/20 border-t border-white/8 px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-center gap-8 sm:gap-12 flex-wrap">
              {[
                { value: results?.total ?? "—", label: "programs" },
                { value: "All 50", label: "states covered" },
                { value: "$4.2B+", label: "available funding" },
                { value: "Daily", label: "updates" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="stat-number text-xl font-bold text-white leading-tight">
                    {typeof value === "number" ? value.toLocaleString() : value}
                  </div>
                  <div className="text-white/40 text-[11px] font-medium uppercase tracking-wide mt-0.5">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Browse ───────────────────────────────────────────────────────── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Mobile filter button row */}
        <div className="lg:hidden flex items-center gap-3 mb-5">
          <button
            onClick={() => setSidebarOpen(true)}
            className={cn(
              "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors",
              activeFilterCount > 0
                ? "border-forest-700 bg-forest-50 text-forest-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-forest-700 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <span className="text-sm text-slate-500 tabular-nums flex-1">
            <span className="font-semibold text-slate-700">{results?.total?.toLocaleString() ?? "—"}</span>{" "}
            programs
          </span>

          <SortSelect value={sortValue} onChange={handleSortChange} />
        </div>

        {/* Desktop flex row */}
        <div className="flex gap-8">
          {/* Sidebar — desktop only */}
          <FilterSidebar
            filters={filters}
            onChange={handleFilterChange}
            totalResults={results?.total ?? 0}
            className="hidden lg:block w-56 flex-shrink-0 sticky top-20 self-start max-h-[calc(100vh-5rem)] overflow-y-auto"
          />

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Desktop results header */}
            <div className="hidden lg:flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500 tabular-nums">
                <span className="font-semibold text-slate-800">
                  {results?.total?.toLocaleString() ?? "—"}
                </span>{" "}
                programs found
                {activeFilterCount > 0 && (
                  <span className="ml-1 text-slate-400">
                    · {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
                  </span>
                )}
              </p>
              <SortSelect value={sortValue} onChange={handleSortChange} />
            </div>

            <ResultsGrid
              incentives={results?.data ?? []}
              loading={loading}
              error={error}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearAllFilters}
            />

            {/* Pagination */}
            {results && results.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  disabled={filters.page === 1}
                  onClick={() => {
                    const newFilters = { ...filters, page: (filters.page ?? 1) - 1 };
                    setFilters(newFilters);
                    fetchIncentives(newFilters);
                    window.scrollTo({ top: 0, behavior: "smooth" });
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
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="btn-ghost border border-slate-200 disabled:opacity-40 text-sm px-4"
                >
                  Next →
                </button>
              </div>
            )}
          </main>
        </div>
      </section>

      {/* ── Mobile sidebar drawer ────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Drawer */}
          <div
            className="absolute inset-y-0 left-0 w-80 max-w-[90vw] bg-white shadow-2xl flex flex-col animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
              <span className="font-semibold text-slate-800 text-sm">Filters</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <FilterSidebar
                filters={filters}
                onChange={(partial) => {
                  handleFilterChange(partial);
                }}
                totalResults={results?.total ?? 0}
              />
            </div>
            <div className="px-4 py-4 border-t border-slate-100">
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full btn-primary py-2.5"
              >
                Show {results?.total?.toLocaleString() ?? ""} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

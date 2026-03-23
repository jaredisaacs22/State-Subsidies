"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Zap, Flame, BatteryCharging, Hammer, Truck, Sprout, Factory, Leaf, HeartPulse, Building2, Utensils, FlaskConical } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { FilterBar } from "@/components/FilterBar";
import { ResultsGrid } from "@/components/ResultsGrid";
import type { Incentive, IncentiveFilters, PaginatedResponse } from "@/lib/types";

const CATEGORY_CARDS = [
  { label: "EV Charging",            icon: Zap,           color: "text-violet-600", bg: "bg-violet-50",  border: "border-violet-200" },
  { label: "Building Electrification",icon: Flame,         color: "text-orange-600", bg: "bg-orange-50",  border: "border-orange-200" },
  { label: "Energy Storage",         icon: BatteryCharging,color: "text-teal-600",   bg: "bg-teal-50",    border: "border-teal-200"   },
  { label: "Construction",           icon: Hammer,         color: "text-amber-600",  bg: "bg-amber-50",   border: "border-amber-200"  },
  { label: "Fleet",                  icon: Truck,          color: "text-sky-600",    bg: "bg-sky-50",     border: "border-sky-200"    },
  { label: "Agriculture",            icon: Sprout,         color: "text-green-600",  bg: "bg-green-50",   border: "border-green-200"  },
  { label: "Manufacturing",          icon: Factory,        color: "text-stone-600",  bg: "bg-stone-50",   border: "border-stone-200"  },
  { label: "Clean Technology",       icon: Leaf,           color: "text-emerald-600",bg: "bg-emerald-50", border: "border-emerald-200"},
  { label: "Healthcare",             icon: HeartPulse,     color: "text-rose-600",   bg: "bg-rose-50",    border: "border-rose-200"   },
  { label: "Real Estate",            icon: Building2,      color: "text-stone-600",  bg: "bg-stone-50",   border: "border-stone-200"  },
  { label: "Hospitality",            icon: Utensils,       color: "text-pink-600",   bg: "bg-pink-50",    border: "border-pink-200"   },
  { label: "Research & Development", icon: FlaskConical,   color: "text-purple-600", bg: "bg-purple-50",  border: "border-purple-200" },
];

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
            Search grants, tax credits, rebates, and loans across Federal, State, City, and Agency programs — all 50 states covered.
          </p>

          <SearchBar
            value={filters.search ?? ""}
            onChange={(search) => handleFilterChange({ search })}
            placeholder="Search programs, agencies, industries…"
            className="max-w-2xl mx-auto"
          />

          {/* Animated stats */}
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm">
            <span className="glass-overlay px-4 py-2">
              <strong className="text-white text-lg">{stats.total || "100+"}</strong>
              <span className="text-brand-200 ml-1.5">Programs</span>
            </span>
            <span className="glass-overlay px-4 py-2">
              <strong className="text-white text-lg">{stats.federal || "24+"}</strong>
              <span className="text-brand-200 ml-1.5">Federal</span>
            </span>
            <span className="glass-overlay px-4 py-2">
              <strong className="text-white text-lg">{stats.state || "40+"}</strong>
              <span className="text-brand-200 ml-1.5">State</span>
            </span>
            <span className="glass-overlay px-4 py-2">
              <strong className="text-white text-lg">$100B+</strong>
              <span className="text-brand-200 ml-1.5">Est. Available</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Category Icon Grid ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-lg font-semibold text-slate-800 mb-5">Browse by Industry</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-10">
          {CATEGORY_CARDS.map(({ label, icon: Icon, color, bg, border }) => (
            <button
              key={label}
              onClick={() => handleFilterChange({ industryCategory: filters.industryCategory === label ? undefined : label })}
              className={`card-category p-4 flex flex-col items-center gap-2 text-center border ${border} ${
                filters.industryCategory === label ? "ring-2 ring-brand-500" : ""
              }`}
            >
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={20} className={color} />
              </div>
              <span className="text-xs font-medium text-slate-700 leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Filter & Results ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
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

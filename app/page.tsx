"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, SlidersHorizontal, X, Link2, Check } from "lucide-react";
import { FilterSidebar } from "@/components/FilterSidebar";
import { ResultsGrid } from "@/components/ResultsGrid";
import { BusinessIntakeChat } from "@/components/BusinessIntakeChat";
import { AudienceSelector, AUDIENCES } from "@/components/AudienceSelector";
import type { AudienceId } from "@/components/AudienceSelector";
import { cn, fmtMoney } from "@/lib/utils";
import { Stat } from "@/components/Stat";
import type { Incentive, IncentiveFilters, PaginatedResponse } from "@/lib/types";

const DEFAULT_FILTERS: IncentiveFilters = {
  search: "",
  status: "ACTIVE",
  sortBy: "relevance",
  sortOrder: "desc",
  page: 1,
  pageSize: 24,
};

function readFiltersFromURL(): Partial<IncentiveFilters> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Partial<IncentiveFilters> = {};
  if (p.get("search")) out.search = p.get("search")!;
  if (p.get("jurisdictionLevel")) out.jurisdictionLevel = p.get("jurisdictionLevel") as IncentiveFilters["jurisdictionLevel"];
  if (p.get("jurisdictionName")) out.jurisdictionName = p.get("jurisdictionName")!;
  if (p.get("incentiveType")) out.incentiveType = p.get("incentiveType") as IncentiveFilters["incentiveType"];
  if (p.get("industryCategory")) out.industryCategory = p.get("industryCategory")!;
  if (p.get("excludeIndustryCategory")) out.excludeIndustryCategory = p.get("excludeIndustryCategory")!;
  if (p.get("sortBy")) out.sortBy = p.get("sortBy") as IncentiveFilters["sortBy"];
  if (p.get("sortOrder")) out.sortOrder = p.get("sortOrder") as "asc" | "desc";
  if (p.get("minFunding")) out.minFunding = parseInt(p.get("minFunding")!);
  if (p.get("verified") === "true") out.verified = true;
  if (p.get("closingSoon") === "true") out.closingSoon = true;
  if (p.get("page")) out.page = parseInt(p.get("page")!);
  if (p.get("applicantType")) out.applicantType = p.get("applicantType") as IncentiveFilters["applicantType"];
  return out;
}

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
        <option value="relevance_desc">Featured</option>
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

// ── Share button ──────────────────────────────────────────────────────────────
function ShareButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-forest-700 transition-colors"
      title="Copy link to these results"
    >
      {copied ? <Check size={12} /> : <Link2 size={12} />}
      {copied ? "Copied!" : "Share"}
    </button>
  );
}

export default function HomePage() {
  const [filters, setFilters] = useState<IncentiveFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<PaginatedResponse<Incentive> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<AudienceId | null>(null);
  const [stats, setStats] = useState<{
    federal: number; state: number; city: number; agency: number;
    medianAward: number | null; largestActive: number | null; asOf: string | null;
  } | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {});
  }, []);

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
      if (f.excludeIndustryCategory) params.set("excludeIndustryCategory", f.excludeIndustryCategory);
      if (f.status) params.set("status", f.status);
      if (f.sortBy) params.set("sortBy", f.sortBy);
      if (f.sortOrder) params.set("sortOrder", f.sortOrder);
      if (f.minFunding !== undefined) params.set("minFunding", String(f.minFunding));
      if (f.maxFunding !== undefined) params.set("maxFunding", String(f.maxFunding));
      if (f.verified) params.set("verified", "true");
      if (f.closingSoon) params.set("closingSoon", "true");
      if (f.applicantType) params.set("applicantType", f.applicantType);
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
    localStorage.removeItem("ss_audience_v1");
    setSelectedAudience(null);
    handleFilterChange({
      search: "",
      jurisdictionLevel: undefined,
      jurisdictionName: undefined,
      incentiveType: undefined,
      industryCategory: undefined,
      excludeIndustryCategory: undefined,
      minFunding: undefined,
      maxFunding: undefined,
      verified: undefined,
      closingSoon: undefined,
    });
  }, [handleFilterChange]);

  // Single mount effect: reads URL params + stored audience, then fetches once
  useEffect(() => {
    const urlFilters = readFiltersFromURL();
    const hasUrlFilters = Object.keys(urlFilters).length > 0;

    // Restore stored audience selection (visual state always)
    const stored = localStorage.getItem("ss_audience_v1");
    const storedAudience = stored && AUDIENCES.some((a) => a.id === stored)
      ? (stored as AudienceId)
      : null;
    if (storedAudience) setSelectedAudience(storedAudience);

    // Build initial filters: URL params take precedence; fall back to audience preset
    let initial: IncentiveFilters = DEFAULT_FILTERS;
    if (hasUrlFilters) {
      initial = { ...DEFAULT_FILTERS, ...urlFilters };
    } else if (storedAudience) {
      const preset = AUDIENCES.find((a) => a.id === storedAudience)?.filterPreset ?? {};
      initial = { ...DEFAULT_FILTERS, ...preset };
    }

    if (initial !== DEFAULT_FILTERS) setFilters(initial);
    fetchIncentives(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAudienceSelect = useCallback(
    (filterPreset: Partial<IncentiveFilters>, audienceId: AudienceId) => {
      // Toggle off if clicking the same audience again
      if (selectedAudience === audienceId) {
        localStorage.removeItem("ss_audience_v1");
        setSelectedAudience(null);
        handleFilterChange({ industryCategory: undefined, excludeIndustryCategory: undefined, jurisdictionLevel: undefined, incentiveType: undefined });
        return;
      }
      localStorage.setItem("ss_audience_v1", audienceId);
      setSelectedAudience(audienceId);
      // Clear all audience-related fields first so switching audiences never stacks
      handleFilterChange({
        industryCategory: undefined,
        excludeIndustryCategory: undefined,
        jurisdictionLevel: undefined,
        incentiveType: undefined,
        ...filterPreset,
      });
    },
    [handleFilterChange, selectedAudience]
  );

  const handleAudienceClear = useCallback(() => {
    localStorage.removeItem("ss_audience_v1");
    setSelectedAudience(null);
    handleFilterChange({ industryCategory: undefined, excludeIndustryCategory: undefined, jurisdictionLevel: undefined, incentiveType: undefined });
  }, [handleFilterChange]);

  const sortValue = `${filters.sortBy ?? "relevance"}_${filters.sortOrder ?? "desc"}`;
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
    filters.minFunding,
    filters.verified,
    filters.closingSoon,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0 || !!filters.search;

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-section relative text-white pt-16 pb-0 overflow-hidden">
        {/* Subtle grid overlay */}
        <div className="hero-grid absolute inset-0 pointer-events-none" />
        {/* Ambient center glow */}
        <div className="hero-glow absolute inset-0 pointer-events-none" />
        {/* Forest horizon */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* H1 */}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] font-extrabold tracking-[-0.02em] leading-[1.06] mb-4 text-balance">
            Find government money<br className="hidden sm:block" /> for your business
          </h1>

          <p className="text-white/50 text-lg mb-9 max-w-xl mx-auto leading-relaxed">
            Grants, tax credits, loans &amp; rebates across every state and federal agency.<br className="hidden sm:block" />
            Tell us about your business and we&apos;ll find what you qualify for.
          </p>

          {/* Inline AI intake + search */}
          <BusinessIntakeChat onSearch={(search) => {
            handleFilterChange({ search });
            document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" });
          }} />

          {/* Agency trust strip */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span className="text-white/30 text-[11px] uppercase tracking-widest font-medium">Sourced from</span>
            {["USDA", "IRS", "DOE", "EPA", "SBA", "HUD", "CARB", "NYSERDA", "EDA"].map((agency) => (
              <span key={agency} className="text-white/45 text-[11px] font-semibold tracking-wide hover:text-white/65 transition-colors cursor-default">
                {agency}
              </span>
            ))}
            <span className="text-white/25 text-[11px]">+ more</span>
          </div>

          {/* Stats strip — SS-005: all figures live from DB, no hardcoded numbers.
              flex-wrap with gap-y-6 prevents wrapped rows from overlapping; each
              item is fixed-width so the row breaks cleanly instead of mid-Stat. */}
          <div className="mt-10 -mx-4 sm:-mx-6 lg:-mx-8 bg-black/25 border-t border-white/[0.07] px-4 sm:px-6 lg:px-8 py-5 backdrop-blur-sm">
            <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-6">
              {(() => {
                const asOf = stats?.asOf ? new Date(stats.asOf) : null;
                const items = [
                  { value: results?.total ?? "—", label: "Programs" },
                  { value: stats?.federal ?? "—", label: "Federal" },
                  { value: stats?.state ?? "—", label: "State" },
                  { value: stats != null ? (stats.city + stats.agency) : "—", label: "Local & Agency" },
                  { value: fmtMoney(stats?.largestActive), label: "Largest active" },
                  { value: fmtMoney(stats?.medianAward), label: "Median award" },
                ];
                return items.map(({ value, label }, i) => (
                  <div key={label} className="flex items-center gap-x-6">
                    <Stat
                      value={value}
                      label={label}
                      asOf={asOf}
                      methodologyAnchor="how-we-count"
                      dark
                    />
                    {i < items.length - 1 && <div className="w-px h-8 bg-white/[0.08] flex-shrink-0" />}
                  </div>
                ));
              })()}
              <a
                href="#browse"
                className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/45 hover:text-white/80 transition-colors border border-white/[0.12] hover:border-white/25 rounded-full px-3.5 py-1.5"
              >
                Browse all →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Hero → content gradient bridge ───────────────────────────────── */}
      <div className="h-px bg-gradient-to-r from-transparent via-forest-600/40 to-transparent" />

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section aria-label="How StateSubsidies works" className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-3">
            <span className="font-semibold text-slate-400 uppercase tracking-widest text-[10px] mr-4">How it works</span>
            {[
              { n: "1", text: "Search or ask the AI" },
              { n: "2", text: "Check if you qualify" },
              { n: "3", text: "Apply directly — free" },
            ].map(({ n, text }, i) => (
              <div key={n} className="flex items-center gap-1">
                <span className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] text-slate-600 font-medium">
                  <span className="w-5 h-5 rounded-full bg-forest-700 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0" aria-hidden>{n}</span>
                  {text}
                </span>
                {i < 2 && <span className="text-slate-300 text-xs mx-1 hidden sm:inline">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Browse ───────────────────────────────────────────────────────── */}
      <section id="browse" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

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

        {/* Audience selector — always visible, allows quick persona-based filtering */}
        <AudienceSelector
          onSelect={handleAudienceSelect}
          selectedId={selectedAudience}
          onClear={handleAudienceClear}
          className="mb-3"
        />

        {/* Active filter chips + master reset */}
        {(filters.search || hasActiveFilters || selectedAudience) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {filters.search && (
              <span className="inline-flex items-center gap-1.5 text-[12px] bg-forest-50 text-forest-800 border border-forest-200 rounded-full px-3 py-1 font-medium">
                &ldquo;{filters.search}&rdquo;
                <button
                  onClick={() => handleFilterChange({ search: "" })}
                  className="hover:text-forest-900 flex-shrink-0"
                  aria-label="Clear search"
                >
                  <X size={11} />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-800 border border-slate-200 bg-white hover:border-slate-300 rounded-full px-3 py-1 font-medium transition-colors"
            >
              <X size={11} />
              Reset all
            </button>
          </div>
        )}

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
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-slate-500 tabular-nums">
                  {results ? (
                    <>
                      Showing{" "}
                      <span className="font-semibold text-slate-800">
                        {(((filters.page ?? 1) - 1) * (filters.pageSize ?? 24) + 1).toLocaleString()}
                        –
                        {Math.min((filters.page ?? 1) * (filters.pageSize ?? 24), results.total).toLocaleString()}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-slate-800">{results.total.toLocaleString()}</span>
                      {activeFilterCount > 0 && (
                        <span className="text-slate-400"> · {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}</span>
                      )}
                    </>
                  ) : (
                    <span className="font-semibold text-slate-800">—</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {(hasActiveFilters || !!filters.search) && (
                  <ShareButton url={typeof window !== "undefined" ? window.location.href : ""} />
                )}
                <SortSelect value={sortValue} onChange={handleSortChange} />
              </div>
            </div>

            <ResultsGrid
              incentives={results?.data ?? []}
              loading={loading}
              error={error}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearAllFilters}
              searchQuery={filters.search}
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

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, SlidersHorizontal, X, Link2, Check } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { FilterSidebar } from "@/components/FilterSidebar";
import { ResultsGrid } from "@/components/ResultsGrid";
import { BusinessIntakeChat } from "@/components/BusinessIntakeChat";
import { AudienceSelector, AUDIENCES } from "@/components/AudienceSelector";
import type { AudienceId } from "@/components/AudienceSelector";
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

function readFiltersFromURL(): Partial<IncentiveFilters> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Partial<IncentiveFilters> = {};
  if (p.get("search")) out.search = p.get("search")!;
  if (p.get("jurisdictionLevel")) out.jurisdictionLevel = p.get("jurisdictionLevel") as IncentiveFilters["jurisdictionLevel"];
  if (p.get("jurisdictionName")) out.jurisdictionName = p.get("jurisdictionName")!;
  if (p.get("incentiveType")) out.incentiveType = p.get("incentiveType") as IncentiveFilters["incentiveType"];
  if (p.get("industryCategory")) out.industryCategory = p.get("industryCategory")!;
  if (p.get("sortBy")) out.sortBy = p.get("sortBy") as IncentiveFilters["sortBy"];
  if (p.get("sortOrder")) out.sortOrder = p.get("sortOrder") as "asc" | "desc";
  if (p.get("minFunding")) out.minFunding = parseInt(p.get("minFunding")!);
  if (p.get("verified") === "true") out.verified = true;
  if (p.get("closingSoon") === "true") out.closingSoon = true;
  if (p.get("page")) out.page = parseInt(p.get("page")!);
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
  const [stats, setStats] = useState<{ federal: number; state: number; city: number; agency: number } | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  const fetchIncentives = useCallback(async (f: IncentiveFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      // Sync URL (for shareability) — only non-default values
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams();
        if (f.search) urlParams.set("search", f.search);
        if (f.jurisdictionLevel) urlParams.set("jurisdictionLevel", f.jurisdictionLevel);
        if (f.jurisdictionName) urlParams.set("jurisdictionName", f.jurisdictionName);
        if (f.incentiveType) urlParams.set("incentiveType", f.incentiveType);
        if (f.industryCategory) urlParams.set("industryCategory", f.industryCategory);
        if (f.sortBy && f.sortBy !== "createdAt") urlParams.set("sortBy", f.sortBy);
        if (f.sortOrder && f.sortOrder !== "desc") urlParams.set("sortOrder", f.sortOrder);
        if (f.minFunding) urlParams.set("minFunding", String(f.minFunding));
        if (f.verified) urlParams.set("verified", "true");
        if (f.closingSoon) urlParams.set("closingSoon", "true");
        if (f.page && f.page > 1) urlParams.set("page", String(f.page));
        const qs = urlParams.toString();
        window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
      }
      if (f.search) params.set("search", f.search);
      if (f.jurisdictionLevel) params.set("jurisdictionLevel", f.jurisdictionLevel);
      if (f.jurisdictionName) params.set("jurisdictionName", f.jurisdictionName);
      if (f.incentiveType) params.set("incentiveType", f.incentiveType);
      if (f.industryCategory) params.set("industryCategory", f.industryCategory);
      if (f.status) params.set("status", f.status);
      if (f.sortBy) params.set("sortBy", f.sortBy);
      if (f.sortOrder) params.set("sortOrder", f.sortOrder);
      if (f.minFunding !== undefined) params.set("minFunding", String(f.minFunding));
      if (f.maxFunding !== undefined) params.set("maxFunding", String(f.maxFunding));
      if (f.verified) params.set("verified", "true");
      if (f.closingSoon) params.set("closingSoon", "true");
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
        handleFilterChange({ industryCategory: undefined, jurisdictionLevel: undefined, incentiveType: undefined });
        return;
      }
      localStorage.setItem("ss_audience_v1", audienceId);
      setSelectedAudience(audienceId);
      handleFilterChange(filterPreset);
    },
    [handleFilterChange, selectedAudience]
  );

  const handleAudienceClear = useCallback(() => {
    localStorage.removeItem("ss_audience_v1");
    setSelectedAudience(null);
    handleFilterChange({ industryCategory: undefined, jurisdictionLevel: undefined, incentiveType: undefined });
  }, [handleFilterChange]);

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
    filters.minFunding,
    filters.verified,
    filters.closingSoon,
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
            Find government money<br className="hidden sm:block" /> for your business
          </h1>

          <p className="text-white/55 text-lg mb-9 max-w-xl mx-auto leading-relaxed">
            Grants, tax credits, loans &amp; rebates — federal and all 50 states.<br className="hidden sm:block" />
            Tell us about your situation and we'll find what you qualify for.
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

          {/* Stats strip */}
          <div className="mt-10 -mx-4 sm:-mx-6 lg:-mx-8 bg-black/20 border-t border-white/8 px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
              {[
                { value: results?.total ?? "—", label: "total programs" },
                { value: stats?.federal ?? "—", label: "federal" },
                { value: stats?.state ?? "—", label: "state-level" },
                { value: (stats != null ? (stats.city + stats.agency) : "—"), label: "local / agency" },
                { value: "$4.2B+", label: "available funding" },
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

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section aria-label="How StateSubsidies works" className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-6">How it works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "1", icon: "🔍", title: "Search or tell the AI your situation", body: "Use the search bar to browse by keyword, or tap 'Get Matched' and answer 4 quick questions. No expertise required." },
              { step: "2", icon: "✅", title: "Check if you qualify", body: "Each program card has a 'Do I qualify?' button. Answer a few yes/no questions and get an instant confidence score before you apply." },
              { step: "3", icon: "💰", title: "Apply directly to the agency", body: "Every program links to the official government or agency page. No middleman, no fees — just free access to funding you've earned." },
            ].map(({ step, icon, title, body }) => (
              <div key={step} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-forest-700 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5" aria-hidden>
                  {step}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-800 mb-1">{icon} {title}</p>
                  <p className="text-[12px] text-slate-500 leading-relaxed">{body}</p>
                </div>
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
          className="mb-6"
        />

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
                {activeFilterCount > 0 && (
                  <button onClick={clearAllFilters} className="text-xs text-slate-400 hover:text-forest-700 transition-colors underline underline-offset-2">
                    Clear all
                  </button>
                )}
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

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, X, Bookmark, Bell, Check } from "lucide-react";
import { useBookmarks } from "@/lib/useBookmarks";
import {
  INCENTIVE_TYPE_LABELS,
  INDUSTRY_CATEGORY_GROUPS,
  JURISDICTION_LABELS,
} from "@/lib/types";
import type { IncentiveFilters, IncentiveType, JurisdictionLevel } from "@/lib/types";

const FUNDING_OPTIONS: { label: string; min?: number; max?: number }[] = [
  { label: "Any amount" },
  { label: "$1K+",   min: 1_000 },
  { label: "$10K+",  min: 10_000 },
  { label: "$100K+", min: 100_000 },
  { label: "$500K+", min: 500_000 },
  { label: "$1M+",   min: 1_000_000 },
];
import { cn } from "@/lib/utils";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

interface FilterSidebarProps {
  filters: IncentiveFilters;
  onChange: (partial: Partial<IncentiveFilters>) => void;
  totalResults: number;
  className?: string;
}

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full py-2 text-left group"
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 group-hover:text-slate-500 transition-colors">
          {title}
        </span>
        <ChevronDown
          size={13}
          className={cn(
            "text-slate-300 group-hover:text-slate-400 transition-all flex-shrink-0",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}

function ListItem({
  label,
  active,
  onClick,
  indent = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors leading-snug",
        indent && "pl-4",
        active
          ? "bg-forest-700 text-white font-medium"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      {label}
    </button>
  );
}

function BookmarksWidget() {
  const { bookmarks } = useBookmarks();
  if (bookmarks.length === 0) return null;
  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <Link
        href="/saved"
        className="flex items-center gap-2 text-sm text-forest-700 hover:text-forest-800 font-medium transition-colors"
      >
        <Bookmark size={13} className="fill-current" />
        {bookmarks.length} saved program{bookmarks.length !== 1 ? "s" : ""}
      </Link>
    </div>
  );
}

function EmailAlertWidget() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("ss_alert_email")) setSubmitted(true);
    } catch {}
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    try { localStorage.setItem("ss_alert_email", trimmed); } catch {}
    setSubmitted(true);
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <div className="flex items-center gap-1.5 mb-2">
        <Bell size={11} className="text-slate-400" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          New Program Alerts
        </span>
      </div>
      {submitted ? (
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-2">
          <Check size={12} />
          You&apos;ll be notified of new programs
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-1.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full text-xs rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-700 focus:border-forest-700"
          />
          <button
            type="submit"
            className="w-full text-xs bg-forest-700 text-white rounded-md py-1.5 font-medium hover:bg-forest-800 transition-colors"
          >
            Notify me
          </button>
          <p className="text-[10px] text-slate-400 leading-snug">
            Get notified when new programs are added in your area.
          </p>
        </form>
      )}
    </div>
  );
}

export function FilterSidebar({
  filters,
  onChange,
  totalResults,
  className,
}: FilterSidebarProps) {
  const [stateQuery, setStateQuery] = useState("");

  const activeCount = [
    filters.jurisdictionLevel,
    filters.jurisdictionName,
    filters.incentiveType,
    filters.industryCategory,
    filters.minFunding,
    filters.verified,
    filters.closingSoon,
  ].filter(Boolean).length;

  const clearAll = () =>
    onChange({
      jurisdictionLevel: undefined,
      jurisdictionName: undefined,
      incentiveType: undefined,
      industryCategory: undefined,
      minFunding: undefined,
      maxFunding: undefined,
      verified: undefined,
      closingSoon: undefined,
    });

  const filteredStates = stateQuery.trim()
    ? US_STATES.filter((s) =>
        s.toLowerCase().includes(stateQuery.toLowerCase())
      )
    : US_STATES;

  return (
    <aside className={cn("space-y-1", className)}>
      {/* Header: count or clear-all */}
      <div className="pb-3 mb-1 border-b border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 tabular-nums">
          <span className="font-semibold text-slate-600">{totalResults.toLocaleString()}</span> programs
        </span>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-[11px] font-medium text-forest-700 hover:text-forest-800 transition-colors"
          >
            <X size={11} />
            Clear all ({activeCount})
          </button>
        )}
      </div>

      {/* ── Industry ─────────────────────────────────────── */}
      <Section title="Industry" defaultOpen>
        <div className="space-y-0.5">
          <ListItem
            label="All industries"
            active={!filters.industryCategory}
            onClick={() => onChange({ industryCategory: undefined })}
          />
          {INDUSTRY_CATEGORY_GROUPS.map((group) => (
            <div key={group.label} className="mt-2 first:mt-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2.5 py-1 select-none">
                {group.label}
              </p>
              {group.options.map((opt) => (
                <ListItem
                  key={opt}
                  label={opt}
                  active={filters.industryCategory === opt}
                  onClick={() =>
                    onChange({
                      industryCategory:
                        filters.industryCategory === opt ? undefined : opt,
                    })
                  }
                  indent
                />
              ))}
            </div>
          ))}
        </div>
      </Section>

      {/* ── State ────────────────────────────────────────── */}
      <Section title="State" defaultOpen>
        <div className="mb-2">
          <input
            type="text"
            value={stateQuery}
            onChange={(e) => setStateQuery(e.target.value)}
            placeholder="Search states…"
            className="w-full text-xs rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-700 focus:border-forest-700"
          />
        </div>
        <div className="max-h-44 overflow-y-auto space-y-0.5 pr-0.5">
          {!stateQuery && (
            <ListItem
              label="All states"
              active={!filters.jurisdictionName}
              onClick={() => onChange({ jurisdictionName: undefined })}
            />
          )}
          {filteredStates.map((s) => (
            <ListItem
              key={s}
              label={s}
              active={filters.jurisdictionName === s}
              onClick={() =>
                onChange({
                  jurisdictionName:
                    filters.jurisdictionName === s ? undefined : s,
                })
              }
            />
          ))}
        </div>
      </Section>

      {/* ── Incentive Type ───────────────────────────────── */}
      <Section title="Incentive Type" defaultOpen>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(INCENTIVE_TYPE_LABELS) as [IncentiveType, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() =>
                  onChange({
                    incentiveType:
                      filters.incentiveType === key ? undefined : key,
                  })
                }
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors font-medium",
                  filters.incentiveType === key
                    ? "bg-forest-700 text-white border-forest-700"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                )}
              >
                {label}
              </button>
            )
          )}
        </div>
      </Section>

      {/* ── Scope ────────────────────────────────────────── */}
      <Section title="Scope" defaultOpen={false}>
        <div className="space-y-0.5">
          <ListItem
            label="All scopes"
            active={!filters.jurisdictionLevel}
            onClick={() => onChange({ jurisdictionLevel: undefined })}
          />
          {(Object.entries(JURISDICTION_LABELS) as [JurisdictionLevel, string][]).map(
            ([key, label]) => (
              <ListItem
                key={key}
                label={label}
                active={filters.jurisdictionLevel === key}
                onClick={() =>
                  onChange({
                    jurisdictionLevel:
                      filters.jurisdictionLevel === key ? undefined : key,
                  })
                }
              />
            )
          )}
        </div>
      </Section>

      {/* ── Funding Amount ───────────────────────────────── */}
      <Section title="Min. Funding" defaultOpen={false}>
        <div className="flex flex-wrap gap-1.5">
          {FUNDING_OPTIONS.map((opt) => {
            const active = opt.min === undefined
              ? !filters.minFunding
              : filters.minFunding === opt.min;
            return (
              <button
                key={opt.label}
                onClick={() =>
                  onChange({ minFunding: opt.min, maxFunding: undefined })
                }
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors font-medium",
                  active
                    ? "bg-forest-700 text-white border-forest-700"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Quality & Urgency ───────────────────────────── */}
      <Section title="Quality & Urgency" defaultOpen={false}>
        <div className="space-y-0.5">
          {[
            { label: "Verified programs only", field: "verified" as const },
            { label: "Closing in 30 days", field: "closingSoon" as const },
          ].map(({ label, field }) => {
            const active = !!filters[field];
            return (
              <button
                key={field}
                onClick={() => onChange({ [field]: active ? undefined : true })}
                className={cn(
                  "flex items-center gap-2 w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors",
                  active
                    ? "bg-forest-700 text-white font-medium"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <span className={cn("w-3 h-3 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                  active ? "border-white bg-white" : "border-slate-400"
                )}>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-forest-700" />}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      <BookmarksWidget />
      <EmailAlertWidget />
    </aside>
  );
}

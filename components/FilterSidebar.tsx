"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import {
  INCENTIVE_TYPE_LABELS,
  INDUSTRY_CATEGORY_GROUPS,
  JURISDICTION_LABELS,
} from "@/lib/types";
import type { IncentiveFilters, IncentiveType, JurisdictionLevel } from "@/lib/types";
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
  ].filter(Boolean).length;

  const clearAll = () =>
    onChange({
      jurisdictionLevel: undefined,
      jurisdictionName: undefined,
      incentiveType: undefined,
      industryCategory: undefined,
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
    </aside>
  );
}

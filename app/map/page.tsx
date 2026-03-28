"use client";

import { useState, useEffect } from "react";
import { USStateMap } from "@/components/USStateMap";
import { X, TrendingUp, DollarSign, Clock, Filter } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDeadline } from "@/lib/utils";
import type { Incentive, PaginatedResponse } from "@/lib/types";

interface StateSummary {
  total: number;
  byType: Record<string, number>;
  topFunded: Incentive[];
  closingSoon: Incentive[];
}

const TYPE_LABELS: Record<string, string> = {
  GRANT: "Grants",
  TAX_CREDIT: "Tax Credits",
  LOAN: "Loans",
  POINT_OF_SALE_REBATE: "Rebates",
  VOUCHER: "Vouchers",
  SUBSIDY: "Subsidies",
};

const TYPE_COLORS: Record<string, string> = {
  GRANT: "bg-emerald-500",
  TAX_CREDIT: "bg-violet-500",
  LOAN: "bg-yellow-500",
  POINT_OF_SALE_REBATE: "bg-orange-500",
  VOUCHER: "bg-pink-500",
  SUBSIDY: "bg-sky-500",
};

export default function MapPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [summary, setSummary] = useState<StateSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch all incentives once to build state counts
  useEffect(() => {
    fetch("/api/incentives?pageSize=200&status=ACTIVE")
      .then((r) => r.json())
      .then((data: PaginatedResponse<Incentive>) => {
        const c: Record<string, number> = {};
        for (const inc of data.data) {
          const name = inc.jurisdictionName;
          c[name] = (c[name] ?? 0) + 1;
        }
        setCounts(c);
      })
      .catch(() => {});
  }, []);

  // Fetch detailed data when state selected
  useEffect(() => {
    if (!selected) { setSummary(null); return; }
    setLoading(true);
    fetch(`/api/incentives?pageSize=50&status=ACTIVE&jurisdictionName=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then((data: PaginatedResponse<Incentive>) => {
        const all = data.data;
        const byType: Record<string, number> = {};
        for (const inc of all) {
          byType[inc.incentiveType] = (byType[inc.incentiveType] ?? 0) + 1;
        }
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        setSummary({
          total: data.total,
          byType,
          topFunded: [...all]
            .filter((i) => i.fundingAmount)
            .sort((a, b) => (b.fundingAmount ?? 0) - (a.fundingAmount ?? 0))
            .slice(0, 3),
          closingSoon: [...all]
            .filter((i) => i.deadline && new Date(i.deadline).getTime() - now < thirtyDays && new Date(i.deadline).getTime() > now)
            .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
            .slice(0, 3),
        });
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [selected]);

  const totalPrograms = Object.values(counts).reduce((a, b) => a + b, 0);
  const statesWithPrograms = Object.keys(counts).filter((s) => counts[s] > 0).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Incentives by State</h1>
        <p className="text-slate-500 text-sm">
          {totalPrograms > 0 ? (
            <><span className="font-semibold text-slate-700">{totalPrograms.toLocaleString()}</span> active programs across <span className="font-semibold text-slate-700">{statesWithPrograms}</span> states. Click a state to explore.</>
          ) : "Click any state to explore its programs."}
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <span className="text-xs text-slate-400 font-medium">Programs:</span>
        {[
          { label: "None", cls: "bg-slate-100 border-slate-200" },
          { label: "1–2", cls: "bg-forest-50 border-forest-200" },
          { label: "3–5", cls: "bg-forest-200 border-forest-300" },
          { label: "6–10", cls: "bg-forest-400 border-forest-500" },
          { label: "11+", cls: "bg-forest-700 border-forest-800" },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-4 h-4 rounded-sm border ${cls} inline-block`} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Map */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <USStateMap counts={counts} selected={selected} onSelect={(s) => setSelected(s === selected ? null : s)} />
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
              <div className="w-16 h-16 bg-forest-50 rounded-2xl flex items-center justify-center mb-4 text-3xl">🗺️</div>
              <p className="font-semibold text-slate-800 text-lg mb-1">Select a state</p>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                Click any state on the map to see its active programs, funding breakdown, and deadlines.
              </p>
            </div>
          ) : loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              {[1,2,3,4].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : summary ? (
            <div className="space-y-4">
              {/* State header */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-slate-900 text-xl">{selected}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      <span className="font-semibold text-forest-700">{summary.total}</span> active program{summary.total !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/?jurisdictionName=${encodeURIComponent(selected)}`}
                      className="text-xs bg-forest-700 text-white rounded-lg px-3 py-1.5 font-medium hover:bg-forest-800 transition-colors flex items-center gap-1"
                    >
                      <Filter size={11} />
                      Browse all
                    </Link>
                    <button onClick={() => setSelected(null)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Program type breakdown */}
                {Object.keys(summary.byType).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Program Types</p>
                    <div className="space-y-1.5">
                      {Object.entries(summary.byType)
                        .sort((a, b) => b[1] - a[1])
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[type] ?? "bg-slate-400"} flex-shrink-0`} />
                            <span className="text-xs text-slate-600 flex-1">{TYPE_LABELS[type] ?? type}</span>
                            <span className="text-xs font-semibold text-slate-800">{count}</span>
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${TYPE_COLORS[type] ?? "bg-slate-400"}`}
                                style={{ width: `${(count / summary.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Top funded */}
              {summary.topFunded.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign size={13} className="text-emerald-600" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Highest Funding</p>
                  </div>
                  <div className="space-y-2.5">
                    {summary.topFunded.map((inc) => (
                      <Link key={inc.slug} href={`/incentives/${inc.slug}`} className="block group">
                        <p className="text-sm font-medium text-slate-800 group-hover:text-forest-700 transition-colors leading-tight line-clamp-1">{inc.title}</p>
                        <p className="text-xs text-emerald-700 font-semibold mt-0.5">{formatCurrency(inc.fundingAmount)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Closing soon */}
              {summary.closingSoon.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={13} className="text-amber-600" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Closing Soon</p>
                  </div>
                  <div className="space-y-2.5">
                    {summary.closingSoon.map((inc) => (
                      <Link key={inc.slug} href={`/incentives/${inc.slug}`} className="block group">
                        <p className="text-sm font-medium text-slate-800 group-hover:text-forest-700 transition-colors leading-tight line-clamp-1">{inc.title}</p>
                        <p className="text-xs text-amber-600 font-medium mt-0.5">{formatDeadline(inc.deadline)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {summary.closingSoon.length === 0 && summary.topFunded.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center text-slate-400 text-sm">
                  No detailed data available for {selected}.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-400 text-sm">
              No programs found for {selected}.
            </div>
          )}
        </div>
      </div>

      {/* Top states table */}
      {Object.keys(counts).length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-widest mb-4">All States — Program Count</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .map(([state, count]) => (
                <button
                  key={state}
                  onClick={() => setSelected(state === selected ? null : state)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                    selected === state
                      ? "border-forest-600 bg-forest-50 text-forest-800 font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:border-forest-400 hover:bg-forest-50"
                  }`}
                >
                  <span className="font-medium block leading-tight truncate">{state}</span>
                  <span className={`text-[11px] ${selected === state ? "text-forest-600" : "text-slate-400"}`}>{count} program{count !== 1 ? "s" : ""}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { USStateMap } from "@/components/USStateMap";
import { IncentiveCard } from "@/components/IncentiveCard";
import { X } from "lucide-react";
import type { Incentive, PaginatedResponse } from "@/lib/types";

export default function MapPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<Incentive[]>([]);
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

  // Fetch filtered results when a state is selected
  useEffect(() => {
    if (!selected) { setResults([]); return; }
    setLoading(true);
    fetch(`/api/incentives?pageSize=50&status=ACTIVE&jurisdictionName=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then((data: PaginatedResponse<Incentive>) => setResults(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Incentives by State</h1>
        <p className="text-slate-500 text-sm mb-4">Click a state to see its incentive programs. Darker shading = more programs.</p>
        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Map */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <USStateMap counts={counts} selected={selected} onSelect={setSelected} />
        </div>

        {/* Results panel */}
        <div>
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 text-lg">{selected}</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  <X size={14} /> Clear
                </button>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map((i) => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
                </div>
              ) : results.length === 0 ? (
                <div className="text-slate-400 text-sm py-10 text-center">No programs found for {selected}.</div>
              ) : (
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  {results.map((inc) => <IncentiveCard key={inc.id} incentive={inc} />)}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-20">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-2xl">🗺️</div>
              <p className="font-medium text-slate-600">Select a state</p>
              <p className="text-sm mt-1">Click any state on the map to see its incentive programs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

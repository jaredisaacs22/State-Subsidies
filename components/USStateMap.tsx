"use client";

import { cn } from "@/lib/utils";

interface USStateMapProps {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (state: string) => void;
  federalCount?: number;
}

// Tile-grid cartogram — geographically accurate positions
// [abbrev, fullName, col, row]
const GRID: [string, string, number, number][] = [
  // Row 0 — ME alone top-right
  ["ME", "Maine",                10, 0],

  // Row 1 — Pacific NW → Great Plains → New England
  ["WA", "Washington",           0, 1],
  ["MT", "Montana",              1, 1],
  ["ND", "North Dakota",         2, 1],
  ["MN", "Minnesota",            3, 1],
  ["VT", "Vermont",              9, 1],
  ["NH", "New Hampshire",       10, 1],

  // Row 2 — Pacific → Great Lakes → Northeast
  ["OR", "Oregon",               0, 2],
  ["ID", "Idaho",                1, 2],
  ["WY", "Wyoming",              2, 2],
  ["SD", "South Dakota",         3, 2],
  ["WI", "Wisconsin",            4, 2],
  ["MI", "Michigan",             5, 2],
  ["NY", "New York",             7, 2],
  ["MA", "Massachusetts",        8, 2],
  ["RI", "Rhode Island",         9, 2],
  ["CT", "Connecticut",         10, 2],

  // Row 3 — California → Midwest → Mid-Atlantic
  ["CA", "California",           0, 3],
  ["NV", "Nevada",               1, 3],
  ["CO", "Colorado",             2, 3],
  ["NE", "Nebraska",             3, 3],
  ["IA", "Iowa",                 4, 3],
  ["IL", "Illinois",             5, 3],
  ["IN", "Indiana",              6, 3],
  ["OH", "Ohio",                 7, 3],
  ["PA", "Pennsylvania",         8, 3],
  ["NJ", "New Jersey",           9, 3],

  // Row 4 — Southwest → South-Central → Mid-Atlantic
  ["AZ", "Arizona",              1, 4],
  ["NM", "New Mexico",           2, 4],
  ["KS", "Kansas",               3, 4],
  ["MO", "Missouri",             4, 4],
  ["KY", "Kentucky",             5, 4],
  ["WV", "West Virginia",        6, 4],
  ["VA", "Virginia",             7, 4],
  ["MD", "Maryland",             8, 4],
  ["DE", "Delaware",             9, 4],
  ["DC", "Washington D.C.",     10, 4],

  // Row 5 — South-Central → Southeast
  ["OK", "Oklahoma",             2, 5],
  ["AR", "Arkansas",             3, 5],
  ["TN", "Tennessee",            4, 5],
  ["NC", "North Carolina",       5, 5],
  ["SC", "South Carolina",       6, 5],

  // Row 6 — AK inset, Texas → Deep South → FL
  ["AK", "Alaska",               0, 6],
  ["TX", "Texas",                2, 6],
  ["LA", "Louisiana",            3, 6],
  ["MS", "Mississippi",          4, 6],
  ["AL", "Alabama",              5, 6],
  ["GA", "Georgia",              6, 6],
  ["FL", "Florida",              7, 6],

  // Row 7 — HI inset
  ["HI", "Hawaii",               0, 7],
];

function getColor(count: number, isSelected: boolean): string {
  if (isSelected) return "bg-forest-700 text-white border-forest-800 scale-105 z-10 relative shadow-md";
  if (count === 0) return "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200";
  if (count <= 2)  return "bg-forest-50 text-forest-700 border-forest-200 hover:bg-forest-100";
  if (count <= 5)  return "bg-forest-200 text-forest-800 border-forest-300 hover:bg-forest-300";
  if (count <= 10) return "bg-forest-400 text-white border-forest-500 hover:bg-forest-500";
  return "bg-forest-700 text-white border-forest-800 hover:bg-forest-800";
}

export function USStateMap({ counts, selected, onSelect, federalCount = 0 }: USStateMapProps) {
  const maxCol = Math.max(...GRID.map(([,, c]) => c));
  const maxRow = Math.max(...GRID.map(([,,, r]) => r));

  const byPos: Record<string, [string, string, number, number]> = {};
  for (const s of GRID) byPos[`${s[2]},${s[3]}`] = s;

  const isFederal = selected === "United States";

  return (
    <div className="overflow-x-auto">
      {/* Federal button */}
      <button
        title={`Federal programs: ${federalCount}`}
        onClick={() => onSelect(isFederal ? "" : "United States")}
        className={cn(
          "mb-3 px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150 flex items-center gap-2",
          isFederal
            ? "bg-brand-700 text-white border-brand-800 shadow-md"
            : "bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100"
        )}
      >
        🇺🇸 Federal Programs
        {federalCount > 0 && (
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
            isFederal ? "bg-white/20" : "bg-brand-100 text-brand-800"
          )}>
            {federalCount}
          </span>
        )}
      </button>

      {/* State grid */}
      <div className="inline-block">
        {Array.from({ length: maxRow + 1 }, (_, row) => (
          <div key={row} className="flex gap-1 mb-1">
            {Array.from({ length: maxCol + 1 }, (_, col) => {
              const state = byPos[`${col},${row}`];
              if (!state) return <div key={col} className="w-10 h-10 flex-shrink-0" />;
              const [abbrev, name] = state;
              const count = counts[name] ?? 0;
              const isSelected = selected === name;
              return (
                <button
                  key={col}
                  title={`${name}: ${count} program${count !== 1 ? "s" : ""}`}
                  onClick={() => onSelect(name)}
                  className={cn(
                    "w-10 h-10 flex-shrink-0 rounded text-[11px] font-semibold border transition-all duration-150",
                    getColor(count, isSelected)
                  )}
                >
                  {abbrev}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

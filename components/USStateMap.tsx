"use client";

import { cn } from "@/lib/utils";

interface USStateMapProps {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (state: string | null) => void;
}

// Tile-grid cartogram: [abbrev, fullName, col, row]
const GRID: [string, string, number, number][] = [
  ["ME", "Maine",          11, 0],
  ["WA", "Washington",      1, 1], ["MT", "Montana",         2, 1], ["ND", "North Dakota",    3, 1],
  ["MN", "Minnesota",       4, 1], ["IL", "Illinois",        6, 1], ["VT", "Vermont",         9, 1], ["NH", "New Hampshire",  10, 1],
  ["OR", "Oregon",          1, 2], ["ID", "Idaho",           2, 2], ["WY", "Wyoming",         3, 2],
  ["SD", "South Dakota",    4, 2], ["WI", "Wisconsin",       5, 2], ["MI", "Michigan",        6, 2],
  ["NY", "New York",        8, 2], ["MA", "Massachusetts",   9, 2], ["RI", "Rhode Island",   10, 2],
  ["CA", "California",      1, 3], ["NV", "Nevada",          2, 3], ["CO", "Colorado",        3, 3],
  ["NE", "Nebraska",        4, 3], ["IA", "Iowa",            5, 3], ["IN", "Indiana",         6, 3],
  ["OH", "Ohio",            7, 3], ["PA", "Pennsylvania",    8, 3], ["NJ", "New Jersey",      9, 3], ["CT", "Connecticut",    10, 3],
  ["AZ", "Arizona",         2, 4], ["NM", "New Mexico",      3, 4], ["KS", "Kansas",          4, 4],
  ["MO", "Missouri",        5, 4], ["KY", "Kentucky",        6, 4], ["WV", "West Virginia",   7, 4],
  ["VA", "Virginia",        8, 4], ["MD", "Maryland",        9, 4], ["DE", "Delaware",       10, 4],
  ["OK", "Oklahoma",        3, 5], ["AR", "Arkansas",        4, 5], ["TN", "Tennessee",       5, 5],
  ["NC", "North Carolina",  6, 5], ["SC", "South Carolina",  7, 5], ["DC", "Washington D.C.", 8, 5],
  ["AK", "Alaska",          0, 6], ["TX", "Texas",           3, 6], ["LA", "Louisiana",       4, 6],
  ["MS", "Mississippi",     5, 6], ["AL", "Alabama",         6, 6], ["GA", "Georgia",         7, 6], ["FL", "Florida", 8, 6],
  ["HI", "Hawaii",          0, 7],
];

function getColor(count: number, selected: boolean): string {
  if (selected) return "bg-brand-600 text-white border-brand-700";
  if (count === 0) return "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200";
  if (count <= 2)  return "bg-brand-100 text-brand-700 border-brand-200 hover:bg-brand-200";
  if (count <= 5)  return "bg-brand-300 text-brand-900 border-brand-400 hover:bg-brand-400";
  return "bg-brand-500 text-white border-brand-600 hover:bg-brand-600";
}

export function USStateMap({ counts, selected, onSelect }: USStateMapProps) {
  const maxCol = Math.max(...GRID.map(([,,c]) => c));
  const maxRow = Math.max(...GRID.map(([,,,r]) => r));

  // Build lookup by [col,row]
  const byPos: Record<string, [string, string, number, number]> = {};
  for (const s of GRID) byPos[`${s[2]},${s[3]}`] = s;

  return (
    <div className="overflow-x-auto">
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
                  onClick={() => onSelect(isSelected ? null : name)}
                  className={cn(
                    "w-10 h-10 flex-shrink-0 rounded text-xs font-semibold border transition-all duration-150",
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
      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
        <span className="font-medium">Programs:</span>
        {[["bg-slate-100","0"],["bg-brand-100","1–2"],["bg-brand-300","3–5"],["bg-brand-500 text-white","6+"]].map(([cls,label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn("w-4 h-4 rounded border border-slate-200", cls)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

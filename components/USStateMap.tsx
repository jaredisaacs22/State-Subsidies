"use client";

import { ComposableMap, Geographies, Geography, Annotation } from "react-simple-maps";
import { cn } from "@/lib/utils";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// FIPS code → state full name (50 states only, no DC)
const FIPS: Record<string, string> = {
  "01": "Alabama", "02": "Alaska", "04": "Arizona", "05": "Arkansas",
  "06": "California", "08": "Colorado", "09": "Connecticut", "10": "Delaware",
  "12": "Florida", "13": "Georgia", "15": "Hawaii", "16": "Idaho",
  "17": "Illinois", "18": "Indiana", "19": "Iowa", "20": "Kansas",
  "21": "Kentucky", "22": "Louisiana", "23": "Maine", "24": "Maryland",
  "25": "Massachusetts", "26": "Michigan", "27": "Minnesota", "28": "Mississippi",
  "29": "Missouri", "30": "Montana", "31": "Nebraska", "32": "Nevada",
  "33": "New Hampshire", "34": "New Jersey", "35": "New Mexico", "36": "New York",
  "37": "North Carolina", "38": "North Dakota", "39": "Ohio", "40": "Oklahoma",
  "41": "Oregon", "42": "Pennsylvania", "44": "Rhode Island", "45": "South Carolina",
  "46": "South Dakota", "47": "Tennessee", "48": "Texas", "49": "Utah",
  "50": "Vermont", "51": "Virginia", "53": "Washington", "54": "West Virginia",
  "55": "Wisconsin", "56": "Wyoming",
};

interface USStateMapProps {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (state: string) => void;
  federalCount?: number;
}

function getFill(count: number, isSelected: boolean): string {
  if (isSelected) return "#1a5c38";   // forest-700
  if (count === 0) return "#f1f5f9";  // slate-100
  if (count <= 2)  return "#dcfce7";  // green-100
  if (count <= 5)  return "#86efac";  // green-300
  if (count <= 10) return "#4ade80";  // green-400
  return "#16a34a";                   // green-600
}

function getStroke(isSelected: boolean): string {
  return isSelected ? "#0f3d25" : "#cbd5e1";
}

export function USStateMap({ counts, selected, onSelect, federalCount = 0 }: USStateMapProps) {
  const isFederal = selected === "United States";

  return (
    <div>
      {/* Federal button */}
      <button
        onClick={() => onSelect(isFederal ? "" : "United States")}
        className={cn(
          "mb-3 px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-2",
          isFederal
            ? "bg-brand-700 text-white border-brand-800 shadow-md"
            : "bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100"
        )}
      >
        🇺🇸 Federal Programs
        {federalCount > 0 && (
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
            isFederal ? "bg-white/20 text-white" : "bg-brand-100 text-brand-800"
          )}>
            {federalCount}
          </span>
        )}
      </button>

      {/* SVG map */}
      <ComposableMap
        projection="geoAlbersUsa"
        style={{ width: "100%", height: "auto" }}
        projectionConfig={{ scale: 1000 }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies
              .filter((geo) => FIPS[geo.id])
              .map((geo) => {
                const name = FIPS[geo.id];
                const count = counts[name] ?? 0;
                const isSelected = selected === name;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => onSelect(name)}
                    style={{
                      default: {
                        fill: getFill(count, isSelected),
                        stroke: getStroke(isSelected),
                        strokeWidth: isSelected ? 1.5 : 0.5,
                        outline: "none",
                        cursor: "pointer",
                      },
                      hover: {
                        fill: isSelected ? "#1a5c38" : count > 0 ? "#4ade80" : "#e2e8f0",
                        stroke: "#64748b",
                        strokeWidth: 1,
                        outline: "none",
                        cursor: "pointer",
                      },
                      pressed: {
                        fill: "#1a5c38",
                        outline: "none",
                      },
                    }}
                  >
                    <title>{`${name}: ${count} program${count !== 1 ? "s" : ""}`}</title>
                  </Geography>
                );
              })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}

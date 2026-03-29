"use client";

import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import { cn } from "@/lib/utils";

const GEO_URL = "/us-states.json";

// FIPS → full state name
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

// FIPS → 2-letter abbreviation
const ABBR: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR",
  "06": "CA", "08": "CO", "09": "CT", "10": "DE",
  "12": "FL", "13": "GA", "15": "HI", "16": "ID",
  "17": "IL", "18": "IN", "19": "IA", "20": "KS",
  "21": "KY", "22": "LA", "23": "ME", "24": "MD",
  "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV",
  "33": "NH", "34": "NJ", "35": "NM", "36": "NY",
  "37": "NC", "38": "ND", "39": "OH", "40": "OK",
  "41": "OR", "42": "PA", "44": "RI", "45": "SC",
  "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV",
  "55": "WI", "56": "WY",
};

// Centroid nudges for small/awkward states (longitude offset, latitude offset)
const NUDGE: Record<string, [number, number]> = {
  "09": [0, 0],   // CT
  "10": [0, 0],   // DE
  "24": [1.5, 0], // MD — nudge east away from DC
  "25": [0, 0],   // MA
  "33": [0, 0],   // NH
  "34": [0, 0],   // NJ
  "44": [0, 0],   // RI
  "50": [0, 0],   // VT
};

interface USStateMapProps {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (state: string) => void;
  federalCount?: number;
}

function getFill(count: number, isSelected: boolean): string {
  if (isSelected) return "#1a5c38";
  if (count === 0) return "#f1f5f9";
  if (count <= 2)  return "#dcfce7";
  if (count <= 5)  return "#86efac";
  if (count <= 10) return "#4ade80";
  return "#16a34a";
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

      <ComposableMap
        projection="geoAlbersUsa"
        style={{ width: "100%", height: "auto" }}
        projectionConfig={{ scale: 1000 }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }: { geographies: any[] }) => {
            const validGeos = geographies.filter((geo) => FIPS[geo.id]);
            return (
              <>
                {/* State shapes */}
                {validGeos.map((geo) => {
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
                          stroke: isSelected ? "#0f3d25" : "#cbd5e1",
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
                        pressed: { fill: "#1a5c38", outline: "none" },
                      }}
                    >
                      <title>{`${name}: ${count} program${count !== 1 ? "s" : ""}`}</title>
                    </Geography>
                  );
                })}

                {/* State abbreviation labels */}
                {validGeos.map((geo) => {
                  const fips = geo.id;
                  const name = FIPS[fips];
                  const abbr = ABBR[fips];
                  const isSelected = selected === name;
                  const centroid = geoCentroid(geo.toJSON ? geo.toJSON() : geo);
                  const nudge = NUDGE[fips] ?? [0, 0];
                  return (
                    <Marker
                      key={`label-${fips}`}
                      coordinates={[centroid[0] + nudge[0], centroid[1] + nudge[1]]}
                      onClick={() => onSelect(name)}
                    >
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                          fontSize: "7px",
                          fontWeight: 700,
                          fill: isSelected ? "#ffffff" : "#334155",
                          pointerEvents: "none",
                          userSelect: "none",
                          fontFamily: "system-ui, sans-serif",
                        }}
                      >
                        {abbr}
                      </text>
                    </Marker>
                  );
                })}
              </>
            );
          }}
        </Geographies>
      </ComposableMap>
    </div>
  );
}

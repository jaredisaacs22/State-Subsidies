"use client";

import { ComposableMap, Geographies, Geography, Marker, Annotation } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

const GEO_URL = "/us-states.json";

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

// States that use an Annotation (callout line) instead of inline label
// [dx, dy] = pixel offset from centroid to label
const ANNOTATED: Record<string, [number, number]> = {
  "09": [28, -8],   // CT
  "10": [32, 8],    // DE
  "24": [32, 4],    // MD
  "25": [34, -14],  // MA
  "33": [28, -18],  // NH
  "34": [30, 14],   // NJ
  "44": [36, 2],    // RI
  "50": [26, -26],  // VT
};

// Nudge centroid for states whose auto-centroid is off
// [lon offset, lat offset] in degrees
const NUDGE: Record<string, [number, number]> = {
  "12": [1.0, -2.8],  // FL — pull south into peninsula
  "26": [0, -1.0],    // MI — pull south away from UP
};

interface USStateMapProps {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (state: string) => void;
  federalCount?: number;
}

function getFill(count: number, isSelected: boolean): string {
  if (isSelected) return "#0c1738"; // navy-900
  if (count === 0) return "#f1f4f9"; // navy-50
  if (count <= 2)  return "#b6c5db"; // navy-200
  if (count <= 5)  return "#5d7ba3"; // navy-400
  if (count <= 10) return "#2c4467"; // navy-600
  return "#15244a";                  // navy-800
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
            ? "bg-forest-800 text-white border-forest-900 shadow-md"
            : "bg-forest-50 text-forest-700 border-forest-200 hover:bg-forest-100"
        )}
      >
        <Flag size={12} aria-hidden /> Federal Programs
        {federalCount > 0 && (
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
            isFederal ? "bg-white/20 text-white" : "bg-forest-100 text-forest-800"
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
                          stroke: isSelected ? "#060c22" : "#cbd5e1",
                          strokeWidth: isSelected ? 1.5 : 0.5,
                          outline: "none",
                          cursor: "pointer",
                        },
                        hover: {
                          fill: isSelected ? "#060c22" : count > 0 ? "#3d5a85" : "#e2e8f0",
                          stroke: "#475569",
                          strokeWidth: 1,
                          outline: "none",
                          cursor: "pointer",
                        },
                        pressed: { fill: "#060c22", outline: "none" },
                      }}
                    >
                      <title>{`${name}: ${count} program${count !== 1 ? "s" : ""}`}</title>
                    </Geography>
                  );
                })}

                {/* Inline labels for normal-sized states */}
                {validGeos
                  .filter((geo) => !ANNOTATED[geo.id])
                  .map((geo) => {
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
                            fill: "#ffffff",
                            stroke: "#0c1738",
                            strokeWidth: 0.6,
                            paintOrder: "stroke fill",
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

                {/* Annotated callout labels for small NE states */}
                {validGeos
                  .filter((geo) => ANNOTATED[geo.id])
                  .map((geo) => {
                    const fips = geo.id;
                    const name = FIPS[fips];
                    const abbr = ABBR[fips];
                    const isSelected = selected === name;
                    const centroid = geoCentroid(geo.toJSON ? geo.toJSON() : geo);
                    const [dx, dy] = ANNOTATED[fips];
                    return (
                      <Annotation
                        key={`ann-${fips}`}
                        subject={centroid}
                        dx={dx}
                        dy={dy}
                        connectorProps={{
                          stroke: "#94a3b8",
                          strokeWidth: 0.8,
                          strokeLinecap: "round",
                        }}
                      >
                        <text
                          textAnchor="start"
                          dominantBaseline="central"
                          onClick={() => onSelect(name)}
                          style={{
                            fontSize: "6.5px",
                            fontWeight: 700,
                            fill: isSelected ? "#dbe2ee" : "#334155",
                            cursor: "pointer",
                            userSelect: "none",
                            fontFamily: "system-ui, sans-serif",
                          }}
                        >
                          {abbr}
                        </text>
                      </Annotation>
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

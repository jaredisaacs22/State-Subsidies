"use client";

import { memo } from "react";
import { ComposableMap, Geographies, Geography, Marker, Annotation } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { navy } from "@/lib/colors";

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

interface GeoStyleSet {
  default: { fill: string; stroke: string; strokeWidth: number; outline: string; cursor: string };
  hover:   { fill: string; stroke: string; strokeWidth: number; outline: string; cursor: string };
  pressed: { fill: string; outline: string };
}

// Pre-allocated style objects so Geography never gets a new reference each render.
const STYLE_SELECTED: GeoStyleSet = {
  default: { fill: navy[900], stroke: navy[950], strokeWidth: 1.5, outline: "none", cursor: "pointer" },
  hover:   { fill: navy[950], stroke: "#475569", strokeWidth: 1,   outline: "none", cursor: "pointer" },
  pressed: { fill: navy[950], outline: "none" },
};
const STYLE_EMPTY: GeoStyleSet = {
  default: { fill: navy[50],  stroke: "#cbd5e1", strokeWidth: 0.5, outline: "none", cursor: "pointer" },
  hover:   { fill: "#e2e8f0", stroke: "#475569", strokeWidth: 1,   outline: "none", cursor: "pointer" },
  pressed: { fill: navy[950], outline: "none" },
};
const STYLE_ACTIVE_HOVER: GeoStyleSet["hover"]   = { fill: navy[500], stroke: "#475569", strokeWidth: 1, outline: "none", cursor: "pointer" };
const STYLE_ACTIVE_PRESSED: GeoStyleSet["pressed"] = { fill: navy[950], outline: "none" };

function getChoroplethFill(count: number): string {
  if (count === 0) return navy[50];
  if (count <= 2)  return navy[200];
  if (count <= 5)  return navy[400];
  if (count <= 10) return navy[600];
  return navy[800];
}

interface USStateMapProps {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (state: string) => void;
  federalCount?: number;
}

export const USStateMap = memo(function USStateMap({ counts, selected, onSelect, federalCount = 0 }: USStateMapProps) {
  const isFederal = selected === "United States";

  return (
    <div>
      {/* Federal button */}
      <button
        onClick={() => onSelect(isFederal ? "" : "United States")}
        className={cn(
          "mb-3 px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-2",
          isFederal
            ? "bg-navy-800 text-white border-navy-900 shadow-md"
            : "bg-navy-50 text-navy-700 border-navy-200 hover:bg-navy-100"
        )}
      >
        <Flag size={12} aria-hidden /> Federal Programs
        {federalCount > 0 && (
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
            isFederal ? "bg-white/20 text-white" : "bg-navy-100 text-navy-800"
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

                  let style: GeoStyleSet;
                  if (isSelected) {
                    style = STYLE_SELECTED;
                  } else if (count > 0) {
                    style = {
                      default: { fill: getChoroplethFill(count), stroke: "#cbd5e1", strokeWidth: 0.5, outline: "none", cursor: "pointer" },
                      hover:   STYLE_ACTIVE_HOVER,
                      pressed: STYLE_ACTIVE_PRESSED,
                    };
                  } else {
                    style = STYLE_EMPTY;
                  }

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => onSelect(name)}
                      style={style}
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
                            fill: isSelected ? navy[100] : "#1e293b",
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
                            fill: isSelected ? navy[100] : "#334155",
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
});

/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/noSvgWithoutTitle: <explanation> */
"use client";

import { cn } from "@/lib/utils";
import { MOROCCO_REGIONS_DATA } from "./morocco-heatmap-data";

export interface RegionStats {
  id: string;
  name: string;
  totalSeats: number;
  radiologySeats: number;
  noticesCount: number;
}

interface MoroccoHeatmapProps {
  regionStats: Record<string, RegionStats>;
  selectedRegionId: string | null;
  onRegionClick?: (id: string) => void;
  hoveredRegionId: string | null;
  onRegionHover?: (id: string | null) => void;
  rankings: string[];
  heatmapMode: "combined" | "seats" | "ranking";
}

const REGION_SHORT_NAMES: Record<string, string> = {
  "MA-01": "Tanger-Tétouan",
  "MA-02": "Oriental",
  "MA-03": "Fès-Meknès",
  "MA-04": "Rabat-Salé",
  "MA-05": "Béni Mellal",
  "MA-06": "Casa-Settat",
  "MA-07": "Marrakech-Safi",
  "MA-08": "Drâa-Tafilalet",
  "MA-09": "Souss-Massa",
  "MA-10": "Guelmim-Noun",
  "MA-11": "Laâyoune",
  "MA-12": "Dakhla",
};

export function MoroccoHeatmap({
  regionStats,
  selectedRegionId,
  onRegionClick,
  hoveredRegionId,
  onRegionHover,
  rankings,
  heatmapMode,
}: MoroccoHeatmapProps) {
  // Find max radiology seats to establish heatmap scale
  const maxSeats = Math.max(
    1,
    ...Object.values(regionStats).map((s) => s.radiologySeats),
  );

  // Helper to calculate fill color based on selected mode
  const getRegionFill = (id: string) => {
    const stats = regionStats[id];
    if (!stats) return "#fbf9f4";

    const isSelected = selectedRegionId === id;
    const isHovered = hoveredRegionId === id;

    // Calculate ratio based on selected heatmap mode
    let ratio = 0;
    if (heatmapMode === "seats") {
      ratio = stats.radiologySeats / maxSeats;
    } else if (heatmapMode === "ranking") {
      const rankIndex = rankings.indexOf(id);
      ratio = rankIndex !== -1 ? (12 - rankIndex) / 12 : 0;
    } else {
      // Combined
      const seatsRatio = stats.radiologySeats / maxSeats;
      const rankIndex = rankings.indexOf(id);
      const rankRatio = rankIndex !== -1 ? (12 - rankIndex) / 12 : 0;
      ratio = (seatsRatio + rankRatio) / 2;
    }

    if (stats.radiologySeats === 0 && heatmapMode === "seats") {
      // Soft sand-linen base color when there are no seats
      return "#fbf9f4";
    }

    // Blend from sandstone-cream (0.97 lightness) to rich terracotta (0.50 lightness, 0.15 chroma, 49 hue)
    const hue = Math.round(38 - ratio * 27); // 38 -> 11
    const sat = Math.round(30 + ratio * 25); // 30% -> 55%
    const light = Math.round(97 - ratio * 52); // 97% -> 45%

    if (isSelected) {
      return `hsl(${hue}, ${sat + 10}%, ${Math.max(25, light - 10)}%)`;
    }
    if (isHovered) {
      return `hsl(${hue}, ${sat + 5}%, ${Math.max(35, light - 5)}%)`;
    }

    return `hsl(${hue}, ${sat}%, ${light}%)`;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center p-2 select-none">
      <svg
        viewBox="0 0 600 600"
        className="w-full h-full max-h-[85vh] drop-shadow-sm transition-all duration-500 ease-out"
        xmlns="http://www.w3.org/2000/svg"
      >
        {Object.entries(MOROCCO_REGIONS_DATA).map(([id, region]) => {
          const stats = regionStats[id] || {
            id,
            name: region.name,
            totalSeats: 0,
            radiologySeats: 0,
            noticesCount: 0,
          };

          const fill = getRegionFill(id);
          const isSelected = selectedRegionId === id;
          const isHovered = hoveredRegionId === id;

          return (
            <path
              key={id}
              d={region.path}
              id={id}
              fill={fill}
              stroke={isSelected ? "#af4c34" : isHovered ? "#b85d43" : "#e8e3d9"}
              strokeWidth={isSelected ? 2.2 : isHovered ? 1.8 : 1}
              className="cursor-pointer transition-all duration-300 ease-in-out focus:outline-none"
              onMouseEnter={() => onRegionHover?.(id)}
              onMouseLeave={() => onRegionHover?.(null)}
              onClick={() => onRegionClick?.(id)}
            />
          );
        })}

        {/* Dynamic labels and ranking badges layer (absolute SVG coordinate placement) */}
        {Object.entries(MOROCCO_REGIONS_DATA).map(([id, region]) => {
          const stats = regionStats[id];
          const rankIndex = rankings.indexOf(id);
          const isSelected = selectedRegionId === id;
          const isHovered = hoveredRegionId === id;

          if (rankIndex === -1) return null;

          return (
            <g
              key={`label-${id}`}
              transform={`translate(${region.centerX}, ${region.centerY})`}
              className="pointer-events-none transition-all duration-300"
              style={{
                opacity: isHovered || isSelected ? 1 : 0.85,
              }}
            >
              {/* Circular Rank Badge */}
              <circle
                r="10"
                fill={
                  isSelected ? "#af4c34" : isHovered ? "#933e2a" : "#faf6f0"
                }
                stroke={isSelected || isHovered ? "#faf6f0" : "#af4c34"}
                strokeWidth="1.5"
                className="transition-colors duration-300"
              />
              <text
                textAnchor="middle"
                y="3.5"
                fill={isSelected || isHovered ? "#faf6f0" : "#af4c34"}
                className="font-mono text-[9px] font-bold"
              >
                {rankIndex + 1}
              </text>

              {/* Small Radiology Seats Count Rect Badge next to priority */}
              {stats && stats.radiologySeats > 0 && (
                <g transform="translate(13, -7)">
                  <rect
                    width="14"
                    height="12"
                    rx="3"
                    fill={isSelected ? "#faf6f0" : "#e8e3d9"}
                    stroke={isSelected ? "#af4c34" : "none"}
                    strokeWidth="0.5"
                    className="transition-colors duration-300 shadow-sm"
                  />
                  <text
                    x="7"
                    y="9"
                    textAnchor="middle"
                    fill={isSelected ? "#af4c34" : "#1c1917"}
                    className="font-mono text-[8px] font-extrabold"
                  >
                    {stats.radiologySeats}
                  </text>
                </g>
              )}

              {/* Shortened Region Name Label */}
              <text
                x="0"
                y="18"
                textAnchor="middle"
                className={cn(
                  "font-sans text-[7.5px] font-bold tracking-tight transition-colors duration-300",
                  isSelected || isHovered ? "fill-primary font-extrabold" : "fill-stone-600"
                )}
                style={{
                  paintOrder: "stroke",
                  stroke: "#ffffff",
                  strokeWidth: "2.5px",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                }}
              >
                {REGION_SHORT_NAMES[id]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

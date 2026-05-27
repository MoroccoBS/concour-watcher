"use client";

import {
  AlertCircle,
  Compass,
  GripVertical,
  HelpCircle,
  MapPin,
  Trophy,
  X,
} from "lucide-react";
import { AnimatePresence, motion, Reorder } from "motion/react";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MoroccoHeatmap, type RegionStats } from "./morocco-heatmap";
import { MOROCCO_REGIONS_DATA } from "./morocco-heatmap-data";

interface MoroccoHeatmapModalProps {
  open: boolean;
  onClose: () => void;
  documentData: any[]; // Raw documents list to aggregate statistics
}

export function MoroccoHeatmapModal({
  open,
  onClose,
  documentData,
}: MoroccoHeatmapModalProps) {
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [rankings, setRankings] = useState<string[]>([]);
  const [heatmapMode, setHeatmapMode] = useState<
    "combined" | "seats" | "ranking"
  >("combined");

  // 1. Normalize and aggregate statistics from the raw database records
  const regionStats = useMemo(() => {
    const stats: Record<string, RegionStats> = {};

    // Initialize all 12 regions with empty statistics
    Object.keys(MOROCCO_REGIONS_DATA).forEach((id) => {
      stats[id] = {
        id,
        name: MOROCCO_REGIONS_DATA[id].name,
        totalSeats: 0,
        radiologySeats: 0,
        noticesCount: 0,
      };
    });

    // Aggregate values
    documentData.forEach((doc) => {
      const regionId = normalizeRegionToId(doc.region);
      if (regionId && stats[regionId]) {
        if (doc.documentType === "notice") {
          stats[regionId].noticesCount += 1;
        }
        if (typeof doc.totalSeats === "number") {
          stats[regionId].totalSeats = Math.max(
            stats[regionId].totalSeats,
            doc.totalSeats,
          );
        }
        if (typeof doc.radiologySeats === "number") {
          stats[regionId].radiologySeats = Math.max(
            stats[regionId].radiologySeats,
            doc.radiologySeats,
          );
        }
      }
    });

    return stats;
  }, [documentData]);

  // Find max radiology seats to establish heatmap scale
  const maxSeats = useMemo(() => {
    return Math.max(
      1,
      ...Object.values(regionStats).map((s) => s.radiologySeats),
    );
  }, [regionStats]);

  // Helper to normalize region names into ISO-3166 codes
  function normalizeRegionToId(regionName?: string | null): string | null {
    if (!regionName) return null;
    const n = regionName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/direction regionale/g, "")
      .trim();

    if (n.includes("tanger") || n.includes("tetouan") || n.includes("hoceima"))
      return "MA-01";
    if (n.includes("oriental") || n.includes("شرقية")) return "MA-02";
    if (n.includes("fes") || n.includes("meknes")) return "MA-03";
    if (n.includes("rabat") || n.includes("sale") || n.includes("kenitra"))
      return "MA-04";
    if (n.includes("beni mellal") || n.includes("khenifra")) return "MA-05";
    if (n.includes("casablanca") || n.includes("settat")) return "MA-06";
    if (n.includes("marrakech") || n.includes("safi")) return "MA-07";
    if (
      n.includes("draa") ||
      n.includes("tafilalet") ||
      n.includes("errachidia")
    )
      return "MA-08";
    if (n.includes("souss") || n.includes("massa")) return "MA-09";
    if (n.includes("guelmim") || n.includes("noun")) return "MA-10";
    if (n.includes("laayoune") || n.includes("saguia") || n.includes("sakia"))
      return "MA-11";
    if (n.includes("dakhla") || n.includes("dahab")) return "MA-12";

    return null;
  }

  // 2. Load and persist regional preference rankings in localStorage
  useEffect(() => {
    if (!open) return;

    try {
      const stored = localStorage.getItem("cncr_region_rankings");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 12) {
          setRankings(parsed);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to load rankings:", e);
    }

    // Default: Sort by radiology seats count descending to provide a smart baseline
    const defaultRankings = Object.keys(MOROCCO_REGIONS_DATA).sort(
      (a, b) =>
        (regionStats[b]?.radiologySeats || 0) -
        (regionStats[a]?.radiologySeats || 0),
    );
    setRankings(defaultRankings);
  }, [open, regionStats]);

  const handleRankingsChange = (newOrder: string[]) => {
    setRankings(newOrder);
    try {
      localStorage.setItem("cncr_region_rankings", JSON.stringify(newOrder));
    } catch (e) {
      console.error("Failed to save rankings:", e);
    }
  };

  // Find active notices in the selected region for detail view
  const activeNoticesInSelected = useMemo(() => {
    if (!selectedRegionId) return [];
    return documentData.filter((doc) => {
      const isNotice = doc.documentType === "notice";
      const matchesRegion =
        normalizeRegionToId(doc.region) === selectedRegionId;
      return isNotice && matchesRegion;
    });
  }, [selectedRegionId, documentData]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[64rem] w-full sm:max-w-[64rem] md:max-w-[64rem] lg:max-w-[64rem] h-[85vh] max-h-[85vh] border border-border bg-card shadow-2xl rounded-xl overflow-hidden p-0 flex flex-col">
        {/* Full-screen serene modal header */}
        <div className="flex items-center justify-between border-b border-border/40 bg-card/60 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Compass className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                Oasis GIS Workspace
              </div>
              <DialogTitle className="font-serif text-2xl font-semibold leading-none text-stone-900">
                Moroccan Regions Heatmap
              </DialogTitle>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 rounded-full p-0 text-stone-400 hover:bg-muted hover:text-stone-900"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Main Split Viewport */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-background">
          {/* Left Column: Heatmap & Info Panel */}
          <div className="flex-1 min-w-0 flex flex-col border-r border-border/30 overflow-y-auto lg:overflow-hidden relative p-6 overflow-x-hidden">
            {/* Top-Left: Legend & Mode Control Overlay */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-auto ">
              {/* Legend */}
              <div className="p-3 bg-card/95 backdrop-blur-md border border-border/50 rounded-xl text-xs space-y-1.5 shadow-md w-44">
                <div className="font-serif font-extrabold text-stone-800 text-[11px] leading-tight">
                  {heatmapMode === "combined" && "Strategic Match"}
                  {heatmapMode === "seats" && "Radiology Seats"}
                  {heatmapMode === "ranking" && "My Preference"}
                </div>
                <div className="flex items-center justify-between gap-1 font-mono text-[8px] text-stone-400 leading-none">
                  <span>Low</span>
                  <div className="flex-1 h-1.5 rounded bg-gradient-to-r from-[#fbf9f4] to-[#af4c34]" />
                  <span>High</span>
                </div>
              </div>

              {/* Heatmap Mode Pill Buttons */}
              <div className="flex items-center gap-0.5 bg-stone-100/90 border border-stone-200/50 p-0.5 rounded-lg shadow-sm w-fit">
                {(["combined", "seats", "ranking"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setHeatmapMode(mode)}
                    className={cn(
                      "px-2 py-1 text-[8.5px] font-mono font-bold uppercase rounded-md transition-all duration-300",
                      heatmapMode === mode
                        ? "bg-[#af4c34] text-white shadow-sm font-extrabold"
                        : "text-stone-500 hover:text-stone-800 hover:bg-stone-50/50",
                    )}
                  >
                    {mode === "combined" && "Strategy"}
                    {mode === "seats" && "Seats"}
                    {mode === "ranking" && "Rank"}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Map Canvas */}
            <div className="flex-1 flex items-center justify-center min-h-[350px] lg:min-h-0">
              <MoroccoHeatmap
                regionStats={regionStats}
                selectedRegionId={selectedRegionId}
                onRegionClick={(id) => {
                  setSelectedRegionId(selectedRegionId === id ? null : id);
                }}
                hoveredRegionId={hoveredRegionId}
                onRegionHover={setHoveredRegionId}
                rankings={rankings}
                heatmapMode={heatmapMode}
              />
            </div>

            {/* Absolute Info Card Overlay (bottom-right) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedRegionId || hoveredRegionId || "none"}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute bottom-4 right-4 z-10 bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-lg w-72 leading-relaxed pointer-events-auto"
              >
                {(() => {
                  const activeId = selectedRegionId || hoveredRegionId;
                  if (!activeId) {
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                          <Compass
                            className="h-3.5 w-3.5"
                            style={{ animation: "spin 12s linear infinite" }}
                          />
                          Moroccan GIS
                        </div>
                        <h4 className="font-serif text-sm font-bold text-stone-900 leading-tight">
                          Explore Regional Hubs
                        </h4>
                        <p className="text-[10.5px] text-stone-500 font-sans leading-normal">
                          Hover or click any region on the map to analyze
                          radiology vacancy distribution, local priority
                          ratings, and active recruitment notices.
                        </p>
                        <div className="text-[9px] text-stone-400 font-serif italic border-t border-dashed border-stone-200/60 pt-1.5 mt-1.5">
                          💡 Tip: Drag & drop items in the list on the right to
                          re-rank your employment strategy.
                        </div>
                      </div>
                    );
                  }

                  const region = MOROCCO_REGIONS_DATA[activeId];
                  const stats = regionStats[activeId];
                  const rank = rankings.indexOf(activeId) + 1;
                  const ratio =
                    stats && stats.totalSeats
                      ? Math.round(
                          (stats.radiologySeats / stats.totalSeats) * 100,
                        )
                      : 0;

                  // Calculate a "Strategic Fit Match Score"
                  const seatsRatio = stats
                    ? stats.radiologySeats / maxSeats
                    : 0;
                  const rankRatio = rank > 0 ? (13 - rank) / 12 : 0;
                  const matchScore = Math.round(
                    ((seatsRatio + rankRatio) / 2) * 100,
                  );

                  return (
                    <div className="space-y-3">
                      {/* Region Title */}
                      <div className="border-b border-border/40 pb-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] font-extrabold uppercase tracking-wide text-primary">
                            {activeId} region
                          </span>
                          {selectedRegionId === activeId && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100/50 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider">
                              Locked Selection
                            </span>
                          )}
                        </div>
                        <h4 className="font-serif text-base font-bold text-stone-900 leading-tight mt-0.5">
                          {region.name}
                        </h4>
                        <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono mt-0.5">
                          <span>{region.nameAr}</span>
                          {rank > 0 && (
                            <span className="text-primary font-bold">
                              Priority Rank #{rank}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Recruitment Stats */}
                      <div className="grid grid-cols-2 gap-2 text-stone-700 font-sans text-[11px]">
                        <div className="bg-stone-50/50 border border-stone-100 p-2 rounded-lg">
                          <span className="text-[9px] uppercase font-mono text-stone-400 block tracking-wider leading-none mb-1">
                            Radiology Seats
                          </span>
                          <strong className="text-sm font-mono text-stone-800">
                            {stats?.radiologySeats || 0}
                          </strong>
                        </div>
                        <div className="bg-stone-50/50 border border-stone-100 p-2 rounded-lg">
                          <span className="text-[9px] uppercase font-mono text-stone-400 block tracking-wider leading-none mb-1">
                            Total Seats
                          </span>
                          <strong className="text-sm font-mono text-stone-800">
                            {stats?.totalSeats || 0}
                          </strong>
                        </div>
                        <div className="bg-stone-50/50 border border-stone-100 p-2 rounded-lg">
                          <span className="text-[9px] uppercase font-mono text-stone-400 block tracking-wider leading-none mb-1">
                            Active Notices
                          </span>
                          <strong className="text-sm font-mono text-stone-800">
                            {stats?.noticesCount || 0}
                          </strong>
                        </div>
                        <div className="bg-stone-50/50 border border-stone-100 p-2 rounded-lg">
                          <span className="text-[9px] uppercase font-mono text-stone-400 block tracking-wider leading-none mb-1">
                            Vacancy Ratio
                          </span>
                          <strong className="text-sm font-mono text-stone-800">
                            {ratio}%
                          </strong>
                        </div>
                      </div>

                      {/* Strategic Match Index Progress */}
                      <div className="border-t border-border/40 pt-2 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                          <span className="text-stone-500 font-serif">
                            Strategic Match Index
                          </span>
                          <span className="text-primary font-bold">
                            {matchScore}%
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden border border-stone-200/50">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${matchScore}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-amber-500 to-[#af4c34] rounded-full"
                          />
                        </div>
                        <p className="text-[8.5px] text-stone-400 leading-normal font-sans italic">
                          Index balances local seats abundance with your custom
                          priority list.
                        </p>
                      </div>

                      {/* Quick Actions */}
                      {selectedRegionId === activeId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs font-semibold h-8 border-stone-200 text-stone-700 hover:bg-stone-50"
                          onClick={() => setSelectedRegionId(null)}
                        >
                          Deselect Region
                        </Button>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column: Preference drag reorder list (Desktop Only) */}
          <div className="w-full lg:w-[420px] bg-card/10  flex-col overflow-hidden hidden lg:flex">
            {/* Header info */}
            <div className="p-4 border-b border-border/30 bg-card/30 space-y-2">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                <Trophy className="h-3 w-3" />
                Strategic Region Priority Ranking
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed font-sans">
                Drag regions to rank your employment preferences. Contrast your
                priority list directly with radiology seat allocations.
              </p>

              {/* Desktop vs Mobile notice */}
              <div className="block lg:hidden flex items-center gap-1.5 bg-amber-50 text-amber-800 p-2 rounded border border-amber-200/50 text-[10px] leading-relaxed font-sans">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Drag and drop ranking is optimized for wider desktop
                  viewports.
                </span>
              </div>
            </div>

            {/* Draggable container list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {rankings.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-stone-400">
                  Initializing lists...
                </div>
              ) : (
                <div className="hidden lg:block h-full">
                  <Reorder.Group
                    axis="y"
                    values={rankings}
                    onReorder={handleRankingsChange}
                    className="space-y-2"
                  >
                    {rankings.map((id, index) => {
                      const region = MOROCCO_REGIONS_DATA[id];
                      const stats = regionStats[id];
                      const ratio =
                        stats && stats.totalSeats
                          ? Math.round(
                              (stats.radiologySeats / stats.totalSeats) * 100,
                            )
                          : 0;

                      const isSelected = selectedRegionId === id;
                      const isHovered = hoveredRegionId === id;

                      return (
                        <Reorder.Item
                          key={id}
                          value={id}
                          className={cn(
                            "group flex items-center gap-3 p-3 bg-card border rounded-lg shadow-sm cursor-grab active:cursor-grabbing transition-colors duration-300",
                            isSelected
                              ? "border-primary/50 ring-1 ring-primary/20 bg-primary/[0.01]"
                              : isHovered
                                ? "border-stone-400 bg-stone-50/50"
                                : "border-border/60",
                          )}
                          style={{ touchAction: "none" }}
                        >
                          {/* Left priority rank badge */}
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-stone-100 text-[10px] font-mono font-bold text-stone-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            {index + 1}
                          </div>

                          {/* Region label details */}
                          <div className="flex-1 min-w-0">
                            <div className="font-serif text-xs font-bold text-stone-900 group-hover:text-primary transition-colors leading-tight">
                              {region.name}
                            </div>
                            <div className="text-[10px] font-mono text-stone-400 flex items-center gap-2">
                              <span>
                                {stats?.radiologySeats || 0} rad seats
                              </span>
                              {ratio > 0 && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-stone-200" />
                                  <span className="text-primary font-semibold">
                                    {ratio}% ratio
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Grip drag handle icon */}
                          <div className="text-stone-300 group-hover:text-stone-500 cursor-row-resize pr-1">
                            <GripVertical className="h-4 w-4" />
                          </div>
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                </div>
              )}

              {/* Mobile simple fallback static list */}
              {/* <div className="block lg:hidden space-y-2">
                {rankings.map((id, index) => {
                  const region = MOROCCO_REGIONS_DATA[id];
                  const stats = regionStats[id];
                  const ratio =
                    stats && stats.totalSeats
                      ? Math.round(
                          (stats.radiologySeats / stats.totalSeats) * 100,
                        )
                      : 0;

                  return (
                    <div
                      key={id}
                      className="flex items-center gap-3 p-3 bg-card border border-border/60 rounded-lg shadow-sm"
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-stone-100 text-[9px] font-mono font-bold text-stone-500">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-serif text-xs font-bold text-stone-900 leading-tight">
                          {region.name}
                        </div>
                        <div className="text-[10px] font-mono text-stone-400 flex items-center gap-2">
                          <span>{stats?.radiologySeats || 0} radiology</span>
                          {ratio > 0 && (
                            <span className="text-primary">{ratio}% ratio</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div> */}
            </div>

            {/* Selected Region Detail side panel (within Modal) */}
            <AnimatePresence>
              {selectedRegionId && activeNoticesInSelected.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="hidden lg:block bg-card border-t border-border/40 p-4 shrink-0 overflow-y-auto max-h-[30vh]"
                >
                  <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary mb-2">
                    <MapPin className="h-3 w-3" />
                    Active Notices in Region
                  </div>
                  <div className="space-y-1.5">
                    {activeNoticesInSelected.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block p-2 rounded bg-stone-50 border border-stone-100 hover:border-primary/30 text-[11px] hover:bg-primary/[0.01] transition-all leading-snug group"
                      >
                        <div className="font-serif font-bold text-stone-800 group-hover:text-primary transition-colors">
                          {doc.title}
                        </div>
                        {doc.center && (
                          <div className="font-mono text-[9px] text-stone-400">
                            Center: {doc.center}
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

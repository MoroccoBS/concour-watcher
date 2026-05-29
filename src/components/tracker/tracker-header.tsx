"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Compass,
  Filter,
  Lock,
  RadioTower,
  RefreshCw,
  SearchCheck,
  ServerCog,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import Logo from "@/app/apple-icon.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatDateTime } from "@/lib/utils";
import type { TrackerFilter } from "@/store/filter-store";
import { trpc } from "@/trpc/client";
import type { WatcherHealth, WatcherRun } from "./types";

type Stats = {
  total: number;
  radiology: number;
  review: number;
  seats: number;
  matches: number;
};

export function TrackerHeader({
  stats,
  filter,
  watcherHealth,
  watcherRuns,
  hasAdminToken,
  onFilterChange,
  onOpenSettings,
  onOpenHeatmap,
  onOpenCalendar,
}: {
  stats: Stats;
  filter: TrackerFilter;
  watcherHealth?: WatcherHealth;
  watcherRuns: WatcherRun[];
  hasAdminToken: boolean;
  onFilterChange: (filter: TrackerFilter) => void;
  onOpenSettings: () => void;
  onOpenHeatmap: () => void;
  onOpenCalendar: () => void;
}) {
  const [watcherOpen, setWatcherOpen] = useState(false);
  const utils = trpc.useUtils();

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-border/80 bg-background/90 shadow-[0_1px_3px_rgba(0,0,0,0.01)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-8 lg:px-10 lg:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-widest text-primary">
              <RadioTower data-icon="inline-start" />
              Moroccan Ministry of Health Opportunity Compass
            </div>
            <div className="flex items-center gap-2">
              <Image
                className="rounded-full size-14"
                src={Logo}
                alt="Logo"
                width={128}
                height={128}
              />
              <h1 className="mt-1 font-serif text-3xl font-semibold leading-none tracking-tight text-stone-900 sm:text-4xl">
                Clinical Opportunities Portal
              </h1>
            </div>
            <p className="mt-2 max-w-2xl font-sans text-xs leading-relaxed text-stone-500">
              A locally verified directory for Moroccan Ministry of Health ITS
              recruitment notices, focused on radiology openings.
            </p>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-stone-200 bg-card font-mono text-[9px] uppercase tracking-wider text-stone-600 shadow-[0_1px_2px_rgba(0,0,0,0.01)] sm:min-w-[420px]">
            <Metric label="Notices" value={stats.total.toString()} />
            <Metric label="ITS Focus" value={stats.radiology.toString()} />
            <Metric label="Radiology" value={`${stats.seats} seats`} />
            {hasAdminToken ? (
              <>
                <Metric label="Review" value={stats.review.toString()} />
                <Metric label="Matches" value={stats.matches.toString()} />
                <Metric label="Console" value="Unlocked" />
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/30 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            <Button
              variant={filter === "radiology" ? "default" : "outline"}
              onClick={() => onFilterChange("radiology")}
              className="text-xs font-semibold"
            >
              <SearchCheck data-icon="inline-start" />
              Priority
            </Button>
            <Button
              variant={filter === "review" ? "default" : "outline"}
              onClick={() => onFilterChange("review")}
              className="text-xs font-semibold"
            >
              <AlertTriangle data-icon="inline-start" />
              Needs Review
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => onFilterChange("all")}
              className="text-xs font-semibold"
            >
              <Filter data-icon="inline-start" />
              Show All
            </Button>
            <Button
              variant="outline"
              onClick={onOpenCalendar}
              className="text-xs font-semibold border-amber-700/20 hover:border-amber-700/40 hover:bg-amber-50/30"
            >
              <CalendarDays data-icon="inline-start" />
              Calendar
            </Button>
            <Button
              variant="outline"
              onClick={onOpenHeatmap}
              className="text-xs font-semibold border-primary/20 hover:border-primary/40 hover:bg-primary/[0.02]"
            >
              <Compass data-icon="inline-start" className="text-primary" />
              Regional Heatmap
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              className={"text-sm py-1"}
              variant={"secondary"}
              onClick={() =>
                utils.documents.list.invalidate().then(() => {
                  toast.success("Documents refreshed successfully", {
                    duration: 1000,
                    position: "bottom-center",
                  });
                })
              }
            >
              <RefreshCw data-icon="inline-start" />
              Refresh Documents
            </Button>
            {watcherHealth ? (
              <button type="button" onClick={() => setWatcherOpen(true)}>
                <WatcherBadge health={watcherHealth} />
              </button>
            ) : null}
            <Button
              variant="ghost"
              onClick={onOpenSettings}
              className="text-xs font-semibold text-stone-600 hover:bg-muted hover:text-stone-900"
            >
              {hasAdminToken ? (
                <CheckCircle2
                  data-icon="inline-start"
                  className="text-accent-success"
                />
              ) : (
                <Lock data-icon="inline-start" className="text-stone-400" />
              )}
              {hasAdminToken ? "Console unlocked" : "Unlock Console"}
            </Button>
          </div>
        </div>
      </div>
      {watcherHealth ? (
        <WatcherDialog
          health={watcherHealth}
          runs={watcherRuns}
          open={watcherOpen}
          onOpenChange={setWatcherOpen}
        />
      ) : null}
    </header>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-stone-200 px-3 py-2.5 odd:bg-muted/20 even:bg-muted/30 [&:not(:nth-child(3n))]:border-r [&:nth-child(n+4)]:border-t">
      <div className="truncate text-stone-400">{label}</div>
      <strong className="mt-0.5 block truncate font-extrabold text-stone-900">
        {value}
      </strong>
    </div>
  );
}

function WatcherBadge({ health }: { health: WatcherHealth }) {
  const healthy = health.status === "healthy";
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-2 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition-colors hover:bg-muted",
        healthy
          ? "border-emerald-200/80 bg-emerald-50/50 text-accent-success"
          : "border-orange-200/80 bg-orange-50/50 text-accent-warning",
      )}
      title={`Last Heartbeat: ${formatDateTime(health.heartbeat?.lastOkAt)}`}
    >
      <span className="relative flex size-1.5">
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-75",
            healthy ? "bg-emerald-500" : "bg-orange-500",
          )}
        />
        <span
          className={cn(
            "relative inline-flex size-1.5 rounded-full",
            healthy ? "bg-accent-success" : "bg-accent-warning",
          )}
        />
      </span>
      Watcher: {healthy ? "Live" : "Stale"}
    </Badge>
  );
}

function WatcherDialog({
  health,
  runs,
  open,
  onOpenChange,
}: {
  health: WatcherHealth;
  runs: WatcherRun[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const heartbeat = health.heartbeat;
  const rows = [
    ["Runner", health.runnerId],
    ["Status", health.status],
    ["Last started", formatDateTime(heartbeat?.lastStartedAt)],
    ["Last successful check", formatDateTime(heartbeat?.lastOkAt)],
    ["Last error", formatDateTime(heartbeat?.lastErrorAt)],
    [
      "Found / inserted / processed",
      `${heartbeat?.lastFound ?? 0} / ${heartbeat?.lastInserted ?? 0} / ${heartbeat?.lastProcessed ?? 0}`,
    ],
    ["Stale warning after", `${health.staleMinutes} minutes`],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-xl border border-border bg-card p-0">
        <DialogHeader className="border-b border-border/50 p-6">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
            <ServerCog data-icon="inline-start" />
            Local watcher
          </div>
          <DialogTitle className="font-serif text-3xl text-stone-900">
            Watcher Health
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-relaxed text-stone-500">
            The ministry fetch runs from the local Moroccan IP. This panel shows
            when that runner last checked the source pages.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 p-6">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[130px_1fr] gap-4 rounded-md border border-border/60 bg-background/50 px-3 py-2 text-sm"
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {label}
              </span>
              <span className="min-w-0 wrap-break-word font-medium text-stone-800 first-letter:uppercase">
                {value}
              </span>
            </div>
          ))}
          {heartbeat?.lastError ? (
            <div className="rounded-md border border-orange-200 bg-orange-50/60 p-3 text-xs leading-relaxed text-accent-warning">
              {heartbeat.lastError}
            </div>
          ) : null}
          {runs.length ? (
            <div className="mt-4 border-t border-border/50 pt-4">
              <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Run history
              </div>
              <div className="overflow-hidden rounded-md border border-border/60">
                {runs.slice(0, 8).map((run) => (
                  <div
                    key={run.id}
                    className="grid grid-cols-[1fr_auto] gap-3 border-b border-border/50 bg-background/45 px-3 py-2 text-xs last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-4 px-1.5 font-mono text-[9px] uppercase",
                            run.status === "completed"
                              ? "border-emerald-200 bg-emerald-50 text-accent-success"
                              : run.status === "failed"
                                ? "border-red-200 bg-red-50 text-red-800"
                                : "border-amber-200 bg-amber-50 text-accent-warning",
                          )}
                        >
                          {run.status}
                        </Badge>
                        <span className="font-mono text-[10px] text-stone-400">
                          {formatDateTime(run.startedAt)}
                        </span>
                      </div>
                      {run.error ? (
                        <p className="mt-1 truncate text-[11px] text-red-800">
                          {run.error}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right font-mono text-[10px] leading-relaxed text-stone-600">
                      <div>
                        {run.found ?? 0}/{run.inserted ?? 0}/
                        {run.processed ?? 0}
                      </div>
                      <div className="text-stone-400">
                        {run.durationMs
                          ? `${Math.round(run.durationMs / 1000)}s`
                          : "running"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

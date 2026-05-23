import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Lock,
  RadioTower,
  SearchCheck,
  Settings,
  Wifi,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import type { TrackerFilter } from "@/store/filter-store";
import type { WatcherHealth } from "./types";

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
  hasAdminToken,
  onFilterChange,
  onOpenSettings,
}: {
  stats: Stats;
  filter: TrackerFilter;
  watcherHealth?: WatcherHealth;
  hasAdminToken: boolean;
  onFilterChange: (filter: TrackerFilter) => void;
  onOpenSettings: () => void;
}) {
  return (
    <section className="border-b border-stone-300/70 bg-[#fbf7ef]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-900">
              <RadioTower className="h-4 w-4" />
              CNCR Watcher
            </div>
            <h1 className="font-serif text-4xl leading-tight text-stone-950 sm:text-5xl">
              Concours to watch
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:w-[520px]">
            <Stat label="Concours" value={stats.total} />
            <Stat label="ITS" value={stats.radiology} />
            <Stat label="Seats" value={stats.seats} />
            <Stat label="Review" value={stats.review} />
            <Stat label="Name" value={stats.matches} />
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={filter === "radiology" ? "default" : "outline"}
              onClick={() => onFilterChange("radiology")}
            >
              <SearchCheck className="h-4 w-4" />
              Priority
            </Button>
            <Button
              variant={filter === "review" ? "default" : "outline"}
              onClick={() => onFilterChange("review")}
            >
              <AlertTriangle className="h-4 w-4" />
              Review
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => onFilterChange("all")}
            >
              <Filter className="h-4 w-4" />
              All
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {watcherHealth ? <WatcherBadge health={watcherHealth} /> : null}
            <Button variant="ghost" onClick={onOpenSettings}>
              {hasAdminToken ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              Decisions
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function WatcherBadge({ health }: { health: WatcherHealth }) {
  const healthy = health.status === "healthy";
  return (
    <Badge
      className={cn(
        "gap-2 rounded-full px-3 py-1",
        healthy
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-orange-200 bg-orange-50 text-orange-950",
      )}
      title={`Last OK ${formatDateTime(health.heartbeat?.lastOkAt)}`}
    >
      {healthy ? (
        <Wifi className="h-3.5 w-3.5" />
      ) : (
        <Settings className="h-3.5 w-3.5" />
      )}
      Watcher {health.status}
    </Badge>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-300 bg-white/60 px-3 py-2">
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-stone-500">
        {label}
      </div>
    </div>
  );
}

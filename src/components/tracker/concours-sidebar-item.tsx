import { CalendarDays, RadioTower } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { statusLabel, statusTone } from "@/lib/status";
import { cn, formatDateTime } from "@/lib/utils";
import type { ConcoursCase } from "./types";

export function ConcoursSidebarItem({
  item,
  selected,
  isAdminUnlocked,
  onClick,
}: {
  item: ConcoursCase;
  selected: boolean;
  isAdminUnlocked: boolean;
  onClick: () => void;
}) {
  const status = item.primary.applicationStatus;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 border-b border-border/60 transition-all duration-150 relative cursor-pointer select-none",
        selected
          ? "bg-primary/[0.03] border-l-2 border-l-primary"
          : "hover:bg-muted/30 hover:border-l-2 hover:border-l-stone-300/50 border-l-2 border-l-transparent",
      )}
    >
      <div className="flex flex-col gap-2">
        {/* Badges row */}
        <div className="flex flex-wrap gap-1">
          {isAdminUnlocked ? (
            <Badge
              className={cn(
                "px-1.5 py-0.5 text-[9px] font-mono tracking-wider uppercase font-semibold",
                statusTone(status),
              )}
            >
              {statusLabel(status)}
            </Badge>
          ) : null}
          {isAdminUnlocked && item.hasCandidateMatch ? (
            <Badge className="border-violet-200/80 bg-violet-50 text-accent-match px-1.5 py-0.5 text-[9px] font-mono tracking-wider uppercase font-bold animate-pulse">
              name found
            </Badge>
          ) : null}
          {item.latestUpdate.updateLabel ? (
            <Badge className="border-sky-200/80 bg-sky-50 text-accent-info px-1.5 py-0.5 text-[9px] font-mono tracking-wider uppercase font-semibold line-clamp-1">
              {item.latestUpdate.updateLabel}
            </Badge>
          ) : null}
        </div>

        {/* Title */}
        <h4 className="font-serif text-[16px] font-medium leading-tight text-stone-900 line-clamp-2">
          {item.title}
        </h4>

        {/* Metadata grid */}
        <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-stone-500 pt-1">
          <div className="flex items-center gap-1">
            <RadioTower className="h-3 w-3 text-primary/70" />
            <span>
              Seats:{" "}
              <strong className="text-stone-800 font-bold">
                {item.radiologySeats ?? 0}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3 text-primary/70" />
            <span>
              Deadline:{" "}
              <strong className="text-stone-800 font-bold">
                {formatDateTime(item.deadline)}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

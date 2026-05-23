import { applicationStatuses, statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { DecisionDraft } from "./types";

export function DecisionChips({
  value,
  compact = false,
}: {
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {applicationStatuses.map((status) => (
        <span
          key={status}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] font-medium",
            value === status
              ? "border-amber-300 bg-amber-100 text-amber-950"
              : "border-stone-200 bg-white/60 text-stone-400",
            compact && value !== status && "hidden sm:inline-flex",
          )}
        >
          {statusLabel(status)}
        </span>
      ))}
    </div>
  );
}

export function DecisionPreview({
  draft,
  className,
}: {
  draft: DecisionDraft;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-stone-200 bg-white/60 p-3",
        className,
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
        Decision
      </div>
      <div className="mt-2">
        <DecisionChips value={draft.applicationStatus} />
      </div>
      {draft.adminNotes ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-stone-700">
          {draft.adminNotes}
        </p>
      ) : null}
    </div>
  );
}

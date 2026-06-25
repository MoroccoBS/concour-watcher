import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  MapPin,
  RadioTower,
  UsersRound,
} from "lucide-react";

import { cn, formatDateTime } from "@/lib/utils";
import type { DocumentItem } from "./types";

export function isAllocationDocument(item: DocumentItem) {
  return item.documentType === "notice";
}

export function DocumentTypeSummary({
  item,
  expanded,
  onToggleSpecialties,
}: {
  item: DocumentItem;
  expanded: boolean;
  onToggleSpecialties: () => void;
}) {
  if (isAllocationDocument(item)) {
    return (
      <NoticeSpecialtiesSummary
        item={item}
        expanded={expanded}
        onToggleSpecialties={onToggleSpecialties}
      />
    );
  }

  return <FollowUpDocumentSummary item={item} />;
}

function NoticeSpecialtiesSummary({
  item,
  expanded,
  onToggleSpecialties,
}: {
  item: DocumentItem;
  expanded: boolean;
  onToggleSpecialties: () => void;
}) {
  if (!item.specialtyRows.length) {
    return (
      <div className="rounded border border-border bg-background/30 px-3.5 py-2.5 text-xs text-stone-600">
        <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-wider text-stone-500">
          <FileText className="h-3.5 w-3.5" />
          Avis de concours
        </div>
        <div className="mt-1 font-medium text-stone-800">
          Specialty allocation has not been extracted yet.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded border border-border bg-background/30 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-3 bg-muted/40 px-3.5 py-2 text-left text-xs font-semibold text-stone-700 transition-colors hover:bg-muted/70"
        onClick={onToggleSpecialties}
      >
        <span className="font-sans">
          Specialties ({item.specialtyRows.length}) ·{" "}
          <strong className="font-mono font-bold text-stone-900">
            {item.specialtyRows.reduce((sum, row) => sum + row.seats, 0)}
          </strong>{" "}
          seats
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-background/50 text-left">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-3.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-stone-500">
                  Specialty
                </th>
                <th className="px-3.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-stone-500">
                  Frame
                </th>
                <th className="px-3.5 py-1.5 text-right font-mono text-[9px] font-bold uppercase tracking-wider text-stone-500">
                  Seats
                </th>
              </tr>
            </thead>
            <tbody>
              {item.specialtyRows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-t border-border/40 transition-colors hover:bg-muted/20",
                    row.isRadiology &&
                      "border-y border-emerald-100/40 bg-emerald-500/5 font-medium text-accent-success",
                  )}
                >
                  <td className="px-3.5 py-1.5 text-xs text-stone-800">
                    {row.specialty}
                  </td>
                  <td className="px-3.5 py-1.5 font-sans text-[11px] text-stone-500">
                    {row.frame ?? "-"}
                  </td>
                  <td
                    className={cn(
                      "px-3.5 py-1.5 text-right font-mono text-xs font-semibold",
                      row.isRadiology
                        ? "text-accent-success"
                        : "text-stone-900",
                    )}
                  >
                    {row.seats}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function FollowUpDocumentSummary({ item }: { item: DocumentItem }) {
  const config = getFollowUpConfig(item.documentType);
  const details = getFollowUpDetails(item);

  return (
    <div
      className={cn(
        "rounded border px-3.5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)]",
        config.className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-wider">
            {config.icon}
            {config.label}
          </div>
          <div className="mt-1 text-sm font-semibold leading-snug text-stone-900">
            {config.summary}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:min-w-[260px]">
          {details.map((detail) => (
            <div
              key={detail.label}
              className="rounded border border-stone-200/70 bg-background/45 px-2.5 py-2"
            >
              <div className="flex items-center gap-1.5 font-mono text-[8px] font-bold uppercase tracking-wider text-stone-400">
                {detail.icon}
                {detail.label}
              </div>
              <div className="mt-0.5 truncate text-[11px] font-semibold text-stone-800">
                {detail.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getFollowUpConfig(documentType: DocumentItem["documentType"]) {
  switch (documentType) {
    case "convocation":
      return {
        label: "Liste des convoqués",
        summary: "Candidate list published for the concours stage.",
        icon: <UsersRound className="h-3.5 w-3.5" />,
        className: "border-sky-200/80 bg-sky-50/45 text-accent-info",
      };
    case "planning":
      return {
        label: "Planning",
        summary: "Exam schedule or programme document.",
        icon: <CalendarDays className="h-3.5 w-3.5" />,
        className: "border-amber-200/80 bg-amber-50/35 text-accent-warning",
      };
    case "results":
      return {
        label: "Résultats",
        summary: "Results document published.",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        className: "border-violet-200/80 bg-violet-50/35 text-accent-match",
      };
    case "assignment":
      return {
        label: "Affectation",
        summary: "Assignment or service-start document.",
        icon: <ClipboardList className="h-3.5 w-3.5" />,
        className: "border-emerald-200/80 bg-emerald-50/30 text-accent-success",
      };
    default:
      return {
        label: "Document",
        summary: "Additional concours document.",
        icon: <FileText className="h-3.5 w-3.5" />,
        className: "border-border bg-background/30 text-stone-600",
      };
  }
}

function getFollowUpDetails(item: DocumentItem) {
  return [
    {
      label: "Exam",
      value: formatDateTime(item.examDate),
      icon: <CalendarDays className="h-3 w-3" />,
    },
    {
      label: "Place",
      value: item.center ?? item.region ?? "Unknown",
      icon: <MapPin className="h-3 w-3" />,
    },
    {
      label: "PDF",
      value: item.hasAttachment ? "Available" : "Missing",
      icon: <FileText className="h-3 w-3" />,
    },
    {
      label: "Radiology",
      value: item.isRadiologyRelevant ? "Relevant" : "Not scored",
      icon: <RadioTower className="h-3 w-3" />,
    },
  ];
}

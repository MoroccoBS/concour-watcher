"use client";

import { CalendarDays, ChevronRight, TriangleAlert } from "lucide-react";
import type * as React from "react";
import { useMemo, useState } from "react";
import type { DayButton } from "react-day-picker";

import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatDateTime } from "@/lib/utils";
import { displayTitle } from "./tracker-utils";
import type { ConcoursCase } from "./types";

type CalendarEntry = {
  id: string;
  type: "deadline" | "exam";
  title: string;
  center: string | null;
  hasConflict: boolean;
};

function dateKey(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function buildCalendarEntries(cases: ConcoursCase[]) {
  const entries = new Map<string, CalendarEntry[]>();
  const examCounts = new Map<string, number>();

  for (const item of cases) {
    const key = dateKey(item.examDate);
    if (key) examCounts.set(key, (examCounts.get(key) ?? 0) + 1);
  }

  for (const item of cases) {
    const title = displayTitle(item.primary);
    const examKey = dateKey(item.examDate);
    const deadlineKey = dateKey(item.deadline);

    if (deadlineKey) {
      entries.set(deadlineKey, [
        ...(entries.get(deadlineKey) ?? []),
        {
          id: item.id,
          type: "deadline",
          title,
          center: item.center,
          hasConflict: false,
        },
      ]);
    }

    if (examKey) {
      entries.set(examKey, [
        ...(entries.get(examKey) ?? []),
        {
          id: item.id,
          type: "exam",
          title,
          center: item.center,
          hasConflict: (examCounts.get(examKey) ?? 0) > 1 || item.hasConflict,
        },
      ]);
    }
  }

  return entries;
}

export function ConcoursCalendarView({
  cases,
  selectedCaseId,
  onSelectCase,
}: {
  cases: ConcoursCase[];
  selectedCaseId: string | null;
  onSelectCase: (id: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const firstDate =
      cases
        .map((item) => item.examDate ?? item.deadline)
        .filter(Boolean)
        .map((value) => new Date(value as string | Date))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? new Date();
    return firstDate;
  });
  const eventsByDay = useMemo(() => buildCalendarEntries(cases), [cases]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
            <CalendarDays data-icon="inline-start" />
            Monthly view
          </div>
          <h2 className="font-serif text-3xl font-semibold text-stone-900">
            Deadlines and exam dates
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <LegendChip className="bg-[#b36b00]" label="Deadline" />
          <LegendChip className="bg-[#2a4f6e]" label="Exam" />
          <LegendChip className="bg-primary" label="Same-day conflict" />
        </div>
      </div>

      <Calendar
        month={month}
        onMonthChange={setMonth}
        onDayClick={() => {}}
        className="w-full rounded-lg border border-border bg-card p-3"
        classNames={{
          root: "w-full",
          month: "w-full flex flex-col gap-3", // ① restore flex flex-col
          month_grid: "w-full", // ② drop table-* (layout is flex-based)
          weekdays: "flex w-full", // ③ explicit flex container
          weekday:
            "flex-1 h-8 rounded-md text-center font-mono text-[10px] font-bold uppercase tracking-wider text-stone-400", // ④ add flex-1 ← fixes SUMOTUWETHFRSA
          week: "mt-1 flex w-full gap-1", // ⑤ add gap-1 (replaces border-spacing)
          day: "flex-1 relative rounded-md p-0", // ⑥ add flex-1, drop align-top (table-only prop)
        }}
        components={{
          DayButton: (props) => (
            <CalendarEventDayButton
              {...props}
              entries={eventsByDay.get(dateKey(props.day.date) ?? "") ?? []}
              selectedCaseId={selectedCaseId}
              onSelectCase={onSelectCase}
            />
          ),
        }}
      />
    </div>
  );
}

function LegendChip({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-stone-500">
      <span className={cn("size-2 rounded-full", className)} />
      {label}
    </div>
  );
}

function CalendarEventDayButton({
  day,
  modifiers,
  entries,
  selectedCaseId,
  onSelectCase,
  className,
  ...props
}: React.ComponentProps<typeof DayButton> & {
  entries: CalendarEntry[];
  selectedCaseId: string | null;
  onSelectCase: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasDeadline = entries.some((entry) => entry.type === "deadline");
  const hasExam = entries.some((entry) => entry.type === "exam");
  const hasConflict = entries.some((entry) => entry.hasConflict);
  const hasSelection = entries.some((entry) => entry.id === selectedCaseId);
  const dayNumber = day.date.getDate();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "group relative flex min-h-20 w-full flex-col items-start justify-between rounded-md border border-border/60 bg-background p-2 text-left transition-colors hover:border-primary/30 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:min-h-24",
              modifiers.outside && "opacity-35",
              modifiers.today && "bg-muted/45",
              hasSelection && "border-primary/50 bg-primary/[0.04]",
              hasConflict && "border-primary/40 bg-primary/[0.03]",
              className,
            )}
            onFocus={() => entries.length && setOpen(true)}
            onMouseEnter={() => entries.length && setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            {...props}
          />
        }
      >
        <span className="font-mono text-[11px] font-bold text-stone-700">
          {dayNumber}
        </span>
        <span className="flex w-full flex-col gap-1">
          {hasDeadline ? (
            <span className="h-1.5 rounded-full bg-[#b36b00]" />
          ) : null}
          {hasExam ? (
            <span className="h-1.5 rounded-full bg-[#2a4f6e]" />
          ) : null}
          {hasConflict ? (
            <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
              <TriangleAlert data-icon="inline-start" />
              Conflict
            </span>
          ) : null}
        </span>
      </PopoverTrigger>
      {entries.length ? (
        <PopoverContent
          className="w-80 rounded-lg border border-border bg-card p-3"
          side="top"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <PopoverHeader>
            <PopoverTitle className="font-serif text-lg text-stone-900">
              {formatDateTime(day.date)}
            </PopoverTitle>
          </PopoverHeader>
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <button
                type="button"
                key={`${entry.id}-${entry.type}-${entry.title}`}
                onClick={() => {
                  onSelectCase(entry.id);
                  setOpen(false);
                }}
                className="rounded-md border border-border bg-background/70 p-2 text-left transition-colors hover:bg-muted/50"
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 px-1.5 font-mono text-[9px] uppercase",
                      entry.type === "deadline"
                        ? "border-amber-200 bg-amber-50 text-[#8a5200]"
                        : "border-sky-200 bg-sky-50 text-[#2a4f6e]",
                    )}
                  >
                    {entry.type}
                  </Badge>
                  {entry.hasConflict ? (
                    <Badge className="h-5 border-primary/20 bg-primary/10 px-1.5 font-mono text-[9px] uppercase text-primary">
                      conflict
                    </Badge>
                  ) : null}
                </div>
                <div className="line-clamp-2 text-xs font-semibold leading-snug text-stone-800">
                  {entry.title}
                </div>
                {entry.center ? (
                  <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-stone-400">
                    {entry.center}
                    <ChevronRight data-icon="inline-end" />
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        </PopoverContent>
      ) : null}
    </Popover>
  );
}

import {
  CalendarDays,
  ExternalLink,
  FileText,
  MapPin,
  RadioTower,
  UserRoundSearch,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusLabel, statusTone } from "@/lib/status";
import { cn, formatDateTime } from "@/lib/utils";
import { DecisionChips } from "./decision-controls";
import { decisionAccent, decisionSummary } from "./tracker-utils";
import type { ConcoursCase, DocumentItem } from "./types";

export function ConcoursCard({
  item,
  onOpenDetails,
}: {
  item: ConcoursCase;
  onOpenDetails: () => void;
}) {
  const status = item.primary.applicationStatus;

  return (
    <Card
      className={cn(
        "border border-border/80 bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)]",
        cardStatusTone(status),
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge className={cn("px-2.5 py-0.5 text-[10px] font-mono tracking-wider uppercase font-semibold", statusTone(status))}>
                {statusLabel(status)}
              </Badge>
              <Badge variant="outline" className="border-border bg-background/50 text-[10px] font-mono tracking-wider uppercase font-semibold text-stone-600">
                {decisionSummary(status)}
              </Badge>
              {item.latestUpdate.updateLabel ? (
                <Badge className="border-sky-200/80 bg-sky-50 text-sky-950 px-2.5 py-0.5 text-[10px] font-mono tracking-wider uppercase font-semibold">
                  {item.latestUpdate.updateLabel}
                </Badge>
              ) : null}
              {item.hasCandidateMatch ? (
                <Badge className="border-violet-200/80 bg-violet-50 text-accent-match px-2.5 py-0.5 text-[10px] font-mono tracking-wider uppercase font-semibold animate-pulse">
                  name found
                </Badge>
              ) : null}
            </div>
            <CardTitle className="font-serif text-2xl font-medium tracking-tight text-stone-900 leading-tight">
              {item.title}
            </CardTitle>
          </div>
          <DecisionChips value={status} compact />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 text-sm text-stone-700 sm:grid-cols-2 lg:grid-cols-4">
          <Info
            icon={<CalendarDays className="h-4 w-4" />}
            label="Exam Date"
            value={formatDateTime(item.examDate)}
          />
          <Info
            icon={<CalendarDays className="h-4 w-4" />}
            label="Deadline"
            value={formatDateTime(item.deadline)}
          />
          <Info
            icon={<MapPin className="h-4 w-4" />}
            label="Location"
            value={item.center ?? "Unknown"}
            isMono={false}
          />
          <Info
            icon={<RadioTower className="h-4 w-4" />}
            label="Radiology Seats"
            value={item.radiologySeats?.toString() ?? "0"}
            isHighlight={Boolean(item.radiologySeats && item.radiologySeats > 0)}
          />
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-border/40 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {item.documents.map((document) => (
              <DocumentPill key={document.id} item={document} />
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onOpenDetails}
              className="text-xs font-semibold px-4 py-2 hover:opacity-95"
            >
              Details
            </Button>
            <a
              href={
                item.primary.hasAttachment
                  ? item.primary.pdfUrl
                  : item.primary.sourcePageUrl
              }
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "text-xs font-semibold px-4 py-2 hover:bg-muted"
              )}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              View PDF
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function cardStatusTone(status: string) {
  return {
    new: "border-t border-t-stone-200/50",
    maybe: "border-t border-t-amber-300 bg-amber-50/5",
    apply: "border-t border-t-emerald-300 bg-emerald-50/5",
    applied: "border-t border-t-teal-300 bg-teal-50/5",
    skip: "opacity-75 bg-stone-50/30",
    closed: "opacity-60 bg-stone-50/40",
  }[status] || "";
}

function DocumentPill({ item }: { item: DocumentItem }) {
  const isResult = item.updateLabel?.toLowerCase().includes("résultat");
  const isMatched = item.candidateMatched === true;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wide uppercase font-mono shadow-[0_1px_2px_rgba(0,0,0,0.01)]",
        isMatched
          ? "border-violet-200 bg-violet-50 text-accent-match font-bold"
          : isResult
            ? "border-sky-200 bg-sky-50 text-accent-info"
            : "border-border bg-background text-stone-500",
      )}
    >
      {isMatched || isResult ? (
        <UserRoundSearch className="h-3.5 w-3.5" />
      ) : (
        <FileText className="h-3.5 w-3.5" />
      )}
      {item.updateLabel ?? item.documentType}
    </span>
  );
}

function Info({
  icon,
  label,
  value,
  isMono = true,
  isHighlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isMono?: boolean;
  isHighlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-md border border-border/80 bg-background/40 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-colors hover:border-border",
        isHighlight && "border-emerald-200 bg-emerald-50/10 text-accent-success",
      )}
    >
      <div className="mt-0.5 text-primary/80">{icon}</div>
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-stone-500 font-mono mb-0.5">
          {label}
        </div>
        <div
          className={cn(
            "font-medium text-stone-900 leading-snug",
            isMono ? "font-mono text-xs" : "font-sans text-sm",
            isHighlight && "text-accent-success font-semibold",
          )}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

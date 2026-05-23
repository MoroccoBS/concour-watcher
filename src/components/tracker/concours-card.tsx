import {
  CalendarDays,
  ExternalLink,
  FileText,
  MapPin,
  RadioTower,
  UserRoundSearch,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <Card className={cn("border-l-4 shadow-sm", decisionAccent(status))}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge className={statusTone(status)}>
                {statusLabel(status)}
              </Badge>
              <Badge className="border-stone-200 bg-white/70 text-stone-700">
                {decisionSummary(status)}
              </Badge>
              {item.latestUpdate.updateLabel ? (
                <Badge className="border-sky-200 bg-sky-100 text-sky-950">
                  {item.latestUpdate.updateLabel}
                </Badge>
              ) : null}
              {item.hasCandidateMatch ? (
                <Badge className="border-violet-200 bg-violet-100 text-violet-950">
                  name found
                </Badge>
              ) : null}
            </div>
            <CardTitle>{item.title}</CardTitle>
          </div>
          <DecisionChips value={status} compact />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 text-sm text-stone-700 sm:grid-cols-2 lg:grid-cols-4">
          <Info
            icon={<CalendarDays className="h-4 w-4" />}
            label="Exam"
            value={formatDateTime(item.examDate)}
          />
          <Info
            icon={<CalendarDays className="h-4 w-4" />}
            label="Deadline"
            value={formatDateTime(item.deadline)}
          />
          <Info
            icon={<MapPin className="h-4 w-4" />}
            label="Place"
            value={item.center ?? "Unknown"}
          />
          <Info
            icon={<RadioTower className="h-4 w-4" />}
            label="Radiology"
            value={item.radiologySeats?.toString() ?? "Unknown"}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-stone-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {item.documents.map((document) => (
              <DocumentPill key={document.id} item={document} />
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={onOpenDetails}>Details</Button>
            <Button asChild variant="outline">
              <a
                href={
                  item.primary.hasAttachment
                    ? item.primary.pdfUrl
                    : item.primary.sourcePageUrl
                }
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentPill({ item }: { item: DocumentItem }) {
  const isResult = item.updateLabel?.toLowerCase().includes("résultat");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        isResult
          ? "border-violet-200 bg-violet-50 text-violet-950"
          : "border-stone-300 bg-white/70 text-stone-700",
      )}
    >
      {isResult ? (
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2 rounded-md border border-stone-200 bg-white/50 p-3">
      <div className="mt-0.5 text-amber-900">{icon}</div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
          {label}
        </div>
        <div className="mt-1 font-medium text-stone-950">{value}</div>
      </div>
    </div>
  );
}

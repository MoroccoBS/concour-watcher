import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  NotebookPen,
  RadioTower,
  RotateCcw,
  Sparkles,
  UserRoundSearch,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  type ApplicationStatus,
  processingTone,
  statusLabel,
  statusTone,
} from "@/lib/status";
import { cn, formatDateTime } from "@/lib/utils";
import {
  DossierAnnotationsNotepad,
  DossierFunnelStepper,
} from "./decision-controls";
import { DocumentTypeSummary } from "./document-type-summary";
import { displayTitle } from "./tracker-utils";
import type { ConcoursCase, DocumentItem } from "./types";

export function TrackerDetailPane({
  concoursCase,
  adminToken,
  isAdminUnlocked,
  expandedSpecialties,
  updatePending,
  reprocessPending,
  onToggleSpecialties,
  onStatusChange,
  onNotesChange,
  onReprocess,
}: {
  concoursCase: ConcoursCase | null;
  adminToken: string;
  isAdminUnlocked: boolean;
  expandedSpecialties: Record<string, boolean>;
  updatePending: boolean;
  reprocessPending: boolean;
  onToggleSpecialties: (id: string) => void;
  onStatusChange: (status: ApplicationStatus) => void;
  onNotesChange: (notes: string) => void;
  onReprocess: (documentId: string) => void;
}) {
  if (!concoursCase) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-[#faf6f0]/20 border-l border-border/30">
        <div className="max-w-md space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 text-primary mb-2">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="font-serif text-2xl font-semibold text-stone-900 tracking-tight">
            No Selection
          </h3>
          <p className="text-sm text-stone-500 leading-relaxed font-sans">
            Select a recruitment notice from the left sidebar to inspect its
            chronological documents timeline, specialties allocation, and
            candidate verification matches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#faf6f0]/25 p-6 lg:p-8 space-y-6 border-l border-border/30">
      {/* Pane Header */}
      <div className="space-y-3">
        {isAdminUnlocked ? (
          <div className="flex flex-wrap gap-1.5">
            <Badge
              className={cn(
                "px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
                statusTone(concoursCase.primary.applicationStatus),
              )}
            >
              {statusLabel(concoursCase.primary.applicationStatus)}
            </Badge>
            {concoursCase.hasCandidateMatch ? (
              <Badge className="border-violet-200/80 bg-violet-50 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-accent-match">
                name found
              </Badge>
            ) : null}
          </div>
        ) : null}
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-stone-900 leading-tight">
          {concoursCase.title}
        </h2>
      </div>

      {/* Top-Docked Progress Funnel Stepper */}
      {isAdminUnlocked ? (
        <DossierFunnelStepper
          status={concoursCase.primary.applicationStatus}
          adminToken={adminToken}
          updatePending={updatePending}
          onStatusChange={onStatusChange}
        />
      ) : null}

      {/* Primary Metadata Blocks */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Info
          icon={<CalendarDays className="h-4 w-4" />}
          label="Exam Date"
          value={formatDateTime(concoursCase.examDate)}
        />
        <Info
          icon={<CalendarDays className="h-4 w-4" />}
          label="Deadline"
          value={formatDateTime(concoursCase.deadline)}
        />
        <Info
          icon={<MapPin className="h-4 w-4" />}
          label="Center Location"
          value={concoursCase.center ?? "Unknown"}
          isMono={false}
        />
        <Info
          icon={<RadioTower className="h-4 w-4" />}
          label="Radiology Seats"
          value={concoursCase.radiologySeats?.toString() ?? "0"}
          isHighlight={Boolean(
            concoursCase.radiologySeats && concoursCase.radiologySeats > 0,
          )}
        />
      </div>

      {/* Main timeline vs admin column split */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px] pt-2">
        {/* Timeline Stack */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
            Chronological Timeline ({concoursCase.documents.length} docs)
          </h3>
          <div className="relative border-l border-stone-200/80 ml-3.5 pl-7 space-y-8 py-2">
            {concoursCase.documents.map((item) => (
              <DocumentSection
                key={item.id}
                item={item}
                isAdminUnlocked={isAdminUnlocked}
                reprocessPending={reprocessPending}
                expanded={Boolean(expandedSpecialties[item.id])}
                onToggleSpecialties={() => onToggleSpecialties(item.id)}
                onReprocess={() => onReprocess(item.id)}
              />
            ))}
          </div>
        </div>

        {/* Inline Decisions sidebar console */}
        {isAdminUnlocked ? (
          <aside className="h-fit">
            <DossierJournalDialog
              adminNotes={concoursCase.primary.adminNotes}
              adminToken={adminToken}
              onNotesChange={onNotesChange}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function DossierJournalDialog({
  adminNotes,
  adminToken,
  onNotesChange,
}: {
  adminNotes: string;
  adminToken: string;
  onNotesChange: (notes: string) => void;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" className="w-full justify-start text-xs" />
        }
      >
        <NotebookPen data-icon="inline-start" />
        Clinical Dossier Journal
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-xl border border-border bg-card p-0">
        <DialogHeader className="border-b border-border/50 p-6">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
            <NotebookPen data-icon="inline-start" />
            Private notes
          </div>
          <DialogTitle className="font-serif text-3xl text-stone-900">
            Clinical Dossier Journal
          </DialogTitle>
        </DialogHeader>
        <DossierAnnotationsNotepad
          adminNotes={adminNotes}
          adminToken={adminToken}
          onNotesChange={onNotesChange}
          className="rounded-none border-0 bg-transparent shadow-none"
        />
      </DialogContent>
    </Dialog>
  );
}

function getTimelineNodeProps(item: DocumentItem) {
  const isMatched = item.candidateMatched === true;

  if (isMatched) {
    return {
      bg: "bg-violet-600 border-violet-600 text-violet-50",
      icon: <Sparkles className="h-3 w-3" />,
      pulse: true,
    };
  }

  switch (item.documentType) {
    case "notice":
      return {
        bg: "bg-primary border-primary text-primary-foreground",
        icon: <FileText className="h-3 w-3" />,
        pulse: false,
      };
    case "planning":
      return {
        bg: "bg-amber-600 border-amber-600 text-amber-50",
        icon: <Clock className="h-3.5 w-3.5" />,
        pulse: false,
      };
    case "convocation":
      return {
        bg: "bg-indigo-600 border-indigo-600 text-indigo-50",
        icon: <UserRoundSearch className="h-3.5 w-3.5" />,
        pulse: false,
      };
    case "results":
    case "assignment":
      return {
        bg: "bg-violet-600 border-violet-600 text-violet-50",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        pulse: false,
      };
    default:
      return {
        bg: "bg-stone-500 border-stone-500 text-stone-50",
        icon: <FileText className="h-3 w-3" />,
        pulse: false,
      };
  }
}

function DocumentSection({
  item,
  isAdminUnlocked,
  reprocessPending,
  expanded,
  onToggleSpecialties,
  onReprocess,
}: {
  item: DocumentItem;
  isAdminUnlocked: boolean;
  reprocessPending: boolean;
  expanded: boolean;
  onToggleSpecialties: () => void;
  onReprocess: () => void;
}) {
  const node = getTimelineNodeProps(item);
  return (
    <div className="relative group pl-1">
      {/* Node Circle on Sandstone line */}
      <div
        className={cn(
          "absolute -left-[28px] top-1 -translate-x-1/2 h-7 w-7 rounded-full border border-stone-200 bg-card flex items-center justify-center shadow-sm z-10 transition-transform duration-200 group-hover:scale-110",
          node.bg,
        )}
      >
        {node.pulse && (
          <span className="absolute -inset-1 rounded-full bg-violet-400/30 animate-pulse" />
        )}
        {node.icon}
      </div>

      {/* Main clinical journal entry */}
      <div className="space-y-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              <Badge
                className={cn(
                  "px-2 py-0.5 text-[8px] font-mono tracking-wider uppercase font-semibold",
                  processingTone(item.processingStatus),
                )}
              >
                {item.processingStatus.replace("_", " ")}
              </Badge>
              {item.updateLabel ? (
                <Badge className="border-sky-200/80 bg-sky-50 text-accent-info px-2 py-0.5 text-[8px] font-mono tracking-wider uppercase font-semibold">
                  {item.updateLabel}
                </Badge>
              ) : null}
              {!item.hasAttachment ? (
                <Badge className="border-orange-200/80 bg-orange-50 text-accent-warning px-2 py-0.5 text-[8px] font-mono tracking-wider uppercase font-semibold">
                  no attachment
                </Badge>
              ) : null}
              {isAdminUnlocked && item.candidateMatched === true ? (
                <Badge className="border-violet-200/80 bg-violet-50 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-accent-match">
                  name found
                </Badge>
              ) : isAdminUnlocked && item.candidateMatched === false ? (
                <Badge className="border-stone-200 bg-stone-100/50 text-stone-500 px-2 py-0.5 text-[8px] font-mono tracking-wider uppercase font-semibold">
                  name checked
                </Badge>
              ) : null}
            </div>

            <h4 className="font-serif text-lg font-semibold leading-snug text-stone-900 group-hover:text-primary transition-colors">
              {displayTitle(item)}
            </h4>

            <p className="mt-1 text-[9px] font-medium font-mono text-stone-400">
              Discovered: {formatDateTime(item.discoveredAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start">
            {isAdminUnlocked ? (
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={reprocessPending}
                onClick={onReprocess}
                className="h-7 px-3 font-mono text-[10px] font-bold uppercase tracking-wider"
              >
                <RotateCcw data-icon="inline-start" />
                Reprocess
              </Button>
            ) : null}
            <a
              href={item.hasAttachment ? item.pdfUrl : item.sourcePageUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "xs" }),
                "h-7 px-3 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-muted",
              )}
            >
              <ExternalLink data-icon="inline-start" />
              {item.hasAttachment ? "Open PDF" : "Source"}
            </a>
          </div>
        </div>

        {isAdminUnlocked && item.events?.length ? (
          <div className="rounded-md border border-border/60 bg-background/35 p-3">
            <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-stone-400">
              Document events
            </div>
            <div className="flex flex-col gap-1.5">
              {item.events.slice(0, 4).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <span className="font-medium text-stone-700">
                    {event.message}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-stone-400">
                    {formatDateTime(event.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {isAdminUnlocked && item.candidateMatched !== null ? (
          <div className="rounded border border-violet-100 bg-violet-50/20 px-3.5 py-2.5 text-xs text-stone-700 leading-relaxed shadow-[0_1px_2px_rgba(88,28,135,0.02)]">
            <div className="flex items-center gap-2 font-mono font-semibold text-accent-match uppercase text-[9px] tracking-wider mb-1">
              <UserRoundSearch className="h-4 w-4" />
              Gemini check:{" "}
              {item.candidateMatched ? "Match Confirmed" : "No Match"} ·{" "}
              {item.candidateCheckConfidence ?? 0}% confidence
            </div>
            {item.candidateMatchedName ? (
              <div className="mt-1 font-mono text-xs">
                <span className="text-stone-400">Matched Name:</span>{" "}
                <strong className="text-stone-900 font-bold">
                  {item.candidateMatchedName}
                </strong>
              </div>
            ) : null}
            {item.candidateEvidence ? (
              <div className="mt-1.5 border-t border-violet-100/45 pt-1.5 text-stone-600 text-[11px]">
                {item.candidateEvidence}
              </div>
            ) : null}
          </div>
        ) : null}

        <DocumentTypeSummary
          item={item}
          expanded={expanded}
          onToggleSpecialties={onToggleSpecialties}
        />
      </div>
    </div>
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
        "flex gap-3 rounded-md border border-border bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-colors hover:border-border",
        isHighlight &&
          "border-emerald-200 bg-emerald-50/10 text-accent-success",
      )}
    >
      <div className="mt-0.5 text-primary/85">{icon}</div>
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

import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Sparkles,
  UserRoundSearch,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

export function ConcoursDetailsDialog({
  concoursCase,
  adminToken,
  expandedSpecialties,
  updatePending,
  onClose,
  onToggleSpecialties,
  onStatusChange,
  onNotesChange,
}: {
  concoursCase: ConcoursCase | null;
  adminToken: string;
  expandedSpecialties: Record<string, boolean>;
  updatePending: boolean;
  onClose: () => void;
  onToggleSpecialties: (id: string) => void;
  onStatusChange: (status: ApplicationStatus) => void;
  onNotesChange: (notes: string) => void;
}) {
  if (!concoursCase) {
    return null;
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl border border-border bg-card shadow-2xl rounded-lg overflow-hidden p-0 gap-0">
        <DialogHeader className="flex flex-col sm:flex-row items-start justify-between gap-4 p-6 border-b border-border/40 bg-background/50">
          <div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              <Badge
                className={cn(
                  "px-2.5 py-0.5 text-[10px] font-mono tracking-wider uppercase font-semibold",
                  statusTone(concoursCase.primary.applicationStatus),
                )}
              >
                {statusLabel(concoursCase.primary.applicationStatus)}
              </Badge>
              {concoursCase.hasCandidateMatch ? (
                <Badge className="border-violet-200/80 bg-violet-50 text-accent-match px-2.5 py-0.5 text-[10px] font-mono tracking-wider uppercase font-semibold animate-pulse">
                  name found
                </Badge>
              ) : null}
            </div>
            <DialogTitle className="font-serif text-3xl font-semibold tracking-tight text-stone-900 leading-tight">
              {concoursCase.title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Top-Docked Funnel Stepper */}
          <DossierFunnelStepper
            status={concoursCase.primary.applicationStatus}
            adminToken={adminToken}
            updatePending={updatePending}
            onStatusChange={onStatusChange}
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            {/* Left Column: Timeline Documents */}
            <div className="space-y-4">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
                Chronological Timeline ({concoursCase.documents.length} docs)
              </h2>
              <div className="relative border-l border-stone-200/80 ml-3.5 pl-7 space-y-8 py-2">
                {concoursCase.documents.map((item) => (
                  <DocumentSection
                    key={item.id}
                    item={item}
                    expanded={Boolean(expandedSpecialties[item.id])}
                    onToggleSpecialties={() => onToggleSpecialties(item.id)}
                  />
                ))}
              </div>
            </div>

            {/* Right Column: Decisions & Action Notes */}
            <aside className="space-y-4">
              <DossierAnnotationsNotepad
                adminNotes={concoursCase.primary.adminNotes}
                adminToken={adminToken}
                onNotesChange={onNotesChange}
              />
              {!adminToken && (
                <div className="rounded border border-stone-200/60 bg-stone-50/50 p-3 text-[11px] font-medium leading-normal text-stone-500 font-sans shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                  Unlock security console in the main header to edit tracking
                  decisions and add annotations.
                </div>
              )}
            </aside>
          </div>
        </div>
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
  expanded,
  onToggleSpecialties,
}: {
  item: DocumentItem;
  expanded: boolean;
  onToggleSpecialties: () => void;
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
              {item.candidateMatched === true ? (
                <Badge className="border-violet-200/80 bg-violet-50 text-accent-match px-2 py-0.5 text-[8px] font-mono tracking-wider uppercase font-bold animate-pulse">
                  name found
                </Badge>
              ) : item.candidateMatched === false ? (
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

          <a
            href={item.hasAttachment ? item.pdfUrl : item.sourcePageUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "text-[10px] h-7 font-mono uppercase tracking-wider px-3 hover:bg-muted font-bold self-start mt-1 sm:mt-0",
            )}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            {item.hasAttachment ? "Open PDF" : "Source"}
          </a>
        </div>

        {item.candidateMatched !== null ? (
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

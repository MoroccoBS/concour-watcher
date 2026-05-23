import {
  ChevronDown,
  ExternalLink,
  PencilLine,
  UserRoundSearch,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type ApplicationStatus,
  applicationStatuses,
  processingTone,
  statusLabel,
  statusTone,
} from "@/lib/status";
import { cn, formatDateTime } from "@/lib/utils";
import { DecisionPreview } from "./decision-controls";
import { displayTitle } from "./tracker-utils";
import type { ConcoursCase, DecisionDraft, DocumentItem } from "./types";

export function ConcoursDetailsDialog({
  concoursCase,
  adminToken,
  editing,
  draft,
  expandedSpecialties,
  updatePending,
  onClose,
  onBeginEdit,
  onDraftChange,
  onToggleSpecialties,
  onSave,
  onCancelEdit,
}: {
  concoursCase: ConcoursCase | null;
  adminToken: string;
  editing: string | null;
  draft: DecisionDraft;
  expandedSpecialties: Record<string, boolean>;
  updatePending: boolean;
  onClose: () => void;
  onBeginEdit: (item: DocumentItem) => void;
  onDraftChange: React.Dispatch<React.SetStateAction<DecisionDraft>>;
  onToggleSpecialties: (id: string) => void;
  onSave: (item: DocumentItem) => void;
  onCancelEdit: () => void;
}) {
  if (!concoursCase) {
    return null;
  }

  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge
                className={statusTone(concoursCase.primary.applicationStatus)}
              >
                {statusLabel(concoursCase.primary.applicationStatus)}
              </Badge>
              {concoursCase.hasCandidateMatch ? (
                <Badge className="border-violet-200 bg-violet-100 text-violet-950">
                  name found
                </Badge>
              ) : null}
            </div>
            <DialogTitle>{concoursCase.title}</DialogTitle>
          </div>
          <DialogClose label="Close details" onClick={onClose} />
        </DialogHeader>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-3">
            {concoursCase.documents.map((item) => (
              <DocumentSection
                key={item.id}
                item={item}
                expanded={Boolean(expandedSpecialties[item.id])}
                onToggleSpecialties={() => onToggleSpecialties(item.id)}
              />
            ))}
          </div>

          <aside className="h-fit rounded-md border border-stone-300 bg-white/60 p-4">
            <DecisionPreview
              draft={{
                applicationStatus: concoursCase.primary.applicationStatus,
                adminNotes: concoursCase.primary.adminNotes,
              }}
              className="border-0 bg-transparent p-0"
            />
            {adminToken ? (
              <Button
                className="mt-4 w-full"
                variant="secondary"
                onClick={() => onBeginEdit(concoursCase.primary)}
              >
                <PencilLine className="h-4 w-4" />
                Edit decision
              </Button>
            ) : (
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
                Unlock decisions from the header.
              </div>
            )}

            {editing === concoursCase.primary.id ? (
              <div className="mt-4 grid gap-3 border-t border-stone-300 pt-4">
                <Select
                  value={draft.applicationStatus}
                  onChange={(event) =>
                    onDraftChange((current) => ({
                      ...current,
                      applicationStatus: event.target
                        .value as ApplicationStatus,
                    }))
                  }
                >
                  {applicationStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </Select>
                <Textarea
                  value={draft.adminNotes}
                  onChange={(event) =>
                    onDraftChange((current) => ({
                      ...current,
                      adminNotes: event.target.value,
                    }))
                  }
                  placeholder="Decision notes"
                />
                <div className="flex gap-2">
                  <Button
                    disabled={updatePending}
                    onClick={() => onSave(concoursCase.primary)}
                  >
                    Save
                  </Button>
                  <Button variant="ghost" onClick={onCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
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
  return (
    <section className="rounded-md border border-stone-300 bg-white/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge className={processingTone(item.processingStatus)}>
              {item.processingStatus.replace("_", " ")}
            </Badge>
            {item.updateLabel ? (
              <Badge className="border-sky-200 bg-sky-100 text-sky-950">
                {item.updateLabel}
              </Badge>
            ) : null}
            {!item.hasAttachment ? (
              <Badge className="border-orange-200 bg-orange-100 text-orange-900">
                no attachment yet
              </Badge>
            ) : null}
            {item.candidateMatched === true ? (
              <Badge className="border-violet-200 bg-violet-100 text-violet-950">
                name found
              </Badge>
            ) : item.candidateMatched === false ? (
              <Badge className="border-stone-200 bg-stone-100 text-stone-700">
                name checked
              </Badge>
            ) : null}
          </div>
          <h3 className="font-serif text-xl leading-snug">
            {displayTitle(item)}
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            Detected {formatDateTime(item.discoveredAt)}
          </p>
        </div>
        <Button asChild variant="outline">
          <a
            href={item.hasAttachment ? item.pdfUrl : item.sourcePageUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
            {item.hasAttachment ? "PDF" : "Source"}
          </a>
        </Button>
      </div>

      {item.candidateMatched !== null ? (
        <div className="mt-3 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-950">
          <div className="flex items-center gap-2 font-medium">
            <UserRoundSearch className="h-4 w-4" />
            Candidate check: {item.candidateMatched ? "found" : "not found"} ·{" "}
            {item.candidateCheckConfidence ?? 0}%
          </div>
          {item.candidateMatchedName ? (
            <div className="mt-1">Matched: {item.candidateMatchedName}</div>
          ) : null}
          {item.candidateEvidence ? (
            <div className="mt-1">{item.candidateEvidence}</div>
          ) : null}
        </div>
      ) : null}

      {item.specialtyRows.length ? (
        <div className="mt-4 overflow-hidden rounded-md border border-stone-300">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 bg-white/70 px-3 py-3 text-left text-sm font-medium"
            onClick={onToggleSpecialties}
          >
            <span>
              Specialties ({item.specialtyRows.length}) ·{" "}
              {item.specialtyRows.reduce((sum, row) => sum + row.seats, 0)}{" "}
              seats
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
          {expanded ? (
            <table className="w-full border-collapse bg-white/70 text-sm">
              <thead className="bg-stone-100 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Specialty</th>
                  <th className="px-3 py-2 font-medium">Frame</th>
                  <th className="px-3 py-2 text-right font-medium">Seats</th>
                </tr>
              </thead>
              <tbody>
                {item.specialtyRows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-t border-stone-200",
                      row.isRadiology && "bg-emerald-50",
                    )}
                  >
                    <td className="px-3 py-2">{row.specialty}</td>
                    <td className="px-3 py-2 text-stone-600">
                      {row.frame ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-right">{row.seats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { Settings } from "lucide-react";
import { useMemo, useState } from "react";
import { ConcoursCard } from "@/components/tracker/concours-card";
import { ConcoursDetailsDialog } from "@/components/tracker/concours-details-dialog";
import { TrackerHeader } from "@/components/tracker/tracker-header";
import { groupConcours } from "@/components/tracker/tracker-utils";
import type {
  ConcoursCase,
  DecisionDraft,
  DocumentItem,
} from "@/components/tracker/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAdminStore } from "@/store/admin-store";
import { useFilterStore } from "@/store/filter-store";
import { trpc } from "@/trpc/client";

export function TrackerShell() {
  const { data = [], isLoading } = trpc.documents.list.useQuery();
  const { data: watcherHealth } = trpc.watcher.health.useQuery();
  const utils = trpc.useUtils();
  const updateAdmin = trpc.documents.updateAdmin.useMutation({
    onSuccess: () => utils.documents.list.invalidate(),
  });
  const filter = useFilterStore((state) => state.filter);
  const setFilter = useFilterStore((state) => state.setFilter);
  const adminToken = useAdminStore((state) => state.adminToken);
  const setAdminToken = useAdminStore((state) => state.setAdminToken);
  const clearAdminToken = useAdminStore((state) => state.clearAdminToken);
  const [draftToken, setDraftToken] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [expandedSpecialties, setExpandedSpecialties] = useState<
    Record<string, boolean>
  >({});
  const [draft, setDraft] = useState<DecisionDraft>({
    applicationStatus: "new",
    adminNotes: "",
  });

  const cases = useMemo(() => groupConcours(data), [data]);
  const filtered = useMemo(() => filterCases(cases, filter), [cases, filter]);
  const selectedCase = selectedCaseId
    ? (cases.find((item) => item.id === selectedCaseId) ?? null)
    : null;
  const stats = useMemo(() => getStats(cases), [cases]);

  function beginEdit(item: DocumentItem) {
    setEditing(item.id);
    setDraft({
      applicationStatus: item.applicationStatus,
      adminNotes: item.adminNotes,
    });
  }

  return (
    <main className="min-h-screen bg-[#f8f1e7] text-stone-950">
      <TrackerHeader
        stats={stats}
        filter={filter}
        watcherHealth={watcherHealth}
        hasAdminToken={Boolean(adminToken)}
        onFilterChange={setFilter}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <section className="mx-auto grid w-full max-w-7xl gap-3 px-5 py-5 sm:px-8 lg:px-10">
        {isLoading ? (
          <div className="rounded-md border border-stone-300 bg-white/70 p-5">
            Loading concours...
          </div>
        ) : null}
        {filtered.map((item) => (
          <ConcoursCard
            key={item.id}
            item={item}
            onOpenDetails={() => setSelectedCaseId(item.id)}
          />
        ))}
      </section>

      <ConcoursDetailsDialog
        concoursCase={selectedCase}
        adminToken={adminToken}
        editing={editing}
        draft={draft}
        expandedSpecialties={expandedSpecialties}
        updatePending={updateAdmin.isPending}
        onClose={() => {
          setSelectedCaseId(null);
          setEditing(null);
        }}
        onBeginEdit={beginEdit}
        onDraftChange={setDraft}
        onToggleSpecialties={(id) =>
          setExpandedSpecialties((current) => ({
            ...current,
            [id]: !current[id],
          }))
        }
        onSave={(document) =>
          updateAdmin.mutate(
            {
              id: document.id,
              ...draft,
            },
            { onSuccess: () => setEditing(null) },
          )
        }
        onCancelEdit={() => setEditing(null)}
      />

      <DecisionAccessDialog
        open={settingsOpen}
        adminToken={adminToken}
        draftToken={draftToken}
        onDraftTokenChange={setDraftToken}
        onClose={() => setSettingsOpen(false)}
        onSave={() => {
          if (draftToken) setAdminToken(draftToken);
          else clearAdminToken();
          setSettingsOpen(false);
        }}
        onForget={() => {
          clearAdminToken();
          setDraftToken("");
          setSettingsOpen(false);
        }}
      />
    </main>
  );
}

function filterCases(
  cases: ConcoursCase[],
  filter: "radiology" | "all" | "review",
) {
  return cases.filter((item) => {
    if (filter === "all") return true;
    if (filter === "review") return item.hasReview;
    if (item.primary.applicationStatus === "skip") return false;
    if (item.primary.applicationStatus === "closed") return false;
    return item.isRadiologyRelevant || item.hasReview || item.hasCandidateMatch;
  });
}

function getStats(cases: ConcoursCase[]) {
  const focus = cases.filter(
    (item) =>
      item.primary.applicationStatus !== "skip" &&
      item.primary.applicationStatus !== "closed" &&
      (item.isRadiologyRelevant || item.hasReview || item.hasCandidateMatch),
  );
  return {
    total: cases.length,
    radiology: focus.length,
    review: cases.filter((item) => item.hasReview).length,
    seats: focus.reduce((sum, item) => sum + (item.radiologySeats ?? 0), 0),
    matches: cases.filter((item) => item.hasCandidateMatch).length,
  };
}

function DecisionAccessDialog({
  open,
  adminToken,
  draftToken,
  onDraftTokenChange,
  onClose,
  onSave,
  onForget,
}: {
  open: boolean;
  adminToken: string;
  draftToken: string;
  onDraftTokenChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onForget: () => void;
}) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-900">
              <Settings className="h-4 w-4" />
              Decision access
            </div>
            <DialogTitle className="text-2xl">Unlock editing</DialogTitle>
          </div>
          <DialogClose label="Close decision access" onClick={onClose} />
        </DialogHeader>
        <div className="grid gap-3 p-5">
          <Input
            type="password"
            placeholder="Admin token"
            value={draftToken}
            onChange={(event) => onDraftTokenChange(event.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={onSave}>{adminToken ? "Update" : "Unlock"}</Button>
            {adminToken ? (
              <Button variant="ghost" onClick={onForget}>
                Forget
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { ArrowLeft, KeyRound, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ConcoursSidebarItem } from "@/components/tracker/concours-sidebar-item";
import { TrackerDetailPane } from "@/components/tracker/tracker-detail-pane";
import { TrackerHeader } from "@/components/tracker/tracker-header";
import { groupConcours } from "@/components/tracker/tracker-utils";
import type { ConcoursCase } from "@/components/tracker/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSpecialties, setExpandedSpecialties] = useState<
    Record<string, boolean>
  >({});

  const cases = useMemo(() => groupConcours(data), [data]);
  const filtered = useMemo(() => filterCases(cases, filter), [cases, filter]);

  // Search filter
  const searchedCases = useMemo(() => {
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.center?.toLowerCase().includes(q) ||
        c.documents.some(
          (doc) =>
            doc.region?.toLowerCase().includes(q) ||
            doc.title.toLowerCase().includes(q) ||
            doc.updateLabel?.toLowerCase().includes(q),
        ),
    );
  }, [filtered, searchQuery]);

  const stats = useMemo(() => getStats(cases), [cases]);
  const isAdminUnlocked = Boolean(adminToken);

  // Desktop default selection
  const activeCaseId = selectedCaseId || (searchedCases[0]?.id ?? null);
  const activeCase = useMemo(() => {
    return cases.find((c) => c.id === activeCaseId) ?? null;
  }, [cases, activeCaseId]);

  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-background font-sans text-foreground antialiased lg:h-screen lg:overflow-hidden">
      {/* Global simplified Header */}
      <TrackerHeader
        stats={stats}
        filter={filter}
        watcherHealth={watcherHealth}
        hasAdminToken={isAdminUnlocked}
        onFilterChange={setFilter}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main split viewport */}
      <div className="relative flex-1 lg:flex lg:min-h-0 lg:overflow-hidden">
        {/* Left Listing Sidebar */}
        <aside
          className={cn(
            "flex w-full shrink-0 flex-col border-r border-border/30 bg-card/10 lg:h-full lg:w-[380px]",
            selectedCaseId && "hidden lg:flex",
          )}
        >
          {/* Compact search bar */}
          <div className="flex items-center gap-2 border-b border-border/40 bg-background/50 p-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-stone-400" />
              <Input
                type="text"
                placeholder="Search region, specialty, or updates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-md border border-border bg-background pl-9 font-sans text-xs focus:ring-1 focus:ring-primary/10"
              />
            </div>
          </div>

          {/* Listing scrolling feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/30">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="p-4 border border-border/50 bg-card rounded-md space-y-3 animate-pulse"
                  >
                    <div className="flex gap-2">
                      <Skeleton className="h-3.5 w-12 rounded" />
                      <Skeleton className="h-3.5 w-24 rounded" />
                    </div>
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <div className="flex justify-between pt-1">
                      <Skeleton className="h-3 w-16 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchedCases.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-mono">
                No concours matches found.
              </div>
            ) : (
              searchedCases.map((item) => (
                <ConcoursSidebarItem
                  key={item.id}
                  item={item}
                  selected={activeCaseId === item.id}
                  isAdminUnlocked={isAdminUnlocked}
                  onClick={() => setSelectedCaseId(item.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Right Details Panel Viewport */}
        <section
          className={cn(
            "min-w-0 flex-1 flex-col bg-background",
            !selectedCaseId && "hidden lg:flex",
            selectedCaseId &&
              "fixed inset-0 z-50 flex lg:static lg:h-full lg:bg-transparent",
          )}
        >
          {/* Mobile Back Stack Navigation bar */}
          {selectedCaseId ? (
            <div className="flex items-center justify-between border-b border-border/40 bg-background p-3 lg:hidden">
              <Button
                variant="ghost"
                onClick={() => setSelectedCaseId(null)}
                className="gap-1.5 font-serif text-sm hover:bg-muted"
                size="sm"
              >
                <ArrowLeft data-icon="inline-start" />
                Back to listings
              </Button>
            </div>
          ) : null}

          <TrackerDetailPane
            concoursCase={activeCase}
            adminToken={adminToken}
            isAdminUnlocked={isAdminUnlocked}
            expandedSpecialties={expandedSpecialties}
            updatePending={updateAdmin.isPending}
            onToggleSpecialties={(id) =>
              setExpandedSpecialties((current) => ({
                ...current,
                [id]: !current[id],
              }))
            }
            onStatusChange={(status) => {
              if (activeCase?.primary) {
                updateAdmin.mutate({
                  id: activeCase.primary.id,
                  applicationStatus: status,
                  adminNotes: activeCase.primary.adminNotes,
                });
              }
            }}
            onNotesChange={(notes) => {
              if (activeCase?.primary) {
                updateAdmin.mutate({
                  id: activeCase.primary.id,
                  applicationStatus: activeCase.primary.applicationStatus,
                  adminNotes: notes,
                });
              }
            }}
          />
        </section>
      </div>

      {/* Decisions unlocked settings dialogue */}
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md border border-border bg-card shadow-2xl rounded-lg overflow-hidden">
        <DialogHeader className="border-b border-border/40 p-6">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-primary">
              <KeyRound data-icon="inline-start" />
              Private controls
            </div>
            <DialogTitle className="font-serif text-3xl font-semibold leading-none text-stone-900">
              Unlock Console
            </DialogTitle>
            <DialogDescription className="mt-3 text-sm leading-relaxed text-stone-500">
              This only unlocks your private decisions and notes in this
              browser. Visitors keep seeing the public concours directory.
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="grid gap-3 p-6">
          <label
            htmlFor="admin-console-token"
            className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-500"
          >
            Console key
          </label>
          <Input
            id="admin-console-token"
            type="password"
            placeholder="Paste your private key"
            value={draftToken}
            onChange={(event) => onDraftTokenChange(event.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-xs leading-relaxed text-stone-500">
            The key is saved in local browser storage, not shown on the page.
          </p>
        </div>
        <DialogFooter className="border-t border-border/40 p-4 sm:justify-between">
          {adminToken ? (
            <Button
              variant="ghost"
              onClick={onForget}
              className="text-xs font-semibold text-stone-500 hover:bg-muted hover:text-stone-900"
            >
              Forget key
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={onSave} className="text-xs font-semibold">
            {adminToken ? "Update key" : "Unlock console"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

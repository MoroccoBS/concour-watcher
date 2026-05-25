import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Eye,
  FileText,
  FolderMinus,
  Send,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  type ApplicationStatus,
  applicationStatuses,
  statusLabel,
  statusTone,
} from "@/lib/status";
import { cn } from "@/lib/utils";
import type { DecisionDraft } from "./types";

export function DecisionChips({
  value,
  compact = false,
}: {
  value: string;
  compact?: boolean;
}) {
  const steps = [
    { key: "new", label: "Notice" },
    { key: "maybe", label: "Watching" },
    { key: "apply", label: "Preparing" },
    { key: "applied", label: "Applied" },
  ];

  const isSpecial = value === "skip" || value === "closed";

  if (isSpecial) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider",
          value === "skip"
            ? "border border-rose-200 bg-rose-50 text-rose-800"
            : "border border-stone-200 bg-stone-100 text-stone-600",
        )}
      >
        <FolderMinus className="h-3 w-3" />
        {statusLabel(value)}
      </span>
    );
  }

  const activeIndex = steps.findIndex((step) => step.key === value);

  return (
    <div className="flex items-center gap-1 bg-background/60 border border-border/80 px-2 py-1 rounded">
      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        const isPast = index < activeIndex;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-extrabold"
                  : isPast
                    ? "bg-primary/10 text-primary"
                    : "text-stone-400 bg-transparent",
                compact && !isActive && "hidden sm:inline-block",
              )}
              title={step.label}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span
                className={cn(
                  "text-[9px] font-mono text-stone-300",
                  compact && "hidden sm:inline-block",
                )}
              >
                ➔
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DossierFunnelStepper({
  status,
  adminToken,
  updatePending = false,
  onStatusChange,
  className,
}: {
  status: ApplicationStatus;
  adminToken?: string;
  updatePending?: boolean;
  onStatusChange?: (status: ApplicationStatus) => void;
  className?: string;
}) {
  const isUnlocked = Boolean(adminToken);
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    {
      key: "new" as ApplicationStatus,
      num: "01",
      label: "Not Applied",
      desc: "Notice Discovered",
    },
    {
      key: "maybe" as ApplicationStatus,
      num: "02",
      label: "Maybe",
      desc: "Watching Option",
    },
    {
      key: "apply" as ApplicationStatus,
      num: "03",
      label: "Wait / Prep",
      desc: "Preparing Folder",
    },
    {
      key: "applied" as ApplicationStatus,
      num: "04",
      label: "Applied",
      desc: "Submission Sent",
    },
  ];

  const activeIndex = steps.findIndex((step) => step.key === status);
  const isSpecial = status === "skip" || status === "closed";
  const activeStep = steps.find((s) => s.key === status);

  return (
    <div className={cn("space-y-3 w-full", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">
          Recruitment Dossier Progress {isUnlocked && "· Click to Modify"}
        </span>
        {updatePending && (
          <span className="text-[9px] font-mono text-primary animate-pulse uppercase font-semibold">
            Updating Status...
          </span>
        )}
      </div>

      {/* Main Status Trigger Bar */}
      <button
        type="button"
        disabled={!isUnlocked || updatePending}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-3.5 border rounded-lg bg-card text-left transition-all outline-none select-none",
          isUnlocked
            ? "cursor-pointer border-stone-200 hover:border-primary/50 hover:bg-muted/10 shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
            : "cursor-default border-stone-200",
        )}
      >
        <div className="flex items-center gap-3">
          {/* Circular number of current status */}
          <div
            className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-mono font-extrabold border shrink-0",
              isSpecial
                ? "bg-stone-100 border-stone-200 text-stone-500"
                : "bg-primary border-primary text-primary-foreground shadow-sm",
            )}
          >
            {isSpecial ? "➔" : (activeStep?.num ?? "01")}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-900">
                Current State:
              </span>
              <Badge
                className={cn(
                  "px-2.5 py-0.5 text-[9px] font-mono tracking-wider uppercase font-extrabold",
                  statusTone(status),
                )}
              >
                {statusLabel(status)}
              </Badge>
            </div>
            <p className="text-[9px] text-stone-400 font-medium leading-none mt-1">
              {isSpecial
                ? "Status manually overridden or archived"
                : (activeStep?.desc ?? "Notice discovered")}
            </p>
          </div>
        </div>

        {isUnlocked && (
          <div className="flex items-center gap-2 text-[9px] font-mono font-bold uppercase text-stone-400 tracking-wider">
            {isOpen ? "Close Console" : "Change Status"}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180",
              )}
            />
          </div>
        )}
      </button>

      {/* Expanded Stepper Grid */}
      {isUnlocked && isOpen && (
        <div className="space-y-3.5 border border-stone-200 bg-background/40 p-3.5 rounded-lg shadow-inner animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="text-[8px] font-mono font-bold uppercase tracking-wider text-stone-400">
            Select New recruitment State
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {steps.map((step, index) => {
              const isActive = step.key === status;
              const isCompleted = index <= activeIndex;
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => {
                    if (onStatusChange) {
                      onStatusChange(step.key);
                      console.log("onStatusChange", step.key);
                    }
                    setIsOpen(false);
                  }}
                  className={cn(
                    "relative flex items-center gap-3 p-2.5 rounded text-left transition-all border outline-none text-stone-600 select-none cursor-pointer w-full hover:bg-muted/40",
                    isActive
                      ? "bg-card border-stone-300 text-stone-900 shadow-sm"
                      : "border-transparent text-stone-400",
                  )}
                >
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-mono font-extrabold border transition-all duration-200 shrink-0",
                      isActive
                        ? "bg-primary border-primary text-primary-foreground"
                        : isCompleted
                          ? "bg-primary/10 border-primary/20 text-primary"
                          : "bg-muted border-stone-200 text-stone-400",
                    )}
                  >
                    {step.num}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "text-[9px] font-mono font-bold uppercase tracking-wider leading-none",
                        isActive
                          ? "text-stone-900 font-extrabold"
                          : "text-stone-500",
                      )}
                    >
                      {step.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Administrative Toggle Bar inside expanded drawer */}
          <div className="flex gap-2 pt-2 border-t border-stone-200/50">
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                if (onStatusChange)
                  onStatusChange(status === "skip" ? "new" : "skip");
                setIsOpen(false);
              }}
              className={cn(
                "text-[9px] font-mono px-2.5 py-1 h-6 rounded cursor-pointer font-semibold",
                status === "skip"
                  ? "bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100"
                  : "border-border text-stone-500 hover:bg-muted",
              )}
            >
              {status === "skip" ? "✓ Skipped Watch" : "Ignore (Skip)"}
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                if (onStatusChange)
                  onStatusChange(status === "closed" ? "new" : "closed");
                setIsOpen(false);
              }}
              className={cn(
                "text-[9px] font-mono px-2.5 py-1 h-6 rounded cursor-pointer font-semibold",
                status === "closed"
                  ? "bg-stone-100 border-stone-200 text-stone-800 hover:bg-stone-200"
                  : "border-border text-stone-500 hover:bg-muted",
              )}
            >
              {status === "closed" ? "✓ Marked Archived" : "Archive (Closed)"}
            </Button>
          </div>
        </div>
      )}

      {/* Submission success card */}
      {status === "applied" && (
        <div className="border border-violet-100 bg-violet-50/15 p-4 rounded-lg space-y-2 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-all duration-300">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-accent-match font-mono">
            <CheckCircle className="h-4 w-4" />
            Application Complete
          </div>
          <p className="text-[11px] text-stone-600 leading-normal font-sans">
            Your application dossier has been compiled and submitted. Continue
            to monitor document updates for lists of candidates invited for
            written or oral examinations!
          </p>
        </div>
      )}
    </div>
  );
}

export function DossierAnnotationsNotepad({
  adminNotes,
  adminToken,
  onNotesChange,
  className,
}: {
  adminNotes: string;
  adminToken?: string;
  onNotesChange?: (notes: string) => void;
  className?: string;
}) {
  const isUnlocked = Boolean(adminToken);
  const [localNotes, setLocalNotes] = useState(adminNotes);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const lastSentNotesRef = useRef<string>(adminNotes);

  useEffect(() => {
    setLocalNotes(adminNotes);
    lastSentNotesRef.current = adminNotes;
  }, [adminNotes]);

  function handleNotesBlur() {
    if (onNotesChange && localNotes !== lastSentNotesRef.current) {
      setSaveStatus("saving");
      onNotesChange(localNotes);
      lastSentNotesRef.current = localNotes;
      setTimeout(() => setSaveStatus("saved"), 600);
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }

  function appendTemplate(text: string) {
    const divider = localNotes.trim() === "" ? "" : "\n";
    const updated = localNotes + divider + text;
    setLocalNotes(updated);
    if (onNotesChange) {
      setSaveStatus("saving");
      onNotesChange(updated);
      lastSentNotesRef.current = updated;
      setTimeout(() => setSaveStatus("saved"), 600);
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-3",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
          Clinical Dossier Journal {isUnlocked && "· Auto-saving"}
        </div>
        {saveStatus === "saving" && (
          <span className="text-[8px] font-mono text-primary font-semibold flex items-center gap-1">
            <Clock className="h-3 w-3 animate-spin" /> Saving...
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="text-[8px] font-mono text-accent-success font-semibold">
            ✓ Saved
          </span>
        )}
      </div>

      {isUnlocked ? (
        <div className="space-y-3">
          <Textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Record validation observations, tracking IDs, or equivalent certificates context. Annotations auto-save on focus loss."
            className="w-full bg-background/50 border border-border/80 rounded text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-primary/10 font-mono min-h-[140px] leading-relaxed"
          />

          {/* Quick Template Tags */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
            <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-stone-400 mr-1 flex items-center">
              Templates:
            </span>
            <button
              type="button"
              onClick={() =>
                appendTemplate("[✓] Certified Diploma copy verified")
              }
              className="text-[9px] font-mono bg-muted/40 hover:bg-muted text-stone-600 px-2 py-0.5 rounded border border-border/50 cursor-pointer transition-colors"
            >
              + Diploma
            </button>
            <button
              type="button"
              onClick={() => appendTemplate("[✓] CNI copy verified")}
              className="text-[9px] font-mono bg-muted/40 hover:bg-muted text-stone-600 px-2 py-0.5 rounded border border-border/50 cursor-pointer transition-colors"
            >
              + CNI
            </button>
            <button
              type="button"
              onClick={() => appendTemplate("[✓] Equivalency checked")}
              className="text-[9px] font-mono bg-muted/40 hover:bg-muted text-stone-600 px-2 py-0.5 rounded border border-border/50 cursor-pointer transition-colors"
            >
              + Equivalence
            </button>
            <button
              type="button"
              onClick={() => appendTemplate("[✓] Application submitted")}
              className="text-[9px] font-mono bg-muted/40 hover:bg-muted text-stone-600 px-2 py-0.5 rounded border border-border/50 cursor-pointer transition-colors"
            >
              + Submitted
            </button>
          </div>
        </div>
      ) : adminNotes ? (
        <p className="whitespace-pre-wrap text-xs text-stone-700 font-mono leading-relaxed bg-muted/10 p-2.5 border border-border/50 rounded">
          {adminNotes}
        </p>
      ) : (
        <p className="text-xs text-stone-400 italic font-sans py-2">
          No administrative dossier annotations have been recorded.
        </p>
      )}
    </div>
  );
}

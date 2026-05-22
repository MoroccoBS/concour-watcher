import type { ConcoursDocument } from "@/db/schema";

export const applicationStatuses = [
  "new",
  "maybe",
  "apply",
  "applied",
  "skip",
  "closed",
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export function statusLabel(status: ApplicationStatus) {
  return {
    new: "New",
    maybe: "Maybe",
    apply: "Apply",
    applied: "Applied",
    skip: "Skip",
    closed: "Closed",
  }[status];
}

export function statusTone(status: ApplicationStatus) {
  return {
    new: "bg-amber-100 text-amber-900 border-amber-200",
    maybe: "bg-stone-100 text-stone-800 border-stone-200",
    apply: "bg-emerald-100 text-emerald-900 border-emerald-200",
    applied: "bg-teal-100 text-teal-900 border-teal-200",
    skip: "bg-rose-100 text-rose-900 border-rose-200",
    closed: "bg-neutral-200 text-neutral-700 border-neutral-300",
  }[status];
}

export function processingTone(status: ConcoursDocument["processingStatus"]) {
  return {
    pending: "bg-stone-100 text-stone-800 border-stone-200",
    processing: "bg-blue-100 text-blue-900 border-blue-200",
    processed: "bg-emerald-100 text-emerald-900 border-emerald-200",
    needs_review: "bg-orange-100 text-orange-900 border-orange-200",
    failed: "bg-red-100 text-red-900 border-red-200",
  }[status];
}

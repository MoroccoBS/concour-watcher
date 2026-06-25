import type { ApplicationStatus } from "@/lib/status";
import type { ConcoursCase, DocumentItem } from "./types";

export function groupConcours(items: DocumentItem[]): ConcoursCase[] {
  const groups = new Map<string, DocumentItem[]>();
  for (const item of items) {
    const key = item.listingKey ?? item.id;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()]
    .map(([key, documents]) => {
      const sorted = [...documents].sort(
        (a, b) =>
          new Date(b.discoveredAt).getTime() -
          new Date(a.discoveredAt).getTime(),
      );
      const primary =
        sorted.find((item) => item.documentType === "notice") ??
        sorted.find((item) => item.totalSeats || item.radiologySeats) ??
        sorted[0];
      const latestUpdate = sorted[0];

      return {
        id: key,
        title: displayTitle(primary),
        primary,
        documents: sorted,
        totalSeats: firstNumber(sorted, "totalSeats"),
        radiologySeats: firstNumber(sorted, "radiologySeats"),
        examDate: firstValue(sorted, "examDate"),
        deadline: firstValue(sorted, "applicationDeadline"),
        center: firstValue(sorted, "center") ?? firstValue(sorted, "region"),
        hasCandidateMatch: sorted.some(
          (item) => item.candidateMatched === true,
        ),
        hasCandidateCheck: sorted.some(
          (item) => item.candidateMatched !== null,
        ),
        hasReview: sorted.some(
          (item) =>
            item.processingStatus === "needs_review" ||
            item.processingStatus === "failed",
        ),
        hasConflict: sorted.some((item) => item.sameDayConflict),
        isRadiologyRelevant: sorted.some(
          (item) => item.isRadiologyRelevant || item.radiologySeats,
        ),
        latestUpdate,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.examDate ?? b.latestUpdate.discoveredAt).getTime() -
        new Date(a.examDate ?? a.latestUpdate.discoveredAt).getTime(),
    );
}

function firstValue<K extends keyof DocumentItem>(
  items: DocumentItem[],
  key: K,
): DocumentItem[K] | null {
  return (
    items.find((item) => item[key] !== null && item[key] !== undefined)?.[
      key
    ] ?? null
  );
}

function firstNumber<K extends "totalSeats" | "radiologySeats">(
  items: DocumentItem[],
  key: K,
) {
  return items.find((item) => typeof item[key] === "number")?.[key] ?? null;
}

export function displayTitle(item: DocumentItem) {
  const region = item.region
    ?.replace(/concours de recrutement de/gi, "")
    .replace(/infirmiers? et techniciens? de santé/gi, "ITS")
    .replace(/direction régionale/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (item.documentType !== "notice") {
    const typeLabel = documentTypeLabel(item);
    return [typeLabel, region || item.title].filter(Boolean).join(" · ");
  }

  const parts = [
    region || item.title,
    item.totalSeats ? `${item.totalSeats} postes` : null,
    item.radiologySeats ? `${item.radiologySeats} radiologie` : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

function documentTypeLabel(item: DocumentItem) {
  switch (item.documentType) {
    case "convocation":
      return "Liste des convoqués";
    case "planning":
      return "Planning";
    case "results":
      return "Résultats";
    case "assignment":
      return "Affectation";
    default:
      return item.updateLabel ?? null;
  }
}

export function decisionAccent(status: ApplicationStatus) {
  return {
    new: "border-l-stone-300",
    maybe: "border-l-amber-300",
    apply: "border-l-emerald-500",
    applied: "border-l-teal-500",
    skip: "border-l-rose-400 opacity-75",
    closed: "border-l-stone-500 opacity-70",
  }[status];
}

export function decisionSummary(status: ApplicationStatus) {
  return {
    new: "Needs a decision",
    maybe: "Keep watching",
    apply: "Prepare application",
    applied: "Application sent",
    skip: "Hidden from priorities",
    closed: "Closed",
  }[status];
}

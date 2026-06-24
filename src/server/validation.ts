import { z } from "zod";

import { radiologyKeywords } from "./sources";

export const specialtyRowSchema = z.object({
  frame: z.string().nullable().optional(),
  specialty: z.string().min(1),
  seats: z
    .number()
    .nonnegative()
    .transform((value) => Math.round(value)),
  isRadiology: z.boolean().default(false),
});

export const aiExtractionSchema = z.object({
  title: z.string().min(1),
  documentType: z
    .enum([
      "notice",
      "convocation",
      "results",
      "assignment",
      "planning",
      "unknown",
    ])
    .default("unknown"),
  region: z.string().nullable().optional(),
  center: z.string().nullable().optional(),
  examDate: z.string().nullable().optional(),
  applicationDeadline: z.string().nullable().optional(),
  totalSeats: z
    .number()
    .nonnegative()
    .transform((value) => Math.round(value))
    .nullable()
    .optional(),
  radiologySeats: z
    .number()
    .nonnegative()
    .transform((value) => Math.round(value))
    .nullable()
    .optional(),
  formUrl: z.string().nullable().optional(),
  isRadiologyRelevant: z.boolean().default(false),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .transform((value) => Math.round(value)),
  sourceNotes: z
    .array(
      z.object({
        field: z.string(),
        page: z.number().int().positive().nullable().optional(),
        evidence: z.string().optional().default(""),
      }),
    )
    .default([]),
  specialtyRows: z.array(specialtyRowSchema).default([]),
  rawTextSummary: z.string().nullable().optional(),
});

export type AiExtraction = z.infer<typeof aiExtractionSchema>;
export type DocumentType = AiExtraction["documentType"];

export function documentTypeFromLabel(value?: string | null): DocumentType {
  const label = value
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (!label) return "unknown";
  if (label.includes("planning") || label.includes("programme")) {
    return "planning";
  }
  if (
    label.includes("result") ||
    label.includes("rslts") ||
    label.includes("liste definitive")
  ) {
    return "results";
  }
  if (
    label.includes("affectation") ||
    label.includes("prise de service") ||
    label.includes("liste d'attente")
  ) {
    return "assignment";
  }
  if (label.includes("convoque") || label.includes("conv")) {
    return "convocation";
  }
  if (label.includes("avis") || label.includes("postes ouverts")) {
    return "notice";
  }

  return "unknown";
}

export function supportsSeatAllocation(documentType: DocumentType) {
  return documentType === "notice";
}

export function normalizeExtractionForDocumentType(
  extraction: AiExtraction,
  updateLabel?: string | null,
): AiExtraction {
  const labelType = documentTypeFromLabel(updateLabel);
  const documentType =
    labelType === "unknown" ? extraction.documentType : labelType;

  if (supportsSeatAllocation(documentType)) {
    return {
      ...extraction,
      documentType,
    };
  }

  return {
    ...extraction,
    documentType,
    applicationDeadline: null,
    totalSeats: null,
    radiologySeats: null,
    formUrl: null,
    specialtyRows: [],
  };
}

function parseMaybeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isRadiologyText(value: string) {
  const normalized = value.toLowerCase().replace(/[أإآ]/g, "ا");
  return radiologyKeywords.some((keyword) =>
    normalized.includes(keyword.toLowerCase().replace(/[أإآ]/g, "ا")),
  );
}

export function validateExtraction(extraction: AiExtraction) {
  const issues: string[] = [];
  const examDate = parseMaybeDate(extraction.examDate);
  const hasSeatAllocation = supportsSeatAllocation(extraction.documentType);
  const applicationDeadline = hasSeatAllocation
    ? parseMaybeDate(extraction.applicationDeadline)
    : null;
  const rows = hasSeatAllocation ? extraction.specialtyRows : [];
  const radiologyRows = rows.filter(
    (row) => row.isRadiology || isRadiologyText(row.specialty),
  );
  const radiologySeats = radiologyRows.reduce((sum, row) => sum + row.seats, 0);
  const rowTotal = rows.reduce((sum, row) => sum + row.seats, 0);

  if (extraction.documentType === "notice" && !examDate) {
    issues.push("Missing or invalid exam date.");
  }

  if (
    examDate &&
    applicationDeadline &&
    applicationDeadline.getTime() > examDate.getTime()
  ) {
    issues.push("Application deadline is after the exam date.");
  }

  if (
    typeof extraction.totalSeats === "number" &&
    rowTotal > 0 &&
    Math.abs(rowTotal - extraction.totalSeats) > 2
  ) {
    issues.push("Specialty row total does not match total seats.");
  }

  if (
    typeof extraction.radiologySeats === "number" &&
    radiologySeats > 0 &&
    extraction.radiologySeats !== radiologySeats
  ) {
    issues.push("Radiology seats do not match the specialty table.");
  }

  if (
    hasSeatAllocation &&
    extraction.isRadiologyRelevant &&
    radiologyRows.length === 0
  ) {
    issues.push("Marked radiology-relevant without a radiology specialty row.");
  }

  const needsSecondPass =
    extraction.confidence < 80 ||
    issues.length > 0 ||
    (hasSeatAllocation &&
      extraction.isRadiologyRelevant &&
      radiologyRows.length === 0);

  return {
    issues,
    needsSecondPass,
    examDate,
    applicationDeadline,
    radiologySeats: hasSeatAllocation
      ? radiologySeats || extraction.radiologySeats || null
      : null,
    isRadiologyRelevant:
      hasSeatAllocation &&
      (extraction.isRadiologyRelevant || radiologyRows.length > 0),
  };
}

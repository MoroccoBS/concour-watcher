import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const documentTypeEnum = pgEnum("document_type", [
  "notice",
  "convocation",
  "results",
  "assignment",
  "planning",
  "unknown",
]);

export const processingStatusEnum = pgEnum("processing_status", [
  "pending",
  "processing",
  "processed",
  "needs_review",
  "failed",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "new",
  "maybe",
  "apply",
  "applied",
  "skip",
  "closed",
]);

export const concoursDocuments = pgTable(
  "concours_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourcePageUrl: text("source_page_url").notNull(),
    pdfUrl: text("pdf_url").notNull(),
    listingKey: text("listing_key"),
    hasAttachment: boolean("has_attachment").notNull().default(true),
    updateLabel: text("update_label"),
    title: text("title").notNull(),
    region: text("region"),
    documentType: documentTypeEnum("document_type")
      .notNull()
      .default("unknown"),
    processingStatus: processingStatusEnum("processing_status")
      .notNull()
      .default("pending"),
    applicationStatus: applicationStatusEnum("application_status")
      .notNull()
      .default("new"),
    isRadiologyRelevant: boolean("is_radiology_relevant")
      .notNull()
      .default(false),
    isImportant: boolean("is_important").notNull().default(false),
    needsSecondPass: boolean("needs_second_pass").notNull().default(false),
    sameDayConflict: boolean("same_day_conflict").notNull().default(false),
    confidence: integer("confidence"),
    examDate: timestamp("exam_date", { withTimezone: true }),
    applicationDeadline: timestamp("application_deadline", {
      withTimezone: true,
    }),
    center: text("center"),
    totalSeats: integer("total_seats"),
    radiologySeats: integer("radiology_seats"),
    formUrl: text("form_url"),
    candidateMatched: boolean("candidate_matched"),
    candidateMatchedName: text("candidate_matched_name"),
    candidateCheckConfidence: integer("candidate_check_confidence"),
    candidateEvidence: text("candidate_evidence"),
    extractedJson: jsonb("extracted_json"),
    validationIssues: jsonb("validation_issues").$type<string[]>(),
    ocrText: text("ocr_text"),
    adminNotes: text("admin_notes").notNull().default(""),
    discoveredAt: timestamp("discovered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("concours_documents_pdf_url_idx").on(table.pdfUrl),
    index("concours_documents_exam_date_idx").on(table.examDate),
    index("concours_documents_status_idx").on(table.applicationStatus),
    index("concours_documents_processing_idx").on(table.processingStatus),
    index("concours_documents_radiology_idx").on(table.isRadiologyRelevant),
    index("concours_documents_listing_key_idx").on(table.listingKey),
  ],
);

export const specialtyRows = pgTable(
  "specialty_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => concoursDocuments.id, { onDelete: "cascade" }),
    frame: text("frame"),
    specialty: text("specialty").notNull(),
    seats: integer("seats").notNull(),
    isRadiology: boolean("is_radiology").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("specialty_rows_document_idx").on(table.documentId),
    index("specialty_rows_radiology_idx").on(table.isRadiology),
  ],
);

export const documentEvents = pgTable("document_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => concoursDocuments.id, {
    onDelete: "cascade",
  }),
  type: text("type").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const runnerHeartbeats = pgTable("runner_heartbeats", {
  runnerId: text("runner_id").primaryKey(),
  lastStartedAt: timestamp("last_started_at", { withTimezone: true }),
  lastOkAt: timestamp("last_ok_at", { withTimezone: true }),
  lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
  lastError: text("last_error"),
  lastFound: integer("last_found"),
  lastInserted: integer("last_inserted"),
  lastProcessed: integer("last_processed"),
  lastStaleAlertAt: timestamp("last_stale_alert_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const concoursDocumentsRelations = relations(
  concoursDocuments,
  ({ many }) => ({
    specialtyRows: many(specialtyRows),
    events: many(documentEvents),
  }),
);

export const specialtyRowsRelations = relations(specialtyRows, ({ one }) => ({
  document: one(concoursDocuments, {
    fields: [specialtyRows.documentId],
    references: [concoursDocuments.id],
  }),
}));

export const documentEventsRelations = relations(documentEvents, ({ one }) => ({
  document: one(concoursDocuments, {
    fields: [documentEvents.documentId],
    references: [concoursDocuments.id],
  }),
}));

export type ConcoursDocument = typeof concoursDocuments.$inferSelect;
export type SpecialtyRow = typeof specialtyRows.$inferSelect;
export type RunnerHeartbeat = typeof runnerHeartbeats.$inferSelect;

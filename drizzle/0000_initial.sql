CREATE TYPE "public"."application_status" AS ENUM('new', 'maybe', 'apply', 'applied', 'skip', 'closed');
CREATE TYPE "public"."document_type" AS ENUM('notice', 'convocation', 'results', 'assignment', 'planning', 'unknown');
CREATE TYPE "public"."processing_status" AS ENUM('pending', 'processing', 'processed', 'needs_review', 'failed');

CREATE TABLE "concours_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_page_url" text NOT NULL,
  "pdf_url" text NOT NULL,
  "title" text NOT NULL,
  "region" text,
  "document_type" "document_type" DEFAULT 'unknown' NOT NULL,
  "processing_status" "processing_status" DEFAULT 'pending' NOT NULL,
  "application_status" "application_status" DEFAULT 'new' NOT NULL,
  "is_radiology_relevant" boolean DEFAULT false NOT NULL,
  "is_important" boolean DEFAULT false NOT NULL,
  "needs_second_pass" boolean DEFAULT false NOT NULL,
  "same_day_conflict" boolean DEFAULT false NOT NULL,
  "confidence" integer,
  "exam_date" timestamp with time zone,
  "application_deadline" timestamp with time zone,
  "center" text,
  "total_seats" integer,
  "radiology_seats" integer,
  "form_url" text,
  "extracted_json" jsonb,
  "validation_issues" jsonb,
  "ocr_text" text,
  "admin_notes" text DEFAULT '' NOT NULL,
  "discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "specialty_rows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "frame" text,
  "specialty" text NOT NULL,
  "seats" integer NOT NULL,
  "is_radiology" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "document_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid,
  "type" text NOT NULL,
  "message" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "specialty_rows" ADD CONSTRAINT "specialty_rows_document_id_concours_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."concours_documents"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "document_events" ADD CONSTRAINT "document_events_document_id_concours_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."concours_documents"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "concours_documents_pdf_url_idx" ON "concours_documents" USING btree ("pdf_url");
CREATE INDEX "concours_documents_exam_date_idx" ON "concours_documents" USING btree ("exam_date");
CREATE INDEX "concours_documents_status_idx" ON "concours_documents" USING btree ("application_status");
CREATE INDEX "concours_documents_processing_idx" ON "concours_documents" USING btree ("processing_status");
CREATE INDEX "concours_documents_radiology_idx" ON "concours_documents" USING btree ("is_radiology_relevant");
CREATE INDEX "specialty_rows_document_idx" ON "specialty_rows" USING btree ("document_id");
CREATE INDEX "specialty_rows_radiology_idx" ON "specialty_rows" USING btree ("is_radiology");

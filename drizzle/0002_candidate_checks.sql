ALTER TABLE "concours_documents" ADD COLUMN IF NOT EXISTS "candidate_matched" boolean;
ALTER TABLE "concours_documents" ADD COLUMN IF NOT EXISTS "candidate_matched_name" text;
ALTER TABLE "concours_documents" ADD COLUMN IF NOT EXISTS "candidate_check_confidence" integer;
ALTER TABLE "concours_documents" ADD COLUMN IF NOT EXISTS "candidate_evidence" text;

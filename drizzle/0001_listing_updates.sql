ALTER TABLE "concours_documents" ADD COLUMN IF NOT EXISTS "listing_key" text;
ALTER TABLE "concours_documents" ADD COLUMN IF NOT EXISTS "has_attachment" boolean DEFAULT true NOT NULL;
ALTER TABLE "concours_documents" ADD COLUMN IF NOT EXISTS "update_label" text;
CREATE INDEX IF NOT EXISTS "concours_documents_listing_key_idx" ON "concours_documents" USING btree ("listing_key");

-- Soft-delete on legal_document. Quotes snapshot legal docs at submission time
-- and must keep resolving even after a doc is "deleted" by an admin, so we
-- never hard-delete rows or remove their S3 objects.

ALTER TABLE "legal_document" ADD COLUMN "deleted_at" timestamp;

CREATE INDEX IF NOT EXISTS "idx_legal_doc_org_active"
  ON "legal_document" ("organization_id")
  WHERE "deleted_at" IS NULL;

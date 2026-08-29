-- Legal documents: per-org PDF attachments for quotes/invoices.
-- v1: free-form `label`, magic-byte validated server-side.
-- Virus scan deferred to v2 — `scan_status` stays for forward-compat (default 'clean').

CREATE TABLE IF NOT EXISTS "legal_document" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "s3_key" text NOT NULL UNIQUE,
  "size_bytes" integer NOT NULL,
  "mime_type" text NOT NULL,
  "original_filename" text NOT NULL,
  "scan_status" text NOT NULL DEFAULT 'clean',
  "scan_completed_at" timestamp,
  "uploaded_by_id" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_legal_doc_org_scan"
  ON "legal_document" ("organization_id", "scan_status");

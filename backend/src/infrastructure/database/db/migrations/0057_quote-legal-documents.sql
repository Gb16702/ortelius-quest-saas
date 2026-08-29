-- Snapshot join between quote and legal_document. Each row freezes the
-- label / filename / size / s3_key as they were at quote-creation time, so
-- subsequent rename or soft-delete of the source document does not change
-- what the quote shows. ON DELETE RESTRICT on legal_document_id is a
-- belt-and-braces guard — soft-delete is the code-level contract.

CREATE TABLE IF NOT EXISTS "quote_legal_document" (
  "quote_id" text NOT NULL REFERENCES "quote"("id") ON DELETE CASCADE,
  "legal_document_id" uuid NOT NULL REFERENCES "legal_document"("id") ON DELETE RESTRICT,
  "label_snapshot" text NOT NULL,
  "original_filename_snapshot" text NOT NULL,
  "size_bytes_snapshot" integer NOT NULL,
  "s3_key_snapshot" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("quote_id", "legal_document_id")
);

CREATE INDEX IF NOT EXISTS "idx_quote_legal_doc_quote"
  ON "quote_legal_document" ("quote_id");

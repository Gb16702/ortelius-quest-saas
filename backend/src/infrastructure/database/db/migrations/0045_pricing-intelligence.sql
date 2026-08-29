CREATE TABLE IF NOT EXISTS "import_batch" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "file_name" text NOT NULL,
  "row_count" integer NOT NULL,
  "error_count" integer DEFAULT 0 NOT NULL,
  "errors" json,
  "uploaded_by_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "historical_transaction" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "service_id" text NOT NULL REFERENCES "service"("id") ON DELETE CASCADE,
  "price" double precision NOT NULL,
  "currency" text DEFAULT 'EUR' NOT NULL,
  "cargo_categories" json NOT NULL,
  "cargo_weight" double precision,
  "cargo_volume" double precision,
  "cargo_is_hazardous" integer DEFAULT 0 NOT NULL,
  "cargo_is_reefer" integer DEFAULT 0 NOT NULL,
  "cargo_is_oversized" integer DEFAULT 0 NOT NULL,
  "source" text NOT NULL,
  "import_batch_id" text REFERENCES "import_batch"("id") ON DELETE CASCADE,
  "quote_id" text,
  "transaction_date" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "idx_ht_org_service" ON "historical_transaction" ("organization_id", "service_id");
CREATE INDEX "idx_ht_org_service_date" ON "historical_transaction" ("organization_id", "service_id", "transaction_date");
CREATE INDEX "idx_ht_import_batch" ON "historical_transaction" ("import_batch_id");

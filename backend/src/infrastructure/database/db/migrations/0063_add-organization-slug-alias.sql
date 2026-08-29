CREATE TABLE IF NOT EXISTS "organization_slug_alias" (
  "slug" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_organization_slug_alias_org"
  ON "organization_slug_alias" ("organization_id");

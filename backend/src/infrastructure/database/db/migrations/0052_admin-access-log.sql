CREATE TABLE IF NOT EXISTS "admin_access_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_sub" text NOT NULL,
  "admin_email" text,
  "resource" text NOT NULL,
  "resource_id" text,
  "action" text NOT NULL DEFAULT 'read',
  "ip" text,
  "user_agent" text,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_admin_access_log_admin_created"
  ON "admin_access_log" ("admin_sub", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_admin_access_log_resource"
  ON "admin_access_log" ("resource", "resource_id");

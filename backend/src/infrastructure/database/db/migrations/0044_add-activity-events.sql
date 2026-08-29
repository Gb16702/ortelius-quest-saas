CREATE TABLE IF NOT EXISTS "activity_event" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "actor_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "event_type" text NOT NULL,
  "description" text NOT NULL,
  "metadata" json,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "idx_activity_org_created" ON "activity_event" ("organization_id", "created_at" DESC);
CREATE INDEX "idx_activity_org_type_created" ON "activity_event" ("organization_id", "event_type", "created_at" DESC);
CREATE INDEX "idx_activity_actor" ON "activity_event" ("actor_id");

CREATE TABLE IF NOT EXISTS "assistant_conversation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "organization_id" text REFERENCES "organization"("id") ON DELETE set null,
  "title" text NOT NULL,
  "last_route_path" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "assistant_message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL REFERENCES "assistant_conversation"("id") ON DELETE cascade,
  "role" text NOT NULL CHECK ("role" IN ('user', 'assistant')),
  "content" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_assistant_conversation_user_updated"
  ON "assistant_conversation" ("user_id", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_assistant_conversation_org_updated"
  ON "assistant_conversation" ("organization_id", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_assistant_message_conversation_created"
  ON "assistant_message" ("conversation_id", "created_at");

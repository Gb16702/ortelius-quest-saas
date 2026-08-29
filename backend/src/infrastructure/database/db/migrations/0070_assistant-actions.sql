CREATE TABLE IF NOT EXISTS "assistant_action" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid REFERENCES "assistant_conversation"("id") ON DELETE set null,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "organization_id" text REFERENCES "organization"("id") ON DELETE set null,
  "type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'proposed' CHECK ("status" IN ('proposed', 'executed', 'cancelled', 'expired', 'failed')),
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "button_label" text NOT NULL,
  "risk_level" text NOT NULL CHECK ("risk_level" IN ('low', 'medium', 'high', 'destructive')),
  "requires_confirmation" boolean NOT NULL DEFAULT true,
  "payload" jsonb NOT NULL,
  "preview" jsonb,
  "result" jsonb,
  "error_message" text,
  "expires_at" timestamp NOT NULL,
  "confirmed_at" timestamp,
  "executed_at" timestamp,
  "cancelled_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_assistant_action_user_status"
  ON "assistant_action" ("user_id", "status");

CREATE INDEX IF NOT EXISTS "idx_assistant_action_conversation_created"
  ON "assistant_action" ("conversation_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_assistant_action_org_created"
  ON "assistant_action" ("organization_id", "created_at");

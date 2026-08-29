ALTER TABLE "assistant_conversation"
ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

CREATE INDEX IF NOT EXISTS "idx_assistant_conversation_user_active_updated"
  ON "assistant_conversation" ("user_id", "deleted_at", "updated_at" DESC);

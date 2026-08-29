ALTER TABLE "assistant_conversation"
ADD COLUMN IF NOT EXISTS "summary" text,
ADD COLUMN IF NOT EXISTS "summary_message_count" integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "summary_token_estimate" integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "summary_updated_at" timestamp;

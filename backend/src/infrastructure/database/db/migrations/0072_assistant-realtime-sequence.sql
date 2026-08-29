ALTER TABLE "assistant_conversation"
ADD COLUMN IF NOT EXISTS "realtime_sequence" integer NOT NULL DEFAULT 0;

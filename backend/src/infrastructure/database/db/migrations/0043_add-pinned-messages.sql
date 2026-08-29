-- Add pinned message columns
ALTER TABLE "message" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;
ALTER TABLE "message" ADD COLUMN "pinned_at" timestamp;
ALTER TABLE "message" ADD COLUMN "pinned_by_id" text REFERENCES "user"("id") ON DELETE SET NULL;

-- Add index for efficient pinned message queries
CREATE INDEX "idx_message_conversation_pinned" ON "message" ("conversation_id", "is_pinned");

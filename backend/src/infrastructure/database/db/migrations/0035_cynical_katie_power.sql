ALTER TABLE "conversation_participant" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_participant" ADD COLUMN "pinned_at" timestamp;
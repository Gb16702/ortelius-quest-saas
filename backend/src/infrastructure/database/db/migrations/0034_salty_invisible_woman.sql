ALTER TABLE "conversation" ADD COLUMN "is_team_chat" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transcripts" ADD COLUMN "summary_key" text;--> statement-breakpoint
CREATE INDEX "idx_conversation_team_chat" ON "conversation" USING btree ("organization_id","is_team_chat");
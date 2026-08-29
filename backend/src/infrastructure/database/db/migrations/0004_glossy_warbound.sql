ALTER TABLE "request" ADD COLUMN "conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "request" ADD CONSTRAINT "request_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "is_group";
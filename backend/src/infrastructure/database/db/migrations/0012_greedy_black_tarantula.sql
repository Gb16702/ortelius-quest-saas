ALTER TABLE "request" ALTER COLUMN "requester_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "requester_id" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
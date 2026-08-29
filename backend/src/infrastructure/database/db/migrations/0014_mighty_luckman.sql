CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text,
	"message" text NOT NULL,
	"data" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "request" DROP CONSTRAINT "request_requester_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "request" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "request" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."request_status";--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'quoted', 'rejected', 'cancelled', 'quote_accepted');--> statement-breakpoint
ALTER TABLE "request" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."request_status";--> statement-breakpoint
ALTER TABLE "request" ALTER COLUMN "status" SET DATA TYPE "public"."request_status" USING "status"::"public"."request_status";--> statement-breakpoint
ALTER TABLE "request" ALTER COLUMN "requester_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "request" ALTER COLUMN "receiver_organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "request" ALTER COLUMN "requester_email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "request" ALTER COLUMN "requester_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "metadata" json;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request" ADD CONSTRAINT "request_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_member_org_role" ON "member" USING btree ("organization_id","role");--> statement-breakpoint
CREATE INDEX "idx_member_user_org_active" ON "member" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_participant_conversation_user" ON "conversation_participant" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_participants_for_listing" ON "conversation_participant" USING btree ("user_id","conversation_id");--> statement-breakpoint
CREATE INDEX "idx_message_conversation_created" ON "message" USING btree ("conversation_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_request_requester_created" ON "request" USING btree ("requester_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_request_org_status" ON "request" USING btree ("receiver_organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_org_metrics_daily_org_date" ON "organization_metrics_daily" USING btree ("organization_id","date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_quote_request_created" ON "quote" USING btree ("request_id","created_at" DESC NULLS LAST);
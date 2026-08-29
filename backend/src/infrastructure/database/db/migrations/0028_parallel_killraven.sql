ALTER TABLE "request" ADD COLUMN "assigned_to_id" text;--> statement-breakpoint
ALTER TABLE "request" ADD COLUMN "assigned_at" timestamp;--> statement-breakpoint
ALTER TABLE "request" ADD COLUMN "assigned_by_id" text;--> statement-breakpoint
ALTER TABLE "request" ADD CONSTRAINT "request_assigned_to_id_user_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request" ADD CONSTRAINT "request_assigned_by_id_user_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_request_assigned_to_status" ON "request" USING btree ("assigned_to_id","status");--> statement-breakpoint
CREATE INDEX "idx_request_org_assigned" ON "request" USING btree ("receiver_organization_id","assigned_to_id");
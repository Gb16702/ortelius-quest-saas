CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent');--> statement-breakpoint
ALTER TYPE "public"."request_status" ADD VALUE 'invoiced';--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"request_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"pricing" json NOT NULL,
	"description" text,
	"terms" text,
	"notes" text,
	"issue_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "invoice_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_request_id_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_invoice_request" ON "invoice" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_invoice_quote" ON "invoice" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "idx_invoice_org_created" ON "invoice" USING btree ("organization_id","created_at" DESC NULLS LAST);
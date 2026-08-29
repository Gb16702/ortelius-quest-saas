CREATE TYPE "public"."quote_status" AS ENUM('draft', 'sent', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TABLE "quote" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_number" text NOT NULL,
	"request_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"cargo_types" json,
	"cargo_details" json,
	"services" json,
	"timing" json,
	"documents" json,
	"comments" json,
	"pricing" json NOT NULL,
	"description" text,
	"terms" text,
	"valid_until" timestamp NOT NULL,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"responded_at" timestamp,
	"responded_by_id" text,
	"rejection_reason" text,
	"updated_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "quote_quote_number_unique" UNIQUE("quote_number")
);
--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_request_id_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_responded_by_id_user_id_fk" FOREIGN KEY ("responded_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
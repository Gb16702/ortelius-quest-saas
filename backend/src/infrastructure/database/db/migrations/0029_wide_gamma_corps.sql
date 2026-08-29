CREATE TABLE "member_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"requests_handled" integer DEFAULT 0 NOT NULL,
	"quotes_created" integer DEFAULT 0 NOT NULL,
	"invoices_created" integer DEFAULT 0 NOT NULL,
	"total_revenue" numeric(10, 2) DEFAULT '0' NOT NULL,
	"conversations_count" integer DEFAULT 0 NOT NULL,
	"messages_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_metrics_daily" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"requests_handled" integer DEFAULT 0 NOT NULL,
	"quotes_created" integer DEFAULT 0 NOT NULL,
	"invoices_created" integer DEFAULT 0 NOT NULL,
	"revenue" numeric(10, 2) DEFAULT '0' NOT NULL,
	"messages_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_metrics" ADD COLUMN "total_quotes_generated" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_metrics" ADD COLUMN "total_invoices_created" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_metrics" ADD COLUMN "total_revenue" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_metrics_daily" ADD COLUMN "quotes_generated" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_metrics_daily" ADD COLUMN "invoices_created" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_metrics_daily" ADD COLUMN "revenue" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "member_metrics" ADD CONSTRAINT "member_metrics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_metrics" ADD CONSTRAINT "member_metrics_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_metrics_daily" ADD CONSTRAINT "member_metrics_daily_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_metrics_daily" ADD CONSTRAINT "member_metrics_daily_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_member_metrics_user_org" ON "member_metrics" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "idx_member_metrics_daily_user_org_date" ON "member_metrics_daily" USING btree ("user_id","organization_id","date" DESC NULLS LAST);
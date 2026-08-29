CREATE TABLE "legal_page" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"page_type" text NOT NULL,
	"title" text NOT NULL,
	"introduction" text,
	"published" boolean DEFAULT false NOT NULL,
	"last_updated" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_section" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"title" text NOT NULL,
	"level" integer NOT NULL,
	"content" text NOT NULL,
	"order_index" integer NOT NULL,
	"parent_section_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legal_page" ADD CONSTRAINT "legal_page_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_section" ADD CONSTRAINT "legal_section_page_id_legal_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."legal_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_section" ADD CONSTRAINT "legal_section_parent_section_id_legal_section_id_fk" FOREIGN KEY ("parent_section_id") REFERENCES "public"."legal_section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_legal_page_org_type" ON "legal_page" USING btree ("organization_id","page_type");--> statement-breakpoint
CREATE INDEX "idx_legal_section_page_order" ON "legal_section" USING btree ("page_id","order_index");--> statement-breakpoint
CREATE INDEX "idx_legal_section_parent" ON "legal_section" USING btree ("parent_section_id");
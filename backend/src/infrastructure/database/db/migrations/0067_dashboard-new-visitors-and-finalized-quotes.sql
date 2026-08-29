ALTER TABLE "organization_metrics" RENAME COLUMN "total_showcase_views" TO "total_new_visitors";
--> statement-breakpoint
ALTER TABLE "organization_metrics_daily" RENAME COLUMN "showcase_views" TO "new_visitors";
--> statement-breakpoint
CREATE TABLE "organization_public_page_visitor" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "visitor_hash" text NOT NULL,
  "first_seen_at" timestamp NOT NULL,
  "last_seen_at" timestamp NOT NULL,
  CONSTRAINT "organization_public_page_visitor_organization_id_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_org_public_page_visitor_unique"
  ON "organization_public_page_visitor" USING btree ("organization_id", "visitor_hash");
--> statement-breakpoint
CREATE INDEX "idx_org_public_page_visitor_first_seen"
  ON "organization_public_page_visitor" USING btree ("organization_id", "first_seen_at" DESC);
--> statement-breakpoint
ALTER TABLE "quote" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
UPDATE "quote" SET "status" = 'sent' WHERE "status" = 'accepted';
--> statement-breakpoint
CREATE TYPE "public"."quote_status_new" AS ENUM('draft', 'sent', 'rejected', 'expired');
--> statement-breakpoint
ALTER TABLE "quote"
  ALTER COLUMN "status" TYPE "public"."quote_status_new"
  USING "status"::text::"public"."quote_status_new";
--> statement-breakpoint
DROP TYPE "public"."quote_status";
--> statement-breakpoint
ALTER TYPE "public"."quote_status_new" RENAME TO "quote_status";
--> statement-breakpoint
ALTER TABLE "quote" ALTER COLUMN "status" SET DEFAULT 'draft';

CREATE TYPE "public"."request_lifecycle_status" AS ENUM('draft', 'open', 'quoted', 'invoiced', 'closed');
--> statement-breakpoint
CREATE TYPE "public"."request_closed_reason" AS ENUM('request_rejected', 'quote_rejected', 'cancelled', 'expired');
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_request_org_status";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_request_assigned_to_status";
--> statement-breakpoint
ALTER TABLE "request" ADD COLUMN "lifecycle_status" "public"."request_lifecycle_status";
--> statement-breakpoint
ALTER TABLE "request" ADD COLUMN "closed_reason" "public"."request_closed_reason";
--> statement-breakpoint
UPDATE "request"
SET
  "lifecycle_status" = CASE
    WHEN "status"::text = 'draft' THEN 'draft'::"public"."request_lifecycle_status"
    WHEN "status"::text = 'pending' THEN 'open'::"public"."request_lifecycle_status"
    WHEN "status"::text = 'quoted' THEN 'quoted'::"public"."request_lifecycle_status"
    WHEN "status"::text = 'invoiced' THEN 'invoiced'::"public"."request_lifecycle_status"
    WHEN "status"::text IN ('rejected', 'canceled', 'cancelled', 'quote_rejected', 'expired') THEN 'closed'::"public"."request_lifecycle_status"
    WHEN "status"::text = 'quote_accepted' THEN 'quoted'::"public"."request_lifecycle_status"
    ELSE 'open'::"public"."request_lifecycle_status"
  END,
  "closed_reason" = CASE
    WHEN "status"::text = 'rejected' THEN 'request_rejected'::"public"."request_closed_reason"
    WHEN "status"::text IN ('canceled', 'cancelled') THEN 'cancelled'::"public"."request_closed_reason"
    WHEN "status"::text = 'quote_rejected' THEN 'quote_rejected'::"public"."request_closed_reason"
    WHEN "status"::text = 'expired' THEN 'expired'::"public"."request_closed_reason"
    ELSE NULL
  END;
--> statement-breakpoint
ALTER TABLE "request" ALTER COLUMN "lifecycle_status" SET DEFAULT 'open';
--> statement-breakpoint
ALTER TABLE "request" ALTER COLUMN "lifecycle_status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "request"
  ADD CONSTRAINT "request_closed_reason_matches_lifecycle_status"
  CHECK (
    ("lifecycle_status" = 'closed' AND "closed_reason" IS NOT NULL)
    OR
    ("lifecycle_status" != 'closed' AND "closed_reason" IS NULL)
  );
--> statement-breakpoint
ALTER TABLE "request" DROP COLUMN "status";
--> statement-breakpoint
DROP TYPE "public"."request_status";
--> statement-breakpoint
CREATE INDEX "idx_request_org_lifecycle_status"
  ON "request" USING btree ("receiver_organization_id", "lifecycle_status");
--> statement-breakpoint
CREATE INDEX "idx_request_assigned_to_lifecycle_status"
  ON "request" USING btree ("assigned_to_id", "lifecycle_status");

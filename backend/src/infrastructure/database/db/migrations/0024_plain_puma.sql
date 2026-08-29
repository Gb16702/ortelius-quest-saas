ALTER TABLE "request" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "request" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."request_status";--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'quoted', 'rejected', 'canceled', 'quote_accepted', 'invoiced');--> statement-breakpoint
ALTER TABLE "request" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."request_status";--> statement-breakpoint
ALTER TABLE "request" ALTER COLUMN "status" SET DATA TYPE "public"."request_status" USING "status"::"public"."request_status";
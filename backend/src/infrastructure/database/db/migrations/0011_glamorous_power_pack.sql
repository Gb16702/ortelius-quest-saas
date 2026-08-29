ALTER TABLE "cargo_details" ALTER COLUMN "fragility" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."fragility_type";--> statement-breakpoint
CREATE TYPE "public"."fragility_type" AS ENUM('fragile', 'robust');--> statement-breakpoint
ALTER TABLE "cargo_details" ALTER COLUMN "fragility" SET DATA TYPE "public"."fragility_type" USING "fragility"::"public"."fragility_type";
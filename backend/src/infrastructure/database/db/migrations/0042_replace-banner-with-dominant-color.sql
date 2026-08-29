ALTER TABLE "user" DROP COLUMN IF EXISTS "banner";
ALTER TABLE "user" ADD COLUMN "dominant_color" text;

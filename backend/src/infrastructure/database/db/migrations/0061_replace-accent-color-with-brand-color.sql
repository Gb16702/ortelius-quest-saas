ALTER TABLE "organization"
  ADD COLUMN IF NOT EXISTS "brand_color" text NOT NULL DEFAULT '#0103B8';

UPDATE "organization"
SET "brand_color" = CASE "accent_color"
  WHEN 'terracotta' THEN '#CC7D5E'
  WHEN 'violet' THEN '#5E6AD2'
  WHEN 'sky' THEN '#3183D8'
  WHEN 'kaki' THEN '#3D755D'
  WHEN 'rose' THEN '#FF66AD'
  WHEN 'black' THEN '#333333'
  ELSE '#0103B8'
END;

ALTER TABLE "organization" DROP COLUMN IF EXISTS "accent_color";

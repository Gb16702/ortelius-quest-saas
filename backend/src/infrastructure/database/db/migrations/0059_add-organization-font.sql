ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "font" text;

UPDATE "organization"
SET "font" = 'geist'
WHERE "font" IS NULL
  OR "font" NOT IN (
    'geist',
    'inter',
    'roboto',
    'ibm-plex-sans',
    'manrope',
    'plus-jakarta-sans'
  );

ALTER TABLE "organization"
  ALTER COLUMN "font" SET DEFAULT 'geist',
  ALTER COLUMN "font" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_font_allowed_check'
  ) THEN
    ALTER TABLE "organization"
      ADD CONSTRAINT "organization_font_allowed_check"
      CHECK (
        "font" IN (
          'geist',
          'inter',
          'roboto',
          'ibm-plex-sans',
          'manrope',
          'plus-jakarta-sans'
        )
      );
  END IF;
END $$;

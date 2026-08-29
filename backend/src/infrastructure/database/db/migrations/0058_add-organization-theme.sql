ALTER TABLE "organization"
  ADD COLUMN IF NOT EXISTS "theme" jsonb NOT NULL DEFAULT '{
    "type": "preset",
    "presetId": "default",
    "theme": {
      "accent": "#0003b8",
      "contrast": 30,
      "danger": "#a31515",
      "highlight": "#0003b8",
      "ink": "#171717",
      "positive": "#008000",
      "surface": "#ffffff"
    }
  }'::jsonb;

UPDATE "organization"
SET "theme" = '{
  "type": "preset",
  "presetId": "default",
  "theme": {
    "accent": "#0003b8",
    "contrast": 30,
    "danger": "#a31515",
    "highlight": "#0003b8",
    "ink": "#171717",
    "positive": "#008000",
    "surface": "#ffffff"
  }
}'::jsonb
WHERE "theme"->>'type' IS DISTINCT FROM 'preset'
  OR "theme"->'theme'->>'danger' IS NULL
  OR "theme"->'theme'->>'highlight' IS NULL
  OR "theme"->'theme'->>'positive' IS NULL;

ALTER TABLE "organization"
  ALTER COLUMN "theme" SET DEFAULT '{
    "type": "preset",
    "presetId": "default",
    "theme": {
      "accent": "#0003b8",
      "contrast": 30,
      "danger": "#a31515",
      "highlight": "#0003b8",
      "ink": "#171717",
      "positive": "#008000",
      "surface": "#ffffff"
    }
  }'::jsonb;

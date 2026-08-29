-- Add stripe_customer_id to organization (nullable, unique).
-- Lets us attach billing config (address, payment method, invoice email/language)
-- to an org's Stripe Customer before any subscription exists.
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;

-- Backfill: copy the most recent customer id from each org's latest
-- active/trialing subscription so existing subscribed orgs immediately work
-- against the new column without re-creating Customers.
UPDATE "organization" o
SET "stripe_customer_id" = s."stripe_customer_id"
FROM (
  SELECT DISTINCT ON ("reference_id")
    "reference_id",
    "stripe_customer_id"
  FROM "subscription"
  WHERE "stripe_customer_id" IS NOT NULL
    AND "status" IN ('active', 'trialing')
  ORDER BY "reference_id", "created_at" DESC
) s
WHERE o."id" = s."reference_id"
  AND o."stripe_customer_id" IS NULL;

-- Enforce uniqueness only after backfill so we don't fail on the data already in place.
ALTER TABLE "organization"
  ADD CONSTRAINT "organization_stripe_customer_id_unique"
  UNIQUE ("stripe_customer_id");

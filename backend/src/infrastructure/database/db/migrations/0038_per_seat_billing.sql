-- Migration: Add per-seat billing support
-- Add billing_model column to track legacy vs per-seat billing
-- Initialize seats column with current member count

-- Step 1: Add billing_model column
ALTER TABLE "subscription"
ADD COLUMN IF NOT EXISTS "billing_model" text DEFAULT 'per-seat';

-- Step 2: Initialize seats for existing subscriptions based on current member count
-- This ensures existing subscriptions have accurate seat counts
UPDATE "subscription"
SET "seats" = (
  SELECT CAST(COUNT(*) AS text)
  FROM "member"
  WHERE "member"."organizationId" = "subscription"."reference_id"
)
WHERE "seats" IS NULL OR "seats" = '';

-- Step 3: Set default value of 1 for any subscriptions without members
UPDATE "subscription"
SET "seats" = '1'
WHERE "seats" IS NULL OR "seats" = '' OR "seats" = '0';

-- Step 4: Mark all existing subscriptions as legacy fixed-price
-- This preserves backward compatibility during migration
UPDATE "subscription"
SET "billing_model" = 'fixed-price'
WHERE "created_at" < NOW();

-- Step 5: Create index on billing_model for faster queries
CREATE INDEX IF NOT EXISTS "idx_subscription_billing_model"
ON "subscription"("billing_model");

-- Step 6: Add index on reference_id and status for seat management queries
CREATE INDEX IF NOT EXISTS "idx_subscription_ref_status"
ON "subscription"("reference_id", "status")
WHERE "status" IN ('active', 'trialing');

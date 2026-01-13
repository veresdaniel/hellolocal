-- Create BillingPeriod enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingPeriod') THEN
        CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');
    END IF;
END $$;

-- Add new fields to SiteSubscription table
ALTER TABLE "SiteSubscription"
    ADD COLUMN IF NOT EXISTS "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    ADD COLUMN IF NOT EXISTS "priceCents" INTEGER,
    ADD COLUMN IF NOT EXISTS "currency" TEXT,
    ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP(3);

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS "SiteSubscription_validUntil_idx" ON "SiteSubscription"("validUntil");
CREATE INDEX IF NOT EXISTS "SiteSubscription_statusChangedAt_idx" ON "SiteSubscription"("statusChangedAt");

-- Create PlaceSubscription table
CREATE TABLE IF NOT EXISTS "PlaceSubscription" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "validUntil" TIMESTAMP(3),
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "priceCents" INTEGER,
    "currency" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaceSubscription_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on placeId
CREATE UNIQUE INDEX IF NOT EXISTS "PlaceSubscription_placeId_key" ON "PlaceSubscription"("placeId");

-- Create indexes for PlaceSubscription
CREATE INDEX IF NOT EXISTS "PlaceSubscription_plan_idx" ON "PlaceSubscription"("plan");
CREATE INDEX IF NOT EXISTS "PlaceSubscription_status_idx" ON "PlaceSubscription"("status");
CREATE INDEX IF NOT EXISTS "PlaceSubscription_validUntil_idx" ON "PlaceSubscription"("validUntil");
CREATE INDEX IF NOT EXISTS "PlaceSubscription_statusChangedAt_idx" ON "PlaceSubscription"("statusChangedAt");

-- Add foreign key constraint for PlaceSubscription
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'PlaceSubscription_placeId_fkey'
    ) THEN
        ALTER TABLE "PlaceSubscription" 
        ADD CONSTRAINT "PlaceSubscription_placeId_fkey" 
        FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

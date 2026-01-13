-- Create enum types for subscription plans and status
DO $$
BEGIN
    -- Create SubscriptionPlan enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionPlan') THEN
        CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'BASIC', 'PRO');
    END IF;
    
    -- Create SubscriptionStatus enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
        CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED');
    END IF;
END $$;

-- Create SiteSubscription table
CREATE TABLE IF NOT EXISTS "SiteSubscription" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "validUntil" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSubscription_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on siteId
CREATE UNIQUE INDEX IF NOT EXISTS "SiteSubscription_siteId_key" ON "SiteSubscription"("siteId");

-- Create indexes
CREATE INDEX IF NOT EXISTS "SiteSubscription_plan_idx" ON "SiteSubscription"("plan");
CREATE INDEX IF NOT EXISTS "SiteSubscription_status_idx" ON "SiteSubscription"("status");

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'SiteSubscription_siteId_fkey'
    ) THEN
        ALTER TABLE "SiteSubscription" 
        ADD CONSTRAINT "SiteSubscription_siteId_fkey" 
        FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

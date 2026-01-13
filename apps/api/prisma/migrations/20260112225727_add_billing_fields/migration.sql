-- Create enum types for billing plans
DO $$
BEGIN
    -- Create PlacePlan enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlacePlan') THEN
        CREATE TYPE "PlacePlan" AS ENUM ('free', 'basic', 'pro');
    END IF;
    
    -- Create SitePlan enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SitePlan') THEN
        CREATE TYPE "SitePlan" AS ENUM ('free', 'official', 'pro');
    END IF;
END $$;

-- Add billing fields to Site table
ALTER TABLE "Site" 
    ADD COLUMN IF NOT EXISTS "plan" "SitePlan" NOT NULL DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS "planValidUntil" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "billingEmail" TEXT,
    ADD COLUMN IF NOT EXISTS "billingMeta" JSONB;

-- Add billing/upsell fields to Place table
ALTER TABLE "Place"
    ADD COLUMN IF NOT EXISTS "plan" "PlacePlan" NOT NULL DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "featuredUntil" TIMESTAMP(3);

-- Create indexes for Site billing fields
CREATE INDEX IF NOT EXISTS "Site_plan_idx" ON "Site"("plan");
CREATE INDEX IF NOT EXISTS "Site_planValidUntil_idx" ON "Site"("planValidUntil");

-- Create indexes for Place billing/upsell fields
CREATE INDEX IF NOT EXISTS "Place_siteId_isFeatured_idx" ON "Place"("siteId", "isFeatured");
CREATE INDEX IF NOT EXISTS "Place_featuredUntil_idx" ON "Place"("featuredUntil");
CREATE INDEX IF NOT EXISTS "Place_plan_idx" ON "Place"("plan");

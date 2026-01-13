-- Add business to SitePlan enum
DO $$
BEGIN
    -- Check if 'business' value already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'business' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SitePlan')
    ) THEN
        ALTER TYPE "SitePlan" ADD VALUE 'business';
    END IF;
END $$;

-- Add planStatus to Site table
ALTER TABLE "Site" 
    ADD COLUMN IF NOT EXISTS "planStatus" TEXT DEFAULT 'active';

-- Add planLimits to Site table
ALTER TABLE "Site" 
    ADD COLUMN IF NOT EXISTS "planLimits" JSONB;

-- Add sitePlaceholders to SiteInstance table
ALTER TABLE "SiteInstance" 
    ADD COLUMN IF NOT EXISTS "sitePlaceholders" JSONB;

-- Add logoUrl override to SiteInstance table
ALTER TABLE "SiteInstance" 
    ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- Add faviconUrl override to SiteInstance table
ALTER TABLE "SiteInstance" 
    ADD COLUMN IF NOT EXISTS "faviconUrl" TEXT;

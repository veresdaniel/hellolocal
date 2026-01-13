-- Add CANCELLED status to SubscriptionStatus enum
DO $$
BEGIN
    -- Check if CANCELLED already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'CANCELLED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionStatus')
    ) THEN
        -- Add CANCELLED to the enum (after ACTIVE, before SUSPENDED)
        ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
    END IF;
END $$;

-- Add activeSiteId column to User table
ALTER TABLE "User" 
    ADD COLUMN IF NOT EXISTS "activeSiteId" TEXT;

-- Create index for activeSiteId
CREATE INDEX IF NOT EXISTS "User_activeSiteId_idx" ON "User"("activeSiteId");

-- Add foreign key constraint for activeSiteId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'User_activeSiteId_fkey'
    ) THEN
        ALTER TABLE "User" 
        ADD CONSTRAINT "User_activeSiteId_fkey" 
        FOREIGN KEY ("activeSiteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

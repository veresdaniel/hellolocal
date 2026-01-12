-- Fix PushSubscription unique constraint: change from global endpoint unique to composite [tenantId, endpoint]
-- This allows the same endpoint to exist in multiple tenants, but ensures uniqueness within a tenant

DO $$
BEGIN
    -- Step 1: Drop the existing unique index on endpoint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'PushSubscription_endpoint_key'
    ) THEN
        DROP INDEX "PushSubscription_endpoint_key";
    END IF;

    -- Step 2: Create composite unique constraint on [tenantId, endpoint]
    -- Prisma creates this as a unique index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'PushSubscription_tenantId_endpoint_key'
    ) THEN
        CREATE UNIQUE INDEX "PushSubscription_tenantId_endpoint_key" 
        ON "PushSubscription"("tenantId", "endpoint");
    END IF;
END $$;

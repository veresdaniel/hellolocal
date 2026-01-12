-- Ensure the table is named PushSubscription (not Subscription)
-- This migration is idempotent and safe to run multiple times

DO $$
BEGIN
    -- Check if Subscription table exists and rename it to PushSubscription
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Subscription'
    ) THEN
        -- Rename the table
        ALTER TABLE "Subscription" RENAME TO "PushSubscription";
        
        -- Rename constraints if they exist
        IF EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'Subscription_pkey'
        ) THEN
            ALTER TABLE "PushSubscription" RENAME CONSTRAINT "Subscription_pkey" TO "PushSubscription_pkey";
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'Subscription_tenantId_fkey'
        ) THEN
            ALTER TABLE "PushSubscription" RENAME CONSTRAINT "Subscription_tenantId_fkey" TO "PushSubscription_tenantId_fkey";
        END IF;
        
        -- Rename indexes if they exist
        IF EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'Subscription_endpoint_key'
        ) THEN
            ALTER INDEX "Subscription_endpoint_key" RENAME TO "PushSubscription_endpoint_key";
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'Subscription_tenantId_idx'
        ) THEN
            ALTER INDEX "Subscription_tenantId_idx" RENAME TO "PushSubscription_tenantId_idx";
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'Subscription_isActive_idx'
        ) THEN
            ALTER INDEX "Subscription_isActive_idx" RENAME TO "PushSubscription_isActive_idx";
        END IF;
    END IF;
END $$;

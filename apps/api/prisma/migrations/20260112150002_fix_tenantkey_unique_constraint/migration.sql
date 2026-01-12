-- Fix TenantKey unique constraint: change from global [lang, slug] to tenant-specific [tenantId, lang, slug]
-- This allows the same slug to exist in multiple tenants for the same language

DO $$
BEGIN
    -- Step 1: Drop the existing unique index on [lang, slug] if it exists
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'TenantKey_lang_slug_key'
    ) THEN
        DROP INDEX "TenantKey_lang_slug_key";
    END IF;

    -- Step 2: Create composite unique constraint on [tenantId, lang, slug]
    -- Prisma creates this as a unique index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'TenantKey_tenantId_lang_slug_key'
    ) THEN
        CREATE UNIQUE INDEX "TenantKey_tenantId_lang_slug_key" 
        ON "TenantKey"("tenantId", "lang", "slug");
    END IF;
END $$;

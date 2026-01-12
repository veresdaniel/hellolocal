-- Rename Tenant to Site and all related tables, columns, and constraints
-- This is a comprehensive migration that renames all tenant-related entities to site

-- Step 1: Rename enum TenantRole to SiteRole
DO $$
BEGIN
    -- Rename the enum type
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantRole') THEN
        ALTER TYPE "TenantRole" RENAME TO "SiteRole";
    END IF;
    
    -- Rename enum values
    IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'SiteRole' AND e.enumlabel = 'tenantadmin'
    ) THEN
        ALTER TYPE "SiteRole" RENAME VALUE 'tenantadmin' TO 'siteadmin';
    END IF;
END $$;

-- Step 2: Rename main tables
ALTER TABLE IF EXISTS "Tenant" RENAME TO "Site";
ALTER TABLE IF EXISTS "TenantTranslation" RENAME TO "SiteTranslation";
ALTER TABLE IF EXISTS "TenantKey" RENAME TO "SiteKey";
ALTER TABLE IF EXISTS "TenantMembership" RENAME TO "SiteMembership";
ALTER TABLE IF EXISTS "UserTenant" RENAME TO "UserSite";

-- Step 3: Rename tenantId columns to siteId in all tables
ALTER TABLE IF EXISTS "SiteTranslation" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "SiteKey" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "SiteMembership" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "UserSite" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "Slug" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "Town" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "Category" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "Tag" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "PriceBand" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "Place" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "LegalPage" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "StaticPage" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "Event" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "PushSubscription" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "EventLog" RENAME COLUMN "tenantId" TO "siteId";
ALTER TABLE IF EXISTS "SiteInstance" RENAME COLUMN "tenantId" TO "siteId";

-- Step 4: Rename foreign key constraints
DO $$
BEGIN
    -- SiteTranslation
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantTranslation_tenantId_fkey') THEN
        ALTER TABLE "SiteTranslation" RENAME CONSTRAINT "TenantTranslation_tenantId_fkey" TO "SiteTranslation_siteId_fkey";
    END IF;
    
    -- SiteKey
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantKey_tenantId_fkey') THEN
        ALTER TABLE "SiteKey" RENAME CONSTRAINT "TenantKey_tenantId_fkey" TO "SiteKey_siteId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantKey_redirectToId_fkey') THEN
        ALTER TABLE "SiteKey" RENAME CONSTRAINT "TenantKey_redirectToId_fkey" TO "SiteKey_redirectToId_fkey";
    END IF;
    
    -- SiteMembership
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantMembership_tenantId_fkey') THEN
        ALTER TABLE "SiteMembership" RENAME CONSTRAINT "TenantMembership_tenantId_fkey" TO "SiteMembership_siteId_fkey";
    END IF;
    
    -- UserSite
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserTenant_tenantId_fkey') THEN
        ALTER TABLE "UserSite" RENAME CONSTRAINT "UserTenant_tenantId_fkey" TO "UserSite_siteId_fkey";
    END IF;
    
    -- Slug
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Slug_tenantId_fkey') THEN
        ALTER TABLE "Slug" RENAME CONSTRAINT "Slug_tenantId_fkey" TO "Slug_siteId_fkey";
    END IF;
    
    -- Town
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Town_tenantId_fkey') THEN
        ALTER TABLE "Town" RENAME CONSTRAINT "Town_tenantId_fkey" TO "Town_siteId_fkey";
    END IF;
    
    -- Category
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Category_tenantId_fkey') THEN
        ALTER TABLE "Category" RENAME CONSTRAINT "Category_tenantId_fkey" TO "Category_siteId_fkey";
    END IF;
    
    -- Tag
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Tag_tenantId_fkey') THEN
        ALTER TABLE "Tag" RENAME CONSTRAINT "Tag_tenantId_fkey" TO "Tag_siteId_fkey";
    END IF;
    
    -- PriceBand
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PriceBand_tenantId_fkey') THEN
        ALTER TABLE "PriceBand" RENAME CONSTRAINT "PriceBand_tenantId_fkey" TO "PriceBand_siteId_fkey";
    END IF;
    
    -- Place
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Place_tenantId_fkey') THEN
        ALTER TABLE "Place" RENAME CONSTRAINT "Place_tenantId_fkey" TO "Place_siteId_fkey";
    END IF;
    
    -- LegalPage
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LegalPage_tenantId_fkey') THEN
        ALTER TABLE "LegalPage" RENAME CONSTRAINT "LegalPage_tenantId_fkey" TO "LegalPage_siteId_fkey";
    END IF;
    
    -- StaticPage
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StaticPage_tenantId_fkey') THEN
        ALTER TABLE "StaticPage" RENAME CONSTRAINT "StaticPage_tenantId_fkey" TO "StaticPage_siteId_fkey";
    END IF;
    
    -- Event
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Event_tenantId_fkey') THEN
        ALTER TABLE "Event" RENAME CONSTRAINT "Event_tenantId_fkey" TO "Event_siteId_fkey";
    END IF;
    
    -- PushSubscription
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushSubscription_tenantId_fkey') THEN
        ALTER TABLE "PushSubscription" RENAME CONSTRAINT "PushSubscription_tenantId_fkey" TO "PushSubscription_siteId_fkey";
    END IF;
    
    -- EventLog
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventLog_tenantId_fkey') THEN
        ALTER TABLE "EventLog" RENAME CONSTRAINT "EventLog_tenantId_fkey" TO "EventLog_siteId_fkey";
    END IF;
    
    -- SiteInstance
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SiteInstance_tenantId_fkey') THEN
        ALTER TABLE "SiteInstance" RENAME CONSTRAINT "SiteInstance_tenantId_fkey" TO "SiteInstance_siteId_fkey";
    END IF;
    
    -- Brand
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Tenant_brandId_fkey') THEN
        ALTER TABLE "Site" RENAME CONSTRAINT "Tenant_brandId_fkey" TO "Site_brandId_fkey";
    END IF;
END $$;

-- Step 5: Rename indexes
DO $$
BEGIN
    -- SiteTranslation
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TenantTranslation_tenantId_lang_key') THEN
        ALTER INDEX "TenantTranslation_tenantId_lang_key" RENAME TO "SiteTranslation_siteId_lang_key";
    END IF;
    
    -- SiteKey
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TenantKey_tenantId_lang_slug_key') THEN
        ALTER INDEX "TenantKey_tenantId_lang_slug_key" RENAME TO "SiteKey_siteId_lang_slug_key";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TenantKey_lang_slug_idx') THEN
        ALTER INDEX "TenantKey_lang_slug_idx" RENAME TO "SiteKey_lang_slug_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TenantKey_tenantId_lang_idx') THEN
        ALTER INDEX "TenantKey_tenantId_lang_idx" RENAME TO "SiteKey_siteId_lang_idx";
    END IF;
    
    -- SiteMembership
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TenantMembership_tenantId_userId_key') THEN
        ALTER INDEX "TenantMembership_tenantId_userId_key" RENAME TO "SiteMembership_siteId_userId_key";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TenantMembership_tenantId_idx') THEN
        ALTER INDEX "TenantMembership_tenantId_idx" RENAME TO "SiteMembership_siteId_idx";
    END IF;
    
    -- UserSite
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'UserTenant_userId_tenantId_key') THEN
        ALTER INDEX "UserTenant_userId_tenantId_key" RENAME TO "UserSite_userId_siteId_key";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'UserTenant_tenantId_idx') THEN
        ALTER INDEX "UserTenant_tenantId_idx" RENAME TO "UserSite_siteId_idx";
    END IF;
    
    -- Slug
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Slug_tenantId_lang_slug_key') THEN
        ALTER INDEX "Slug_tenantId_lang_slug_key" RENAME TO "Slug_siteId_lang_slug_key";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Slug_tenantId_lang_slug_idx') THEN
        ALTER INDEX "Slug_tenantId_lang_slug_idx" RENAME TO "Slug_siteId_lang_slug_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Slug_tenantId_entityType_entityId_idx') THEN
        ALTER INDEX "Slug_tenantId_entityType_entityId_idx" RENAME TO "Slug_siteId_entityType_entityId_idx";
    END IF;
    
    -- Town
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Town_tenantId_idx') THEN
        ALTER INDEX "Town_tenantId_idx" RENAME TO "Town_siteId_idx";
    END IF;
    
    -- Category
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Category_tenantId_idx') THEN
        ALTER INDEX "Category_tenantId_idx" RENAME TO "Category_siteId_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Category_tenantId_parentId_order_idx') THEN
        ALTER INDEX "Category_tenantId_parentId_order_idx" RENAME TO "Category_siteId_parentId_order_idx";
    END IF;
    
    -- Tag
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Tag_tenantId_idx') THEN
        ALTER INDEX "Tag_tenantId_idx" RENAME TO "Tag_siteId_idx";
    END IF;
    
    -- PriceBand
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PriceBand_tenantId_idx') THEN
        ALTER INDEX "PriceBand_tenantId_idx" RENAME TO "PriceBand_siteId_idx";
    END IF;
    
    -- Place
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Place_tenantId_categoryId_idx') THEN
        ALTER INDEX "Place_tenantId_categoryId_idx" RENAME TO "Place_siteId_categoryId_idx";
    END IF;
    
    -- LegalPage
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'LegalPage_tenantId_key_key') THEN
        ALTER INDEX "LegalPage_tenantId_key_key" RENAME TO "LegalPage_siteId_key_key";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'LegalPage_tenantId_idx') THEN
        ALTER INDEX "LegalPage_tenantId_idx" RENAME TO "LegalPage_siteId_idx";
    END IF;
    
    -- StaticPage
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'StaticPage_tenantId_idx') THEN
        ALTER INDEX "StaticPage_tenantId_idx" RENAME TO "StaticPage_siteId_idx";
    END IF;
    
    -- Event
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Event_tenantId_startDate_idx') THEN
        ALTER INDEX "Event_tenantId_startDate_idx" RENAME TO "Event_siteId_startDate_idx";
    END IF;
    
    -- PushSubscription
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PushSubscription_tenantId_endpoint_key') THEN
        ALTER INDEX "PushSubscription_tenantId_endpoint_key" RENAME TO "PushSubscription_siteId_endpoint_key";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PushSubscription_tenantId_idx') THEN
        ALTER INDEX "PushSubscription_tenantId_idx" RENAME TO "PushSubscription_siteId_idx";
    END IF;
    
    -- EventLog
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'EventLog_tenantId_idx') THEN
        ALTER INDEX "EventLog_tenantId_idx" RENAME TO "EventLog_siteId_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'EventLog_tenantId_userId_idx') THEN
        ALTER INDEX "EventLog_tenantId_userId_idx" RENAME TO "EventLog_siteId_userId_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'EventLog_tenantId_createdAt_idx') THEN
        ALTER INDEX "EventLog_tenantId_createdAt_idx" RENAME TO "EventLog_siteId_createdAt_idx";
    END IF;
    
    -- SiteInstance
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SiteInstance_tenantId_lang_key') THEN
        ALTER INDEX "SiteInstance_tenantId_lang_key" RENAME TO "SiteInstance_siteId_lang_key";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SiteInstance_tenantId_idx') THEN
        ALTER INDEX "SiteInstance_tenantId_idx" RENAME TO "SiteInstance_siteId_idx";
    END IF;
    
    -- Site
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Tenant_brandId_idx') THEN
        ALTER INDEX "Tenant_brandId_idx" RENAME TO "Site_brandId_idx";
    END IF;
END $$;

-- Step 6: Update Brand relation name (if needed)
-- The relation name in Prisma is handled by the schema, but we ensure consistency

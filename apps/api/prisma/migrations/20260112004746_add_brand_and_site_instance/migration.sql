-- CreateTable: Brand
CREATE TABLE IF NOT EXISTS "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "theme" JSONB,
    "placeholders" JSONB,
    "mapDefaults" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add brandId to Tenant (nullable first, will be populated and made NOT NULL later)
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "brandId" TEXT;

-- CreateIndex: Brand lookup
CREATE INDEX IF NOT EXISTS "Tenant_brandId_idx" ON "Tenant"("brandId");

-- AddForeignKey: Tenant.brandId -> Brand.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Tenant_brandId_fkey'
    ) THEN
        ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable: SiteInstance
CREATE TABLE IF NOT EXISTS "SiteInstance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domain" TEXT,
    "lang" "Lang" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "mapConfig" JSONB,
    "features" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: SiteInstance indexes
CREATE UNIQUE INDEX IF NOT EXISTS "SiteInstance_tenantId_lang_key" ON "SiteInstance"("tenantId", "lang");
CREATE INDEX IF NOT EXISTS "SiteInstance_tenantId_idx" ON "SiteInstance"("tenantId");
CREATE INDEX IF NOT EXISTS "SiteInstance_domain_idx" ON "SiteInstance"("domain");
CREATE INDEX IF NOT EXISTS "SiteInstance_lang_idx" ON "SiteInstance"("lang");

-- AddForeignKey: SiteInstance.tenantId -> Tenant.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SiteInstance_tenantId_fkey'
    ) THEN
        ALTER TABLE "SiteInstance" ADD CONSTRAINT "SiteInstance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

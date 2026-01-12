-- CreateTable: SiteDomain
-- Domain-to-site mapping (supports multi-language domains)
-- Example: example.com can serve /hu/... and /en/... for the same site
CREATE TABLE IF NOT EXISTS "SiteDomain" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "defaultLang" "Lang" NOT NULL DEFAULT 'hu',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: SiteDomain indexes
CREATE UNIQUE INDEX IF NOT EXISTS "SiteDomain_domain_key" ON "SiteDomain"("domain");
CREATE INDEX IF NOT EXISTS "SiteDomain_siteId_idx" ON "SiteDomain"("siteId");
CREATE INDEX IF NOT EXISTS "SiteDomain_isActive_idx" ON "SiteDomain"("isActive");

-- AddForeignKey: SiteDomain.siteId -> Site.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SiteDomain_siteId_fkey'
    ) THEN
        ALTER TABLE "SiteDomain" ADD CONSTRAINT "SiteDomain_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Migrate existing domain data from SiteInstance to SiteDomain
-- This preserves existing domain configurations
INSERT INTO "SiteDomain" ("id", "siteId", "domain", "isActive", "isPrimary", "defaultLang", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text as "id",
    "siteId",
    "domain",
    true as "isActive",
    "isDefault" as "isPrimary",
    "lang" as "defaultLang",
    "createdAt",
    "updatedAt"
FROM "SiteInstance"
WHERE "domain" IS NOT NULL
ON CONFLICT ("domain") DO NOTHING;

-- DropIndex: Remove domain index from SiteInstance
DROP INDEX IF EXISTS "SiteInstance_domain_idx";

-- AlterTable: Remove domain column from SiteInstance
ALTER TABLE "SiteInstance" DROP COLUMN IF EXISTS "domain";

-- Per-hostname Google Tag Manager container IDs (GTM-…).
ALTER TABLE "SiteDomain" ADD COLUMN IF NOT EXISTS "gtmContainerId" TEXT;
ALTER TABLE "Town" ADD COLUMN IF NOT EXISTS "gtmContainerId" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "gtmContainerId" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "gtmContainerId" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "gtmContainerId" TEXT;

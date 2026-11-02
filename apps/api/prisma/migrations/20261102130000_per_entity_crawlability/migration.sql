-- Per-content crawl switches. Global crawlability still overrides every page.
ALTER TABLE "Site" ADD COLUMN "isCrawlable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Town" ADD COLUMN "isCrawlable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Place" ADD COLUMN "isCrawlable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Event" ADD COLUMN "isCrawlable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StaticPage" ADD COLUMN "isCrawlable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LegalPage" ADD COLUMN "isCrawlable" BOOLEAN NOT NULL DEFAULT true;

-- Keep an existing region switch that lived only in the default language instance.
UPDATE "Site" s
SET "isCrawlable" = false
FROM "SiteInstance" si
WHERE si."siteId" = s.id
  AND si."isDefault" = true
  AND (si.features->>'isCrawlable') IN ('false', '0');

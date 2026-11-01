-- Per-language opening page. Null keeps the current map or list home.
ALTER TABLE "SiteTranslation" ADD COLUMN "landingHtml" TEXT;

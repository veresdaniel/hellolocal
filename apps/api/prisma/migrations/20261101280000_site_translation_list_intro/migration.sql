-- Optional per-language intro block on the discovery / places list page.
ALTER TABLE "SiteTranslation" ADD COLUMN "listIntroHtml" TEXT;
ALTER TABLE "SiteTranslation" ADD COLUMN "listIntroImage" TEXT;

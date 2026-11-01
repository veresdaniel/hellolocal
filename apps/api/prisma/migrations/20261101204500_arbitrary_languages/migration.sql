-- Language is an ISO 639 code, not a closed list of hu/en/de.
ALTER TABLE "SiteDomain" ALTER COLUMN "defaultLang" DROP DEFAULT;

ALTER TABLE "SiteTranslation" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "SiteKey" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "Slug" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "TownTranslation" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "CategoryTranslation" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "TagTranslation" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "PriceBandTranslation" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "ProductTranslation" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "PlaceTranslation" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "LegalPageTranslation" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "StaticPageTranslation" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "EventTranslation" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "SiteInstance" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "CollectionTranslation" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "CollectionItemTranslation" ALTER COLUMN "lang" TYPE VARCHAR(8) USING "lang"::text;
ALTER TABLE "SiteDomain" ALTER COLUMN "defaultLang" TYPE VARCHAR(8) USING "defaultLang"::text;

DROP TYPE "Lang";

ALTER TABLE "SiteDomain" ALTER COLUMN "defaultLang" SET DEFAULT 'hu';

ALTER TABLE "Site" ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT ARRAY['hu', 'en', 'de']::TEXT[];

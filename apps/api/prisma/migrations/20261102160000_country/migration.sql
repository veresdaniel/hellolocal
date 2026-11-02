-- Country sits above Site (region). Existing regions are attached to one default country.

CREATE TYPE "PlaceSignupStatus" AS ENUM ('pending', 'attached');

CREATE TABLE "Country" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "primaryDomain" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Country_slug_key" ON "Country"("slug");
CREATE UNIQUE INDEX "Country_primaryDomain_key" ON "Country"("primaryDomain");

CREATE TABLE "CountryTranslation" (
  "id" TEXT NOT NULL,
  "countryId" TEXT NOT NULL,
  "lang" VARCHAR(8) NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "CountryTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CountryTranslation_countryId_lang_key" ON "CountryTranslation"("countryId", "lang");
CREATE INDEX "CountryTranslation_lang_idx" ON "CountryTranslation"("lang");

CREATE TABLE "CountryDomain" (
  "id" TEXT NOT NULL,
  "countryId" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "defaultLang" VARCHAR(8) NOT NULL DEFAULT 'hu',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CountryDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CountryDomain_domain_key" ON "CountryDomain"("domain");
CREATE INDEX "CountryDomain_countryId_idx" ON "CountryDomain"("countryId");
CREATE INDEX "CountryDomain_isActive_idx" ON "CountryDomain"("isActive");

ALTER TABLE "CountryTranslation"
  ADD CONSTRAINT "CountryTranslation_countryId_fkey"
  FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CountryDomain"
  ADD CONSTRAINT "CountryDomain_countryId_fkey"
  FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Site" ADD COLUMN "countryId" TEXT;

INSERT INTO "Country" ("id", "slug", "isActive", "createdAt", "updatedAt")
SELECT 'country_default', 'default', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Country");

INSERT INTO "CountryTranslation" ("id", "countryId", "lang", "name")
SELECT 'country_default_hu', 'country_default', 'hu', 'Magyarország'
WHERE NOT EXISTS (SELECT 1 FROM "CountryTranslation" WHERE "countryId" = 'country_default' AND "lang" = 'hu');

INSERT INTO "CountryTranslation" ("id", "countryId", "lang", "name")
SELECT 'country_default_en', 'country_default', 'en', 'Hungary'
WHERE NOT EXISTS (SELECT 1 FROM "CountryTranslation" WHERE "countryId" = 'country_default' AND "lang" = 'en');

INSERT INTO "CountryTranslation" ("id", "countryId", "lang", "name")
SELECT 'country_default_de', 'country_default', 'de', 'Ungarn'
WHERE NOT EXISTS (SELECT 1 FROM "CountryTranslation" WHERE "countryId" = 'country_default' AND "lang" = 'de');

UPDATE "Site" SET "countryId" = 'country_default' WHERE "countryId" IS NULL;

ALTER TABLE "Site" ALTER COLUMN "countryId" SET NOT NULL;

ALTER TABLE "Site"
  ADD CONSTRAINT "Site_countryId_fkey"
  FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Site_countryId_idx" ON "Site"("countryId");

CREATE TABLE "PlaceSignup" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "countryId" TEXT NOT NULL,
  "townId" TEXT,
  "requestedTownName" TEXT NOT NULL,
  "status" "PlaceSignupStatus" NOT NULL DEFAULT 'pending',
  "placeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlaceSignup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlaceSignup_userId_idx" ON "PlaceSignup"("userId");
CREATE INDEX "PlaceSignup_countryId_idx" ON "PlaceSignup"("countryId");
CREATE INDEX "PlaceSignup_status_idx" ON "PlaceSignup"("status");

ALTER TABLE "PlaceSignup"
  ADD CONSTRAINT "PlaceSignup_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlaceSignup"
  ADD CONSTRAINT "PlaceSignup_countryId_fkey"
  FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlaceSignup"
  ADD CONSTRAINT "PlaceSignup_townId_fkey"
  FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE SET NULL ON UPDATE CASCADE;

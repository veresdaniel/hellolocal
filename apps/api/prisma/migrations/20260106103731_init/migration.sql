-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('hu', 'en', 'de');

-- CreateEnum
CREATE TYPE "PlaceCategory" AS ENUM ('winery', 'accommodation', 'hospitality', 'craft', 'food_producer');

-- CreateEnum
CREATE TYPE "PriceBand" AS ENUM ('budget', 'mid', 'premium', 'luxury');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "primaryDomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantTranslation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "heroImage" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "TenantTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Town" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Town_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TownTranslation" (
    "id" TEXT NOT NULL,
    "townId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "heroImage" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "TownTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "townId" TEXT,
    "slug" TEXT NOT NULL,
    "category" "PlaceCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "heroImage" TEXT,
    "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "priceBand" "PriceBand",
    "ratingAvg" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "extras" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceTranslation" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,
    "teaser" TEXT,
    "description" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "openingHours" TEXT,
    "accessibility" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "PlaceTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalPage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalPageTranslation" (
    "id" TEXT NOT NULL,
    "legalPageId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "LegalPageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_primaryDomain_key" ON "Tenant"("primaryDomain");

-- CreateIndex
CREATE INDEX "TenantTranslation_lang_idx" ON "TenantTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "TenantTranslation_tenantId_lang_key" ON "TenantTranslation"("tenantId", "lang");

-- CreateIndex
CREATE INDEX "Town_tenantId_idx" ON "Town"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Town_tenantId_slug_key" ON "Town"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "TownTranslation_lang_idx" ON "TownTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "TownTranslation_townId_lang_key" ON "TownTranslation"("townId", "lang");

-- CreateIndex
CREATE INDEX "Place_tenantId_category_idx" ON "Place"("tenantId", "category");

-- CreateIndex
CREATE INDEX "Place_townId_idx" ON "Place"("townId");

-- CreateIndex
CREATE UNIQUE INDEX "Place_tenantId_slug_key" ON "Place"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "PlaceTranslation_lang_idx" ON "PlaceTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceTranslation_placeId_lang_key" ON "PlaceTranslation"("placeId", "lang");

-- CreateIndex
CREATE INDEX "LegalPage_tenantId_idx" ON "LegalPage"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalPage_tenantId_key_key" ON "LegalPage"("tenantId", "key");

-- CreateIndex
CREATE INDEX "LegalPageTranslation_lang_idx" ON "LegalPageTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "LegalPageTranslation_legalPageId_lang_key" ON "LegalPageTranslation"("legalPageId", "lang");

-- AddForeignKey
ALTER TABLE "TenantTranslation" ADD CONSTRAINT "TenantTranslation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Town" ADD CONSTRAINT "Town_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TownTranslation" ADD CONSTRAINT "TownTranslation_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceTranslation" ADD CONSTRAINT "PlaceTranslation_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPage" ADD CONSTRAINT "LegalPage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPageTranslation" ADD CONSTRAINT "LegalPageTranslation_legalPageId_fkey" FOREIGN KEY ("legalPageId") REFERENCES "LegalPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

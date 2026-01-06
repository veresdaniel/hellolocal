/*
  Warnings:

  - You are about to drop the column `category` on the `Place` table. All the data in the column will be lost.
  - You are about to drop the column `priceBand` on the `Place` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Place` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `Place` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Place_tenantId_category_idx";

-- AlterTable
ALTER TABLE "Place" DROP COLUMN "category",
DROP COLUMN "priceBand",
DROP COLUMN "tags",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "priceBandId" TEXT;

-- DropEnum
DROP TYPE "PlaceCategory";

-- DropEnum
DROP TYPE "PriceBand";

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryTranslation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagTranslation" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "TagTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceBand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceBandTranslation" (
    "id" TEXT NOT NULL,
    "priceBandId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "PriceBandTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceTag" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaceTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_tenantId_idx" ON "Category"("tenantId");

-- CreateIndex
CREATE INDEX "CategoryTranslation_lang_idx" ON "CategoryTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_categoryId_lang_key" ON "CategoryTranslation"("categoryId", "lang");

-- CreateIndex
CREATE INDEX "Tag_tenantId_idx" ON "Tag"("tenantId");

-- CreateIndex
CREATE INDEX "TagTranslation_lang_idx" ON "TagTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "TagTranslation_tagId_lang_key" ON "TagTranslation"("tagId", "lang");

-- CreateIndex
CREATE INDEX "PriceBand_tenantId_idx" ON "PriceBand"("tenantId");

-- CreateIndex
CREATE INDEX "PriceBandTranslation_lang_idx" ON "PriceBandTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "PriceBandTranslation_priceBandId_lang_key" ON "PriceBandTranslation"("priceBandId", "lang");

-- CreateIndex
CREATE INDEX "PlaceTag_placeId_idx" ON "PlaceTag"("placeId");

-- CreateIndex
CREATE INDEX "PlaceTag_tagId_idx" ON "PlaceTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceTag_placeId_tagId_key" ON "PlaceTag"("placeId", "tagId");

-- CreateIndex
CREATE INDEX "Place_tenantId_categoryId_idx" ON "Place"("tenantId", "categoryId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagTranslation" ADD CONSTRAINT "TagTranslation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBand" ADD CONSTRAINT "PriceBand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBandTranslation" ADD CONSTRAINT "PriceBandTranslation_priceBandId_fkey" FOREIGN KEY ("priceBandId") REFERENCES "PriceBand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_priceBandId_fkey" FOREIGN KEY ("priceBandId") REFERENCES "PriceBand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceTag" ADD CONSTRAINT "PlaceTag_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceTag" ADD CONSTRAINT "PlaceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `slug` on the `Place` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Town` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SlugEntityType" AS ENUM ('place', 'placeType', 'town', 'page', 'region');

-- DropIndex
DROP INDEX "Place_tenantId_slug_key";

-- DropIndex
DROP INDEX "Town_tenantId_slug_key";

-- AlterTable
ALTER TABLE "Place" DROP COLUMN "slug";

-- AlterTable
ALTER TABLE "Town" DROP COLUMN "slug";

-- CreateTable
CREATE TABLE "TenantKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "slug" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "redirectToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slug" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "slug" TEXT NOT NULL,
    "entityType" "SlugEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "redirectToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slug_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantKey_lang_slug_idx" ON "TenantKey"("lang", "slug");

-- CreateIndex
CREATE INDEX "TenantKey_tenantId_lang_idx" ON "TenantKey"("tenantId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "TenantKey_lang_slug_key" ON "TenantKey"("lang", "slug");

-- CreateIndex
CREATE INDEX "Slug_tenantId_lang_slug_idx" ON "Slug"("tenantId", "lang", "slug");

-- CreateIndex
CREATE INDEX "Slug_tenantId_entityType_entityId_idx" ON "Slug"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Slug_tenantId_lang_slug_key" ON "Slug"("tenantId", "lang", "slug");

-- AddForeignKey
ALTER TABLE "TenantKey" ADD CONSTRAINT "TenantKey_redirectToId_fkey" FOREIGN KEY ("redirectToId") REFERENCES "TenantKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantKey" ADD CONSTRAINT "TenantKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slug" ADD CONSTRAINT "Slug_redirectToId_fkey" FOREIGN KEY ("redirectToId") REFERENCES "Slug"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slug" ADD CONSTRAINT "Slug_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

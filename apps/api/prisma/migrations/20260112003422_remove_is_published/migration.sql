/*
  Warnings:

  - Made the column `brandId` on table `Site` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
-- Note: Table was renamed from "Tenant" to "Site" in migration 20260112160000_rename_tenant_to_site
ALTER TABLE "Site" ALTER COLUMN "brandId" SET NOT NULL;

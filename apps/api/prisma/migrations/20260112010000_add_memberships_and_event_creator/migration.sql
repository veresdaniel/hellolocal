-- CreateEnum: TenantRole
CREATE TYPE "TenantRole" AS ENUM ('tenantadmin', 'editor', 'viewer');

-- CreateEnum: PlaceRole
CREATE TYPE "PlaceRole" AS ENUM ('owner', 'manager', 'editor');

-- AlterTable: Add createdByUserId to Event
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;

-- CreateIndex: Event.createdByUserId
CREATE INDEX IF NOT EXISTS "Event_createdByUserId_idx" ON "Event"("createdByUserId");

-- AddForeignKey: Event.createdByUserId -> User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Event_createdByUserId_fkey'
    ) THEN
        ALTER TABLE "Event" ADD CONSTRAINT "Event_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable: TenantMembership
CREATE TABLE IF NOT EXISTS "TenantMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'editor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: TenantMembership indexes
CREATE UNIQUE INDEX IF NOT EXISTS "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "TenantMembership_userId_idx" ON "TenantMembership"("userId");
CREATE INDEX IF NOT EXISTS "TenantMembership_tenantId_idx" ON "TenantMembership"("tenantId");
CREATE INDEX IF NOT EXISTS "TenantMembership_role_idx" ON "TenantMembership"("role");

-- AddForeignKey: TenantMembership.tenantId -> Tenant.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TenantMembership_tenantId_fkey'
    ) THEN
        ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: TenantMembership.userId -> User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TenantMembership_userId_fkey'
    ) THEN
        ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable: PlaceMembership
CREATE TABLE IF NOT EXISTS "PlaceMembership" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PlaceRole" NOT NULL DEFAULT 'editor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: PlaceMembership indexes
CREATE UNIQUE INDEX IF NOT EXISTS "PlaceMembership_placeId_userId_key" ON "PlaceMembership"("placeId", "userId");
CREATE INDEX IF NOT EXISTS "PlaceMembership_userId_idx" ON "PlaceMembership"("userId");
CREATE INDEX IF NOT EXISTS "PlaceMembership_placeId_idx" ON "PlaceMembership"("placeId");
CREATE INDEX IF NOT EXISTS "PlaceMembership_role_idx" ON "PlaceMembership"("role");

-- AddForeignKey: PlaceMembership.placeId -> Place.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PlaceMembership_placeId_fkey'
    ) THEN
        ALTER TABLE "PlaceMembership" ADD CONSTRAINT "PlaceMembership_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: PlaceMembership.userId -> User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PlaceMembership_userId_fkey'
    ) THEN
        ALTER TABLE "PlaceMembership" ADD CONSTRAINT "PlaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

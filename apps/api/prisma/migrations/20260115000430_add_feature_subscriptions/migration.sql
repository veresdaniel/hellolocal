-- CreateEnum
CREATE TYPE "FeatureSubscriptionScope" AS ENUM ('place', 'site');

-- CreateEnum
CREATE TYPE "FeatureSubscriptionStatus" AS ENUM ('active', 'past_due', 'canceled');

-- CreateEnum
CREATE TYPE "FeatureKey" AS ENUM ('FLOORPLANS');

-- CreateTable
CREATE TABLE "FeatureSubscription" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "scope" "FeatureSubscriptionScope" NOT NULL,
    "placeId" TEXT,
    "featureKey" "FeatureKey" NOT NULL,
    "planKey" TEXT NOT NULL,
    "billingPeriod" "BillingPeriod" NOT NULL,
    "floorplanLimit" INTEGER,
    "status" "FeatureSubscriptionStatus" NOT NULL,
    "stripeSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceFloorplan" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Floorplan',
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaceFloorplan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FloorplanPin" (
    "id" TEXT NOT NULL,
    "floorplanId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloorplanPin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureSubscription_siteId_idx" ON "FeatureSubscription"("siteId");

-- CreateIndex
CREATE INDEX "FeatureSubscription_placeId_idx" ON "FeatureSubscription"("placeId");

-- CreateIndex
CREATE INDEX "FeatureSubscription_scope_siteId_idx" ON "FeatureSubscription"("scope", "siteId");

-- CreateIndex
CREATE INDEX "FeatureSubscription_scope_placeId_idx" ON "FeatureSubscription"("scope", "placeId");

-- CreateIndex
CREATE INDEX "FeatureSubscription_featureKey_scope_idx" ON "FeatureSubscription"("featureKey", "scope");

-- CreateIndex
CREATE INDEX "FeatureSubscription_status_idx" ON "FeatureSubscription"("status");

-- CreateIndex
CREATE INDEX "PlaceFloorplan_placeId_idx" ON "PlaceFloorplan"("placeId");

-- CreateIndex
CREATE INDEX "PlaceFloorplan_placeId_sortOrder_idx" ON "PlaceFloorplan"("placeId", "sortOrder");

-- CreateIndex
CREATE INDEX "FloorplanPin_floorplanId_idx" ON "FloorplanPin"("floorplanId");

-- CreateIndex
CREATE INDEX "FloorplanPin_floorplanId_sortOrder_idx" ON "FloorplanPin"("floorplanId", "sortOrder");

-- AddForeignKey
ALTER TABLE "FeatureSubscription" ADD CONSTRAINT "FeatureSubscription_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureSubscription" ADD CONSTRAINT "FeatureSubscription_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceFloorplan" ADD CONSTRAINT "PlaceFloorplan_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloorplanPin" ADD CONSTRAINT "FloorplanPin_floorplanId_fkey" FOREIGN KEY ("floorplanId") REFERENCES "PlaceFloorplan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

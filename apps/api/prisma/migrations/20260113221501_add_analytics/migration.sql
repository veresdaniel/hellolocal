-- CreateTable
CREATE TABLE "AnalyticsDaily" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT NOT NULL,
    "placeId" TEXT,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "placeViews" INTEGER NOT NULL DEFAULT 0,
    "ctaPhone" INTEGER NOT NULL DEFAULT 0,
    "ctaEmail" INTEGER NOT NULL DEFAULT 0,
    "ctaWebsite" INTEGER NOT NULL DEFAULT 0,
    "ctaMaps" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsDaily_siteId_day_idx" ON "AnalyticsDaily"("siteId", "day");

-- CreateIndex
CREATE INDEX "AnalyticsDaily_placeId_day_idx" ON "AnalyticsDaily"("placeId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsDaily_day_siteId_placeId_key" ON "AnalyticsDaily"("day", "siteId", "placeId");

-- AddForeignKey
ALTER TABLE "AnalyticsDaily" ADD CONSTRAINT "AnalyticsDaily_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsDaily" ADD CONSTRAINT "AnalyticsDaily_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

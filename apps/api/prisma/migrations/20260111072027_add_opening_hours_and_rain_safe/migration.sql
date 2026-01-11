-- CreateTable
CREATE TABLE "PlaceOpeningHours" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "openTime" TEXT,
    "closeTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaceOpeningHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaceOpeningHours_placeId_idx" ON "PlaceOpeningHours"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceOpeningHours_placeId_dayOfWeek_key" ON "PlaceOpeningHours"("placeId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "PlaceOpeningHours" ADD CONSTRAINT "PlaceOpeningHours_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (Add isRainSafe to Event)
ALTER TABLE "Event" ADD COLUMN "isRainSafe" BOOLEAN NOT NULL DEFAULT false;

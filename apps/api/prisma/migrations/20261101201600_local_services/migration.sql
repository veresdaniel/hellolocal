-- Local services are a category kind, and each one can belong to a place such as a town.
CREATE TYPE "CategoryKind" AS ENUM ('place', 'service');

ALTER TABLE "Category" ADD COLUMN "kind" "CategoryKind" NOT NULL DEFAULT 'place';
ALTER TABLE "Place" ADD COLUMN "parentPlaceId" TEXT;

CREATE INDEX "Place_parentPlaceId_idx" ON "Place"("parentPlaceId");

ALTER TABLE "Place" ADD CONSTRAINT "Place_parentPlaceId_fkey" FOREIGN KEY ("parentPlaceId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

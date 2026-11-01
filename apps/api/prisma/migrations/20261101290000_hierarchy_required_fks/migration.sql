-- Hierarchy FK hardening:
-- Site (régió) → Town (település) → Place (hely) → Event / Gallery / Product
-- Tags stay site-catalog + PlaceTag / EventTag assignments.

-- 1) Backfill Place.townId from the site's oldest town when missing
UPDATE "Place" p
SET "townId" = t.id
FROM (
  SELECT DISTINCT ON ("siteId") id, "siteId"
  FROM "Town"
  ORDER BY "siteId", "createdAt" ASC
) t
WHERE p."townId" IS NULL
  AND p."siteId" = t."siteId";

-- 2) Backfill Gallery.placeId from Event when only eventId is set
UPDATE "Gallery" g
SET "placeId" = e."placeId"
FROM "Event" e
WHERE g."placeId" IS NULL
  AND g."eventId" = e.id
  AND e."placeId" IS NOT NULL;

-- 3) Backfill ProductClickDaily.placeId from Product
UPDATE "ProductClickDaily" c
SET "placeId" = p."placeId"
FROM "Product" p
WHERE c."placeId" IS NULL
  AND c."productId" = p.id
  AND p."placeId" IS NOT NULL;

-- Drop rows that still cannot satisfy required FKs (orphans)
DELETE FROM "ProductClickDaily" WHERE "placeId" IS NULL;
DELETE FROM "Product" WHERE "placeId" IS NULL;
DELETE FROM "Gallery" WHERE "placeId" IS NULL;
DELETE FROM "Event" WHERE "placeId" IS NULL;
-- Places without a town cannot be kept once townId is required
DELETE FROM "Place" WHERE "townId" IS NULL;

-- Place.townId: SetNull → Restrict, NOT NULL
ALTER TABLE "Place" DROP CONSTRAINT IF EXISTS "Place_townId_fkey";
ALTER TABLE "Place" ALTER COLUMN "townId" SET NOT NULL;
ALTER TABLE "Place"
  ADD CONSTRAINT "Place_townId_fkey"
  FOREIGN KEY ("townId") REFERENCES "Town"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Product.placeId: SetNull → Cascade, NOT NULL
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_placeId_fkey";
ALTER TABLE "Product" ALTER COLUMN "placeId" SET NOT NULL;
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_placeId_fkey"
  FOREIGN KEY ("placeId") REFERENCES "Place"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Event.placeId: SetNull → Cascade, NOT NULL
ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS "Event_placeId_fkey";
ALTER TABLE "Event" ALTER COLUMN "placeId" SET NOT NULL;
ALTER TABLE "Event"
  ADD CONSTRAINT "Event_placeId_fkey"
  FOREIGN KEY ("placeId") REFERENCES "Place"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Gallery.placeId: optional → required Cascade
ALTER TABLE "Gallery" DROP CONSTRAINT IF EXISTS "Gallery_placeId_fkey";
ALTER TABLE "Gallery" ALTER COLUMN "placeId" SET NOT NULL;
ALTER TABLE "Gallery"
  ADD CONSTRAINT "Gallery_placeId_fkey"
  FOREIGN KEY ("placeId") REFERENCES "Place"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ProductClickDaily.placeId: optional → required Cascade
ALTER TABLE "ProductClickDaily" DROP CONSTRAINT IF EXISTS "ProductClickDaily_placeId_fkey";
ALTER TABLE "ProductClickDaily" ALTER COLUMN "placeId" SET NOT NULL;
ALTER TABLE "ProductClickDaily"
  ADD CONSTRAINT "ProductClickDaily_placeId_fkey"
  FOREIGN KEY ("placeId") REFERENCES "Place"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

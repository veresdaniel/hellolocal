-- Events in the public list had no coordinates, so the map omitted them.
-- Copy the parent place pin onto events that do not have their own.
UPDATE "Event" AS e
SET "lat" = p."lat",
    "lng" = p."lng"
FROM "Place" AS p
WHERE e."placeId" = p."id"
  AND (e."lat" IS NULL OR e."lng" IS NULL)
  AND p."lat" IS NOT NULL
  AND p."lng" IS NOT NULL;

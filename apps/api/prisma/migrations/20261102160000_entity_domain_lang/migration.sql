-- Language next to a custom hostname, and an optional hostname for events.
ALTER TABLE "Place" ADD COLUMN "domainLang" VARCHAR(8);
ALTER TABLE "Town" ADD COLUMN "domainLang" VARCHAR(8);
ALTER TABLE "Collection" ADD COLUMN "domainLang" VARCHAR(8);
ALTER TABLE "Event" ADD COLUMN "customDomain" TEXT;
ALTER TABLE "Event" ADD COLUMN "domainLang" VARCHAR(8);
CREATE UNIQUE INDEX "Event_customDomain_key" ON "Event"("customDomain");

CREATE OR REPLACE FUNCTION public.hostname_taken(host text, src text, row_id text, owner_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "SiteDomain" d
    WHERE d.domain = host
      AND NOT (src = 'SiteDomain' AND d.id = row_id)
      AND NOT (src = 'Site' AND d."siteId" = row_id)
    UNION ALL
    SELECT 1 FROM "Site" s
    WHERE s."primaryDomain" = host
      AND NOT (src = 'Site' AND s.id = row_id)
      AND NOT (src = 'SiteDomain' AND s.id = owner_id)
    UNION ALL
    SELECT 1 FROM "Town" t
    WHERE t."customDomain" = host AND NOT (src = 'Town' AND t.id = row_id)
    UNION ALL
    SELECT 1 FROM "Place" p
    WHERE p."customDomain" = host AND NOT (src = 'Place' AND p.id = row_id)
    UNION ALL
    SELECT 1 FROM "Event" e
    WHERE e."customDomain" = host AND NOT (src = 'Event' AND e.id = row_id)
    UNION ALL
    SELECT 1 FROM "CountryDomain" c
    WHERE c.domain = host
      AND NOT (src = 'CountryDomain' AND c.id = row_id)
      AND NOT (src = 'Country' AND c."countryId" = row_id)
    UNION ALL
    SELECT 1 FROM "Country" c
    WHERE c."primaryDomain" = host
      AND NOT (src = 'Country' AND c.id = row_id)
      AND NOT (src = 'CountryDomain' AND c.id = owner_id)
    UNION ALL
    SELECT 1 FROM "Collection" c
    WHERE c.domain = host AND NOT (src = 'Collection' AND c.id = row_id)
  );
$$;

CREATE TRIGGER "Event_hostname" BEFORE INSERT OR UPDATE OF "customDomain" ON "Event"
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hostname_unique();

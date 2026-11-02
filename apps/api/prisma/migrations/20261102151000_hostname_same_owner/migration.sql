-- A region keeps the same host on Site.primaryDomain and in its own SiteDomain row.
-- The same is true for a country and CountryDomain. Those mirrors are one owner, not a clash.
CREATE OR REPLACE FUNCTION public.hostname_taken(host text, src text, row_id text)
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
      AND NOT (
        src = 'SiteDomain'
        AND s.id = (SELECT d."siteId" FROM "SiteDomain" d WHERE d.id = row_id)
      )
    UNION ALL
    SELECT 1 FROM "Town" t
    WHERE t."customDomain" = host AND NOT (src = 'Town' AND t.id = row_id)
    UNION ALL
    SELECT 1 FROM "Place" p
    WHERE p."customDomain" = host AND NOT (src = 'Place' AND p.id = row_id)
    UNION ALL
    SELECT 1 FROM "CountryDomain" c
    WHERE c.domain = host
      AND NOT (src = 'CountryDomain' AND c.id = row_id)
      AND NOT (src = 'Country' AND c."countryId" = row_id)
    UNION ALL
    SELECT 1 FROM "Country" c
    WHERE c."primaryDomain" = host
      AND NOT (src = 'Country' AND c.id = row_id)
      AND NOT (
        src = 'CountryDomain'
        AND c.id = (SELECT d."countryId" FROM "CountryDomain" d WHERE d.id = row_id)
      )
    UNION ALL
    SELECT 1 FROM "Collection" c
    WHERE c.domain = host AND NOT (src = 'Collection' AND c.id = row_id)
  );
$$;

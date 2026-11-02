-- The child domain row is not visible yet during BEFORE INSERT, so the parent id
-- has to be passed in. A region's or country's own mirror is still one owner.
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

CREATE OR REPLACE FUNCTION public.enforce_hostname_unique()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  host text;
  owner_id text;
BEGIN
  IF TG_TABLE_NAME IN ('SiteDomain', 'CountryDomain', 'Collection') THEN
    host := NULLIF(lower(btrim(COALESCE(NEW.domain, ''))), '');
    IF host IS NOT NULL THEN
      NEW.domain := host;
    END IF;
  ELSIF TG_TABLE_NAME IN ('Site', 'Country') THEN
    host := NULLIF(lower(btrim(COALESCE(NEW."primaryDomain", ''))), '');
    IF host IS NOT NULL THEN
      NEW."primaryDomain" := host;
    END IF;
  ELSE
    host := NULLIF(lower(btrim(COALESCE(NEW."customDomain", ''))), '');
    IF host IS NOT NULL THEN
      NEW."customDomain" := host;
    END IF;
  END IF;
  IF host IS NULL THEN
    RETURN NEW;
  END IF;
  owner_id := CASE
    WHEN TG_TABLE_NAME = 'SiteDomain' THEN NEW."siteId"
    WHEN TG_TABLE_NAME = 'CountryDomain' THEN NEW."countryId"
    ELSE NEW.id
  END;
  IF public.hostname_taken(host, TG_TABLE_NAME, COALESCE(NEW.id, ''), owner_id) THEN
    RAISE EXCEPTION 'hostname % is already in use', host USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION public.hostname_taken(text, text, text);

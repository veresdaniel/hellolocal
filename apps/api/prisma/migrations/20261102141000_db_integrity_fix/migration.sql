-- A check passes on NULL, so a missing latitude with a stored longitude was allowed.
ALTER TABLE "Site" DROP CONSTRAINT "Site_coords";
ALTER TABLE "Town" DROP CONSTRAINT "Town_coords";
ALTER TABLE "Place" DROP CONSTRAINT "Place_coords";
ALTER TABLE "Event" DROP CONSTRAINT "Event_coords";

ALTER TABLE "Site" ADD CONSTRAINT "Site_coords" CHECK (
  (lat IS NULL AND lng IS NULL)
  OR (lat IS NOT NULL AND lng IS NOT NULL AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
);
ALTER TABLE "Town" ADD CONSTRAINT "Town_coords" CHECK (
  (lat IS NULL AND lng IS NULL)
  OR (lat IS NOT NULL AND lng IS NOT NULL AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
);
ALTER TABLE "Place" ADD CONSTRAINT "Place_coords" CHECK (
  (lat IS NULL AND lng IS NULL)
  OR (lat IS NOT NULL AND lng IS NOT NULL AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
);
ALTER TABLE "Event" ADD CONSTRAINT "Event_coords" CHECK (
  (lat IS NULL AND lng IS NULL)
  OR (lat IS NOT NULL AND lng IS NOT NULL AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
);

-- Read only the hostname column that exists on the table being written.
CREATE OR REPLACE FUNCTION public.enforce_hostname_unique()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  host text;
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
  IF public.hostname_taken(host, TG_TABLE_NAME, COALESCE(NEW.id, '')) THEN
    RAISE EXCEPTION 'hostname % is already in use', host USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

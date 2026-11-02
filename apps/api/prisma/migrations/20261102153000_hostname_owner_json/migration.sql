-- The shared trigger runs on every hostname table. Reading NEW."siteId" fails
-- on tables that do not have that column, even inside an untaken CASE branch.
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
  owner_id := COALESCE(to_jsonb(NEW)->>'siteId', to_jsonb(NEW)->>'countryId', NEW.id);
  IF public.hostname_taken(host, TG_TABLE_NAME, COALESCE(NEW.id, ''), owner_id) THEN
    RAISE EXCEPTION 'hostname % is already in use', host USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

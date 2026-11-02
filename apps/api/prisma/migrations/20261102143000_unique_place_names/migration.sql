-- Same place name: case, repeated spaces, and hyphen versus dash do not make a second record.
CREATE OR REPLACE FUNCTION public.normalized_place_name(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(btrim(COALESCE(raw, '')), '[–—−]', '-', 'g'),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.town_name_conflict(town_id text, name text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.normalized_place_name(name) <> '' AND EXISTS (
    SELECT 1
    FROM "TownTranslation" tr
    JOIN "Town" other ON other.id = tr."townId"
    JOIN "Town" mine ON mine.id = town_id
    LEFT JOIN "Site" other_site ON other_site.id = other."siteId"
    LEFT JOIN "Site" my_site ON my_site.id = mine."siteId"
    WHERE tr."townId" <> town_id
      AND public.normalized_place_name(tr.name) = public.normalized_place_name(name)
      AND (
        (mine."siteId" IS NULL AND other."siteId" IS NULL)
        OR (my_site."countryId" IS NOT NULL AND other_site."countryId" = my_site."countryId")
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.region_name_conflict(site_id text, name text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.normalized_place_name(name) <> '' AND EXISTS (
    SELECT 1
    FROM "SiteTranslation" tr
    JOIN "Site" other ON other.id = tr."siteId"
    JOIN "Site" mine ON mine.id = site_id
    WHERE other.id <> site_id
      AND other."countryId" = mine."countryId"
      AND public.normalized_place_name(tr.name) = public.normalized_place_name(name)
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_town_name_unique()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.town_name_conflict(NEW."townId", NEW.name) THEN
    RAISE EXCEPTION 'duplicate town name: %', NEW.name USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_region_name_unique()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.region_name_conflict(NEW."siteId", NEW.name) THEN
    RAISE EXCEPTION 'duplicate region name: %', NEW.name USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_town_names_after_move()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tr record;
BEGIN
  IF NEW."siteId" IS NOT DISTINCT FROM OLD."siteId" THEN
    RETURN NEW;
  END IF;
  FOR tr IN SELECT name FROM "TownTranslation" WHERE "townId" = NEW.id LOOP
    IF public.town_name_conflict(NEW.id, tr.name) THEN
      RAISE EXCEPTION 'duplicate town name: %', tr.name USING ERRCODE = 'unique_violation';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_region_names_after_country_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tr record;
BEGIN
  IF NEW."countryId" IS NOT DISTINCT FROM OLD."countryId" THEN
    RETURN NEW;
  END IF;
  FOR tr IN SELECT name FROM "SiteTranslation" WHERE "siteId" = NEW.id LOOP
    IF public.region_name_conflict(NEW.id, tr.name) THEN
      RAISE EXCEPTION 'duplicate region name: %', tr.name USING ERRCODE = 'unique_violation';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "TownTranslation_unique_name"
  BEFORE INSERT OR UPDATE OF name, lang, "townId" ON "TownTranslation"
  FOR EACH ROW EXECUTE FUNCTION public.enforce_town_name_unique();

CREATE TRIGGER "SiteTranslation_unique_name"
  BEFORE INSERT OR UPDATE OF name, "siteId" ON "SiteTranslation"
  FOR EACH ROW EXECUTE FUNCTION public.enforce_region_name_unique();

CREATE TRIGGER "Town_unique_name_on_move"
  AFTER UPDATE OF "siteId" ON "Town"
  FOR EACH ROW EXECUTE FUNCTION public.enforce_town_names_after_move();

CREATE TRIGGER "Site_unique_name_on_country"
  AFTER UPDATE OF "countryId" ON "Site"
  FOR EACH ROW EXECUTE FUNCTION public.enforce_region_names_after_country_change();

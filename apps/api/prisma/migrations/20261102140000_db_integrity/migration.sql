-- Region map frame lives on Site. Town.zoom still overrides it.
ALTER TABLE "Site" ADD COLUMN "lat" DOUBLE PRECISION,
ADD COLUMN "lng" DOUBLE PRECISION,
ADD COLUMN "zoom" DOUBLE PRECISION;

UPDATE "Site" AS s
SET
  lat = NULLIF(i."mapConfig"->>'lat', '')::double precision,
  lng = NULLIF(i."mapConfig"->>'lng', '')::double precision,
  zoom = NULLIF(i."mapConfig"->>'zoom', '')::double precision
FROM "SiteInstance" AS i
WHERE i."siteId" = s.id
  AND i."isDefault" = true
  AND i."mapConfig" IS NOT NULL;

ALTER TABLE "Site" ADD CONSTRAINT "Site_coords" CHECK (
  (lat IS NULL AND lng IS NULL)
  OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
);
ALTER TABLE "Site" ADD CONSTRAINT "Site_zoom_range" CHECK (
  zoom IS NULL OR (zoom >= 1 AND zoom <= 20)
);
ALTER TABLE "Town" ADD CONSTRAINT "Town_coords" CHECK (
  (lat IS NULL AND lng IS NULL)
  OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
);
ALTER TABLE "Town" ADD CONSTRAINT "Town_zoom_range" CHECK (
  zoom IS NULL OR (zoom >= 1 AND zoom <= 20)
);
ALTER TABLE "Place" ADD CONSTRAINT "Place_coords" CHECK (
  (lat IS NULL AND lng IS NULL)
  OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
);
ALTER TABLE "Event" ADD CONSTRAINT "Event_coords" CHECK (
  (lat IS NULL AND lng IS NULL)
  OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
);

-- One site-level analytics row per day. Null placeId does not collide in a plain unique key.
CREATE UNIQUE INDEX "AnalyticsDaily_day_site_when_no_place"
  ON "AnalyticsDaily" ("day", "siteId")
  WHERE "placeId" IS NULL;

CREATE UNIQUE INDEX "SiteInstance_one_default"
  ON "SiteInstance" ("siteId")
  WHERE "isDefault" = true;

CREATE UNIQUE INDEX "SiteDomain_one_primary"
  ON "SiteDomain" ("siteId")
  WHERE "isPrimary" = true AND "isActive" = true;

CREATE UNIQUE INDEX "CountryDomain_one_primary"
  ON "CountryDomain" ("countryId")
  WHERE "isPrimary" = true AND "isActive" = true;

ALTER TABLE "PlaceSignup"
  ADD CONSTRAINT "PlaceSignup_placeId_fkey"
  FOREIGN KEY ("placeId") REFERENCES "Place"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SubscriptionHistory"
  ADD CONSTRAINT "SubscriptionHistory_changedBy_fkey"
  FOREIGN KEY ("changedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- A hostname can belong to only one country, region, town, place, or collection.
CREATE OR REPLACE FUNCTION public.hostname_taken(host text, src text, row_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "SiteDomain" d
    WHERE d.domain = host AND NOT (src = 'SiteDomain' AND d.id = row_id)
    UNION ALL
    SELECT 1 FROM "Site" s
    WHERE s."primaryDomain" = host AND NOT (src = 'Site' AND s.id = row_id)
    UNION ALL
    SELECT 1 FROM "Town" t
    WHERE t."customDomain" = host AND NOT (src = 'Town' AND t.id = row_id)
    UNION ALL
    SELECT 1 FROM "Place" p
    WHERE p."customDomain" = host AND NOT (src = 'Place' AND p.id = row_id)
    UNION ALL
    SELECT 1 FROM "CountryDomain" c
    WHERE c.domain = host AND NOT (src = 'CountryDomain' AND c.id = row_id)
    UNION ALL
    SELECT 1 FROM "Country" c
    WHERE c."primaryDomain" = host AND NOT (src = 'Country' AND c.id = row_id)
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
BEGIN
  host := NULLIF(lower(btrim(COALESCE(
    CASE
      WHEN TG_TABLE_NAME IN ('SiteDomain', 'CountryDomain', 'Collection') THEN NEW.domain
      WHEN TG_TABLE_NAME IN ('Site', 'Country') THEN NEW."primaryDomain"
      ELSE NEW."customDomain"
    END,
    ''
  ))), '');
  IF host IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME IN ('SiteDomain', 'CountryDomain', 'Collection') THEN
    NEW.domain := host;
  ELSIF TG_TABLE_NAME IN ('Site', 'Country') THEN
    NEW."primaryDomain" := host;
  ELSE
    NEW."customDomain" := host;
  END IF;
  IF public.hostname_taken(host, TG_TABLE_NAME, COALESCE(NEW.id, '')) THEN
    RAISE EXCEPTION 'hostname % is already in use', host USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Site_hostname" BEFORE INSERT OR UPDATE OF "primaryDomain" ON "Site"
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hostname_unique();
CREATE TRIGGER "SiteDomain_hostname" BEFORE INSERT OR UPDATE OF domain ON "SiteDomain"
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hostname_unique();
CREATE TRIGGER "Town_hostname" BEFORE INSERT OR UPDATE OF "customDomain" ON "Town"
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hostname_unique();
CREATE TRIGGER "Place_hostname" BEFORE INSERT OR UPDATE OF "customDomain" ON "Place"
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hostname_unique();
CREATE TRIGGER "Country_hostname" BEFORE INSERT OR UPDATE OF "primaryDomain" ON "Country"
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hostname_unique();
CREATE TRIGGER "CountryDomain_hostname" BEFORE INSERT OR UPDATE OF domain ON "CountryDomain"
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hostname_unique();
CREATE TRIGGER "Collection_hostname" BEFORE INSERT OR UPDATE OF domain ON "Collection"
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hostname_unique();

-- A place under a regioned town uses that town's region. Events, products, and galleries follow the place.
CREATE OR REPLACE FUNCTION public.place_site_matches_town()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  town_site text;
BEGIN
  SELECT "siteId" INTO town_site FROM "Town" WHERE id = NEW."townId";
  IF town_site IS NOT NULL AND NEW."siteId" IS DISTINCT FROM town_site THEN
    RAISE EXCEPTION 'Place region must match its town region';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.child_site_matches_place()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  place_site text;
BEGIN
  SELECT "siteId" INTO place_site FROM "Place" WHERE id = NEW."placeId";
  IF place_site IS NOT NULL AND NEW."siteId" IS DISTINCT FROM place_site THEN
    RAISE EXCEPTION 'Region must match the place region';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.place_region_cascades()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."siteId" IS DISTINCT FROM OLD."siteId" THEN
    UPDATE "Event" SET "siteId" = NEW."siteId" WHERE "placeId" = NEW.id AND "siteId" IS DISTINCT FROM NEW."siteId";
    UPDATE "Product" SET "siteId" = NEW."siteId" WHERE "placeId" = NEW.id AND "siteId" IS DISTINCT FROM NEW."siteId";
    UPDATE "Gallery" SET "siteId" = NEW."siteId" WHERE "placeId" = NEW.id AND "siteId" IS DISTINCT FROM NEW."siteId";
    UPDATE "ProductClickDaily" SET "siteId" = NEW."siteId" WHERE "placeId" = NEW.id AND "siteId" IS DISTINCT FROM NEW."siteId";
    UPDATE "AnalyticsDaily" SET "siteId" = NEW."siteId" WHERE "placeId" = NEW.id AND "siteId" IS DISTINCT FROM NEW."siteId";
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.town_region_cascades()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."siteId" IS NOT NULL AND NEW."siteId" IS DISTINCT FROM OLD."siteId" THEN
    UPDATE "Place" SET "siteId" = NEW."siteId" WHERE "townId" = NEW.id AND "siteId" IS DISTINCT FROM NEW."siteId";
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Place_site_matches_town" BEFORE INSERT OR UPDATE OF "siteId", "townId" ON "Place"
  FOR EACH ROW EXECUTE FUNCTION public.place_site_matches_town();
CREATE TRIGGER "Place_region_cascades" AFTER UPDATE OF "siteId" ON "Place"
  FOR EACH ROW EXECUTE FUNCTION public.place_region_cascades();
CREATE TRIGGER "Town_region_cascades" AFTER UPDATE OF "siteId" ON "Town"
  FOR EACH ROW EXECUTE FUNCTION public.town_region_cascades();
CREATE TRIGGER "Event_site_matches_place" BEFORE INSERT OR UPDATE OF "siteId", "placeId" ON "Event"
  FOR EACH ROW EXECUTE FUNCTION public.child_site_matches_place();
CREATE TRIGGER "Product_site_matches_place" BEFORE INSERT OR UPDATE OF "siteId", "placeId" ON "Product"
  FOR EACH ROW EXECUTE FUNCTION public.child_site_matches_place();
CREATE TRIGGER "Gallery_site_matches_place" BEFORE INSERT OR UPDATE OF "siteId", "placeId" ON "Gallery"
  FOR EACH ROW EXECUTE FUNCTION public.child_site_matches_place();

-- Subscription plan is the billing source. Site.plan mirrors it, except FREE which has no site label.
CREATE OR REPLACE FUNCTION public.sync_site_plan_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  mapped text;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  mapped := CASE NEW.plan
    WHEN 'BASIC' THEN 'basic'
    WHEN 'PRO' THEN 'pro'
    WHEN 'BUSINESS' THEN 'business'
    WHEN 'MUNICIPAL' THEN 'municipal'
    ELSE NULL
  END;
  IF mapped IS NOT NULL THEN
    UPDATE "Site"
    SET plan = mapped::"SitePlan"
    WHERE id = NEW."siteId" AND plan::text IS DISTINCT FROM mapped;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_subscription_from_site_plan()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  mapped text;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  mapped := CASE NEW.plan::text
    WHEN 'basic' THEN 'BASIC'
    WHEN 'pro' THEN 'PRO'
    WHEN 'business' THEN 'BUSINESS'
    WHEN 'municipal' THEN 'MUNICIPAL'
    ELSE NULL
  END;
  IF mapped IS NOT NULL THEN
    UPDATE "SiteSubscription"
    SET plan = mapped::"SubscriptionPlan"
    WHERE "siteId" = NEW.id AND plan::text IS DISTINCT FROM mapped;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "SiteSubscription_sync_site_plan" AFTER INSERT OR UPDATE OF plan ON "SiteSubscription"
  FOR EACH ROW EXECUTE FUNCTION public.sync_site_plan_from_subscription();
CREATE TRIGGER "Site_sync_subscription_plan" AFTER UPDATE OF plan ON "Site"
  FOR EACH ROW EXECUTE FUNCTION public.sync_subscription_from_site_plan();

-- Data migration script: Migrate AppSetting data to Brand and SiteInstance tables
-- This script should be run AFTER the schema migration

-- Step 1: Create a Brand for each tenant
-- Collect all unique tenant IDs from AppSetting keys
DO $$
DECLARE
    tenant_record RECORD;
    brand_id TEXT;
    tenant_brand_map JSONB := '{}'::JSONB;
BEGIN
    -- Find all unique tenant IDs from AppSetting keys
    FOR tenant_record IN 
        SELECT DISTINCT 
            SUBSTRING(key FROM '_(hu|en|de)_(.+)$') AS tenant_id
        FROM "AppSetting"
        WHERE key LIKE 'siteName_%' OR key LIKE 'siteDescription_%' OR key LIKE 'seoTitle_%' OR key LIKE 'seoDescription_%'
        UNION
        SELECT DISTINCT 
            SUBSTRING(key FROM '_(.+)$') AS tenant_id
        FROM "AppSetting"
        WHERE key LIKE 'faviconUrl_%' OR key LIKE 'defaultPlaceholderCardImage_%' OR key LIKE 'defaultPlaceholderDetailHeroImage_%' 
           OR key LIKE 'defaultEventPlaceholderCardImage_%' OR key LIKE 'brandBadgeIcon_%'
           OR key LIKE 'mapDefaultTownId_%' OR key LIKE 'mapDefaultLat_%' OR key LIKE 'mapDefaultLng_%' OR key LIKE 'mapDefaultZoom_%'
    LOOP
        -- Skip if tenant_id is null or empty
        IF tenant_record.tenant_id IS NULL OR tenant_record.tenant_id = '' THEN
            CONTINUE;
        END IF;

        -- Check if tenant exists
        IF EXISTS (SELECT 1 FROM "Tenant" WHERE id = tenant_record.tenant_id) THEN
            -- Check if brand already created for this tenant
            IF NOT (tenant_brand_map ? tenant_record.tenant_id) THEN
                -- Get tenant name for brand name
                DECLARE
                    tenant_name TEXT;
                BEGIN
                    SELECT name INTO tenant_name 
                    FROM "TenantTranslation" 
                    WHERE "tenantId" = tenant_record.tenant_id 
                    ORDER BY lang 
                    LIMIT 1;
                    
                    IF tenant_name IS NULL THEN
                        tenant_name := 'Brand for ' || tenant_record.tenant_id;
                    END IF;

                    -- Create brand
                    brand_id := gen_random_uuid()::TEXT;
                    INSERT INTO "Brand" (id, name, "logoUrl", "faviconUrl", theme, placeholders, "mapDefaults", "createdAt", "updatedAt")
                    VALUES (
                        brand_id,
                        tenant_name,
                        NULL,
                        (SELECT value FROM "AppSetting" WHERE key = 'faviconUrl_' || tenant_record.tenant_id LIMIT 1),
                        NULL,
                        jsonb_build_object(
                            'defaultPlaceholderCardImage', (SELECT value FROM "AppSetting" WHERE key = 'defaultPlaceholderCardImage_' || tenant_record.tenant_id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
                            'defaultPlaceholderDetailHeroImage', (SELECT value FROM "AppSetting" WHERE key = 'defaultPlaceholderDetailHeroImage_' || tenant_record.tenant_id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
                            'defaultEventPlaceholderCardImage', (SELECT value FROM "AppSetting" WHERE key = 'defaultEventPlaceholderCardImage_' || tenant_record.tenant_id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
                            'brandBadgeIcon', (SELECT value FROM "AppSetting" WHERE key = 'brandBadgeIcon_' || tenant_record.tenant_id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1)
                        ),
                        jsonb_build_object(
                            'townId', (SELECT value FROM "AppSetting" WHERE key = 'mapDefaultTownId_' || tenant_record.tenant_id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
                            'lat', (SELECT CASE WHEN value ~ '^-?[0-9]+\.?[0-9]*$' THEN value::FLOAT ELSE NULL END FROM "AppSetting" WHERE key = 'mapDefaultLat_' || tenant_record.tenant_id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
                            'lng', (SELECT CASE WHEN value ~ '^-?[0-9]+\.?[0-9]*$' THEN value::FLOAT ELSE NULL END FROM "AppSetting" WHERE key = 'mapDefaultLng_' || tenant_record.tenant_id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
                            'zoom', (SELECT CASE WHEN value ~ '^-?[0-9]+\.?[0-9]*$' THEN value::FLOAT ELSE NULL END FROM "AppSetting" WHERE key = 'mapDefaultZoom_' || tenant_record.tenant_id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1)
                        ),
                        NOW(),
                        NOW()
                    );

                    -- Store mapping
                    tenant_brand_map := tenant_brand_map || jsonb_build_object(tenant_record.tenant_id, brand_id);
                END;
            END IF;
        END IF;
    END LOOP;
END $$;

-- Step 2: Update Tenant.brandId for all tenants
-- For each tenant, find or create a brand and assign it
DO $$
DECLARE
    tenant_record RECORD;
    brand_record RECORD;
    brand_id TEXT;
BEGIN
    FOR tenant_record IN SELECT id, slug FROM "Tenant" WHERE "brandId" IS NULL
    LOOP
        -- Try to find existing brand (by matching tenant name or creating new)
        SELECT id INTO brand_id FROM "Brand" WHERE name LIKE '%' || tenant_record.slug || '%' LIMIT 1;
        
        IF brand_id IS NULL THEN
            -- Create new brand
            DECLARE
                tenant_name TEXT;
            BEGIN
                SELECT name INTO tenant_name 
                FROM "TenantTranslation" 
                WHERE "tenantId" = tenant_record.id 
                ORDER BY lang 
                LIMIT 1;
                
                IF tenant_name IS NULL THEN
                    tenant_name := 'Brand for ' || tenant_record.slug;
                END IF;

                brand_id := gen_random_uuid()::TEXT;
                INSERT INTO "Brand" (id, name, "logoUrl", "faviconUrl", theme, placeholders, "mapDefaults", "createdAt", "updatedAt")
                VALUES (
                    brand_id,
                    tenant_name,
                    NULL,
                    (SELECT value FROM "AppSetting" WHERE key = 'faviconUrl_' || tenant_record.id LIMIT 1),
                    NULL,
                    jsonb_build_object(
                        'defaultPlaceholderCardImage', (SELECT value FROM "AppSetting" WHERE key = 'defaultPlaceholderCardImage_' || tenant_record.id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
                        'defaultPlaceholderDetailHeroImage', (SELECT value FROM "AppSetting" WHERE key = 'defaultPlaceholderDetailHeroImage_' || tenant_record.id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
                        'defaultEventPlaceholderCardImage', (SELECT value FROM "AppSetting" WHERE key = 'defaultEventPlaceholderCardImage_' || tenant_record.id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
                        'brandBadgeIcon', (SELECT value FROM "AppSetting" WHERE key = 'brandBadgeIcon_' || tenant_record.id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1)
                    ),
                    jsonb_build_object(
                        'townId', (SELECT value FROM "AppSetting" WHERE key = 'mapDefaultTownId_' || tenant_record.id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
                        'lat', (SELECT CASE WHEN value ~ '^-?[0-9]+\.?[0-9]*$' THEN value::FLOAT ELSE NULL END FROM "AppSetting" WHERE key = 'mapDefaultLat_' || tenant_record.id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
                        'lng', (SELECT CASE WHEN value ~ '^-?[0-9]+\.?[0-9]*$' THEN value::FLOAT ELSE NULL END FROM "AppSetting" WHERE key = 'mapDefaultLng_' || tenant_record.id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
                        'zoom', (SELECT CASE WHEN value ~ '^-?[0-9]+\.?[0-9]*$' THEN value::FLOAT ELSE NULL END FROM "AppSetting" WHERE key = 'mapDefaultZoom_' || tenant_record.id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1)
                    ),
                    NOW(),
                    NOW()
                );
            END;
        END IF;

        -- Update tenant with brandId
        UPDATE "Tenant" SET "brandId" = brand_id WHERE id = tenant_record.id;
    END LOOP;
END $$;

-- Step 3: Create SiteInstance for each tenant+lang combination
INSERT INTO "SiteInstance" (id, "tenantId", domain, lang, "isDefault", "mapConfig", features, "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::TEXT AS id,
    t.id AS "tenantId",
    NULL AS domain,
    tt.lang,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY tt.lang) = 1 THEN true ELSE false END AS "isDefault",
    jsonb_build_object(
        'townId', (SELECT value FROM "AppSetting" WHERE key = 'mapDefaultTownId_' || t.id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
        'lat', (SELECT CASE WHEN value ~ '^-?[0-9]+\.?[0-9]*$' THEN value::FLOAT ELSE NULL END FROM "AppSetting" WHERE key = 'mapDefaultLat_' || t.id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
        'lng', (SELECT CASE WHEN value ~ '^-?[0-9]+\.?[0-9]*$' THEN value::FLOAT ELSE NULL END FROM "AppSetting" WHERE key = 'mapDefaultLng_' || t.id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1),
        'zoom', (SELECT CASE WHEN value ~ '^-?[0-9]+\.?[0-9]*$' THEN value::FLOAT ELSE NULL END FROM "AppSetting" WHERE key = 'mapDefaultZoom_' || t.id AND (value IS NULL OR value = '' OR value = 'null') IS FALSE LIMIT 1)
    ) AS "mapConfig",
    jsonb_build_object(
        'isCrawlable', COALESCE((SELECT value = 'true' OR value = '1' FROM "AppSetting" WHERE key = 'isCrawlable_' || t.id LIMIT 1), true)
    ) AS features,
    NOW() AS "createdAt",
    NOW() AS "updatedAt"
FROM "Tenant" t
INNER JOIN "TenantTranslation" tt ON tt."tenantId" = t.id
WHERE t."brandId" IS NOT NULL
ON CONFLICT ("tenantId", lang) DO NOTHING;

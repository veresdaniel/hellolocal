-- Localized public URL path words (place / map / guide / …).
CREATE TABLE "UiPathSegment" (
    "lang" VARCHAR(8) NOT NULL,
    "key" VARCHAR(40) NOT NULL,
    "segment" VARCHAR(32) NOT NULL,

    CONSTRAINT "UiPathSegment_pkey" PRIMARY KEY ("lang","key")
);

CREATE INDEX "UiPathSegment_key_idx" ON "UiPathSegment"("key");
CREATE INDEX "UiPathSegment_segment_idx" ON "UiPathSegment"("segment");

ALTER TABLE "UiPathSegment" ADD CONSTRAINT "UiPathSegment_lang_fkey"
  FOREIGN KEY ("lang") REFERENCES "UiLanguage"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed shipped UI languages (hu / en / de) when those UiLanguage rows exist.
INSERT INTO "UiPathSegment" ("lang", "key", "segment")
SELECT v.lang, v.key, v.segment
FROM (
  VALUES
    ('hu', 'place', 'hely'),
    ('hu', 'town', 'telepules'),
    ('hu', 'map', 'terkep'),
    ('hu', 'list', 'lista'),
    ('hu', 'regionList', 'regiok'),
    ('hu', 'overview', 'attekintes'),
    ('hu', 'pricing', 'pricing'),
    ('hu', 'guide', 'utmutato'),
    ('hu', 'legal.imprint', 'impresszum'),
    ('hu', 'legal.terms', 'aszf'),
    ('hu', 'legal.privacy', 'adatvedelem'),
    ('en', 'place', 'place'),
    ('en', 'town', 'town'),
    ('en', 'map', 'map'),
    ('en', 'list', 'list'),
    ('en', 'regionList', 'regions'),
    ('en', 'overview', 'overview'),
    ('en', 'pricing', 'tarife'),
    ('en', 'guide', 'guide'),
    ('en', 'legal.imprint', 'imprint'),
    ('en', 'legal.terms', 'terms'),
    ('en', 'legal.privacy', 'privacy'),
    ('de', 'place', 'ort'),
    ('de', 'town', 'gemeinde'),
    ('de', 'map', 'karte'),
    ('de', 'list', 'liste'),
    ('de', 'regionList', 'regionen'),
    ('de', 'overview', 'ueberblick'),
    ('de', 'pricing', 'preise'),
    ('de', 'guide', 'ratgeber'),
    ('de', 'legal.imprint', 'impressum'),
    ('de', 'legal.terms', 'agb'),
    ('de', 'legal.privacy', 'datenschutz')
) AS v(lang, key, segment)
WHERE EXISTS (SELECT 1 FROM "UiLanguage" l WHERE l.code = v.lang)
ON CONFLICT ("lang", "key") DO NOTHING;

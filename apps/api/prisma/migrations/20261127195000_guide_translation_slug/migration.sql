-- Per-language public URL slug for platform guides (en/de no longer reuse hu slug).
ALTER TABLE "PlatformGuideTranslation" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- Backfill from canonical guide slug when missing (hu keeps the original; en/de updated on API boot).
UPDATE "PlatformGuideTranslation" AS t
SET "slug" = g."slug"
FROM "PlatformGuide" AS g
WHERE t."guideId" = g."id" AND (t."slug" IS NULL OR t."slug" = '');

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformGuideTranslation_lang_slug_key"
  ON "PlatformGuideTranslation"("lang", "slug");

CREATE INDEX IF NOT EXISTS "PlatformGuideTranslation_slug_idx"
  ON "PlatformGuideTranslation"("slug");

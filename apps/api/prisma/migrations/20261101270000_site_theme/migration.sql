-- Optional per-site public theme colors (JSON). Null = inherit Brand.theme / code defaults.
ALTER TABLE "Site" ADD COLUMN IF NOT EXISTS "theme" JSONB;

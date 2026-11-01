-- Optional per-entity GA4 measurement IDs (G-…). Null = inherit parent / disabled.
ALTER TABLE "Town" ADD COLUMN IF NOT EXISTS "gaMeasurementId" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "gaMeasurementId" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "gaMeasurementId" TEXT;

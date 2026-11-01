-- Per-site GA4 measurement ID (G-…). Null / empty = analytics disabled for that site.
ALTER TABLE "Site" ADD COLUMN IF NOT EXISTS "gaMeasurementId" TEXT;

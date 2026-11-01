-- Optional map-card image for place marker popovers (falls back to heroImage).
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "mapImage" TEXT;

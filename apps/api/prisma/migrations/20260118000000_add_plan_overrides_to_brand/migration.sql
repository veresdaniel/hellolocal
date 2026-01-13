-- Add planOverrides column to Brand table for feature matrix configuration
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "planOverrides" JSONB;

-- Add placePlanOverrides column to Brand table for place subscription feature matrix configuration
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "placePlanOverrides" JSONB;

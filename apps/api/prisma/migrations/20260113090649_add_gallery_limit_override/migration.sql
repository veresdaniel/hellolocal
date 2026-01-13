-- Add galleryLimitOverride column to Place table
ALTER TABLE "Place"
    ADD COLUMN IF NOT EXISTS "galleryLimitOverride" INTEGER;

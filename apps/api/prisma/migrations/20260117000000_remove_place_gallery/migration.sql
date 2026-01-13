-- Remove gallery field from Place and Event tables
-- Gallery images are now managed via Gallery entities and shortcodes in rich text editors

ALTER TABLE "Place" DROP COLUMN IF EXISTS "gallery";
ALTER TABLE "Event" DROP COLUMN IF EXISTS "gallery";

-- Create Gallery table
CREATE TABLE IF NOT EXISTS "Gallery" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "placeId" TEXT,
    "eventId" TEXT,
    "name" TEXT,
    "images" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "layout" TEXT DEFAULT 'grid',
    "columns" JSONB,
    "aspect" TEXT DEFAULT 'auto',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Gallery_siteId_idx" ON "Gallery"("siteId");
CREATE INDEX IF NOT EXISTS "Gallery_placeId_idx" ON "Gallery"("placeId");
CREATE INDEX IF NOT EXISTS "Gallery_eventId_idx" ON "Gallery"("eventId");
CREATE INDEX IF NOT EXISTS "Gallery_siteId_isActive_idx" ON "Gallery"("siteId", "isActive");

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Gallery_siteId_fkey'
    ) THEN
        ALTER TABLE "Gallery" 
        ADD CONSTRAINT "Gallery_siteId_fkey" 
        FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Gallery_placeId_fkey'
    ) THEN
        ALTER TABLE "Gallery" 
        ADD CONSTRAINT "Gallery_placeId_fkey" 
        FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Gallery_eventId_fkey'
    ) THEN
        ALTER TABLE "Gallery" 
        ADD CONSTRAINT "Gallery_eventId_fkey" 
        FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "EventCategory" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'EventCategory_eventId_idx'
    ) THEN
        CREATE INDEX "EventCategory_eventId_idx" ON "EventCategory"("eventId");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'EventCategory_categoryId_idx'
    ) THEN
        CREATE INDEX "EventCategory_categoryId_idx" ON "EventCategory"("categoryId");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'EventCategory_eventId_categoryId_key'
    ) THEN
        CREATE UNIQUE INDEX "EventCategory_eventId_categoryId_key" ON "EventCategory"("eventId", "categoryId");
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EventCategory_eventId_fkey'
    ) THEN
        ALTER TABLE "EventCategory" ADD CONSTRAINT "EventCategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EventCategory_categoryId_fkey'
    ) THEN
        ALTER TABLE "EventCategory" ADD CONSTRAINT "EventCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "EventLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventLog_tenantId_idx" ON "EventLog"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventLog_userId_idx" ON "EventLog"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventLog_action_idx" ON "EventLog"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventLog_entityType_idx" ON "EventLog"("entityType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventLog_createdAt_idx" ON "EventLog"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventLog_tenantId_userId_idx" ON "EventLog"("tenantId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventLog_tenantId_createdAt_idx" ON "EventLog"("tenantId", "createdAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EventLog_tenantId_fkey'
    ) THEN
        ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EventLog_userId_fkey'
    ) THEN
        ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

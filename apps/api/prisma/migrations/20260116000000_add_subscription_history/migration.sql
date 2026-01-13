-- Create SubscriptionHistory table to track package changes, payment dates, and subscription events
CREATE TABLE IF NOT EXISTS "SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "oldPlan" "SubscriptionPlan",
    "newPlan" "SubscriptionPlan",
    "oldStatus" "SubscriptionStatus",
    "newStatus" "SubscriptionStatus",
    "oldValidUntil" TIMESTAMP(3),
    "newValidUntil" TIMESTAMP(3),
    "paymentDueDate" TIMESTAMP(3),
    "amountCents" INTEGER,
    "currency" TEXT,
    "note" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- Create indexes for SubscriptionHistory
CREATE INDEX IF NOT EXISTS "SubscriptionHistory_scope_subscriptionId_idx" ON "SubscriptionHistory"("scope", "subscriptionId");
CREATE INDEX IF NOT EXISTS "SubscriptionHistory_changeType_idx" ON "SubscriptionHistory"("changeType");
CREATE INDEX IF NOT EXISTS "SubscriptionHistory_createdAt_idx" ON "SubscriptionHistory"("createdAt");
CREATE INDEX IF NOT EXISTS "SubscriptionHistory_paymentDueDate_idx" ON "SubscriptionHistory"("paymentDueDate");

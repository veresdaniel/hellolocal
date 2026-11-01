-- Municipal site plan and stored custom-offer requests.
-- The quote inbox address is not inserted here. The API writes it once, if the setting row is missing.

ALTER TYPE "SitePlan" ADD VALUE 'municipal';
ALTER TYPE "SubscriptionPlan" ADD VALUE 'MUNICIPAL';

CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "emailed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuoteRequest_createdAt_idx" ON "QuoteRequest"("createdAt");

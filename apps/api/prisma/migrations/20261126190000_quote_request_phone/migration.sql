-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN "phone" TEXT;

-- CreateIndex
CREATE INDEX "QuoteRequest_plan_createdAt_idx" ON "QuoteRequest"("plan", "createdAt");

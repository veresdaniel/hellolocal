-- Visitor ladder state on the existing site subscription.
-- Existing rows stay manually overridden so the ladder does not move them.
-- Thresholds live in AppSetting and are not inserted here.

ALTER TABLE "SiteSubscription"
  ADD COLUMN "manualOverride" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "ladderStep" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "ladderSuspended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "belowFloorSince" TIMESTAMP(3),
  ADD COLUMN "ladderEvaluatedAt" TIMESTAMP(3),
  ADD COLUMN "lastNotifiedStep" INTEGER;

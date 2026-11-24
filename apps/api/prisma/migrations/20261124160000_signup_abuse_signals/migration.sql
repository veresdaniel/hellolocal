-- Free-account abuse signals: normalized email, soft IP/device hashes, Stripe card fingerprint.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailNormalized" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupIpHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupDeviceHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupUserAgent" VARCHAR(512);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCardFingerprint" TEXT;

CREATE INDEX IF NOT EXISTS "User_emailNormalized_idx" ON "User"("emailNormalized");
CREATE INDEX IF NOT EXISTS "User_signupIpHash_idx" ON "User"("signupIpHash");
CREATE INDEX IF NOT EXISTS "User_signupDeviceHash_idx" ON "User"("signupDeviceHash");
CREATE INDEX IF NOT EXISTS "User_stripeCardFingerprint_idx" ON "User"("stripeCardFingerprint");

CREATE TABLE IF NOT EXISTS "SignupSignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "emailNormalized" TEXT NOT NULL,
    "ipHash" TEXT,
    "deviceHash" TEXT,
    "userAgent" VARCHAR(512),
    "stripeFingerprint" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignupSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SignupSignal_emailNormalized_idx" ON "SignupSignal"("emailNormalized");
CREATE INDEX IF NOT EXISTS "SignupSignal_ipHash_idx" ON "SignupSignal"("ipHash");
CREATE INDEX IF NOT EXISTS "SignupSignal_deviceHash_idx" ON "SignupSignal"("deviceHash");
CREATE INDEX IF NOT EXISTS "SignupSignal_stripeFingerprint_idx" ON "SignupSignal"("stripeFingerprint");
CREATE INDEX IF NOT EXISTS "SignupSignal_riskScore_idx" ON "SignupSignal"("riskScore");
CREATE INDEX IF NOT EXISTS "SignupSignal_createdAt_idx" ON "SignupSignal"("createdAt");
CREATE INDEX IF NOT EXISTS "SignupSignal_userId_idx" ON "SignupSignal"("userId");

DO $$ BEGIN
  ALTER TABLE "SignupSignal" ADD CONSTRAINT "SignupSignal_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill normalized emails for existing users (simple lower/trim; Gmail rules applied on next login/register path).
UPDATE "User"
SET "emailNormalized" = lower(trim("email"))
WHERE "emailNormalized" IS NULL;

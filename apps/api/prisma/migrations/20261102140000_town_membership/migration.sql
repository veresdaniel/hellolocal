-- Scope split. Existing rows are not rewritten:
--   SiteMembership.siteadmin (UI used to say "hely admin") stays a region admin.
--   SiteMembership.editor stays a region editor.
--   SiteMembership.viewer stays a region viewer.
--   PlaceMembership stays place-scoped.
-- Town scope is TownMembership.role = editor (one town, not a region role).

DO $$ BEGIN
  CREATE TYPE "TownRole" AS ENUM ('editor');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "TownMembership" (
    "id" TEXT NOT NULL,
    "townId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TownRole" NOT NULL DEFAULT 'editor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TownMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TownMembership_townId_userId_key" ON "TownMembership"("townId", "userId");
CREATE INDEX IF NOT EXISTS "TownMembership_userId_idx" ON "TownMembership"("userId");
CREATE INDEX IF NOT EXISTS "TownMembership_townId_idx" ON "TownMembership"("townId");

DO $$ BEGIN
  ALTER TABLE "TownMembership" ADD CONSTRAINT "TownMembership_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TownMembership" ADD CONSTRAINT "TownMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

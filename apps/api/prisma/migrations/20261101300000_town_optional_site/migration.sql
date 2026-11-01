-- Town.siteId becomes optional: Régió (Site) → Település hierarchy,
-- where region assignment can be unset (standalone town).

ALTER TABLE "Town" DROP CONSTRAINT IF EXISTS "Town_siteId_fkey";

ALTER TABLE "Town" ALTER COLUMN "siteId" DROP NOT NULL;

ALTER TABLE "Town"
  ADD CONSTRAINT "Town_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "Site"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

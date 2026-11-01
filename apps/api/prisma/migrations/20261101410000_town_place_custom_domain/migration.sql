-- Optional custom hostname on Town (település) and Place (hely).
-- Per-table UNIQUE allows multiple NULLs; global uniqueness across SiteDomain /
-- Collection.domain / Town.customDomain / Place.customDomain is enforced in app code
-- so hostname-based routing stays unambiguous.

ALTER TABLE "Town" ADD COLUMN "customDomain" TEXT;
CREATE UNIQUE INDEX "Town_customDomain_key" ON "Town"("customDomain");

ALTER TABLE "Place" ADD COLUMN "customDomain" TEXT;
CREATE UNIQUE INDEX "Place_customDomain_key" ON "Place"("customDomain");

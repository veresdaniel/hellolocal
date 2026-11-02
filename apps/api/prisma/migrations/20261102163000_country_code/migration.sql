ALTER TABLE "Country" ADD COLUMN IF NOT EXISTS "code" VARCHAR(2);

UPDATE "Country" SET "code" = 'HU' WHERE "code" IS NULL;

ALTER TABLE "Country" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Country_code_key" ON "Country"("code");

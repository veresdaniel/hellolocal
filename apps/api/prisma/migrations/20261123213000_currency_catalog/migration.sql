-- Extensible currency catalog for platform plan pricing / lang mapping.
CREATE TABLE "Currency" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plural" TEXT NOT NULL,
    "symbol" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

INSERT INTO "Currency" ("code", "name", "plural", "symbol", "createdAt", "updatedAt")
VALUES
  ('HUF', 'forint', 'forint', 'Ft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('EUR', 'euro', 'euros', '€', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- Default lang → currency for landing plan cards (hu→HUF, en/de→EUR).
INSERT INTO "AppSetting" ("id", "key", "value", "type", "description", "createdAt", "updatedAt")
VALUES (
  'appsetting_currency_by_lang',
  'platform.currencyByLang',
  '{"hu":"HUF","en":"EUR","de":"EUR"}',
  'json',
  'Per UI-language currency for platform landing plan cards (hu/en/de).',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;

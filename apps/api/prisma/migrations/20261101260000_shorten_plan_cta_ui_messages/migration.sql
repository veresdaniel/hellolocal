-- Shorten plan-card CTA labels so pill buttons stay one line at desktop widths.

UPDATE "UiMessage" SET "value" = 'Ingyenesen' WHERE "lang" = 'hu' AND "key" = 'public.overview.plans.free.cta';
UPDATE "UiMessage" SET "value" = 'Alapcsomaggal' WHERE "lang" = 'hu' AND "key" = 'public.overview.plans.basic.cta';
UPDATE "UiMessage" SET "value" = 'Prémiummal' WHERE "lang" = 'hu' AND "key" = 'public.overview.plans.premium.cta';
UPDATE "UiMessage" SET "value" = 'Egyedi árat kérek' WHERE "lang" = 'hu' AND "key" = 'public.overview.plans.municipal.cta';

UPDATE "UiMessage" SET "value" = 'Register free' WHERE "lang" = 'en' AND "key" = 'public.overview.plans.free.cta';
UPDATE "UiMessage" SET "value" = 'Get Basic' WHERE "lang" = 'en' AND "key" = 'public.overview.plans.basic.cta';
UPDATE "UiMessage" SET "value" = 'Get Premium' WHERE "lang" = 'en' AND "key" = 'public.overview.plans.premium.cta';
UPDATE "UiMessage" SET "value" = 'Custom quote' WHERE "lang" = 'en' AND "key" = 'public.overview.plans.municipal.cta';

UPDATE "UiMessage" SET "value" = 'Kostenlos' WHERE "lang" = 'de' AND "key" = 'public.overview.plans.free.cta';
UPDATE "UiMessage" SET "value" = 'Mit Basis' WHERE "lang" = 'de' AND "key" = 'public.overview.plans.basic.cta';
UPDATE "UiMessage" SET "value" = 'Mit Premium' WHERE "lang" = 'de' AND "key" = 'public.overview.plans.premium.cta';
UPDATE "UiMessage" SET "value" = 'Angebot anfragen' WHERE "lang" = 'de' AND "key" = 'public.overview.plans.municipal.cta';

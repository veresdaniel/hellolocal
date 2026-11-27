# UI szövegek: DB vs locale JSON

Állapot: 2026. november 27.

## Szabály

| Forrás | Szerep |
| --- | --- |
| **`UiMessage` (DB)** | Élő forrás. CSR (`loadUiCopy`) és SSR overview ebből olvas. |
| **`apps/web/src/i18n/locales/{hu,en,de}/*.json`** | Seed forrás + hideg fallback (CSR első festés / hiányzó kulcs). Az `admin.json` egyelőre csak JSON (nincs kötelező DB seed). |
| **`apps/api/src/ui-copy/seed-catalogs.json`** | API boot seed: a fenti locale-ok flattenelt másolata **admin nélkül**. Újragenerálás: `node apps/api/scripts/generate-ui-seed-catalogs.cjs`. |
| **`planOverrides.landingCopy`** | **Kivezetve.** Ne írj ide, ne olvass innen. |

Cél: a marketing / overview szövegek a DB-ből jöjjenek; a JSON kiindulás és biztonsági háló. Új `UiLanguage` (pl. `fr`) UI-szövegei `addLanguage` → hu másolat + fordító job útján mennek; teljes `LANG_VALUES` / locale-csomag bővítés külön feladat.

## Hogyan töltődik

1. **API boot:** `UiCopyService.onModuleInit` → `UiLanguage` hu/en/de + `UiMessage` **missing** sync a `seed-catalogs.json`-ból (nem ír felül meglévő szerkesztést). Path-szegmensek ugyanekkor seedelődnek.
2. **CSR:** `loadUiCopy` → `addResourceBundle` deep-merge a locale JSON fölé. A `t('public.overview…')` / `useLandingText` így DB-t preferál.
3. **SSR:** `GET /api/public/ui/:lang` → `renderOverview` a locale overview-t és a UiMessage flat kulcsokat összefésüli.
4. **Admin sync (idempotens):** UiCopy szerkesztő első betöltéskor `sync` **`missing`** módban (csak hiányzó kulcsok) — már nem az egyetlen seed út.
5. **Locale → DB felülírás:** UiCopy szerkesztő **„Locale → DB (felülírás)”** gombja → `sync` **`replace`** (upsert).

## Hol szerkeszd

| Tartalom | Hol |
| --- | --- |
| Platform overview / story / FAQ / SEO | Admin → Nyelvesítés → overview szűrés, vagy Public plans editor (csomagkártyák) |
| Csomagnevek, pitch, bullet sablonok | Public plans editor → UiMessage (`public.overview.plans.*`) |
| Számok, árak, enabled flag | `planOverrides.publicPlans` / feature matrix (nem szöveg) |
| Landing képek | Landing images CMS (`platform.landingImages`) |
| Admin UI feliratok | Egyelőre `locales/*/admin.json` (i18n bundle) |

## Mi marad a JSON-ban és miért

- A teljes `public.overview` fa: seed + fallback; ne töröld a használt kulcsokat.
- Új szállított szöveg (hu/en/de): először JSON-ba, majd `generate-ui-seed-catalogs.cjs` + deploy (API boot missing sync), vagy admin **Locale → DB**.
- `plans.freeForever`: `{{currency}}` + `{{count}}` (= `platform.freeTrialDays`); a plans editor nem szerkeszti, de UiMessage-ből jöhet.

## Eltávolított / ne használd

- `LandingCopyEditor` + `planOverrides.landingCopy` olvasás/írás
- Hardcoded overview stringek a PlanPicker / SSR-ben (`priceUnit`, `freeForever` → locale / DB kulcsok)

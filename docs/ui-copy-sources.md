# UI szövegek: DB vs locale JSON

Állapot: 2026. november 26.

## Szabály

| Forrás | Szerep |
| --- | --- |
| **`UiMessage` (DB)** | Élő forrás. Ami egyszer bekerült, onnan jön a CSR és az SSR. |
| **`apps/web/src/i18n/locales/{hu,en,de}/*.json`** | Seed + hideg fallback (üres DB / sync előtt / hiányzó kulcs). |
| **`planOverrides.landingCopy`** | **Kivezetve.** Ne írj ide, ne olvass innen. |

Cél: a marketing / overview szövegek többsége a DB-ből jöjjön; a JSON csak kiindulás és biztonsági háló.

## Hogyan töltődik

1. **CSR:** `loadUiCopy` → `addResourceBundle` deep-merge a locale JSON fölé. A `t('public.overview…')` / `useLandingText` így DB-t preferál.
2. **SSR:** `GET /api/public/ui-copy` → `renderOverview` a locale overview-t és a UiMessage flat kulcsokat összefésüli.
3. **Admin seed:** UiCopy szerkesztő első betöltéskor `sync` **`missing`** módban (csak hiányzó kulcsok).
4. **Locale → DB felülírás:** UiCopy szerkesztő **„Locale → DB (felülírás)”** gombja → `sync` **`replace`** (upsert). Szűrt namespace-re (pl. overview) is megy. Elavult UiMessage (pl. régi „Látszódj”) frissítésére.

## Hol szerkeszd

| Tartalom | Hol |
| --- | --- |
| Platform overview / story / FAQ / SEO | Admin → Nyelvesítés → overview szűrés, vagy Public plans editor (csomagkártyák) |
| Csomagnevek, pitch, bullet sablonok | Public plans editor → UiMessage (`public.overview.plans.*`) |
| Számok, árak, enabled flag | `planOverrides.publicPlans` / feature matrix (nem szöveg) |
| Landing képek | Landing images CMS (`platform.landingImages`) |

## Mi marad a JSON-ban és miért

- A teljes `public.overview` fa: seed + fallback; ne töröld a használt kulcsokat.
- Új szöveg: először JSON-ba (hu/en/de), majd deploy után **Locale → DB**, vagy kézi mentés az adminban.
- `plans.freeForever`: `{{currency}}` + `{{count}}` (= `platform.freeTrialDays`); a plans editor nem szerkeszti, de UiMessage-ből jöhet.

## Eltávolított / ne használd

- `LandingCopyEditor` + `planOverrides.landingCopy` olvasás/írás
- Hardcoded overview stringek a PlanPicker / SSR-ben (`priceUnit`, `freeForever` → locale / DB kulcsok)

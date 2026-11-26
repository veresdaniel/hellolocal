# P0 feature specek — claim, embed/QR, import/bulk

Állapot: 2026. november 26. A versenytárs–feature terv (claim → embed/QR → import/bulk) P0 tételeinek implementációs spece. A vevőfeltételezés a [piackutatás](./piackutatas.md) és az [integrációs felmérés](./integracios-felmeres.md) alapján zárt. Ez a dokumentum a következő három tickethez a szerződés; kódot nem tartalmaz.

**Aktuális termék-leltár (leszállított + hiány):** [termek-kepessegek.md](./termek-kepessegek.md).

## 0. Vevőfeltételezés (zárolva)

**Elsődleges fizető:** önkormányzat / Tourinform-fenntartó / TDM / borút egyesület (Site `municipal` / `business` / `pro` csomag).

**Másodlagos szereplő:** helyi vállalkozó (Place `owner` / `manager`) — tartalmat ad, a számlát általában nem ő fizeti. A free „Egy hely” csomag a feltöltést segíti, nem az első szezon bevételét.

**Következmény a P0 sorrendre:** claim + approval, embed/QR, import/bulk előbb, mint SME growth-loop (akció, ranking, app). Natív app nem P0.

| Szereplő | Mit kap a P0-ból |
| --- | --- |
| TDM / hivatal | Approval queue, CSV feltöltés, embed a saját honlapra, QR/kampány-link |
| Vállalkozó | Meglévő pin claim, vagy új hely jelentkezés jóváhagyásra |
| Vendég | Ugyanaz a böngészős térkép; embed-ből és QR-ből ugyanoda érkezik |

---

## 0.1 Leszállítva a P0 mellett (2026. november) — nem helyettesíti a P0-t

Ezek **nem** zárják a claim / embed / import ticketeket, de gyorsítják a tartalomfeltöltést és a DMO-pitch-et.

| Képesség | Mit ad | Hol |
| --- | --- | --- |
| **Mobilos tartalom-wizard** | Hely és program lépéses feltöltés telefonon: kamera, galéria, GPS, rövid szöveg; free → mindig draft; fizetős / superadmin → draft vagy azonnali publikálás | `/:lang/admin/wizard`, `PlaceWizard` / `EventWizard` |
| Kliensoldali képoptimalizálás | Feltöltés előtt WebP, max ~1920px él | `apps/web` upload pipeline |
| Platform story: helyi intézmények | Önkormányzati pitch (óvoda, iskola, hivatal…) + kép slot `civic` | overview + `LANDING_IMAGE_SLOTS` |
| Platform story: turisztikai iroda | Tematikus oldal + saját domain üzenet (kurátor-szó nélkül) | overview `stories.town` |
| Landing SEO | Önkormányzat / Tourinform / intézmény / tematikus oldal kulcsszavak | `public.json` overview seo* |

A mobilos wizard **csökkenti** a kézi admin-gépelést a helygazdáknál, de nem ad vállalkozói self-claimet, és nem ad WordPress embedet — az továbbra is P0-1 / P0-2.

---

## 1. Self-claim + approval queue

### Cél

A TDM ne gépelje be kézzel az összes helyet. A vállalkozó jelentkezik vagy claimeli a már fent lévő pint; a hivatal (siteadmin / superadmin) egy sorban dönt.

### Ami már megvan (építsünk rá)

| Darab | Hol |
| --- | --- |
| `PlaceMembership` + `PlaceRole` (`owner` / `manager` / `editor`) | `apps/api/prisma/schema.prisma` |
| Emailes meghívó meglévő helyre | `POST /api/admin/places/:id/members` → `admin-place-membership.service.ts` `inviteByEmail` |
| Free regisztráció → új Place `isActive: false` + owner membership | `country.service.ts` `registerFreePlace` |
| Pending signup (ismeretlen településnév) | `PlaceSignup` + `GET/POST /api/admin/signups*` |
| Free place publikálás csak superadmin | `admin-place.service.ts` |
| Scope flag `pendingSignup` | `admin-access.service.ts` |
| Place members UI | `PlaceMembersPanel.tsx`, `PlaceMembershipsPage.tsx` |
| Inactive free place lista | `PlacesPage.tsx` „Awaiting approval” |
| Mobilos hely/program wizard (draft / publish szabályokkal) | `/admin/wizard` — tartalom *létrehozás*, nem claim |

### Ami hiányzik

- Meglévő Place claim (idegen user → ownership / membership kérés)
- Siteadmin szintű approval queue (ne csak superadmin)
- SPA a `PlaceSignup` listához / approve-hoz
- Register SPA mezők a free path-hoz (`plan`, `countryId`, `townId` / `townName` — a backend már várja)

### Adatmodell

Új Prisma modellek (javasolt):

```prisma
enum PlaceClaimStatus {
  pending
  approved
  rejected
  cancelled
}

model PlaceClaim {
  id          String           @id @default(cuid())
  placeId     String
  userId      String
  status      PlaceClaimStatus @default(pending)
  message     String?          // rövid indoklás a vállalkozótól
  proofUrl    String?          // opcionális feltöltött bizonyíték (számla/fotó URL)
  reviewedBy  String?
  reviewedAt  DateTime?
  reviewNote  String?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  place Place @relation(...)
  user  User  @relation(...)

  @@unique([placeId, userId, status]) // egy pending claim / user / place
  @@index([status, placeId])
}
```

`PlaceSignup` marad a „új hely / ismeretlen település” ágra. Claim = meglévő Place-re.

### API

Nyilvános / autentikált (throttled):

| Method | Path | Ki | Viselkedés |
| --- | --- | --- | --- |
| `POST` | `/api/public/:lang/:siteKey/places/:placeId/claim` | bejelentkezett user | Claim `pending`; ha már owner/member → 409; ha van nyitott claim → 409 |
| `GET` | `/api/me/place-claims` | bejelentkezett user | Saját claimjei |

Admin (RBAC: siteadmin a place site-ján, vagy superadmin):

| Method | Path | Viselkedés |
| --- | --- | --- |
| `GET` | `/api/admin/place-claims?status=pending&siteId=` | Queue lista (place + user + message) |
| `POST` | `/api/admin/place-claims/:id/approve` | Claim → `approved`; `PlaceMembership` `owner` (ha nincs owner) vagy `manager`; email ha SMTP él |
| `POST` | `/api/admin/place-claims/:id/reject` | `rejected` + opcionális `reviewNote` |
| `GET` | `/api/admin/signups` | Meglévő — **SPA bekötés** |
| `POST` | `/api/admin/signups/:id/approve` | Meglévő — **SPA bekötés**; siteadmin is, ha a country/site scope engedi |

Unified inbox (UI): egy „Jóváhagyások” oldal három tabbal:

1. Place claims (meglévő pin)
2. Free place publish (`plan=free && !isActive`)
3. PlaceSignup (ismeretlen település)

### UI

| Felület | Viselkedés |
| --- | --- |
| Place detail (publikus) | „Ez a te helyed?” → login → claim form (üzenet + opcionális proof) |
| Admin → Jóváhagyások | Tabok + approve/reject; link a Place szerkesztőre |
| Register | Free path: plan/country/town mezők a query/body szerint (`RegisterPage` ↔ `RegisterDto`) |

### Üzleti szabályok

1. Claim approve soha nem hoz létre új Place-t.
2. Ha a Place-nek már van `owner` membershipje, az approve `manager`-t ad, nem cseréli az ownert — kivéve superadmin „transfer ownership” (külön, nem P0).
3. Siteadmin csak a saját Site Place-eit látja a queue-ban.
4. Reject után ugyanaz a user 30 napig nem claimelheti újra ugyanazt a Place-t (rate limit / status check).
5. UC gate alatt a publikus claim endpoint is zárva marad (ugyanaz a middleware).

### Elfogadási kritériumok

- [ ] Bejelentkezett vállalkozó claimelhet meglévő inaktív vagy aktív Place-t a saját régiójában.
- [ ] Siteadmin approve után a user szerkesztheti a Place-t (`PlaceRole` szerint).
- [ ] Superadmin és siteadmin látja a pending queue-t; viewer nem.
- [ ] PlaceSignup lista megjelenik az admin UI-n, approve működik.
- [ ] Free register SPA kitölti a backend által várt mezőket.

### Nem P0

- Automatikus Google Places prefill
- Számlakép OCR
- Nyilvános „join as editor” open invite link token tábla (az `inviteByEmail` elég)

---

## 2. Embed widget + kampány-link / QR csomag

### Cél

A TDM a saját honlapjára (WordPress HTML-blokk) és a Tourinform / plakát QR-jére ugyanazt a vendégélményt adja. A landing „egy link” ígéretét elosztási csomaggá teszi. Lásd [integracios-felmeres.md](./integracios-felmeres.md) §1.

### Ami már megvan

| Darab | Hol |
| --- | --- |
| Publikus map URL | `urls.ts` / `entityPaths.ts`: `/:lang/:siteKey/terkep` (EN `map`, DE `karte`) |
| Custom domain | SiteDomain + Caddy ask |
| Social share | `SocialShareButtons.tsx` |
| Overview share URL | `ssr/renderOverview.js` |
| Publikus JSON | `GET /api/public/:lang/:siteKey/places\|events` |
| QR kód | csak 2FA TOTP — **nem** kampány QR |

### Scope (P0)

#### A) Embeddable map frame

Új publikus útvonal (SPA + SSR-barát):

- Platform: `/:lang/:siteKey/embed` (opcionális query)
- Custom host: `/:lang/embed`

Query paraméterek:

| Param | Alapértelmezés | Jelentés |
| --- | --- | --- |
| `view` | `map` | `map` \| `list` \| `events` |
| `town` | — | town slug szűrés |
| `category` | — | kategória slug |
| `lang` | path lang | redundáns; path az igazság |
| `utm_source` | — | átmegy analytics eseményekre |
| `utm_medium` | `embed` | |
| `utm_campaign` | — | |

Viselkedés:

- `embed=1` layout: nincs platform chrome / demo CTA / UC marketing; csak map+lista+minimál header (logo + nyelv).
- `X-Frame-Options` / CSP: `frame-ancestors` engedélyezett a Site adminban whitelistelt originökre **vagy** P0-ban `*` + `Referrer` log (egyszerűbb go-live; whitelist P1).
- Mélység: pin kattintás → ugyanabban a frame-ben place detail, vagy `target=_top` a teljes helylapra (P0: `_top` a saját domainre, hogy a WordPress oldal ne ragadjon be).

Admin „Beágyazás” panel (Site szerkesztő):

```html
<iframe
  src="https://{host}/{lang}/{siteKey}/embed?utm_source=webetyek&utm_medium=embed"
  width="100%" height="640" style="border:0;border-radius:12px"
  loading="lazy" title="HelloLocal térkép"></iframe>
```

Másolható gomb + előnézet.

#### B) Kampány-link + QR csomag

Admin → Site → „Kampánycsomag” oldal:

| Eszköz | Tartalom |
| --- | --- |
| Alap link | `https://{customDomain\|platform}/{lang}/{siteKey}` |
| Térkép link | `.../terkep` + UTM (`utm_source=print\|tourinform\|hotel`, `utm_medium=qr\|link`, `utm_campaign=` szerkeszthető) |
| Town link | town slug, ha van |
| QR PNG/SVG | ugyanarra a kampány-URL-re (szerveroldali generálás, pl. `qrcode` lib az API-n) |
| Letöltés | egy ZIP vagy külön PNG + szöveges `.txt` a linkkel |

API:

| Method | Path | Viselkedés |
| --- | --- | --- |
| `GET` | `/api/admin/sites/:id/campaign-pack?lang=&campaign=&town=` | JSON: urls + QR data-URL vagy binary |
| `GET` | `/api/admin/sites/:id/campaign-pack/qr.png?...` | image/png |

Analytics: meglévő GTM események kapjanak `utm_*` contextet a landoláskor (sessionStorage egyszer), hogy a DMO dashboardon „QR vs embed vs organic” legyen.

### Elfogadási kritériumok

- [ ] WordPress HTML-blokkba illeszthető iframe betölti a régió térképét login nélkül.
- [ ] Siteadmin kimásolja az embed kódot és letölti a QR PNG-t.
- [ ] UTM-mel érkező vendég sessionjében a forrás megmarad legalább az első `page_view` / `view_item` eseményig.
- [ ] Embed nézetben nincs admin/demo zaj; mobil szélességen használható.

### Nem P0

- Partner-hotel külön editor jog
- Fizetős map monetization
- iCal / RSS (külön ticket, lásd integrációs felmérés)
- Kiosk fullscreen hardver-profil (P2)

---

## 3. CSV/JSON import–export + bulk admin

### Cél

Új régió ne üres térképpel induljon. A TDM Excel/NETA-szerű listából feltölthet; hibás sorokat javíthat; tömegesen aktiválhat. A CHANGELOG `[Unreleased]` tételek: Export/Import (CSV, JSON), Bulk admin operations.

### Ami már megvan

| Darab | Hol |
| --- | --- |
| Egyedi create | `POST /api/admin/places`, `/events`, `/towns` |
| Publikus JSON olvasás | `/api/public/:lang/:siteKey/places\|events` |
| Event-log CSV | `GET /api/admin/event-logs/export` (minta a CSV streamre) |
| Dev snapshot | `prisma/load-snapshot.cjs` — **nem** termékimport |
| Geocode | `GET /api/admin/geocode` (soronkénti segéd) |

### Formátumok

#### Place CSV (UTF-8, `;` vagy `,` — detektálás az első sorból)

Kötelező oszlopok:

`externalId`, `name_hu`, `lat`, `lng`, `townSlug`, `categorySlug`

Opcionális:

`name_en`, `name_de`, `slug`, `description_hu|en|de`, `address`, `phone`, `email`, `website`, `openingHours` (JSON string vagy egyszerű „Mo-Fr 09:00-17:00”), `tags` (pipe-separated), `isActive` (`true`/`false`), `priceBand`

#### Place JSON

Tömb vagy `{ "places": [ ... ] }` ugyanazokkal a mezőkkel (camelCase engedett).

#### Event CSV/JSON

`externalId`, `title_hu`, `startsAt`, `endsAt`, `placeExternalId` vagy `placeSlug`, opcionális leírások / `isActive`.

`externalId` + `siteId` → idempotens upsert (új `PlaceImportKey` vagy mező a Place-en: `importKey String?` unique per site).

```prisma
// Place-en:
importKey String?
@@unique([siteId, importKey])
```

### API

| Method | Path | Viselkedés |
| --- | --- | --- |
| `POST` | `/api/admin/sites/:id/import/places` | multipart CSV/JSON; dryRun query | válasz: `{ created, updated, skipped, errors[] }` |
| `POST` | `/api/admin/sites/:id/import/events` | ugyanígy |
| `GET` | `/api/admin/sites/:id/export/places?format=csv\|json&lang=` | stream letöltés |
| `GET` | `/api/admin/sites/:id/export/events?format=csv\|json` | |
| `POST` | `/api/admin/sites/:id/bulk/places` | body: `{ ids[], action: "activate"\|"deactivate"\|"delete" }` soft szabályokkal |

RBAC: siteadmin a saját site-ján; superadmin mindenhol. Editor: csak export (olvasás), nem import/bulk delete.

### Dry-run és hibák

1. Minden import alapból `dryRun=true` az UI első gombján („Ellenőrzés”).
2. Hibás sor nem állítja meg a többit; `errors: [{ row, field, message }]`.
3. Ismeretlen `townSlug` / `categorySlug` → error, nem auto-create (földrajzot a hivatal hoz létre — összhangban a PlaceSignup szabállyal).
4. Hiányzó lat/lng → error; geocode gomb soronként az UI-n a dry-run után (nem csendes Nominatim-bulk).
5. Limit P0: max 500 sor / kérés; nagyobb fájl → 413 + üzenet.

### UI

Admin → Site → „Adatok” fül:

1. Sablon CSV letöltés
2. Fájl feltöltés → dry-run táblázat (zöld/sárga/piros)
3. „Importálás” csak ha `errors` blocking = 0 (warning OK)
4. Export gombok
5. Places listán multi-select + bulk activate/deactivate

### OSM (kapcsolat, nem P0 kötelező)

Az integrációs felmérés Overpass one-shot importja **külön** script/ticket: kimenete ugyanezt a JSON sémát állítja elő, majd ember nézi + dry-run. Nem kell az admin UI-ba az első körben.

### Elfogadási kritériumok

- [ ] Siteadmin 50 soros Place CSV-t dry-runol és importál; `importKey` alapján második futás update, nem duplikátum.
- [ ] Export CSV megnyílik Excelben ékezetesen (UTF-8 BOM a CSV-n).
- [ ] Bulk deactivate elrejti a helyeket a publikus térképről.
- [ ] Editor nem futtathat importot / bulk delete-et.
- [ ] CHANGELOG Unreleased checkboxok ehhez a tickethez köthetők.

### Nem P0

- NETA élő szinkron
- iCal eseményimport (külön)
- Képgaléria ZIP import
- Automatikus kategória-létrehozás

---

## Implementációs sorrend (ticketek)

1. **HL-P0-1** — Claim model + API + Jóváhagyások UI (+ PlaceSignup SPA + free register mezők)
2. **HL-P0-2** — Embed route + Site beágyazás panel + campaign pack QR
3. **HL-P0-3** — Place/Event import dry-run + export + bulk actions (`importKey`)

Függés: P0-2 nem függ P0-1-től (párhuzamosítható). P0-3 független. Analytics UTM a P0-2 része.

## Kivéve ebből a spećből

P1 útvonalak, PDF kedvencek, quality gate, P2 kiosk/NETA bridge, DMO analytics dashboard részletes spec — külön dokumentum, miután a P0 ticketek landoltak.

# HelloLocal — termék-képességek

Állapot: 2026. november 26. Leszállított képességek rövid leltára a DMO-first pozícióhoz. A még nyitott P0 ticketek spece: [p0-feature-specs.md](./p0-feature-specs.md). Piaci háttér: [piackutatas.md](./piackutatas.md).

## Nyilvános vendégélmény

- Böngészős térkép + lista (MapLibre), app nélkül
- Helyek, programok, gyűjtemények (tematikus oldalak), települések
- Nyitvatartás, szűrők, részletes oldal, galéria, megosztás
- HU / EN / DE, nyelvenkénti slug + hreflang
- Saját domain site / town / place / collection szinten (csomagtól függ)
- Platform marketing nyitó (hellolocal.hu / .eu) + régió-oldalak
- UC / under-construction kapu (staff + preview)
- GTM → GA4, cookie consent; Web Push ahol be van kapcsolva

## Admin — asztali

- Szerepkörök: platform / site / town / place (2FA TOTP)
- CRUD: site, domain, town, place, event, collection, kategória, tag, áráv, galéria, static/legal
- Tagságok, előfizetés / termék / entitlement
- AI szövegsegéd a tartaloműrlapokon
- Analitikai dashboardok (site / place / town / event / global)
- Platform landing: Localization copy + landing képek CMS (hero, story slotok, closing, share)
- GTM hostonként; landing crawl kapcsoló; Facebook OG refresh

## Admin — mobilos tartalom létrehozás (új)

Útvonal: `/:lang/admin/wizard` (csak ≤767px; asztali redirect a klasszikus űrlapokra).

| Lépés | Hely (Place) | Program (Event) |
| --- | --- | --- |
| 1 | Név | Cím |
| 2 | Település + kategória | Kapcsolt hely |
| 3 | Fotók (kamera / galéria) | Időszak |
| 4 | Rövid leírás | Fotók |
| 5 | GPS („Hol vagyok”) vagy kézi lat/lng | Rövid leírás |
| 6 | Összegzés + mentés | Összegzés + mentés |

Viselkedés:

- Mobilra optimalizált lépéses shell, nagy gombok, 16px inputok (iOS zoom ellen)
- Feltöltés előtt kliensoldali WebP optimalizálás (hosszabb él ≤1920px)
- **Free csomag:** mindig piszkozat (`isActive: false`) — publikálás csak superadmin
- **Fizetős hely / superadmin:** a review lépésen választható *piszkozat* vagy *azonnali publikálás*
- Mentés után: megnyitás az admin szerkesztőben, vagy újabb wizard

Belépési pontok: admin dashboard „Gyors feltöltés”, Új tartalom kártya mobilon.

## Platform marketing (nyitó)

Story blokkok (képpel, CMS-ből felülírható):

1. Kézműves
2. Szolgáltatások, programok és aktualitások
3. Ami nincs szem előtt
4. **Helyi intézmény** (óvoda, bölcsőde, iskola, könyvtár, művelődési ház, rendelő, hivatal)
5. **Turisztikai iroda** — teljes kínálat + tetszőleges tematikus oldal saját domainnel (kampány / QR / hírlevél)

SEO: title / description / keywords vevőintentre (önkormányzat, Tourinform, intézmények, tematikus oldal, saját domain).

## Többtenant modell

```text
Country → Site (régió) → Town → Place / Event
              ↘ Collection (tematikus oldal, opcionális saját domain)
```

Egy régió több települést foghat össze; a vendég a belépési helyszínnél marad.

## Mit nem ad még a termék (P0 / később)

| Hiány | Hol van a spec |
| --- | --- |
| Self-claim + approval queue | [p0-feature-specs.md](./p0-feature-specs.md) §1 |
| Embed widget + kampány QR-csomag | §2 |
| CSV/JSON import–export + bulk | §3 |
| iCal be / ki, NETA bridge | integrációs felmérés + P0 „nem P0” |
| Natív app | szándékosan nem; PWA később |

## Kapcsolódó docok

- [p0-feature-specs.md](./p0-feature-specs.md) — implementációs szerződés a következő három tickethez
- [integracios-felmeres.md](./integracios-felmeres.md) — külső adat / beágyazás
- [piackutatas.md](./piackutatas.md) — vevő, ár, értékesítés
- [analytics-gtm.md](./analytics-gtm.md) — publikus események

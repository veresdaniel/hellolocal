# Changelog

A projektre vonatkozó összes jelentősebb változtatás ebben a fájlban kerül dokumentálásra.

A formátum a [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) alapján,
és ez a projekt követi a [Semantic Versioning](https://semver.org/spec/v2.0.0.html) szabályait.

## [0.1.0-beta] - 2026-01-07

### ✨ Hozzáadva

#### Tartalom Kezelés
- **Többnyelvű rendszer** - Magyar, Angol, Német támogatás i18next-tel
- **Helyek (Places) kezelése** - Teljes CRUD admin felülettel
  - Kategóriák dinamikus kezelése
  - Címkék (tags) rendszer
  - Ár sávok (price bands)
  - Települések (towns) kezelés
  - Galéria és hero image támogatás
  - GPS koordináták
- **Események (Events) rendszer** - Időzített események kezelése
  - Kezdő és befejező dátum
  - Pinned események (kiemelt)
  - Eseményhez kapcsolódó helyek
  - Esemény kategóriák
  - Rich text leírások
- **Rich Text Editor** - TipTap alapú szerkesztő
  - HTML formázás
  - Heading stílusok (H1, H2, H3)
  - Kép beillesztés támogatás
  - Félkövér, dőlt, felsorolás
- **SEO optimalizáció**
  - Automatikus slug generálás
  - Dinamikus meta tagek
  - Multilingual slug-ok
  - Fallback magyar slug-okra
- **Jogi oldalak** - Terms, Privacy, Cookies dinamikus kezelése

#### Felhasználói Felület
- **Interaktív térkép nézet** - MapLibre GL alapú
  - Helyek megjelenítése markerekkel
  - Események megjelenítése a térképen
  - Térkép pozíció és zoom beállítás
  - Cluster funkció nagy mennyiségű marker esetén
- **Lista nézet** - Alternatív megjelenítés
  - Helyek és események kombinált listázása
  - Infinite scroll
  - Keresés funkció
  - Kategória és ár sáv szerinti szűrés
- **Drag-and-drop szűrők**
  - Pozíció megőrzés localStorage-ban
  - Állapot perzisztencia (nyitva/zárva)
  - Újrapozícionálható szűrő box
- **Események lista doboz**
  - Legfeljebb 3 esemény megjelenítése
  - Belső scrollozás
  - Drag-and-drop pozicionálás
  - Pinned események előrébb sorolása
  - Múltbeli események kiszűrése
- **Detail oldalak** - Helyek és események részletes nézete
  - Hero image
  - Galéria
  - Rich text leírások
  - Kapcsolattartási információk
  - Térkép integráció
  - Social share gombok (Facebook, Twitter, Email)
  - Breadcrumb navigáció
- **Reszponzív mobil design**
  - Adaptív padding és margin értékek
  - Mobil-optimalizált képméretek
  - Overflow-x elleni védelem
  - Box-sizing: border-box globálisan
  - Word-wrap hosszú szövegekhez

#### Admin Funkciók
- **Role-based hozzáférés-kezelés**
  - Superadmin - teljes hozzáférés
  - Admin - tartalom és beállítások kezelése
  - Editor - csak tartalom szerkesztése
  - Viewer - csak olvasási jogosultság
- **2FA autentikáció** - TOTP alapú kétfaktoros hitelesítés
  - QR kód generálás
  - Backup kódok
  - Admin általi engedélyezés/letiltás
- **Többbérlős (Multi-tenant) rendszer**
  - Tenant-ek elkülönített kezelése
  - Tenant-specifikus beállítások
  - Tenant váltás admin felületen
- **Felhasználó kezelés**
  - CRUD műveletek
  - Szerepkör módosítás
  - 2FA kezelés adminként
  - Jelszó hash-elés (bcrypt)
- **Beállítások oldal** - Collapse-olható szekciókkal
  - 🌍 Alapértelmezett nyelv beállítás
  - 🗺️ Térkép központ és zoom
  - ⚙️ Oldal SEO beállítások (név, leírás, meta)
- **Automatikus slug generálás**
  - Helyekhez és eseményekhez
  - Minden nyelvhez külön slug
  - Maintenance endpoint meglévő rekordokhoz
- **Admin Dashboard** - Átlátható kezdőoldal rendezett csempékkel
  1. Események
  2. Helyek
  3. Ár sávok
  4. Kategóriák
  5. Címkék
  6. Települések
  7. Beállítások
  8. Jogi oldalak
  9. Felhasználói profil

#### Értesítések
- **Push notification rendszer** - Web Push API
  - Feliratkozás és leiratkozás
  - Prisma model push subscriptions-hoz
  - Esemény létrehozásakor azonnali értesítés (TODO)
  - Esemény előtt 2 órával emlékeztető
  - Cron job 10 percenként ellenőrzi a közelgő eseményeket

#### Technikai Fejlesztések
- **JWT autentikáció** - Access token alapú
- **Prisma ORM** - Type-safe adatbázis hozzáférés
- **React Query** - Server state cache management
- **Error handling** - GlobalExceptionFilter
- **Tenant resolver** - Automatikus tenant felismerés slug/domain alapján
- **Slug service** - Központi slug kezelés
- **Loading spinner** - 2 másodperces késleltetéssel, full-screen
  - Navigáció közben nem villan fel a "Nincs találat"
  - Smooth loading experience
- **Inter font** - Globális betűtípus jobb olvashatósághoz
- **Footer** - Modern, sticky design
  - Kompakt mód térkép nézetben
  - 3 oszlopos layout (logo, legal, quick links)
  - Gradiens háttér

### 🔧 Javítva
- Place és Event detail oldalak scrollozhatóvá tétele
- Slug fallback logika magyar nyelvre ha hiányzik a kért nyelv
- Site settings mentése működik megfelelően
- MapFilters drag-and-drop javítások
- EventsList header teljes területe klikkelhetővé vált
- Price band szűrés most ID alapján működik (nem név alapján)
- Admin settings collapse-olható szekciók UX javítása
- Mobil overflow problémák kijavítása (padding, margin optimalizálás)
- Fordítások kiegészítése ("Városok" → "Települések")
- Linter figyelmeztetések javítása

### 🎨 UI/UX Fejlesztések
- Modern kártyaalapú design
- Lilás brand színek (#667eea, #764ba2)
- Hover effektek és átmenetek
- Árnyékok és gradiens hátterek
- Ikonok emoji-kkal (📅, 📍, 💰, 📁, etc.)
- Collapse animációk (forgó nyíl ikonok)
- Social share gombok kisebb, elegánsabb megjelenéssel
- Checkboxok brand-színűek a szűrőkben

### 🔒 Biztonság
- Bcrypt jelszó hash-elés
- JWT token alapú autentikáció
- Role-based hozzáférés Guards-szal
- 2FA TOTP implementáció
- CORS konfiguráció

### 📦 Függőségek
#### Frontend
- React 19.2.0
- Vite 7.2.4
- TypeScript 5.9.3
- TanStack Query 5.90.16
- React Router 7.11.0
- MapLibre GL 3.6.2
- TipTap 2.1.13
- i18next 23.7.6

#### Backend
- NestJS 11.1.11
- Prisma 7.2.0
- PostgreSQL (via @prisma/adapter-pg)
- Passport JWT 4.0.1
- bcryptjs 2.4.3
- Web Push 3.6.7
- Node.js 18+

### 🚧 Ismert Korlátok (Beta)
- Unit és E2E tesztek hiányoznak
- Email szolgáltatás nincs konfigurálva (EmailService placeholder)
- Képfeltöltés még file path alapú (nincs S3/CDN integráció)
- Nincs cache layer (Redis)
- Nincs rate limiting
- Audit log hiányzik

### 📝 Dokumentáció
- README.md átfogó telepítési és használati útmutatóval
- CHANGELOG.md verziókövetéssel
- API endpoint dokumentáció (docs/)
- Frontend és backend architektúra dokumentáció

## [Unreleased]

### 🎯 Tervezett funkciók
- [ ] Redis cache layer
- [ ] Export/Import funkció (CSV, JSON)
- [ ] Bulk műveletek admin felületen
- [ ] Nyelvi fordítások bővítése
- [ ] A11y (accessibility) fejlesztések

---

## Verzió Formátum

A verziók a következő formátumban vannak:
- **Major.Minor.Patch-tag**
- Példa: `0.1.0-beta`, `1.0.0`, `1.2.3`

### Változás Típusok
- **✨ Hozzáadva** - Új funkciók
- **🔧 Javítva** - Bug fix-ek
- **🔄 Módosítva** - Változtatások meglévő funkciókon
- **🗑️ Elavult** - Hamarosan eltávolításra kerülő funkciók
- **❌ Eltávolítva** - Eltávolított funkciók
- **🔒 Biztonság** - Biztonsági javítások
- **🎨 UI/UX** - Felhasználói felület változások
- **⚡ Teljesítmény** - Teljesítmény javítások
- **📚 Dokumentáció** - Dokumentáció változások

[0.1.0-beta]: https://github.com/yourusername/hellolocal/releases/tag/v0.1.0-beta
[Unreleased]: https://github.com/yourusername/hellolocal/compare/v0.1.0-beta...HEAD


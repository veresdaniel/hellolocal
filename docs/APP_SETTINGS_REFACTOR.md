# App Settings Refaktor - Összefoglaló

## Jelenlegi helyzet

### AppSettings (globális, AppSetting táblában)
✅ **Marad az AppSettings-ben:**
- `defaultLanguage` - globális nyelv beállítás
- `active-tenants-count` - aktív tenant-ok száma (multi-tenant mód detektálásához)

### Tenant-specifikus beállítások (át kell helyezni)
❌ **Át kell helyezni SiteSettings-be:**
- `map-settings` - SiteInstance.mapConfig-ben tárolva
- `site-settings` - Brand + TenantTranslation + SiteInstance-ben tárolva

## Problémák

1. **Duplikáció:**
   - `AdminAppSettingsService.getSiteSettings()` és `SiteSettingsService.getSiteSettings()` két külön implementáció
   - `AdminAppSettingsService.getMapSettings()` tenant-specifikus, de AppSettings-ben van

2. **Rossz helyen lévő endpoint-ok:**
   - `AppSettingsController`-ben: `/:lang/map-settings` és `/:lang/site-settings` (tenant-specifikus)
   - Ezeknek a `SiteSettingsController`-ben kellene lenniük

3. **Admin endpoint-ok:**
   - `/api/admin/app-settings/map-settings` - át kell helyezni `/api/admin/site-settings/map-settings`-re
   - `/api/admin/app-settings/site-settings` - át kell helyezni `/api/admin/site-settings`-re

## Refaktor terv

### 1. Backend változtatások

#### A. SiteSettingsService bővítése
- Hozzáadni: `setMapSettings(tenantId, settings)` metódust
- Hozzáadni: `setSiteSettings(tenantId, settings)` metódust
- A `getSiteSettings()` már létezik és jó

#### B. AdminAppSettingsService tisztítása
- **Eltávolítani:**
  - `getMapSettings(tenantId)` ❌
  - `setMapSettings(tenantId, settings)` ❌
  - `getSiteSettings(tenantId)` ❌
  - `setSiteSettings(tenantId, settings)` ❌
- **Megtartani:**
  - `getDefaultLanguage()` ✅
  - `setDefaultLanguage(lang)` ✅
  - `findAll()`, `findOne()`, `upsert()`, `delete()` ✅ (általános AppSetting kezelés)

#### C. AppSettingsController tisztítása
- **Eltávolítani:**
  - `/:lang/map-settings` endpoint ❌
  - `/:lang/site-settings` endpoint ❌
- **Megtartani:**
  - `/app-settings/default-language` ✅
  - `/app-settings/active-tenants-count` ✅

#### D. SiteSettingsController bővítése
- Hozzáadni admin endpoint-okat:
  - `GET /api/admin/site-settings/map-settings?tenantId=...`
  - `PUT /api/admin/site-settings/map-settings`
  - `GET /api/admin/site-settings?tenantId=...`
  - `PUT /api/admin/site-settings`

#### E. AdminController frissítése
- `/api/admin/app-settings/map-settings` → `/api/admin/site-settings/map-settings`
- `/api/admin/app-settings/site-settings` → `/api/admin/site-settings`
- Frissíteni a service hívásokat: `appSettingsService` → `siteSettingsService`

### 2. Frontend változtatások

#### A. API kliens frissítése (`apps/web/src/api/admin.api.ts`)
- `getMapSettings()` - endpoint változtatás
- `setMapSettings()` - endpoint változtatás
- `getSiteSettings()` - endpoint változtatás
- `setSiteSettings()` - endpoint változtatás

#### B. Public API (`apps/web/src/api/places.api.ts`)
- `getMapSettings()` - endpoint változtatás (ha szükséges)
- `getSiteSettings()` - endpoint változtatás (ha szükséges)

#### C. AppSettingsPage frissítése
- API hívások frissítése új endpoint-okra

## Végleges struktúra

### AppSettings (globális)
```
GET  /api/app-settings/default-language
GET  /api/app-settings/active-tenants-count
GET  /api/admin/app-settings
GET  /api/admin/app-settings/:key
POST /api/admin/app-settings
PUT  /api/admin/app-settings/:key
DELETE /api/admin/app-settings/:key
PUT  /api/admin/app-settings/default-language
```

### SiteSettings (tenant-specifikus)
```
GET  /api/public/site?lang=hu&tenantKey=etyek-budai
GET  /api/:lang/:tenantKey/site-settings
GET  /api/admin/site-settings?tenantId=...
PUT  /api/admin/site-settings
GET  /api/admin/site-settings/map-settings?tenantId=...
PUT  /api/admin/site-settings/map-settings
```

## Adatbázis struktúra (változatlan)

- **AppSetting** tábla - globális beállítások
- **Brand** tábla - brand assets (placeholders, mapDefaults, theme)
- **TenantTranslation** tábla - nyelvspecifikus tartalom (name, description, SEO)
- **SiteInstance** tábla - runtime beállítások (mapConfig, features)

## Következő lépések

1. ✅ Analízis kész
2. ⏳ SiteSettingsService bővítése admin metódusokkal
3. ⏳ AdminAppSettingsService tisztítása
4. ⏳ AppSettingsController tisztítása
5. ⏳ SiteSettingsController bővítése admin endpoint-okkal
6. ⏳ AdminController frissítése
7. ⏳ Frontend API kliens frissítése
8. ⏳ AppSettingsPage frissítése
9. ⏳ Tesztelés

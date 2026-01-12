# App Settings Refaktor - Összefoglaló

## ✅ Elvégzett változtatások

### 1. SiteSettingsService bővítése
- ✅ Hozzáadva: `getMapSettings(tenantId)` - admin metódus
- ✅ Hozzáadva: `setMapSettings(tenantId, settings)` - admin metódus
- ✅ Hozzáadva: `getSiteSettingsForAdmin(tenantId)` - admin metódus (kompatibilis formátum)
- ✅ Hozzáadva: `setSiteSettings(tenantId, settings)` - admin metódus

### 2. AppSettingsController tisztítása
- ✅ Eltávolítva: `/:lang/map-settings` endpoint (tenant-specifikus)
- ✅ Eltávolítva: `/:lang/site-settings` endpoint (tenant-specifikus)
- ✅ Eltávolítva: `TenantKeyResolverService` import (már nem kell)
- ✅ Megtartva: `/app-settings/default-language` (globális)
- ✅ Megtartva: `/app-settings/active-tenants-count` (globális)

### 3. AdminAppSettingsService tisztítása
- ✅ Eltávolítva: `getMapSettings(tenantId)` metódus
- ✅ Eltávolítva: `setMapSettings(tenantId, settings)` metódus
- ✅ Eltávolítva: `getSiteSettings(tenantId)` metódus
- ✅ Eltávolítva: `setSiteSettings(tenantId, settings)` metódus
- ✅ Eltávolítva: nem használt importok (`isValidImageUrl`, `sanitizeImageUrl`, `BadRequestException`)
- ✅ Megtartva: `getDefaultLanguage()` (globális)
- ✅ Megtartva: `setDefaultLanguage(lang)` (globális)
- ✅ Megtartva: `findAll()`, `findOne()`, `upsert()`, `delete()` (általános AppSetting kezelés)

### 4. SiteSettingsController bővítése
- ✅ Hozzáadva: `AdminSiteSettingsController` új controller
- ✅ Hozzáadva: `GET /api/admin/site-settings?tenantId=...` endpoint
- ✅ Hozzáadva: `PUT /api/admin/site-settings` endpoint
- ✅ Hozzáadva: `GET /api/admin/site-settings/map-settings?tenantId=...` endpoint
- ✅ Hozzáadva: `PUT /api/admin/site-settings/map-settings` endpoint
- ✅ Hozzáadva: Guards és role-based access control

### 5. AdminController frissítése
- ✅ Eltávolítva: `/api/admin/app-settings/map-settings` endpoint
- ✅ Eltávolítva: `/api/admin/app-settings/site-settings` endpoint
- ✅ Hozzáadva: `SiteSettingsService` dependency injection
- ✅ Megjegyzés: Az endpoint-ok most az `AdminSiteSettingsController`-ben vannak

### 6. SeoController frissítése
- ✅ Frissítve: `appSettingsService.getSiteSettings()` → `siteSettingsService.getSiteSettingsForAdmin()`
- ✅ Frissítve: `AdminModule` import → `SiteSettingsModule` import

### 7. Modulok frissítése
- ✅ `SiteSettingsModule`: Hozzáadva `AuthModule` import (guards-okhoz)
- ✅ `SiteSettingsModule`: Exportálva `SiteSettingsService`
- ✅ `AdminModule`: Hozzáadva `SiteSettingsModule` import
- ✅ `SeoModule`: Frissítve `AdminModule` → `SiteSettingsModule` import
- ✅ `AppSettingsModule`: Eltávolítva `TenantKeyResolverService` provider

## 📊 Végleges struktúra

### AppSettings (globális, AppSetting táblában)
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
# Public endpoints
GET  /api/public/site?lang=hu&tenantKey=etyek-budai
GET  /api/:lang/:tenantKey/site-settings

# Admin endpoints
GET  /api/admin/site-settings?tenantId=...
PUT  /api/admin/site-settings
GET  /api/admin/site-settings/map-settings?tenantId=...
PUT  /api/admin/site-settings/map-settings
```

## ✅ Ellenőrzés

- ✅ Nincs több tenant-specifikus metódus az `AdminAppSettingsService`-ben
- ✅ Nincs több tenant-specifikus endpoint az `AppSettingsController`-ben
- ✅ Minden tenant-specifikus logika a `SiteSettingsService`-ben van
- ✅ Admin endpoint-ok az `AdminSiteSettingsController`-ben vannak
- ✅ Guards és role-based access control helyesen beállítva
- ✅ Nincs duplikáció

## 🎯 Eredmény

Az AppSettings most **csak globális beállításokat** tartalmaz:
- `defaultLanguage` - alapértelmezett nyelv
- `active-tenants-count` - multi-tenant mód detektálás
- Általános AppSetting CRUD műveletek

A SiteSettings tartalmazza **minden tenant-specifikus beállítást**:
- Map settings (SiteInstance.mapConfig)
- Site settings (Brand + TenantTranslation + SiteInstance)
- Admin endpoint-ok a módosításhoz

A struktúra most tiszta és konzisztens! 🎉

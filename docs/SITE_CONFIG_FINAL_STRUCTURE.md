# SiteConfig végső struktúra - Felosztás

## Jelenlegi helyzet és végső felosztás

### ✅ SiteInstance (Deploy/Instance/Runtime Override)
**Maradjon a SiteInstance-ban:**
- `domain` - deploy/instance specifikus domain (pl. `etyek.localo.app`)
- `lang` - nyelv (hu/en/de)
- `isDefault` - default instance flag
- `mapConfig` - **instance-specific map override** (felülírja a Brand.mapDefaults-t)
  - `townId`, `lat`, `lng`, `zoom` - deploy/instance specifikus térkép beállítások
- `features` - **runtime/deploy specifikus feature flags**
  - `enableEvents` - események engedélyezése
  - `enableBlog` - blog engedélyezése
  - `enableStaticPages` - statikus oldalak engedélyezése
  - `cookieConsent` - cookie consent engedélyezése
  - `seo.indexable` - robots/index meta (deploy specifikus)

**Indoklás:** Ezek deploy/instance/runtime override beállítások, amelyek instance-onként eltérhetnek.

---

### ✅ Brand (Brand Assets & Defaults)
**Maradjon a Brand-ben:**
- `name` - brand neve
- `logoUrl` - brand logó
- `faviconUrl` - brand favicon
- `theme` - brand styling (színek, tipográfia, stb.)
- `placeholders` - **default képek** (brand szintű)
  - `defaultPlaceholderCardImage` - default kártya kép
  - `defaultPlaceholderDetailHeroImage` - default detail hero kép
  - `defaultEventPlaceholderCardImage` - default esemény kártya kép
  - `brandBadgeIcon` - brand badge ikon
- `mapDefaults` - **map default beállítások** (brand szintű)
  - `townId`, `lat`, `lng`, `zoom` - alapértelmezett térkép beállítások

**Indoklás:** Ezek brand szintű assets és defaults, amelyek minden instance-on ugyanazok.

**Merge logika:**
```
Final Map Config = Brand.mapDefaults (base) + SiteInstance.mapConfig (override)
```

---

### ✅ TenantTranslation (Nyelvfüggő tartalom)
**Maradjon a TenantTranslation-ben:**
- `name` - tenant neve (nyelvspecifikus)
- `shortDescription` - rövid leírás (nyelvspecifikus)
- `description` - teljes leírás (nyelvspecifikus)
- `heroImage` - hero kép (nyelvspecifikus)
- `seoTitle` - SEO cím (nyelvspecifikus)
- `seoDescription` - SEO leírás (nyelvspecifikus)
- `seoImage` - SEO kép (nyelvspecifikus)
- `seoKeywords` - SEO kulcsszavak (nyelvspecifikus)

**Indoklás:** Ezek nyelvfüggő tartalmak, amelyek tenant+lang kombinációhoz tartoznak.

---

## Összefoglaló táblázat

| Beállítás típus | Hely | Indoklás |
|----------------|------|----------|
| **Domain** | SiteInstance | Deploy/instance specifikus |
| **Lang** | SiteInstance | Instance specifikus nyelv |
| **isDefault** | SiteInstance | Instance flag |
| **Map Config (override)** | SiteInstance.mapConfig | Instance-specific override |
| **Features (runtime)** | SiteInstance.features | Runtime/deploy specifikus |
| **Logo, Favicon** | Brand | Brand asset |
| **Theme** | Brand | Brand styling |
| **Placeholders (defaults)** | Brand.placeholders | Brand szintű defaults |
| **Map Defaults** | Brand.mapDefaults | Brand szintű defaults |
| **Nyelvfüggő tartalom** | TenantTranslation | Tenant+lang specifikus |

---

## Merge/Override logika

### Map Settings
```typescript
// 1. Brand.mapDefaults (base)
const brandDefaults = tenant.brand.mapDefaults || {};

// 2. SiteInstance.mapConfig (override)
const instanceConfig = siteInstance.mapConfig || {};

// 3. Final (deep merge)
const finalMapConfig = deepMerge(brandDefaults, instanceConfig);
```

### Features
```typescript
// 1. App defaults (hardcoded)
const appDefaults = {
  events: true,
  blog: true,
  knowledgeBase: true,
  cookieConsent: true,
};

// 2. SiteInstance.features (override)
const instanceFeatures = siteInstance.features || {};

// 3. Final (deep merge)
const finalFeatures = deepMerge(appDefaults, instanceFeatures);
```

### Placeholders
```typescript
// Csak Brand.placeholders (nincs override)
const placeholders = tenant.brand.placeholders || {
  defaultPlaceholderCardImage: null,
  defaultPlaceholderDetailHeroImage: null,
  defaultEventPlaceholderCardImage: null,
  brandBadgeIcon: null,
};
```

### SEO
```typescript
// TenantTranslation (nyelvspecifikus)
const seo = {
  title: translation.seoTitle,
  description: translation.seoDescription,
  image: translation.seoImage,
  keywords: translation.seoKeywords,
  indexable: siteInstance.features?.seo?.indexable ?? true, // runtime override
};
```

---

## Jelenlegi implementáció ellenőrzése

### ✅ Jó helyen van:
- SiteInstance.domain ✅
- SiteInstance.lang ✅
- SiteInstance.isDefault ✅
- SiteInstance.mapConfig ✅ (override)
- SiteInstance.features ✅ (runtime)
- Brand.logoUrl, faviconUrl ✅
- Brand.theme ✅
- Brand.placeholders ✅
- Brand.mapDefaults ✅
- TenantTranslation.* ✅

### ⚠️ Ellenőrizendő:
- Nincs duplikáció Brand és SiteInstance között
- A merge logika helyesen működik (deepMerge)
- A SiteSettingsService helyesen olvassa be az összes adatot

---

## Következő lépések

1. ✅ Struktúra megerősítve - minden jó helyen van
2. ⏳ Refaktor: AdminAppSettingsService tisztítása (tenant-specifikus metódusok kivétele)
3. ⏳ Refaktor: SiteSettingsService bővítése admin metódusokkal
4. ⏳ Refaktor: Endpoint-ok áthelyezése

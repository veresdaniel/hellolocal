# Site Architecture - Tenant to Site Migration

## Áttekintés

A rendszer átállt **Tenant**-alapúról **Site**-alapú architektúrára. Ez a változás **csak a publikus rétegre** (UI, fordítások, API endpoint-ok) vonatkozik. A **technikai réteg** (adatbázis, kód változónevek, típusok) változatlan maradt.

## Naming Convention

### Publikus réteg (User-facing)

- **"Tenant"** → **"Site"** (angol)
- **"Terület"** → **"Site"** (magyar)
- **"Gebiet"** → **"Site"** (német)

### Technikai réteg (Database & Code)

- **Adatbázis táblák**: `Tenant`, `TenantKey`, `TenantTranslation`, `TenantMembership` - **változatlan**
- **Prisma model-ek**: `Tenant`, `TenantKey` - **változatlan**
- **TypeScript típusok**: `Tenant`, `TenantKey` - **változatlan**
- **Változónevek**: `tenantId`, `tenantKey`, `tenant` - **változatlan**
- **API endpoint-ok**: `/api/public/:lang/:tenantKey/*` - **változatlan** (backward compatibility)

## Site Resolve Middleware (Canonical Flow)

A Site-alapú architektúra gerince a `SiteResolveMiddleware`.

### HTTP Request Flow

```
HTTP request → /:lang/:siteKey/*
```

### Resolve Lépések (Prioritás szerint)

#### Priority 1: Domain-based Resolution (Legmagasabb prioritás)

1. **Host header** → **SiteInstance.domain** match
2. Ha talál match-et → **SiteInstance.tenantId** → **Site**
3. **SiteInstance.lang**-ot használja (nem az URL-ből jövő lang-ot)
4. Attach: `req.site = { siteId, canonicalKey: null, redirected: false, lang }`

Ez lehetővé teszi a **multidomain** működést (pl. `etyek.local` → Etyek site, `budai.local` → Budai site).

#### Priority 2: URL-based Resolution

1. **siteKey + lang** → **SiteKey** (TenantKey tábla lookup)
2. Ha redirect van → **301 redirect** a canonical URL-re
3. **SiteKey.siteId** → **Site** (Tenant tábla verifikáció)
4. Attach: `req.site = { siteId, canonicalKey, redirected, lang }`

### Request Context

Minden request után a `req.site` objektum elérhető:

```typescript
type SiteCtx = {
  siteId: string;        // Tenant.id (adatbázis ID)
  canonicalKey: string | null;  // Canonical siteKey (TenantKey.slug)
  redirected: boolean;   // Volt-e redirect
  lang: Lang;            // Nyelv
};
```

### Példa használat

```typescript
// Controller-ben
@Get()
async list(@Req() req: RequestWithSite) {
  const siteId = req.site?.siteId;  // Tenant.id
  const lang = req.site?.lang;      // Lang
  // ...
}
```

## Adatbázis Struktúra

A technikai réteg változatlan maradt:

```prisma
model Tenant {
  id       String   @id
  slug     String   @unique
  isActive Boolean
  
  tenantKeys TenantKey[]
  // ...
}

model TenantKey {
  id       String   @id
  tenantId String   // → siteId
  lang     Lang
  slug     String   // → siteKey
  
  tenant   Tenant   @relation(...)
  // ...
}
```

### Mapping

- **Site** (publikus) = **Tenant** (technikai)
- **SiteKey** (publikus) = **TenantKey** (technikai)
- **siteId** (publikus) = **tenantId** (technikai)
- **siteKey** (publikus) = **tenantKey.slug** (technikai)

## API Endpoint-ok

### Publikus API

A route-ok továbbra is `tenantKey` paramétert használnak (backward compatibility):

```
GET /api/public/:lang/:tenantKey/places
GET /api/public/:lang/:tenantKey/events
GET /api/public/:lang/:tenantKey/tenants
```

A middleware automatikusan kezeli a `tenantKey` → `siteKey` mapping-ot.

## Fordítások

Minden user-facing szöveg át lett nevezve:

### Magyar (hu.json)
- "Terület" → "Site"
- "Területek" → "Site-ok"
- "Terület tagságok" → "Site tagságok"

### Angol (en.json)
- "Tenant" → "Site"
- "Tenant Memberships" → "Site Memberships"
- "Tenant Admin" → "Site Admin"

### Német (de.json)
- "Gebiet" → "Site"
- "Gebiete" → "Sites"
- "Gebietsmitgliedschaften" → "Site-Mitgliedschaften"

## Migráció Összefoglaló

### Változott

✅ **Publikus réteg**:
- UI szövegek (fordítások)
- Admin felület címkéi
- Error üzenetek
- Dokumentáció

✅ **Middleware**:
- `SiteResolveMiddleware` létrehozva (canonical flow)
- `TenantResolveMiddleware` eltávolítva
- `DomainTenantResolverMiddleware` eltávolítva

✅ **TypeScript típusok**:
- `SiteCtx` type létrehozva
- `RequestWithSite` interface létrehozva
- `express.d.ts` frissítve

### Változatlan

❌ **Adatbázis**:
- Táblák nevei (`Tenant`, `TenantKey`)
- Mezők nevei (`tenantId`, `tenantKey`)
- Séma struktúra

❌ **Kód**:
- Prisma model-ek
- Service-ek belső logikája
- Változónevek (`tenantId`, `tenant`, stb.)
- API endpoint path-ek (`/:tenantKey/`)

## Best Practices

### Új kód írásakor

1. **Publikus rétegben**: Használd a "Site" terminológiát
2. **Technikai rétegben**: Használd a "Tenant" terminológiát
3. **Request context**: Használd a `req.site` objektumot a middleware-ből
4. **Adatbázis query-k**: Használd a `Tenant` és `TenantKey` model-eket

### Példa

```typescript
// ✅ JÓ: Publikus rétegben Site terminológia
const siteName = t("admin.site"); // "Site"
const siteId = req.site?.siteId;

// ✅ JÓ: Technikai rétegben Tenant terminológia
const tenant = await prisma.tenant.findUnique({
  where: { id: siteId }
});

// ❌ ROSSZ: Ne keverd
const tenantName = t("admin.site"); // Site legyen
const site = await prisma.tenant.findUnique(...); // Tenant legyen
```

## Multidomain Support

A SiteResolveMiddleware támogatja a **multidomain** működést:

### Domain-based Resolution

Ha egy request egy custom domain-ről jön (pl. `etyek.local`, `budai.local`), a middleware:

1. Keresi a `SiteInstance` táblában a `domain` mező alapján
2. Ha talál match-et, automatikusan beállítja a `req.site` objektumot
3. A `SiteInstance.lang`-ot használja (nem az URL-ből jövő lang-ot)
4. Nincs szükség `siteKey` paraméterre a URL-ben

### Példa

```typescript
// Request: http://etyek.local/api/public/places
// → SiteInstance.domain = "etyek.local" match
// → req.site = { siteId: "etyek-tenant-id", canonicalKey: null, redirected: false, lang: "hu" }

// Request: http://budai.local/api/public/places  
// → SiteInstance.domain = "budai.local" match
// → req.site = { siteId: "budai-tenant-id", canonicalKey: null, redirected: false, lang: "hu" }
```

### Lokális fejlesztés

A `/etc/hosts` fájlban beállított custom domain-ek működnek:

```
127.0.0.1 etyek.local
127.0.0.1 budai.local
```

A `SiteInstance` táblában lévő `domain` mezők automatikusan feloldódnak.

## Backward Compatibility

A rendszer **backward compatible** maradt:

- API endpoint-ok továbbra is `tenantKey` paramétert várnak
- A middleware automatikusan kezeli a `tenantKey` → `siteKey` mapping-ot
- Régi kód továbbra is működik (deprecated, de nem broken)
- **Multidomain support** továbbra is működik (domain-based resolution)

## Jövőbeli Refactor

Hosszú távon lehetőség van a teljes technikai réteg átnevezésére is:

- `Tenant` → `Site` (adatbázis táblák)
- `TenantKey` → `SiteKey` (adatbázis táblák)
- `tenantId` → `siteId` (változónevek)
- `tenantKey` → `siteKey` (API paraméterek)

Ez egy **major breaking change** lenne, és migration script-eket igényelne.

## Kapcsolódó Dokumentáció

- [Tenant Resolution Refactor](./tenant-resolution-refactor.md) - Régi tenant resolution dokumentáció
- [Domain-based Tenant Resolution](./domain-based-tenant-resolution.md) - Domain alapú resolution (deprecated)

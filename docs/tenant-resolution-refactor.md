# Tenant Resolution Refactor Guide

Ez a dokumentum leírja a tenant resolution refactor folyamatát és a jövőbeli teljes refactor lehetőségét.

## Jelenlegi állapot (2025-01)

### Új megoldás: `TenantResolveMiddleware`

Az új egyesített middleware (`TenantResolveMiddleware`) beállítja a `req.tenantCtx` objektumot minden request-re:

```typescript
type TenantCtx = {
  lang: Lang;
  tenantId: string;
  canonicalTenantKey?: string | null;
  tenantKeyRedirected?: boolean;
  siteInstanceId?: string | null;
  domain?: string | null;
};
```

### Feloldási prioritás

1. **Domain alapú** (legmagasabb prioritás)
   - Host header → `SiteInstance.domain` match
   - Ha talál, a `siteInstance.lang`-ot használja (nem az URL-ből jövő lang-ot)

2. **TenantKey alapú**
   - Path param: `/api/public/:lang/:tenantKey/...`
   - Query param: `/api/:lang/places?tenantKey=...`
   - Priority: path param > query param

3. **Fallback**
   - `SiteInstance.isDefault=true` és `domain=null` a megadott lang-hoz

### Visszafelé kompatibilitás

Az új middleware **visszafelé kompatibilis**:
- Beállítja a `req.tenantCtx`-et (új)
- Beállítja a `req.resolvedTenantFromDomain`-et is (régi, meglévő kódokhoz)
- A `TenantKeyResolverService.resolve()` és `resolveFromRequest()` továbbra is működik

## Jelenlegi használat (hibrid megoldás)

### Régi módszer (még működik, de deprecated)

```typescript
// Controller
@Get()
async list(
  @Param("lang") lang: string,
  @Query("tenantKey") tenantKey?: string
) {
  // Service-ben manuálisan feloldás
  const tenant = await this.tenantResolver.resolveFromRequest(req, {
    lang,
    tenantKey,
  });
  // ...
}
```

### Új módszer (ajánlott)

```typescript
// Controller
@Get()
async list(
  @Param("lang") lang: string,
  @Req() req: Request & { tenantCtx?: TenantCtx }
) {
  // Middleware már feloldotta
  const tenantId = req.tenantCtx?.tenantId; // always present
  const effectiveLang = req.tenantCtx?.lang; // may differ from URL lang (domain-based)
  // ...
}
```

## Teljes refactor terv (jövőbeli)

### 1. Controller refactor

**Cél**: Minden controller használja a `req.tenantCtx`-et közvetlenül, ne hívja a `TenantKeyResolverService`-t.

**Lépések**:
1. Keresd meg az összes helyet, ahol `tenantResolver.resolve()` vagy `resolveFromRequest()` hívódik
2. Cseréld le `req.tenantCtx` használatára
3. Távolítsd el a `tenantKey` paramétereket a controller method signature-ökből (ha csak tenant resolution miatt voltak)

**Példa refactor**:

```typescript
// ELŐTTE
@Get()
async list(
  @Param("lang") lang: string,
  @Query("tenantKey") tenantKey?: string
) {
  const tenant = await this.tenantResolver.resolveFromRequest(req, {
    lang,
    tenantKey,
  });
  return this.service.list({
    lang: tenant.lang,
    tenantId: tenant.tenantId,
    // ...
  });
}

// UTÁNA
@Get()
async list(@Req() req: Request & { tenantCtx: TenantCtx }) {
  return this.service.list({
    lang: req.tenantCtx.lang,
    tenantId: req.tenantCtx.tenantId,
    // ...
  });
}
```

### 2. Service refactor

**Cél**: Services ne kapják a `lang` és `tenantKey` paramétereket, hanem közvetlenül a `tenantId`-t.

**Lépések**:
1. Frissítsd a service method signature-öket, hogy `tenantId`-t várjanak `lang` + `tenantKey` helyett
2. A controller-ből add át a `req.tenantCtx.tenantId`-t
3. Ha a service-nek szüksége van a lang-ra, add át `req.tenantCtx.lang`-ot

**Példa refactor**:

```typescript
// ELŐTTE
async list(args: { lang: string; tenantKey?: string; ... }) {
  const tenant = await this.tenantResolver.resolve({
    lang: args.lang,
    tenantKey: args.tenantKey,
  });
  // ...
}

// UTÁNA
async list(args: { tenantId: string; lang: Lang; ... }) {
  // tenantId közvetlenül használható, nincs feloldás
  // ...
}
```

### 3. Deprecated kód eltávolítása

**Cél**: Távolítsd el a régi megoldásokat, ha már mindenhol az új van.

**Lépések**:
1. Távolítsd el a `DomainTenantResolverMiddleware`-t (ha már nincs rá szükség)
2. A `TenantKeyResolverService`-t megtarthatod, de csak belső használatra (pl. admin panel, migration scriptek)
3. Frissítsd a típusokat, hogy a `resolvedTenantFromDomain` opcionális legyen (vagy távolítsd el)

### 4. Route pattern egységesítés

**Cél**: Döntsd el, hogy query param vagy path param a standard.

**Jelenleg**:
- `/api/:lang/places?tenantKey=...` (query param)
- `/api/public/:lang/:tenantKey/places` (path param)

**Javaslat**: Path param legyen a standard (tisztább URL-ek, SEO-friendly), de query param is működjön visszafelé kompatibilitás miatt.

## Migration checklist

- [ ] 1. Controller refactor: cseréld le `tenantResolver.resolve()` hívásokat `req.tenantCtx`-re
- [ ] 2. Service refactor: frissítsd a signature-öket, hogy `tenantId`-t várjanak
- [ ] 3. Távolítsd el a `tenantKey` query param-eket, ahol csak tenant resolution miatt voltak
- [ ] 4. Frissítsd a teszteket
- [ ] 5. Frissítsd a dokumentációt
- [ ] 6. Deprecated kód eltávolítása (opcionális)

## Best practices

### Localhost/IP kezelés

A middleware csak akkor hagyja ki a domain resolution-t, ha:
- `domain === "localhost"` (pontos egyezés)
- `domain.startsWith("localhost.")` (localhost subdomain)
- IP cím (IPv4 vagy IPv6)

**Custom domainek a hosts file-ban** (pl. `etyek.localo.test`) **működnek**, ha van hozzájuk `SiteInstance` rekord.

### SiteInstance.isDefault használata

A fallback tenant resolution `SiteInstance.isDefault=true` és `domain=null` kombinációt használ.

**Fontos**: Minden nyelvhez legyen legalább egy default `SiteInstance`:

```sql
-- Példa: default SiteInstance létrehozása
INSERT INTO "SiteInstance" (id, "tenantId", domain, lang, "isDefault", "createdAt", "updatedAt")
VALUES (
  'site-default-hu',
  'tenant-id',
  NULL,  -- domain=null a fallback-hoz
  'hu',
  true,  -- isDefault=true
  NOW(),
  NOW()
);
```

### Domain vs URL lang konfliktus

Ha domain alapú resolution történik, a middleware a `siteInstance.lang`-ot használja, nem az URL-ből jövő lang-ot. Ez azért van, mert a domain canonical identifier, és a lang-ot is a domain határozza meg.

Ha ez problémát okoz, lehetőség van a logika módosítására, de jelenleg ez a kívánt viselkedés.

## Kérdések / Problémák

Ha bármilyen kérdés vagy probléma merül fel a refactor során, dokumentáld itt:

- [ ] Kérdés 1: ...
- [ ] Kérdés 2: ...

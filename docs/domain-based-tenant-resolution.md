# Domain-based Tenant Resolution

Ez a dokumentum leírja, hogyan működik a domain-alapú tenant feloldás és hogyan lehet lokális fejlesztői környezetben tesztelni.

## Hogyan működik?

A tenant feloldás sorrendje:

1. **Host header (domain)** → `SiteInstance.domain` match
2. Ha nincs match → **URL `/:tenantKey`** alapján
3. Ha az sincs → **default tenant**

### Implementáció

A `DomainTenantResolverMiddleware` fut minden request előtt és:

1. Kinyeri a `Host` header-t a request-ből
2. Keresi a `SiteInstance` táblában a `domain` mező alapján
3. Ha talál match-et, beállítja a `request.resolvedTenantFromDomain` property-t
4. Ha nincs match, a request továbbhalad, és a `TenantKeyResolverService` kezeli a URL alapú feloldást

A `TenantKeyResolverService.resolve()` metódus prioritása:

1. **Domain alapú feloldás** (ha `domainResolvedTenant` paraméter van)
2. **URL alapú feloldás** (ha `tenantKey` paraméter van)
3. **Default tenant** (ha egyik sincs)

## Lokális fejlesztés

A lokális fejlesztői környezetben több domain-t is be lehet állítani a `/etc/hosts` fájlban.

### macOS / Linux

Szerkeszd a `/etc/hosts` fájlt (sudo szükséges):

```bash
sudo nano /etc/hosts
```

Adj hozzá sorokat, pl.:

```
127.0.0.1 etyek.local
127.0.0.1 budai.local
127.0.0.1 test.local
```

Mentés után a domain-ek azonnal elérhetők lesznek a böngészőben.

### Windows

Szerkeszd a `C:\Windows\System32\drivers\etc\hosts` fájlt (adminisztrátori jogosultság szükséges):

```
127.0.0.1 etyek.local
127.0.0.1 budai.local
127.0.0.1 test.local
```

### SiteInstance beállítás

A domain-ek működéséhez létre kell hozni `SiteInstance` rekordokat az adatbázisban:

```sql
-- Példa: Etyek tenant domain beállítása
INSERT INTO "SiteInstance" (id, "tenantId", domain, lang, "isDefault", "createdAt", "updatedAt")
VALUES (
  'site-instance-1',
  'tenant-id-etyek',  -- Etyek tenant ID
  'etyek.local',
  'hu',
  true,
  NOW(),
  NOW()
);

-- Példa: Budai tenant domain beállítása
INSERT INTO "SiteInstance" (id, "tenantId", domain, lang, "isDefault", "createdAt", "updatedAt")
VALUES (
  'site-instance-2',
  'tenant-id-budai',  -- Budai tenant ID
  'budai.local',
  'hu',
  true,
  NOW(),
  NOW()
);
```

Vagy használd az admin felületet a `SiteInstance` létrehozásához.

### Tesztelés

1. Indítsd el az API szervert (pl. `http://localhost:3002`)
2. Indítsd el a frontend-et (pl. `http://localhost:5173`)
3. Böngészőben nyisd meg:
   - `http://etyek.local:5173` → Etyek tenant
   - `http://budai.local:5173` → Budai tenant
   - `http://localhost:5173/hu/etyek-budai` → URL alapú feloldás (ha nincs domain match)

### Fontos megjegyzések

- A middleware **kihagyja** a `localhost` és IP címeket (pl. `127.0.0.1`, `localhost:3002`)
- Csak **valódi domain neveket** használ feloldásra (pl. `etyek.local`, `budai.local`)
- Ha a domain nem található a `SiteInstance` táblában, a rendszer automatikusan a URL alapú feloldásra vált
- A domain alapú feloldás **prioritást élvez** a URL alapú feloldással szemben

## Használat a kódban

### Service-ekben

Ha a service hozzáfér a request objektumhoz, használd a `resolveFromRequest()` metódust:

```typescript
import { TenantKeyResolverService } from "../tenant/tenant-key-resolver.service";
import { Request } from "express";

@Injectable()
export class MyService {
  constructor(
    private readonly tenantResolver: TenantKeyResolverService
  ) {}

  async myMethod(request: Request, lang: string, tenantKey?: string) {
    // Automatikusan kezeli a domain alapú feloldást
    const tenant = await this.tenantResolver.resolveFromRequest(request, {
      lang,
      tenantKey,
    });
    
    // tenant.tenantId, tenant.lang, stb.
  }
}
```

### Controller-ekben

A controller-ekben ugyanúgy használható:

```typescript
@Controller("/api/public/:lang/:tenantKey")
export class MyController {
  constructor(
    private readonly tenantResolver: TenantKeyResolverService
  ) {}

  @Get("something")
  async getSomething(
    @Req() request: Request,
    @Param("lang") lang: string,
    @Param("tenantKey") tenantKey: string
  ) {
    const tenant = await this.tenantResolver.resolveFromRequest(request, {
      lang,
      tenantKey,
    });
    
    // tenant.tenantId, tenant.lang, stb.
  }
}
```

### Ha nincs hozzáférés a request-hez

Ha a service nem fér hozzá a request-hez, használd a `resolve()` metódust közvetlenül:

```typescript
const tenant = await this.tenantResolver.resolve({
  lang,
  tenantKey,
  // domainResolvedTenant opcionális, ha van
});
```

## Debugging

A middleware logolja a domain feloldást. A log szintjét beállíthatod a `NestJS` logger konfigurációjában.

Példa log üzenetek:

```
[DomainTenantResolverMiddleware] Domain-based tenant resolved: etyek.local → tenantId=xxx, lang=hu
[DomainTenantResolverMiddleware] No SiteInstance found for domain: unknown.local
[DomainTenantResolverMiddleware] Skipping domain resolution for localhost/IP: localhost
```

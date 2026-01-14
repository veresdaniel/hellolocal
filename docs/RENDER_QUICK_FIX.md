# Render.com Quick Fix - Site Not Found

## Probléma

A console logok mutatják:
1. `VITE_API_URL: 'not set'` - A frontend nem tudja elérni a backend-et
2. `Site key not found: balatonfelvidek for lang: hu` - A backend nem találja a site-ot

## Megoldás

### 1. Frontend Environment Változó Beállítása

**Render Dashboard → `hellolocal-frontend` service → Environment**

Add hozzá:
```
VITE_API_URL=https://hellolocal-api.onrender.com
```

**FONTOS**: 
- A `VITE_*` változók **build-time** változók
- Miután hozzáadtad, **ÚJRA KELL BUILDELNI** a frontend-et!
- Render Dashboard → Manual Deploy → Clear build cache & deploy

### 2. Backend Environment Változó Beállítása

**Render Dashboard → `hellolocal-api` service → Environment**

Add hozzá (ha még nincs):
```
CORS_ORIGIN=https://hellolocal-fe.onrender.com
```

### 3. SiteKey Ellenőrzése

Ha a `balatonfelvidek` site létezik az adatbázisban, de még mindig nem működik:

**Render Dashboard → `hellolocal-api` service → Shell**

Futtasd:
```bash
cd apps/api
pnpm db:debug-site balatonfelvidek
```

Ez megmutatja:
- Létezik-e a site
- Aktív-e
- Vannak-e SiteKey-ek minden nyelvhez

Ha hiányoznak SiteKey-ek:
```bash
pnpm db:fix-all-sites
```

## Ellenőrzés

1. **Frontend build után**, nyisd meg: `https://hellolocal-fe.onrender.com/hu/balatonfelvidek`
2. **Console-ban** most már látnod kellene:
   - `apiBaseUrl: 'https://hellolocal-api.onrender.com'` (nem "empty")
   - `viteApiUrl: 'https://hellolocal-api.onrender.com'` (nem "not set")
3. **Ha még mindig 404**, akkor a backend logokban nézd meg, hogy mi a pontos hiba

## Gyors Checklist

- [ ] `VITE_API_URL` beállítva a frontend service-ben
- [ ] Frontend újra buildelve (Manual Deploy)
- [ ] `CORS_ORIGIN` beállítva a backend service-ben
- [ ] `pnpm db:debug-site balatonfelvidek` futtatva
- [ ] Ha hiányoznak SiteKey-ek: `pnpm db:fix-all-sites` futtatva

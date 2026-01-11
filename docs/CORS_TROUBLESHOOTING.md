# 🔧 CORS Hibaelhárítási Útmutató

## Probléma: PreflightMissingAllowOriginHeader

Ha a frontend `PreflightMissingAllowOriginHeader` hibát kap, az azt jelenti, hogy a backend nem küldi a megfelelő CORS header-eket az OPTIONS preflight kérésre.

## Gyors Megoldás

### 1. Ellenőrizd a Render.com Environment Variables-t

Menj a **Backend API** service-hez (`hellolocal-api`) a Render.com Dashboard-on:

1. Kattints az **"Environment"** tab-ra
2. Ellenőrizd, hogy van-e `CORS_ORIGIN` változó
3. Ha nincs, **add hozzá**:
   ```
   CORS_ORIGIN=https://hellolocal-fe.onrender.com
   ```
   **Fontos**: A frontend URL-nek **pontosan** egyeznie kell! (nincs trailing slash)

4. Kattints **"Save Changes"** gombra
5. A backend automatikusan újraindul

### 2. Ellenőrizd a Frontend URL-t

A `CORS_ORIGIN`-ben megadott URL-nek **pontosan** egyeznie kell a frontend URL-jével:

- ✅ Jó: `CORS_ORIGIN=https://hellolocal-fe.onrender.com` és frontend: `https://hellolocal-fe.onrender.com`
- ❌ Rossz: `CORS_ORIGIN=https://hellolocal-frontend.onrender.com` és frontend: `https://hellolocal-fe.onrender.com`
- ❌ Rossz: `CORS_ORIGIN=https://hellolocal-fe.onrender.com/` (trailing slash!)

### 3. Több Origin Támogatása

Ha több origin-t szeretnél engedélyezni (pl. custom domain), add hozzá vesszővel elválasztva:

```
CORS_ORIGIN=https://hellolocal-fe.onrender.com,https://hellolocal.com,https://www.hellolocal.com
```

### 4. Fallback: FRONTEND_URL

Ha a `CORS_ORIGIN` nincs beállítva, de a `FRONTEND_URL` igen, akkor azt használja fallback-ként. De **ajánlott** a `CORS_ORIGIN` explicit beállítása.

## Diagnosztika

### 1. Backend Logok Ellenőrzése

A backend indításakor a logokban látnod kell:

**Ha CORS be van állítva:**
```
✅ CORS enabled for origins: https://hellolocal-fe.onrender.com
```

**Ha CORS nincs beállítva:**
```
⚠️  WARNING: CORS_ORIGIN and FRONTEND_URL are not set! CORS will be disabled and frontend requests will fail!
   Please set CORS_ORIGIN environment variable (e.g., CORS_ORIGIN=https://hellolocal-frontend.onrender.com)
```

**Ha egy kérés blokkolva van:**
```
❌ CORS blocked: Origin "https://hellolocal-fe.onrender.com" not in allowed list: [https://hellolocal-frontend.onrender.com]
```

### 2. Browser DevTools Ellenőrzése

1. Nyisd meg a **Network** tab-ot
2. Keresd meg a sikertelen kérést (pl. `login`)
3. Kattints rá, és nézd meg a **Headers** tab-ot
4. Az **Request Headers**-ben keresd meg az `Origin` header-t
5. Ez az érték **pontosan** egyeznie kell a `CORS_ORIGIN`-ben megadott értékkel

### 3. OPTIONS Preflight Kérés Tesztelése

Teszteld az OPTIONS preflight kérést curl-lal:

```bash
curl -X OPTIONS https://hellolocal-api.onrender.com/api/auth/login \
  -H "Origin: https://hellolocal-fe.onrender.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v
```

**Várt válasz:**
```
< HTTP/1.1 204 No Content
< Access-Control-Allow-Origin: https://hellolocal-fe.onrender.com
< Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
< Access-Control-Allow-Headers: Content-Type,Authorization,X-Requested-With
< Access-Control-Allow-Credentials: true
```

**Ha nincs `Access-Control-Allow-Origin` header:**
- A `CORS_ORIGIN` nincs beállítva vagy nem egyezik az `Origin` header-rel

## Gyakori Hibák

### 1. Trailing Slash

❌ **Rossz:**
```
CORS_ORIGIN=https://hellolocal-fe.onrender.com/
```

✅ **Jó:**
```
CORS_ORIGIN=https://hellolocal-fe.onrender.com
```

### 2. HTTP vs HTTPS

❌ **Rossz:** Ha a frontend HTTPS-en fut, de HTTP-et adsz meg:
```
CORS_ORIGIN=http://hellolocal-fe.onrender.com
```

✅ **Jó:**
```
CORS_ORIGIN=https://hellolocal-fe.onrender.com
```

### 3. Subdomain Különbség

❌ **Rossz:** Ha a frontend `hellolocal-fe.onrender.com`, de `hellolocal-frontend.onrender.com`-ot adsz meg:
```
CORS_ORIGIN=https://hellolocal-frontend.onrender.com
```

✅ **Jó:**
```
CORS_ORIGIN=https://hellolocal-fe.onrender.com
```

### 4. Port Szám (Development)

Development módban a port számnak is egyeznie kell:

✅ **Jó:**
```
CORS_ORIGIN=http://localhost:5173
```

❌ **Rossz:** Ha a frontend `localhost:3000`-on fut:
```
CORS_ORIGIN=http://localhost:5173
```

## Automatikus Javítás

A backend mostantól:
- ✅ Dinamikusan ellenőrzi az origin-eket
- ✅ Logolja, ha egy origin blokkolva van
- ✅ Jobban kezeli az OPTIONS preflight kéréseket
- ✅ Támogatja a wildcard subdomain-eket (pl. `*.render.com`)

## További Segítség

Ha még mindig nem működik:
1. Ellenőrizd a backend logokat a Render.com Dashboard-on
2. Ellenőrizd a browser DevTools Network tab-jában az exact `Origin` header-t
3. Ellenőrizd, hogy a `CORS_ORIGIN` pontosan egyezik-e az `Origin` header-rel
4. Próbáld meg manuálisan újraindítani a backend service-t

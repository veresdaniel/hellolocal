# Render.com Environment Variables Checklist

Ez a dokumentum tartalmazza az összes szükséges environment változót, amit be kell állítani a Render.com-on a helyes működéshez.

## Backend API Service (`hellolocal-api`)

### Kötelező változók:

1. **`DATABASE_URL`**
   - Render Internal Database URL
   - Formátum: `postgresql://user:password@host:port/database`
   - Render Dashboard → Database → Internal Database URL

2. **`JWT_SECRET`**
   - JWT token titkosítási kulcs
   - Generálás: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Hossz: minimum 32 karakter

3. **`CORS_ORIGIN`** ⚠️ **KRITIKUS**
   - Frontend URL-ek (vesszővel elválasztva)
   - Példa: `https://hellolocal-fe.onrender.com`
   - Több domain esetén: `https://hellolocal-fe.onrender.com,https://hellolocal.com`
   - **Ha nincs beállítva, minden frontend request blokkolva lesz!**

4. **`FRONTEND_URL`** (opcionális, fallback CORS_ORIGIN-hez)
   - Frontend URL
   - Példa: `https://hellolocal-fe.onrender.com`
   - Használható CORS_ORIGIN helyett, ha csak egy domain van

### Opcionális változók:

5. **`NODE_ENV`**
   - Alapértelmezett: `production` (beállítva a `render.yaml`-ban)

6. **`PORT`**
   - Alapértelmezett: `3002` (beállítva a `render.yaml`-ban)

7. **`JWT_EXPIRES_IN`**
   - Alapértelmezett: `7d`
   - Példa: `15m` (access token), `7d` (refresh token)

8. **`VAPID_PUBLIC_KEY`**, **`VAPID_PRIVATE_KEY`**, **`VAPID_SUBJECT`**
   - Web Push Notification kulcsok
   - Generálás: `npx web-push generate-vapid-keys`

## Frontend Web Service (`hellolocal-frontend`)

### Kötelező változók:

1. **`VITE_API_URL`** ⚠️ **KRITIKUS**
   - Backend API URL
   - Példa: `https://hellolocal-api.onrender.com`
   - **Fontos**: Build-time változó, újra kell buildelni, ha megváltozik!

2. **`FRONTEND_URL`** (opcionális, SEO-hoz)
   - Frontend URL
   - Példa: `https://hellolocal-fe.onrender.com`

3. **`VITE_HAS_MULTIPLE_SITES`** (opcionális)
   - Multi-site mód bekapcsolása
   - Értékek: `"true"` vagy `"false"`
   - Alapértelmezett: `true` (ha nincs beállítva)
   - **Fontos**: Build-time változó!

### Opcionális változók:

4. **`NODE_ENV`**
   - Alapértelmezett: `production` (beállítva a `render.yaml`-ban)

5. **`VITE_VAPID_PUBLIC_KEY`**
   - Web Push Notification public key (meg kell egyezzen a backend VAPID_PUBLIC_KEY-jével)

6. **`VITE_CLOUDINARY_CLOUD_NAME`**, **`VITE_CLOUDINARY_API_KEY`**, **`VITE_CLOUDINARY_UPLOAD_PRESET`**
   - Cloudinary konfiguráció (TipTap editor image/video upload-hoz)

## Gyors ellenőrző lista

### Backend API:
- [ ] `DATABASE_URL` beállítva
- [ ] `JWT_SECRET` beállítva
- [ ] `CORS_ORIGIN` beállítva (frontend URL-ek)
- [ ] `FRONTEND_URL` beállítva (opcionális)

### Frontend:
- [ ] `VITE_API_URL` beállítva (backend API URL)
- [ ] `VITE_HAS_MULTIPLE_SITES` beállítva (ha szükséges)
- [ ] `FRONTEND_URL` beállítva (opcionális)

## Gyakori problémák

### "Site not found" hiba
- Ellenőrizd, hogy a site-ok aktívak-e az adatbázisban
- Futtasd: `pnpm db:fix-all-sites` a backend-en
- Ellenőrizd a SiteKey-eket: `pnpm db:debug-site <site-slug>`

### CORS hiba (Network tab-ban pending requests)
- Ellenőrizd, hogy a `CORS_ORIGIN` tartalmazza-e a frontend URL-t
- Ellenőrizd a backend logokat: `❌ CORS blocked: Origin "..." not in allowed list`
- A `CORS_ORIGIN` értéke pontosan egyezzen a frontend URL-lel (https://...)

### API hívások nem működnek
- Ellenőrizd, hogy a `VITE_API_URL` helyes-e
- **Fontos**: A `VITE_*` változókat build-time kell beállítani!
- Ha megváltoztatod, újra kell buildelni a frontend-et

### Multi-site mód nem működik
- Ellenőrizd, hogy a `VITE_HAS_MULTIPLE_SITES` be van-e állítva `"true"`-ra
- **Fontos**: Build-time változó, újra kell buildelni!
- Ellenőrizd a build logokat, hogy a változó be van-e injektálva

## Render Dashboard beállítás

1. Menj a Render Dashboard-ra
2. Válaszd ki a service-t (pl. `hellolocal-api`)
3. Kattints az "Environment" fülre
4. Add hozzá a szükséges változókat
5. **Fontos**: A `VITE_*` változókat a frontend service-ben kell beállítani!
6. Mentsd el és várj a redeploy-re

## Tesztelés

Miután beállítottad az env var-okat:

1. **Backend logok ellenőrzése**:
   - Keress rá: `✅ CORS enabled for origins: ...`
   - Ha nem látod, akkor a `CORS_ORIGIN` nincs beállítva!

2. **Frontend Network tab**:
   - Nyisd meg a DevTools Network tab-ot
   - Próbáld meg betölteni egy site-ot
   - Ha a request-ek pending maradnak, valószínűleg CORS probléma

3. **Console ellenőrzése**:
   - Nyisd meg a browser console-t
   - Keress rá CORS hibákra
   - Ha van "CORS policy" hiba, akkor a `CORS_ORIGIN` rosszul van beállítva

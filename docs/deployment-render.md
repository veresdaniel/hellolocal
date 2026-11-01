# Deployment Útmutató - Render.com

> **Deprecated (2026-11).** Live production is **Hetzner** via `.github/workflows/deploy.yml` (SSH + Docker Compose). The repo `render.yaml` has been removed so Render Blueprint auto-setup is no longer implied. Keep this page only as historical notes; do not deploy new environments here. Delete any remaining Render services in the [Render dashboard](https://dashboard.render.com). See [DEPLOYMENT.md](DEPLOYMENT.md) and `deploy/`.

Ez az útmutató lépésről lépésre bemutatja, hogyan telepítsd a HelloLocal alkalmazást a **Render.com** platformra, amely **ingyenes kezdéshez** és automatikus HTTPS-t biztosít.

## 🎯 Miért Render.com?

- ✅ **Ingyenes PostgreSQL** adatbázis (90 nap inaktivitás után törlődik)
- ✅ **Ingyenes web service** (750 óra/hó)
- ✅ **Automatikus HTTPS** minden service-hez
- ✅ **GitHub integration** - automatikus deploy commit-ra
- ✅ **Environment variables** kezelés
- ✅ **Egyszerű setup** - 10 perc alatt kész

## 📋 Előfeltételek

1. **GitHub account** - A projekt legyen GitHub repository-ban
2. **Render.com account** - Regisztrálj ingyenesen: https://render.com
3. **Projekt push-olva** GitHub-ra

## 🚀 Deployment Lépések

### 0. Render.yaml használata (Gyors deployment)

Ha a `render.yaml` fájl a repository-ban van, Render automatikusan felismeri és felajánlja a service-ek létrehozását:

1. **Push-old a kódot** GitHub-ra (ha még nem tetted)
2. **Jelentkezz be** Render Dashboard-ra: https://dashboard.render.com
3. Kattints a **"New +"** gombra → **"Blueprint"**
4. **Connect a repository** és válaszd ki a `hellolocal` repository-t
5. Render automatikusan felismeri a `render.yaml` fájlt
6. **Állítsd be az Environment Variables**-t (lásd alább)
7. Kattints **"Apply"** gombra
8. Render automatikusan létrehozza mindkét service-t

**Fontos**: Az adatbázist **manuálisan** kell létrehozni (lásd 1. lépés), mert a `render.yaml` nem tartalmazza.

**Environment Variables beállítása** (Blueprint után):

**Backend (`hellolocal-api`)**:
- `DATABASE_URL` - Internal Database URL
- `JWT_SECRET` - Generálj egy random stringet
- `JWT_EXPIRES_IN` - `7d` (opcionális)
- `FRONTEND_URL` - Frontend URL (később, miután a frontend deploy-olva van)
- `CORS_ORIGIN` - **FONTOS**: Frontend URL (pl: `https://hellolocal-frontend.onrender.com`)
  - Több origin esetén vesszővel elválasztva: `https://hellolocal.com,https://www.hellolocal.com`
  - **Kritikus**: A biztonsági beállítások után production módban kötelező!

**Frontend (`hellolocal-frontend`)**:
- `API_URL` - Backend API URL (pl: `https://hellolocal-api.onrender.com`)
- `FRONTEND_URL` - Frontend URL (pl: `https://hellolocal-frontend.onrender.com`)
- `VITE_API_URL` - Ugyanaz, mint `API_URL` (build-time változó)
- `VITE_FRONTEND_URL` - Ugyanaz, mint `FRONTEND_URL` (build-time változó)

---

### Manuális Deployment (ha nem használod a render.yaml-t)

### 1. Adatbázis Létrehozása

1. Jelentkezz be a Render Dashboard-ra: https://dashboard.render.com
2. Kattints a **"New +"** gombra → **"PostgreSQL"**
3. Állítsd be:
   - **Name**: `hellolocal-db`
   - **Database**: `hellolocal`
   - **User**: `hellolocal` (vagy hagyd alapértelmezetten)
   - **Region**: Válaszd a legközelebbi régiót (Frankfurt)
   - **PostgreSQL Version**: 16
   - **Instance Type**: **Free** (0$/hó)
4. Kattints **"Create Database"** gombra
5. **Fontos**: Várd meg, amíg az adatbázis status **"Available"** lesz (~2-3 perc)
6. **Másold ki** az **"Internal Database URL"**-t (később szükséges lesz)
   - Formátum: `postgresql://user:password@dpg-xxxxx/database`

### 2. Backend API Deploy

1. Kattints a **"New +"** gombra → **"Web Service"**
2. **Connect a repository**:
   - Ha még nem tetted, engedélyezd a GitHub hozzáférést
   - Válaszd ki a `hellolocal` repository-t
3. Állítsd be:
   - **Name**: `hellolocal-api`
   - **Region**: Válaszd ugyanazt, mint az adatbázis (Frankfurt)
   - **Branch**: `main` (vagy `master`)
   - **Root Directory**: `apps/api`
   - **Environment**: `Node`
   - **Build Command**:
     ```bash
     npm install -g pnpm@10.27.0 && pnpm install && pnpm prisma generate && pnpm run build
     ```
   - **Start Command**:
     ```bash
     pnpm prisma migrate deploy && node dist/main.js
     ```
   - **Instance Type**: **Free** (0$/hó)

4. **Environment Variables** beállítása (Add Environment Variable):
   ```
   NODE_ENV=production
   DATABASE_URL=<Internal Database URL amit kimásoltál>
   JWT_SECRET=<generálj egy hosszú random stringet>
   JWT_EXPIRES_IN=7d
   PORT=3002
   FRONTEND_URL=<Frontend URL lesz később, pl: https://hellolocal-frontend.onrender.com>
   CORS_ORIGIN=<Frontend URL lesz később, pl: https://hellolocal-frontend.onrender.com>
   ```
   
   **⚠️ FONTOS**: A `CORS_ORIGIN` változó **kötelező** a biztonsági beállítások után! 
   - Ha nincs beállítva, a frontend nem fog tudni API kéréseket küldeni (CORS hibák)
   - Több origin esetén vesszővel elválasztva: `https://hellolocal.com,https://www.hellolocal.com`

   **JWT Secret generálás** (Terminal-ban):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **(Opcionális) Web Push beállítás**:
   ```
   VAPID_PUBLIC_KEY=<public key>
   VAPID_PRIVATE_KEY=<private key>
   VAPID_SUBJECT=mailto:admin@yourdomain.com
   ```

   **VAPID keys generálás**:
   ```bash
   npx web-push generate-vapid-keys
   ```

6. Kattints **"Create Web Service"** gombra
7. Várd meg az első deploy-t (~5-10 perc)
8. **Másold ki** az API URL-t (pl: `https://hellolocal-api.onrender.com`)

### 3. Frontend Deploy

1. Kattints a **"New +"** gombra → **"Web Service"**
2. **Connect a repository**:
   - Válaszd ki ugyanazt a `hellolocal` repository-t
3. Állítsd be:
   - **Name**: `hellolocal-frontend`
   - **Region**: Válaszd ugyanazt, mint az adatbázis (Frankfurt)
   - **Branch**: `main` (vagy `master`)
   - **Root Directory**: `apps/web`
   - **Environment**: `Node`
   - **Build Command**:
     ```bash
     npm install -g pnpm@10.27.0 && pnpm install && pnpm build
     ```
   - **Start Command**:
     ```bash
     node server.js
     ```
   - **Instance Type**: **Free** (0$/hó)

4. **Environment Variables** beállítása (Add Environment Variable):
   ```
   NODE_ENV=production
   API_URL=<Backend API URL amit kimásoltál, pl: https://hellolocal-api.onrender.com>
   FRONTEND_URL=<Frontend URL lesz később, pl: https://hellolocal-frontend.onrender.com>
   VITE_API_URL=<Backend API URL - build-time változó, pl: https://hellolocal-api.onrender.com>
   VITE_FRONTEND_URL=<Frontend URL - build-time változó, pl: https://hellolocal-frontend.onrender.com>
   VITE_VAPID_PUBLIC_KEY=<public key ha használod>
   VITE_CLOUDINARY_CLOUD_NAME=<cloud name ha használod Cloudinary-t>
   VITE_CLOUDINARY_API_KEY=<api key ha használod Cloudinary-t>
   VITE_CLOUDINARY_UPLOAD_PRESET=<upload preset ha használod Cloudinary-t>
   ```

   **Fontos**: 
   - A `VITE_*` változók build-time-ban vannak beégetve, ezért mindkettőt állítsd be!
   - **Változtatás után újra kell build-elni!** (Manual Deploy → Deploy latest commit)
   - A Cloudinary változók csak akkor szükségesek, ha használod a TipTap editor-t képek/videók feltöltéséhez

5. Kattints **"Create Web Service"** gombra
6. Várd meg az első deploy-t (~5-10 perc)
7. **Másold ki** a Frontend URL-t (pl: `https://hellolocal-frontend.onrender.com`)

### 4. Környezeti változók frissítése

#### Backend FRONTEND_URL és CORS_ORIGIN frissítése

1. Menj vissza a **Backend API** service-hez
2. Kattints az **"Environment"** tab-ra
3. Frissítsd a `FRONTEND_URL` és `CORS_ORIGIN` változókat az új frontend URL-re:
   ```
   FRONTEND_URL=https://hellolocal-frontend.onrender.com
   CORS_ORIGIN=https://hellolocal-frontend.onrender.com
   ```
   **Fontos**: Ha több origin-t szeretnél engedélyezni (pl. custom domain), add hozzá vesszővel elválasztva:
   ```
   CORS_ORIGIN=https://hellolocal-frontend.onrender.com,https://hellolocal.com,https://www.hellolocal.com
   ```
4. Kattints **"Save Changes"** gombra
5. A backend automatikusan újra fog indulni

#### Frontend FRONTEND_URL frissítése

1. Menj a **Frontend** service-hez
2. Kattints az **"Environment"** tab-ra
3. Frissítsd a `FRONTEND_URL` változót:
   ```
   FRONTEND_URL=https://hellolocal-frontend.onrender.com
   VITE_FRONTEND_URL=https://hellolocal-frontend.onrender.com
   ```
4. Kattints **"Save Changes"** gombra
5. **Fontos**: A `VITE_*` változók miatt újra kell build-elni! Kattints a **"Manual Deploy"** → **"Deploy latest commit"** gombra

## ✅ Tesztelés

### Backend API Teszt
Nyisd meg a böngészőben:
```
https://hellolocal-api.onrender.com/health
```
Válasz: `{"status":"OK"}`

### Frontend Teszt
Nyisd meg:
```
https://hellolocal-frontend.onrender.com
```

### Admin Bejelentkezés
1. Menj: `https://hellolocal-frontend.onrender.com/login`
2. Email: `superadmin@hellolocal.com`
3. Password: `password123`

⚠️ **FONTOS**: Változtasd meg az admin jelszavakat production-ben!

## 🔧 Karbantartás

### Auto-Deploy Beállítása

Render automatikusan deploy-ol minden git push esetén. Ha ezt módosítani szeretnéd:

1. Menj a Service **Settings** → **Build & Deploy**
2. **Auto-Deploy**: `Yes` vagy `No`

### Manual Re-deploy

Ha manuálisan szeretnél újra deploy-olni:

1. Menj a Service Dashboard-ra
2. Kattints a **"Manual Deploy"** gombra → **"Deploy latest commit"**

### Logs Megtekintése

1. Menj a Service Dashboard-ra
2. Kattints a **"Logs"** tab-ra
3. Real-time logok jelennek meg

### Database Backup

Render ingyenes tervben nincs automatikus backup. Javasolt:

**Manuális backup** (Render Shell-ben vagy lokálisan):
```bash
pg_dump -h <hostname> -U <user> -d <database> > backup.sql
```

### Environment Variables Módosítása

1. Menj a Service **Environment** tab-ra
2. Módosítsd a változót
3. Kattints **"Save Changes"**
4. A service automatikusan újraindul

## 🚨 Gyakori Problémák

### 1. Build Failed - "pnpm: command not found"

**Megoldás**: Ellenőrizd, hogy a Build Command tartalmazza:
```bash
npm install -g pnpm@10.27.0 && ...
```

### 2. Database Connection Error

**Megoldás**: 
- Ellenőrizd, hogy az **Internal Database URL**-t használod (nem az External-t)
- Formátum: `postgresql://user:pass@dpg-xxxxx-INTERNAL/database`
- A backend service-nek ugyanabban a régióban kell lennie, mint az adatbázis

### 3. Prisma Migration Failed

**Megoldás**: 
- Ellenőrizd, hogy a `pnpm prisma migrate deploy` szerepel a Start Command-ban
- Nézd meg a logokat részletekért

### 4. CORS Error Frontend-en (MissingAllowOriginHeader / PreflightMissingAllowOriginHeader)

**Probléma**: A frontend kérések `CORS error: MissingAllowOriginHeader` vagy `PreflightMissingAllowOriginHeader` hibát kapnak.

**Ok**: A backend nem küldi a `Access-Control-Allow-Origin` header-t, mert a `CORS_ORIGIN` environment változó nincs beállítva production módban, vagy nem egyezik a frontend origin-jével.

**Gyors Megoldás**: 
1. Menj a **Backend API** service-hez (`hellolocal-api`) a Render.com Dashboard-on
2. Kattints az **"Environment"** tab-ra
3. Add hozzá vagy frissítsd a `CORS_ORIGIN` változót:
   ```
   CORS_ORIGIN=https://hellolocal-fe.onrender.com
   ```
   **Fontos**: 
   - A frontend URL-nek **pontosan** egyeznie kell! (nincs trailing slash!)
   - Ha a frontend `https://hellolocal-fe.onrender.com`, akkor pontosan ezt add meg
   - Több origin esetén: `https://hellolocal-fe.onrender.com,https://hellolocal.com`
4. Kattints **"Save Changes"** gombra
5. A backend automatikusan újraindul

**Részletes hibaelhárítás**: Lásd [`docs/CORS_TROUBLESHOOTING.md`](./CORS_TROUBLESHOOTING.md)

**Ellenőrzés**:
- A backend logokban látnod kell: `✅ CORS enabled for origins: https://hellolocal-fe.onrender.com`
- Ha blokkolva van egy kérés, látni fogod: `❌ CORS blocked: Origin "..." not in allowed list`

### 4a. 503 Service Unavailable

**Probléma**: A backend API 503-as hibát ad vissza (Service Unavailable).

**Ok**: 
- A Render.com free tier service-ek **15 perc inaktivitás után alvó módba** kerülnek
- Vagy a backend service le van állítva / nem elérhető
- Vagy a health check sikertelen volt, és a service "unhealthy" státuszban van

**Megoldás**:
1. **Várd meg 1-2 percet** - Ha a service "spinned down" volt, akkor az első kérés után ~1 percbe telik felébredni
2. **Ellenőrizd a Render.com Dashboard-on**:
   - Menj a backend service-hez (`hellolocal-api`)
   - Nézd meg a **Logs** tab-ot - vannak-e hibák?
   - Nézd meg a **Metrics** tab-ot - fut-e a service?
   - Ellenőrizd a **Events** tab-ot - volt-e health check failure?
3. **Ha a service "unhealthy"**:
   - Ellenőrizd a health check endpoint-ot: `https://hellolocal-api.onrender.com/health`
   - Ha 429-es hibát kapsz, akkor a health check endpoint nincs kizárva a rate limiting alól (frissítsd a kódot)
   - Ha más hibát kapsz, nézd meg a logokat
4. **Ha továbbra is probléma van**:
   - Próbáld meg manuálisan újraindítani a service-t (Render Dashboard → Manual Deploy)
   - Vagy upgrade-elj fizetős tervre, amely nem "spins down" inaktivitás után

### 5. Health Check Failed - Status Code 429

**Probléma**: A Render.com health check-je 429-es hibát kap (Too Many Requests).

**Ok**: A rate limiting globálisan alkalmazva van, és a health check endpoint-ok is rate limitálva vannak. A Render.com health check-je túl gyakran hívja meg az endpoint-ot.

**Megoldás**: ✅ **JAVÍTVA** - A health check endpoint-ok (`/health` és `/api/health`) kizárva lettek a rate limiting alól a `@SkipThrottle()` dekorátorral.

Ha még mindig 429-es hibát kapsz:
- Ellenőrizd, hogy a legfrissebb kód deploy-olva van (a `health.controller.ts` tartalmazza a `@SkipThrottle()` dekorátorokat)
- Várd meg 1-2 percet, hogy a rate limit cache lejárjon

### 5a. Frontend 429-es hibák (Too Many Requests)

**Probléma**: A frontend betöltéskor sok API kérés 429-es hibát kap.

**Ok**: A frontend betöltéskor egyszerre 7-8 API kérést küld (map-settings, site-settings, events, places, stb.), és a korábbi 10 kérés/perc limit túl szigorú volt.

**Megoldás**: ✅ **JAVÍTVA** - A globális rate limit 10-ről 50-re növelve. Most már a frontend betöltéskor nem lesznek 429-es hibák.

**Rate limiting konfiguráció**:
- **Public endpoint-ok** (places, events, site-settings, stb.): 50 kérés/perc
- **Auth endpoint-ok** (login, register, stb.): 5 kérés/perc (brute-force védelem)
- **Health check endpoint-ok**: Rate limiting kikapcsolva

### 6. Free Tier "Spins Down" Inaktivitás Után

A Render ingyenes szolgáltatások **15 perc inaktivitás után alvó módba** kerülnek. Az első kérés után ~1 percbe telik felébredni.

**Megoldás** (opcionális):
- **Upgrade** Render fizetős tervére ($7/hó)
- **External Ping Service** (pl: UptimeRobot) amely 5 percenként ping-eli az API-t

## 💰 Költségek

### Ingyenes Tier (Free)
- **Web Service**: 750 óra/hó INGYENES (mindkét service használja ezt a kvótát)
- **PostgreSQL**: INGYENES, 90 nap inaktivitás után törlődik
- **Bandwidth**: 100 GB/hó INGYENES
- **Fontos**: Két Web Service esetén a 750 óra/hó megosztott (pl. 375 óra/service)

### Fizetős Tier (Starter - $7/hó/service)
- **Nincs "spin down"** - mindig elérhető
- **Nagyobb erőforrások**
- **Több backup** lehetőség

## 🔒 Biztonság - Production Checklist

- [ ] **Változtasd meg** az admin jelszavakat
- [ ] **Használj erős** `JWT_SECRET`-et
- [ ] **Állíts be** custom domain-t (opcionális)
- [ ] **Ellenőrizd** az Environment Variables-t
- [ ] **Tiltsd le** a debug mode-okat
- [ ] **Állíts be** rate limiting-et (később)
- [ ] **Állíts be** monitoring-ot (Render beépített vagy külső)

## 📊 Monitoring

### Render Beépített Metrics

1. Menj a Service **Metrics** tab-ra
2. Láthatod:
   - CPU használat
   - Memory használat
   - Request/sec
   - Response times

### External Monitoring (Opcionális)

Ajánlott eszközök:
- **UptimeRobot** - Uptime monitoring (ingyenes)
- **Sentry** - Error tracking (ingyenes tier)
- **LogRocket** - Session replay (ingyenes tier)

## 🌐 Custom Domain Beállítás (Opcionális)

1. Menj a Service **Settings** → **Custom Domain**
2. Kattints **"Add Custom Domain"**
3. Írd be a domain-edet (pl: `www.hellolocal.com`)
4. Add hozzá a DNS rekordokat a domain szolgáltatódnál:
   ```
   CNAME www your-service.onrender.com
   ```
5. Render automatikusan létrehoz egy **Let's Encrypt HTTPS** tanúsítványt

## 🆘 Támogatás

- **Render Docs**: https://render.com/docs
- **Community Forum**: https://community.render.com
- **Status Page**: https://status.render.com

## 🎉 Kész!

Az alkalmazásod most már elérhető HTTPS-en keresztül, automatikus deploy-al! 🚀

### Következő Lépések

- [ ] Teszteld az összes funkciót
- [ ] Állítsd be a monitoring-ot
- [ ] Hívd meg a csapatot tesztelésre
- [ ] Oszd meg a beta URL-t a felhasználókkal
- [ ] Gyűjtsd a feedback-et

---

Bármilyen kérdés esetén nézd meg a [README.md](../README.md) fájlt vagy a többi dokumentációt a `docs/` mappában.


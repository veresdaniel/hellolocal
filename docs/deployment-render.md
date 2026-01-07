# Deployment Útmutató - Render.com

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
   FRONTEND_URL=<Frontend URL lesz később, pl: https://hellolocal.onrender.com>
   ```

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

1. Kattints a **"New +"** gombra → **"Static Site"**
2. **Connect a repository**:
   - Válaszd ki ugyanazt a `hellolocal` repository-t
3. Állítsd be:
   - **Name**: `hellolocal`
   - **Branch**: `main` (vagy `master`)
   - **Root Directory**: `apps/web`
   - **Build Command**:
     ```bash
     npm install -g pnpm@10.27.0 && pnpm install && pnpm run build
     ```
   - **Publish Directory**: `dist`

4. **Environment Variables** beállítása:
   ```
   VITE_API_URL=<Backend API URL amit kimásoltál, pl: https://hellolocal-api.onrender.com>
   VITE_VAPID_PUBLIC_KEY=<public key ha használod>
   ```

5. Kattints **"Create Static Site"** gombra
6. Várd meg az első deploy-t (~3-5 perc)
7. **Másold ki** a Frontend URL-t (pl: `https://hellolocal.onrender.com`)

### 4. Backend FRONTEND_URL frissítése

1. Menj vissza a **Backend API** service-hez
2. Kattints az **"Environment"** tab-ra
3. Frissítsd a `FRONTEND_URL` változót az új frontend URL-re:
   ```
   FRONTEND_URL=https://hellolocal.onrender.com
   ```
4. Kattints **"Save Changes"** gombra
5. A backend automatikusan újra fog indulni

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
https://hellolocal.onrender.com
```

### Admin Bejelentkezés
1. Menj: `https://hellolocal.onrender.com/login`
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

### 3. Prisma Migration Failed

**Megoldás**: 
- Ellenőrizd, hogy a `pnpm prisma migrate deploy` szerepel a Start Command-ban
- Nézd meg a logokat részletekért

### 4. CORS Error Frontend-en

**Megoldás**: 
- Ellenőrizd, hogy a backend `FRONTEND_URL` jól van beállítva
- Formátum: `https://hellolocal.onrender.com` (nincs trailing slash!)

### 5. Free Tier "Spins Down" Inaktivitás Után

A Render ingyenes szolgáltatások **15 perc inaktivitás után alvó módba** kerülnek. Az első kérés után ~1 percbe telik felébredni.

**Megoldás** (opcionális):
- **Upgrade** Render fizetős tervére ($7/hó)
- **External Ping Service** (pl: UptimeRobot) amely 5 percenként ping-eli az API-t

## 💰 Költségek

### Ingyenes Tier (Free)
- **Web Service**: 750 óra/hó INGYENES
- **Static Site**: INGYENES, korlátlan
- **PostgreSQL**: INGYENES, 90 nap inaktivitás után törlődik
- **Bandwidth**: 100 GB/hó INGYENES

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


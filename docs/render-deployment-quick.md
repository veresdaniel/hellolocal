# 🚀 Render.com Deployment - Gyors Útmutató

## 📋 Előfeltételek

- ✅ GitHub repository push-olva
- ✅ Render.com account (ingyenes regisztráció: https://render.com)

## 🎯 Gyors Deployment (render.yaml használatával)

### 1. Adatbázis létrehozása

1. Render Dashboard → **"New +"** → **"PostgreSQL"**
2. **Name**: `hellolocal-db`
3. **Region**: Frankfurt (vagy legközelebbi)
4. **Instance Type**: Free
5. **Create Database**
6. **Másold ki** az **Internal Database URL**-t

### 2. Service-ek létrehozása (Blueprint)

1. Render Dashboard → **"New +"** → **"Blueprint"**
2. **Connect repository** → Válaszd ki a `hellolocal` repository-t
3. Render automatikusan felismeri a `render.yaml` fájlt
4. **Kattints "Apply"** gombra
5. Render létrehozza mindkét service-t:
   - `hellolocal-api` (Backend)
   - `hellolocal-frontend` (Frontend)

### 3. Environment Variables beállítása

#### Backend (`hellolocal-api`) → Environment tab:

```
DATABASE_URL=<Internal Database URL>
JWT_SECRET=<generálj: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_EXPIRES_IN=7d
FRONTEND_URL=<Frontend URL - később>
```

#### Frontend (`hellolocal-frontend`) → Environment tab:

```
API_URL=https://hellolocal-api.onrender.com
FRONTEND_URL=https://hellolocal-frontend.onrender.com
VITE_API_URL=https://hellolocal-api.onrender.com
VITE_FRONTEND_URL=https://hellolocal-frontend.onrender.com
```

**Fontos**: A `VITE_*` változók build-time-ban vannak beégetve! Mindkettőt állítsd be!

### 4. Frontend URL frissítése

Miután mindkét service deploy-olva van:

1. **Backend** → Environment → Frissítsd: `FRONTEND_URL=https://hellolocal-frontend.onrender.com`
2. **Frontend** → Environment → Frissítsd: `FRONTEND_URL` és `VITE_FRONTEND_URL`
3. **Frontend** → Manual Deploy → Deploy latest commit (mert `VITE_*` változók miatt újra kell build-elni)

## ✅ Tesztelés

- **Backend**: https://hellolocal-api.onrender.com/health → `{"status":"OK"}`
- **Frontend**: https://hellolocal-frontend.onrender.com
- **Admin**: https://hellolocal-frontend.onrender.com/login

## 🔧 Service URL-ek

Miután deploy-olva van, a service URL-ek:
- **Backend API**: `https://hellolocal-api.onrender.com`
- **Frontend**: `https://hellolocal-frontend.onrender.com`

## ⚠️ Fontos megjegyzések

1. **Free tier "spin down"**: 15 perc inaktivitás után alvó módba kerül, első kérés után ~1 perc felébredés
2. **750 óra/hó**: Két Web Service esetén megosztott (pl. 375 óra/service)
3. **VITE_* változók**: Build-time változók, változtatás után újra kell build-elni
4. **Database URL**: Mindig az **Internal Database URL**-t használd (nem az External-t)

## 📚 Részletes dokumentáció

- [Teljes Render.com Deployment útmutató](./deployment-render.md)
- [Deployment Summary](./DEPLOYMENT.md)

## 🆘 Problémák?

### Build Failed
- Ellenőrizd, hogy a Build Command tartalmazza: `npm install -g pnpm@10.27.0 && ...`

### Database Connection Error
- Használd az **Internal Database URL**-t (nem az External-t)
- Backend és Database ugyanabban a régióban legyen

### CORS Error
- Ellenőrizd a backend `FRONTEND_URL` változót (nincs trailing slash!)
- Ellenőrizd a frontend `API_URL` változót

### SEO Meta Tags nem működnek
- Ellenőrizd, hogy a frontend `API_URL` és `FRONTEND_URL` helyesen van beállítva
- A `server.js` middleware-nek elérhetőnek kell lennie a backend API-nak

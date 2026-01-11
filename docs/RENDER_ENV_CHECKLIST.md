# ✅ Render.com Environment Variables - Ellenőrző Lista

## 🔴 KRITIKUS - Backend API (`hellolocal-api`)

### Kötelező változók:

1. **`CORS_ORIGIN`** ⚠️ **LEGFONTOSABB!**
   ```
   CORS_ORIGIN=https://hellolocal-fe.onrender.com
   ```
   - **Fontos**: Pontosan egyezzen a frontend URL-lel!
   - **Nincs trailing slash!**
   - Ha több origin-t szeretnél: `https://hellolocal-fe.onrender.com,https://hellolocal.com`

2. **`DATABASE_URL`**
   ```
   DATABASE_URL=postgresql://user:password@dpg-xxxxx-INTERNAL/database
   ```
   - **Fontos**: Használd az **Internal Database URL**-t (nem az External-t)!
   - Formátum: `postgresql://...` (nem `postgres://...`)

3. **`JWT_SECRET`**
   ```
   JWT_SECRET=<64 karakteres random string>
   ```
   - Generálás: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

4. **`NODE_ENV`**
   ```
   NODE_ENV=production
   ```

5. **`PORT`**
   ```
   PORT=3002
   ```

### Opcionális (de ajánlott):

6. **`FRONTEND_URL`**
   ```
   FRONTEND_URL=https://hellolocal-fe.onrender.com
   ```
   - Fallback-ként használható, ha `CORS_ORIGIN` nincs beállítva
   - **Ajánlott**: Állítsd be explicit módon

7. **`JWT_EXPIRES_IN`**
   ```
   JWT_EXPIRES_IN=7d
   ```

---

## 🟢 Frontend (`hellolocal-fe` vagy `hellolocal-frontend`)

### Kötelező változók:

1. **`VITE_API_URL`** ⚠️ **LEGFONTOSABB!**
   ```
   VITE_API_URL=https://hellolocal-api.onrender.com
   ```
   - **Fontos**: Build-time változó! Változtatás után újra kell build-elni!
   - Nincs trailing slash!

2. **`API_URL`**
   ```
   API_URL=https://hellolocal-api.onrender.com
   ```
   - Runtime változó (ha a server.js használja)

3. **`FRONTEND_URL`**
   ```
   FRONTEND_URL=https://hellolocal-fe.onrender.com
   ```

4. **`VITE_FRONTEND_URL`**
   ```
   VITE_FRONTEND_URL=https://hellolocal-fe.onrender.com
   ```
   - Build-time változó

5. **`NODE_ENV`**
   ```
   NODE_ENV=production
   ```

### Opcionális (ha használod a Cloudinary-t):

8. **`VITE_CLOUDINARY_CLOUD_NAME`**
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   ```
   - **Fontos**: Build-time változó! Változtatás után újra kell build-elni!
   - Csak akkor szükséges, ha használod a TipTap editor-t képek/videók feltöltéséhez

9. **`VITE_CLOUDINARY_API_KEY`**
   ```
   VITE_CLOUDINARY_API_KEY=your_api_key
   ```
   - **Fontos**: Build-time változó! Változtatás után újra kell build-elni!

10. **`VITE_CLOUDINARY_UPLOAD_PRESET`**
    ```
    VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_name
    ```
    - **Fontos**: Build-time változó! Változtatás után újra kell build-elni!

---

## 🔍 Gyors Diagnosztika

### 1. CORS Hiba Ellenőrzése

**Probléma**: `PreflightMissingAllowOriginHeader` vagy `CORS error`

**Ellenőrzés**:
1. Menj a **Backend API** service-hez
2. Kattints az **"Environment"** tab-ra
3. Ellenőrizd a `CORS_ORIGIN` értékét
4. **Fontos**: A böngészőben nézd meg a frontend URL-t (pl. `https://hellolocal-fe.onrender.com`)
5. A `CORS_ORIGIN`-nek **pontosan** egyeznie kell!

**Példa**:
- Frontend URL: `https://hellolocal-fe.onrender.com`
- `CORS_ORIGIN` értéke: `https://hellolocal-fe.onrender.com` ✅
- `CORS_ORIGIN` értéke: `https://hellolocal-frontend.onrender.com` ❌ (nem egyezik!)

### 2. 503 Service Unavailable Ellenőrzése

**Probléma**: Backend API 503-as hibát ad vissza

**Ellenőrzés**:
1. Menj a **Backend API** service-hez
2. Kattints a **"Logs"** tab-ra
3. Nézd meg, hogy fut-e a service
4. Ha "spinned down", várj 1-2 percet (Render free tier 15 perc inaktivitás után alvó módba kerül)

**Megoldás**:
- Várj 1-2 percet, amíg a service felébred
- Vagy upgrade-elj fizetős tervre

### 3. Backend Logok Ellenőrzése

A backend indításakor a logokban látnod kell:

**Ha CORS be van állítva:**
```
✅ CORS enabled for origins: https://hellolocal-fe.onrender.com
```

**Ha CORS nincs beállítva:**
```
⚠️  WARNING: CORS_ORIGIN and FRONTEND_URL are not set! CORS will be disabled and frontend requests will fail!
```

**Ha egy kérés blokkolva van:**
```
❌ CORS blocked: Origin "https://hellolocal-fe.onrender.com" not in allowed list: [https://hellolocal-frontend.onrender.com]
```

---

## 🛠️ Gyors Javítás Lépések

### CORS Hiba Javítása:

1. **Határozd meg a pontos frontend URL-t**
   - Nyisd meg a frontend-et a böngészőben
   - Másold ki a pontos URL-t (pl. `https://hellolocal-fe.onrender.com`)

2. **Frissítsd a `CORS_ORIGIN` változót**
   - Menj a Backend API service-hez
   - Environment tab → `CORS_ORIGIN`
   - Frissítsd a pontos frontend URL-re
   - **Nincs trailing slash!**

3. **Mentsd el és várj**
   - Kattints "Save Changes"
   - Várj 1-2 percet, amíg a backend újraindul

4. **Ellenőrizd a logokat**
   - Logs tab → Nézd meg, hogy látod-e: `✅ CORS enabled for origins: ...`

5. **Teszteld újra**
   - Frissítsd a frontend oldalt
   - A CORS hibáknak megszűnniük kell

---

## 📋 Teljes Checklist

### Backend API (`hellolocal-api`)

- [ ] `CORS_ORIGIN` be van állítva és **pontosan egyezik** a frontend URL-lel
- [ ] `DATABASE_URL` be van állítva (Internal Database URL)
- [ ] `JWT_SECRET` be van állítva (erős, random generált)
- [ ] `NODE_ENV=production`
- [ ] `PORT=3002`
- [ ] Backend logokban látod: `✅ CORS enabled for origins: ...`

### Frontend (`hellolocal-fe`)

- [ ] `VITE_API_URL` be van állítva (Backend API URL)
- [ ] `API_URL` be van állítva (ha használja a server.js)
- [ ] `FRONTEND_URL` be van állítva
- [ ] `VITE_FRONTEND_URL` be van állítva
- [ ] **Fontos**: `VITE_*` változók miatt újra kell build-elni, ha módosítod!

---

## 🚨 Gyakori Hibák

### 1. CORS_ORIGIN nem egyezik a frontend URL-lel

**Hiba**: `PreflightMissingAllowOriginHeader`

**Ok**: 
- `CORS_ORIGIN=https://hellolocal-frontend.onrender.com`
- De a frontend: `https://hellolocal-fe.onrender.com`

**Megoldás**: Frissítsd a `CORS_ORIGIN`-t a pontos frontend URL-re

### 2. Trailing Slash

**Hiba**: CORS hiba

**Ok**: `CORS_ORIGIN=https://hellolocal-fe.onrender.com/` (van trailing slash)

**Megoldás**: Távolítsd el a trailing slash-t

### 3. HTTP vs HTTPS

**Hiba**: CORS hiba

**Ok**: `CORS_ORIGIN=http://hellolocal-fe.onrender.com` (HTTP)

**Megoldás**: Használj HTTPS-et: `https://hellolocal-fe.onrender.com`

### 4. VITE_* változók nem frissülnek

**Hiba**: Frontend még mindig a régi API URL-t használja

**Ok**: `VITE_*` változók build-time-ban vannak beégetve

**Megoldás**: 
1. Frissítsd a `VITE_API_URL` változót
2. Kattints "Manual Deploy" → "Deploy latest commit"

---

## 📞 További Segítség

- [CORS Hibaelhárítási Útmutató](./CORS_TROUBLESHOOTING.md)
- [Render.com Deployment Útmutató](./deployment-render.md)
- [Biztonsági Javítások](./SECURITY_FIXES.md)

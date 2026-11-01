# 🚨 CORS Hiba Gyors Javítás

> **Deprecated context (2026-11).** Live stack is Hetzner (`hello-local.io`), not Render. Steps below are historical Render dashboard notes; set `CORS_ORIGIN` in `/opt/hellolocal` stack env instead.

## Probléma

```
Access-Control-Allow-Origin header is not present
```

Ez azt jelenti, hogy a backend **nem küldi** a CORS header-t, mert:
1. A `CORS_ORIGIN` nincs beállítva, VAGY
2. A `CORS_ORIGIN` nem egyezik a frontend URL-lel

## ⚡ Gyors Megoldás (3 lépés)

### 1. Határozd meg a pontos URL-eket

**Frontend URL** (böngészőben látod):
```
https://hellolocal-fe.onrender.com
```

**Backend URL** (a hibaüzenetben látod):
```
https://hellolocal.onrender.com
```

### 2. Render.com Dashboard - Backend Service

1. Menj a **Render.com Dashboard**-ra
2. Keresd meg a **Backend API** service-t
   - Lehet, hogy neve: `hellolocal-api` VAGY `hellolocal`
   - A backend URL alapján: `hellolocal.onrender.com` → service neve valószínűleg `hellolocal`

3. Kattints a service-re
4. Kattints az **"Environment"** tab-ra

### 3. Állítsd be a `CORS_ORIGIN` változót

**Ha nincs `CORS_ORIGIN` változó:**
1. Kattints **"Add Environment Variable"** gombra
2. **Key**: `CORS_ORIGIN`
3. **Value**: `https://hellolocal-fe.onrender.com`
   - **Fontos**: Pontosan egyezzen a frontend URL-lel!
   - **Nincs trailing slash!**

**Ha van `CORS_ORIGIN` változó, de rossz értékkel:**
1. Kattints a `CORS_ORIGIN` változóra
2. Frissítsd az értéket: `https://hellolocal-fe.onrender.com`
3. Kattints **"Save"** gombra

### 4. Várj és ellenőrizd

1. Kattints **"Save Changes"** gombra (ha van ilyen)
2. Várj **1-2 percet**, amíg a backend újraindul
3. Menj a **"Logs"** tab-ra
4. Nézd meg a logokat - látnod kell:
   ```
   ✅ CORS enabled for origins: https://hellolocal-fe.onrender.com
   ```

5. Frissítsd a frontend oldalt
6. A CORS hibáknak megszűnniük kell!

---

## 🔍 Ellenőrző Lista

- [ ] Backend service megtalálva a Render.com Dashboard-on
- [ ] `CORS_ORIGIN` változó hozzáadva/frissítve
- [ ] `CORS_ORIGIN` értéke: `https://hellolocal-fe.onrender.com` (pontosan egyezik a frontend URL-lel)
- [ ] Nincs trailing slash a `CORS_ORIGIN`-ben
- [ ] Backend újraindult (logokban látod: `✅ CORS enabled`)
- [ ] Frontend oldal frissítve

---

## ❌ Gyakori Hibák

### 1. Rossz Service

**Hiba**: Nem találod a backend service-t

**Megoldás**: 
- A backend URL: `https://hellolocal.onrender.com`
- A service neve valószínűleg: `hellolocal` (nem `hellolocal-api`)
- Keresd meg a Render.com Dashboard-on a service-eket

### 2. Trailing Slash

**Hiba**: `CORS_ORIGIN=https://hellolocal-fe.onrender.com/`

**Megoldás**: Távolítsd el a `/`-t: `https://hellolocal-fe.onrender.com`

### 3. HTTP vs HTTPS

**Hiba**: `CORS_ORIGIN=http://hellolocal-fe.onrender.com`

**Megoldás**: Használj HTTPS-et: `https://hellolocal-fe.onrender.com`

### 4. Nem egyezik a Frontend URL

**Hiba**: 
- Frontend: `https://hellolocal-fe.onrender.com`
- `CORS_ORIGIN`: `https://hellolocal-frontend.onrender.com`

**Megoldás**: A `CORS_ORIGIN`-nek **pontosan** egyeznie kell a frontend URL-lel!

---

## 🆘 Ha Még Mindig Nem Működik

1. **Ellenőrizd a backend logokat**:
   - Render.com Dashboard → Backend Service → Logs tab
   - Nézd meg, hogy látod-e: `✅ CORS enabled for origins: ...`
   - Ha nem látod, akkor a `CORS_ORIGIN` nincs beállítva vagy üres

2. **Ellenőrizd a backend státuszát**:
   - Ha 503-as hibát kapsz, a backend le van állítva
   - Várj 1-2 percet, amíg felébred

3. **Teszteld az OPTIONS preflight kérést**:
   ```bash
   curl -X OPTIONS https://hellolocal.onrender.com/api/admin/users/me \
     -H "Origin: https://hellolocal-fe.onrender.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -v
   ```
   
   **Várt válasz**:
   ```
   < HTTP/1.1 204 No Content
   < Access-Control-Allow-Origin: https://hellolocal-fe.onrender.com
   < Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
   < Access-Control-Allow-Headers: Content-Type,Authorization,X-Requested-With,Cache-Control,Pragma,Expires,Accept
   < Access-Control-Allow-Credentials: true
   ```

4. **Ha nincs `Access-Control-Allow-Origin` header a válaszban**:
   - A `CORS_ORIGIN` nincs beállítva vagy nem egyezik
   - Frissítsd a `CORS_ORIGIN` változót
   - Várj, amíg a backend újraindul

---

## 📝 Összefoglalás

**A legvalószínűbb probléma**: A `CORS_ORIGIN` nincs beállítva vagy nem egyezik a frontend URL-lel.

**Megoldás**: 
1. Menj a Render.com Dashboard-ra
2. Backend service → Environment tab
3. Állítsd be: `CORS_ORIGIN=https://hellolocal-fe.onrender.com`
4. Várj 1-2 percet
5. Frissítsd a frontend oldalt

**Ennyi!** 🎉

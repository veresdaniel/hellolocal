# 🚨 503 + CORS Hibák Együttes Megoldása

## Probléma

A konzolban látod:
- **503 Service Unavailable** hibák
- **CORS policy** hibák ("No 'Access-Control-Allow-Origin' header is present")

## Ok

Két probléma van egyszerre:

1. **503 hiba**: A backend service le van állítva vagy "spinned down" (Render.com free tier)
2. **CORS hiba**: A `CORS_ORIGIN` nincs beállítva vagy nem egyezik a frontend URL-lel

## ⚡ Gyors Megoldás (Lépésről Lépésre)

### 1. Várj 1-2 percet (503 hiba miatt)

A backend service felébred, de ez időbe telik.

**Ellenőrzés**: Nyisd meg a böngészőben:
```
https://hellolocal.onrender.com/health
```

**Ha látod**: `{"ok": true}` → A backend felébredt, folytasd a 2. lépéssel.

**Ha még 503**: Várj még egy kicsit, majd próbáld újra.

### 2. Állítsd be a CORS_ORIGIN változót

**Render.com Dashboard → Backend Service → Environment tab**

1. **Ha nincs `CORS_ORIGIN` változó**:
   - Kattints "Add Environment Variable"
   - **Key**: `CORS_ORIGIN`
   - **Value**: `https://hellolocal-fe.onrender.com`
   - **Fontos**: Pontosan egyezzen a frontend URL-lel!

2. **Ha van `CORS_ORIGIN`, de rossz értékkel**:
   - Frissítsd: `https://hellolocal-fe.onrender.com`
   - **Fontos**: Nincs trailing slash!

3. **Kattints "Save Changes"**

4. **Várj 1-2 percet**, amíg a backend újraindul

### 3. Ellenőrizd a Backend Logokat

**Render.com Dashboard → Backend Service → Logs tab**

**Mit kell látnod**:
```
✅ CORS enabled for origins: https://hellolocal-fe.onrender.com
```

**Ha látod ezt**: A CORS be van állítva! ✅

**Ha nem látod**:
- A `CORS_ORIGIN` nincs beállítva vagy rossz értékkel
- Vagy a backend még nem indult újra (várj még)

### 4. Frissítsd a Frontend Oldalt

Miután:
- ✅ A backend felébredt (health check működik)
- ✅ A `CORS_ORIGIN` be van állítva
- ✅ A backend logokban látod: `✅ CORS enabled`

**Frissítsd a frontend oldalt** (F5 vagy Ctrl+R).

**Várt eredmény**:
- ✅ Nincs 503-as hiba
- ✅ Nincs CORS hiba
- ✅ Az API kérések működnek

---

## 🔍 Részletes Diagnosztika

### 503 Hiba Ellenőrzése

**Teszteld a health check endpoint-ot**:
```bash
curl https://hellolocal.onrender.com/health
```

**Várt válasz** (ha felébredt):
```json
{"ok": true}
```

**Ha még 503**: Várj még 1-2 percet.

### CORS Hiba Ellenőrzése

**Teszteld az OPTIONS preflight kérést**:
```bash
curl -X OPTIONS https://hellolocal.onrender.com/api/hu/places \
  -H "Origin: https://hellolocal-fe.onrender.com" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

**Várt válasz** (ha jó):
```
< HTTP/1.1 204 No Content
< Access-Control-Allow-Origin: https://hellolocal-fe.onrender.com
```

**Ha nincs `Access-Control-Allow-Origin` header**:
- A `CORS_ORIGIN` nincs beállítva vagy nem egyezik

---

## 📋 Ellenőrző Lista

- [ ] Backend health check működik: `https://hellolocal.onrender.com/health` → `{"ok": true}`
- [ ] `CORS_ORIGIN` változó be van állítva: `https://hellolocal-fe.onrender.com`
- [ ] `CORS_ORIGIN` pontosan egyezik a frontend URL-lel (nincs trailing slash)
- [ ] Backend újraindult (várj 1-2 percet)
- [ ] Backend logokban látod: `✅ CORS enabled for origins: ...`
- [ ] Frontend oldal frissítve (hard refresh: Ctrl+Shift+R)

---

## 🚨 Ha Még Mindig Nem Működik

### 1. Backend Service Le van Állítva

**Ellenőrzés**:
- Render.com Dashboard → Backend Service → Overview tab
- Nézd meg a service státuszát

**Megoldás**:
- Ha "Stopped": Kattints a "Start" gombra
- Ha "Unhealthy": Nézd meg a logokat

### 2. CORS_ORIGIN Nem Olvasható

**Ellenőrzés**:
- Render.com Dashboard → Backend Service → Environment tab
- Nézd meg, hogy a `CORS_ORIGIN` változó ott van-e és helyes-e

**Megoldás**:
- Ha nincs: Add hozzá
- Ha rossz: Frissítsd
- **Fontos**: Kattints "Save Changes" gombra!

### 3. Backend Kód Nincs Deploy-olva

**Ellenőrzés**:
- Render.com Dashboard → Backend Service → Logs tab
- Nézd meg, hogy látod-e a `✅ CORS enabled` üzenetet

**Ha nem látod**:
- A kód változtatások még nincsenek deploy-olva
- Commit-old és push-old a változtatásokat
- Várj 2-3 percet, amíg újra deploy-ol

### 4. Manuális Újraindítás

**Ha semmi sem segít**:
1. Render.com Dashboard → Backend Service
2. Kattints a **"Manual Deploy"** gombra
3. Válaszd: **"Deploy latest commit"**
4. Várj 2-3 percet

---

## 💡 Hosszú Távú Megoldás (503 hiba)

### Ingyenes: UptimeRobot Ping Service

**Cél**: 5 percenként ping-eli az API-t, hogy ne menjen alvó módba

**Beállítás**:
1. Regisztrálj: https://uptimerobot.com
2. Add hozzá a monitor-t:
   - **URL**: `https://hellolocal.onrender.com/health`
   - **Type**: HTTP(s)
   - **Interval**: 5 minutes
3. Kész! Most már nem fog alvó módba kerülni

### Fizetős: Render.com Upgrade ($7/hó)

- ✅ Nincs "spin down" - mindig elérhető
- ✅ Nagyobb erőforrások

---

## 📝 Összefoglalás

**A két probléma**:
1. **503 hiba**: Backend "spinned down" → Várj 1-2 percet
2. **CORS hiba**: `CORS_ORIGIN` nincs beállítva → Állítsd be a Render.com-on

**Megoldás sorrendje**:
1. Várj, amíg a backend felébred (503 hiba)
2. Állítsd be a `CORS_ORIGIN` változót
3. Várj, amíg a backend újraindul
4. Ellenőrizd a logokat
5. Frissítsd a frontend oldalt

**Ennyi!** 🎉

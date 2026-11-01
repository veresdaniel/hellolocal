# 🔍 CORS Diagnosztika - Mi lehet még a probléma?

> **Deprecated context (2026-11).** Live stack is Hetzner (`hello-local.io`), not Render. Historical Render dashboard notes only.

Ha már beállítottad a `CORS_ORIGIN` változót, de még mindig CORS hibákat kapsz, akkor ezeket ellenőrizd:

## 1. ✅ Backend Logok Ellenőrzése

**Render.com Dashboard → Backend Service → Logs tab**

### Mit kell látnod:

**✅ Jó esetben:**
```
✅ CORS enabled for origins: https://hellolocal-fe.onrender.com
```

**❌ Ha rossz:**
```
⚠️  WARNING: CORS_ORIGIN and FRONTEND_URL are not set! CORS will be disabled and frontend requests will fail!
```

**❌ Ha blokkolva van egy kérés:**
```
❌ CORS blocked: Origin "https://hellolocal-fe.onrender.com" not in allowed list: [https://hellolocal-frontend.onrender.com]
```

### Mit jelent:

- **Ha látod a `✅ CORS enabled` üzenetet**: A CORS be van állítva, de lehet, hogy nem egyezik az origin
- **Ha látod a `⚠️ WARNING` üzenetet**: A `CORS_ORIGIN` nincs beállítva
- **Ha látod a `❌ CORS blocked` üzenetet**: A `CORS_ORIGIN` rossz értékkel van beállítva

---

## 2. 🔍 Backend Service Neve Ellenőrzése

A backend URL: `https://hellolocal.onrender.com`

**Lehetőségek:**
- Service neve: `hellolocal`
- Service neve: `hellolocal-api`
- Service neve: valami más

**Hogyan találod meg:**
1. Render.com Dashboard → Services
2. Nézd meg az összes service-t
3. Keresd meg azt, amelyik URL-je: `hellolocal.onrender.com`

---

## 3. 🧪 OPTIONS Preflight Kérés Tesztelése

Teszteld, hogy a backend válaszol-e a CORS preflight kérésre:

```bash
curl -X OPTIONS https://hellolocal.onrender.com/api/admin/users/me \
  -H "Origin: https://hellolocal-fe.onrender.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v
```

### Várt válasz (ha jó):

```
< HTTP/1.1 204 No Content
< Access-Control-Allow-Origin: https://hellolocal-fe.onrender.com
< Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
< Access-Control-Allow-Headers: Content-Type,Authorization,X-Requested-With,Cache-Control,Pragma,Expires,Accept
< Access-Control-Allow-Credentials: true
```

### Ha rossz:

```
< HTTP/1.1 200 OK
(nincs Access-Control-Allow-Origin header)
```

**Ez azt jelenti**: A `CORS_ORIGIN` nincs beállítva vagy nem egyezik.

---

## 4. 🔄 Backend Újraindítás

Ha módosítottad a `CORS_ORIGIN` változót:

1. **Automatikus újraindítás**: Render.com automatikusan újraindítja a service-t
2. **Várj 1-2 percet**: Amíg a backend újraindul
3. **Ellenőrizd a logokat**: Nézd meg, hogy látod-e a `✅ CORS enabled` üzenetet

**Ha nem indul újra automatikusan:**
- Render.com Dashboard → Backend Service → Manual Deploy → Deploy latest commit

---

## 5. 📋 Ellenőrző Lista

- [ ] Backend service megtalálva a Render.com Dashboard-on
- [ ] `CORS_ORIGIN` változó hozzáadva/frissítve
- [ ] `CORS_ORIGIN` értéke: `https://hellolocal-fe.onrender.com` (pontosan egyezik)
- [ ] Nincs trailing slash: `https://hellolocal-fe.onrender.com` (nem `/` a végén)
- [ ] HTTPS használata: `https://` (nem `http://`)
- [ ] Backend újraindult (várj 1-2 percet)
- [ ] Backend logokban látod: `✅ CORS enabled for origins: ...`
- [ ] Frontend oldal frissítve (hard refresh: Ctrl+Shift+R vagy Cmd+Shift+R)

---

## 6. 🚨 További Lehetséges Problémák

### A. Backend Service Le van Állítva (503 hiba)

**Jelzés**: `503 Service Unavailable`

**Ok**: Render.com free tier 15 perc inaktivitás után alvó módba kerül

**Megoldás**: 
- Várj 1-2 percet, amíg felébred
- Vagy upgrade-elj fizetős tervre

### B. Backend Kód Nincs Deploy-olva

**Jelzés**: A logokban nem látod a `✅ CORS enabled` üzenetet

**Ok**: A kód változtatások még nincsenek deploy-olva

**Megoldás**:
1. Commit-old és push-old a változtatásokat
2. Render.com automatikusan újra deploy-olja
3. Várj 2-3 percet

### C. Environment Változó Nincs Mentve

**Jelzés**: A logokban látod a `⚠️ WARNING` üzenetet

**Ok**: A `CORS_ORIGIN` változó nincs mentve

**Megoldás**:
1. Menj vissza az Environment tab-ra
2. Ellenőrizd, hogy a `CORS_ORIGIN` változó ott van-e
3. Ha nincs, add hozzá újra
4. **Fontos**: Kattints a "Save Changes" gombra (ha van ilyen)

### D. Több Backend Service

**Jelzés**: Nem találod a megfelelő service-t

**Ok**: Lehet, hogy több backend service van

**Megoldás**:
1. Nézd meg az összes service-t
2. Keresd meg azt, amelyik URL-je: `hellolocal.onrender.com`
3. Azon a service-en állítsd be a `CORS_ORIGIN`-t

---

## 7. 📞 További Segítség

Ha még mindig nem működik:

1. **Másold ki a backend logokat** (Render.com Dashboard → Logs tab)
2. **Másold ki a pontos hibaüzenetet** a böngésző konzolból
3. **Ellenőrizd a `CORS_ORIGIN` értékét** a Render.com Dashboard-on

**Fontos információk:**
- Backend service neve: `?`
- Backend URL: `https://hellolocal.onrender.com`
- Frontend URL: `https://hellolocal-fe.onrender.com`
- `CORS_ORIGIN` értéke: `?`

---

## 8. ✅ Sikeres Beállítás Jelei

Ha minden rendben van, akkor:

1. ✅ Backend logokban látod: `✅ CORS enabled for origins: https://hellolocal-fe.onrender.com`
2. ✅ Nincs CORS hiba a böngésző konzolban
3. ✅ Az API kérések sikeresek (200 OK)
4. ✅ A frontend működik

---

**Ha még mindig problémád van, küldd el:**
- A backend logokat (Render.com Dashboard → Logs)
- A pontos hibaüzenetet a böngésző konzolból
- A `CORS_ORIGIN` értékét (Render.com Dashboard → Environment)

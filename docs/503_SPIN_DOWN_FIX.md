# 🔄 503 Service Unavailable - Render.com Free Tier "Spin Down"

## Probléma

A backend API 503-as hibát ad vissza (Service Unavailable).

## Ok

A **Render.com free tier** service-ek **15 perc inaktivitás után alvó módba** kerülnek. Az első kérés után **~1-2 percbe telik felébredni**.

Ez normális viselkedés a free tier-en, és nem hiba!

## ⚡ Gyors Megoldás

### 1. Várj 1-2 percet

Az első kérés után a backend automatikusan felébred, de ez időbe telik.

**Mit látsz:**
- Először: 503 Service Unavailable hibák
- 1-2 perc múlva: A kérések elkezdenek működni

### 2. Ellenőrizd a Backend Státuszát

**Render.com Dashboard → Backend Service → Logs tab**

**Mit kell látnod:**
- Ha "spinned down": Várj, amíg felébred
- Ha fut: Nézd meg, hogy vannak-e hibák

### 3. Frissítsd az Oldalt

Miután vártál 1-2 percet, frissítsd a frontend oldalt (F5 vagy Ctrl+R).

---

## 🔍 Hogyan Ellenőrizd, Hogy Felébredt-e?

### 1. Backend Health Check

Nyisd meg a böngészőben:
```
https://hellolocal.onrender.com/health
```

**Várt válasz** (ha felébredt):
```json
{"ok": true}
```

**Ha még 503**: Várj még egy kicsit.

### 2. Backend Logok

**Render.com Dashboard → Backend Service → Logs tab**

**Ha felébredt**, látnod kell:
- Új log bejegyzéseket
- `✅ CORS enabled for origins: ...`
- API kérések logolása

**Ha még "spinned down"**:
- Nincs új log bejegyzés
- Vagy csak a health check logok vannak

---

## 🚨 Ha Továbbra is 503-as Hibák

### 1. Backend Service Le van Állítva

**Ellenőrzés**:
- Render.com Dashboard → Backend Service → Overview tab
- Nézd meg a service státuszát

**Megoldás**:
- Ha "Stopped": Kattints a "Start" gombra
- Ha "Unhealthy": Nézd meg a logokat, hogy mi a probléma

### 2. Health Check Sikertelen

**Ellenőrzés**:
- Render.com Dashboard → Backend Service → Events tab
- Nézd meg, hogy volt-e health check failure

**Megoldás**:
- Ellenőrizd a health check endpoint-ot: `https://hellolocal.onrender.com/health`
- Ha 429-es hibát kapsz, akkor a health check endpoint nincs kizárva a rate limiting alól
- Ha más hibát kapsz, nézd meg a logokat

### 3. Manuális Újraindítás

**Ha semmi sem segít**:
1. Render.com Dashboard → Backend Service
2. Kattints a **"Manual Deploy"** gombra
3. Válaszd: **"Deploy latest commit"**
4. Várj 2-3 percet, amíg újra deploy-ol

---

## 💡 Hosszú Távú Megoldások

### 1. Upgrade Fizetős Tervre ($7/hó/service)

**Előnyök**:
- ✅ **Nincs "spin down"** - mindig elérhető
- ✅ Nagyobb erőforrások
- ✅ Több backup lehetőség

**Render.com Dashboard → Backend Service → Settings → Plan → Upgrade**

### 2. External Ping Service (Ingyenes)

**Cél**: 5 percenként ping-eli az API-t, hogy ne menjen alvó módba

**Ajánlott szolgáltatások**:
- **UptimeRobot** (ingyenes): https://uptimerobot.com
  - 5 percenként ping-eli a `/health` endpoint-ot
  - Ingyenes terv: 50 monitor/hó

**Beállítás**:
1. Regisztrálj UptimeRobot-ra
2. Add hozzá a monitor-t:
   - **URL**: `https://hellolocal.onrender.com/health`
   - **Type**: HTTP(s)
   - **Interval**: 5 minutes
3. Kész! Most már nem fog alvó módba kerülni

### 3. Render.com Auto-Deploy (Ha Van)

Ha van automatikus deploy beállítva, akkor a service ritkábban megy alvó módba.

---

## 📊 Összefoglalás

### Free Tier (Jelenlegi)

- ✅ Ingyenes
- ❌ 15 perc inaktivitás után alvó módba kerül
- ❌ Első kérés után 1-2 perc felébredés
- ✅ 750 óra/hó (megosztott két service között)

### Fizetős Tier ($7/hó/service)

- ✅ Nincs "spin down" - mindig elérhető
- ✅ Nagyobb erőforrások
- ✅ Több backup lehetőség

### External Ping (Ingyenes)

- ✅ Ingyenes (UptimeRobot)
- ✅ 5 percenként ping-eli az API-t
- ✅ Megakadályozza az alvó módba kerülést

---

## 🎯 Ajánlás

**Rövid távon**:
- Várj 1-2 percet, amikor 503-as hibát kapsz
- Vagy állíts be egy ingyenes UptimeRobot monitor-t

**Hosszú távon**:
- Upgrade-elj fizetős tervre, ha fontos, hogy mindig elérhető legyen
- Vagy használj external ping service-t (ingyenes megoldás)

---

**Fontos**: A 503-as hiba a free tier-en **normális viselkedés**, nem hiba! Csak várni kell, amíg a service felébred.

# 🔧 Health Check 429-es Hiba Javítása

> **Deprecated context (2026-11).** Written for Render health checks; live stack is Hetzner. Historical notes only.

## Probléma

A Render.com health check-je 429-es hibát kap (Too Many Requests).

**Email üzenet**:
```
HTTP health check failed with status code 429
```

## Ok

A health check endpoint rate limitálva van, mert:
1. A `@SkipThrottle()` dekorátor nem működik megfelelően több throttler konfiguráció esetén
2. Vagy a változtatás még nincs deploy-olva

## ✅ Megoldás

### 1. Controller Szintű `@SkipThrottle()`

A health check controller-t **teljesen** kizárjuk a rate limiting alól:

```typescript
@Controller()
@SkipThrottle({ default: true, strict: true }) // Mindkét throttler kizárva
export class HealthController {
  @Get("/health")
  health() {
    return { ok: true };
  }

  @Get("/api/health")
  apiHealth() {
    return { ok: true };
  }
}
```

### 2. Deploy-olás

**Fontos**: A változtatás után **commit-old és push-old** a kódot:

```bash
git add apps/api/src/health.controller.ts
git commit -m "fix: Exclude health check endpoints from rate limiting"
git push
```

### 3. Render.com Automatikus Deploy

A Render.com automatikusan újra deploy-olja a backend service-t.

**Várj 2-3 percet**, amíg a deploy befejeződik.

### 4. Ellenőrzés

**Teszteld a health check endpoint-ot**:
```bash
curl https://hellolocal.onrender.com/health
```

**Várt válasz**:
```json
{"ok": true}
```

**Ha még mindig 429**: Várj még egy kicsit, lehet, hogy a deploy még nem fejeződött be.

---

## 🔍 Miért Nem Működött Előtte?

A `@SkipThrottle()` dekorátor működnie kellene, de:

1. **Több throttler konfiguráció**: Van "default" és "strict" throttler
2. **Explicit megadás szükséges**: A `@SkipThrottle()`-nak explicit módon meg kell adni, hogy melyik throttler-t kell kihagyni
3. **Controller szintű**: Jobb, ha a controller szintjén van, nem csak a route-okon

---

## 📋 Ellenőrző Lista

- [ ] `@SkipThrottle({ default: true, strict: true })` hozzáadva a controller-hez
- [ ] Kód commit-olva és push-olva
- [ ] Render.com automatikusan újra deploy-olja
- [ ] Várj 2-3 percet
- [ ] Health check endpoint tesztelve: `https://hellolocal.onrender.com/health` → `{"ok": true}`
- [ ] Nincs többé 429-es hiba a health check-re

---

## 🚨 Ha Még Mindig 429-es Hiba

### 1. Ellenőrizd a Deploy Státuszát

**Render.com Dashboard → Backend Service → Logs tab**

Nézd meg, hogy:
- A deploy befejeződött-e
- Vannak-e build hibák
- A service fut-e

### 2. Ellenőrizd a Kódot

**Render.com Dashboard → Backend Service → Build Logs**

Nézd meg, hogy a legfrissebb commit deploy-olva van-e.

### 3. Manuális Újraindítás

**Ha semmi sem segít**:
1. Render.com Dashboard → Backend Service
2. Kattints a **"Manual Deploy"** gombra
3. Válaszd: **"Deploy latest commit"**
4. Várj 2-3 percet

---

## 📝 Változtatások

**Fájl**: `apps/api/src/health.controller.ts`

**Előtte**:
```typescript
@Controller()
export class HealthController {
  @SkipThrottle()
  @Get("/health")
  health() { ... }
}
```

**Utána**:
```typescript
@Controller()
@SkipThrottle({ default: true, strict: true })
export class HealthController {
  @Get("/health")
  health() { ... }
}
```

**Előnyök**:
- ✅ Controller szintű kizárás (egyszerűbb)
- ✅ Explicit throttler megadás (biztosabb)
- ✅ Mindkét throttler kizárva (teljes védelem)

---

**Fontos**: A változtatás után **commit-old és push-old** a kódot, hogy a Render.com újra deploy-olhassa!

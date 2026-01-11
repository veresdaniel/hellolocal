# Session Hosszabbítás - Implementációs Összefoglaló

## ✅ ELKÉSZÜLT

### Session automatikus hosszabbítás implementálva!

#### Új funkció: Proaktív session extension user interakció alapján

**Hogyan működik:**

1. **Token expiráció figyelés** (már létezett):
   - 10 másodpercenként ellenőrzi, hogy a token lejárt-e
   - Ha lejárt és van érvényes refresh token, automatikusan frissít
   - Ha nincs érvényes refresh token, kijelentkeztet

2. **ÚJ: Proaktív session hosszabbítás user interakció esetén**:
   - Figyeli a user interakciókat: `mousedown`, `keydown`, `scroll`, `touchstart`
   - **Ha a token 5 percen belül lejár** és a user aktív, **automatikusan frissíti a token-t**
   - **Throttling**: Maximum 1 percenként fut le (nem minden egyes kattintásra)
   - **Nem blokkolja a UI-t**: Háttérben fut, passzív event listener-ekkel

#### Konfigurálható értékek (`env.example` frissítve):

```bash
JWT_ACCESS_EXPIRES_IN=15m   # Access token élettartama (15 perc)
JWT_REFRESH_EXPIRES_IN=7d   # Refresh token élettartama (7 nap)
```

#### Előnyök:

- ✅ **Felhasználó-barát**: Aktív user soha nem jelentkezik ki véletlenül
- ✅ **Biztonságos**: Inaktív session továbbra is 15 perc után lejár
- ✅ **Performáns**: Throttling miatt nem túl gyakori API hívás
- ✅ **Átlátható**: Console log-olja a session hosszabbítást

#### Tesztelés:

1. Jelentkezz be az adminba
2. Várj ~10 percet (token 15 perc múlva jár le)
3. Végezz valamilyen interakciót (kattintás, görgetés)
4. A konzolban látható: `[Auth] Session extended due to user activity`
5. Ellenőrizd localStorage-ban, hogy új `accessToken` és `refreshToken` jött létre

---

## 🔧 MÓDOSÍTOTT FÁJLOK

- `/apps/web/src/contexts/AuthContext.tsx`: Új `useEffect` hook a proaktív session extension-höz
- `/env.example`: `JWT_ACCESS_EXPIRES_IN` és `JWT_REFRESH_EXPIRES_IN` hozzáadva

---

## 📋 KAPCSOLÓDÓ BACKEND KÓD

Backend már támogatja a refresh token mechanizmust:

- `/apps/api/src/auth/auth.service.ts`:
  - `generateTokens()`: Access és refresh token generálás
  - `refreshToken()`: Refresh token validálás és új token-ok kiadása
- `/apps/api/src/auth/auth.controller.ts`:
  - `POST /api/auth/refresh`: Refresh endpoint

---

## ⚙️ JAVASOLT KONFIGURÁCIÓ PRODUCTION-RE

```bash
# Access token: 30 perc (hosszabb, hogy kevesebb API hívás legyen)
JWT_ACCESS_EXPIRES_IN=30m

# Refresh token: 30 nap (felhasználó-barát)
JWT_REFRESH_EXPIRES_IN=30d
```

**Indoklás**:
- 30 perc access token elegendő biztonságot nyújt
- 30 nap refresh token azt jelenti, hogy a user havonta egyszer kell bejelentkezzen
- A proaktív refresh miatt az aktív user soha nem jelentkezik ki

---

## 🔐 BIZTONSÁGI MEGJEGYZÉSEK

- ✅ Refresh token **csak egyszer használható** (backend-ben új token generálódik minden refresh-nél)
- ✅ Refresh token **adatbázisban van tárolva**, nem csak a JWT-ben
- ✅ Inaktív session automatikusan lejár
- ✅ Manual logout törli mindkét token-t

---

Kész! A session automatikusan hosszabbodik user interakció esetén az adminon. 🎉

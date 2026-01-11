# Automatikus verzióellenőrzés és cache-kezelés

## Áttekintés

Az alkalmazás automatikusan ellenőrzi az új verziók elérhetőségét és értesíti a felhasználót, ha frissítés szükséges. Ez megoldja a mobilböngészők cache-elési problémáját.

## Hogyan működik

### 1. Build-time verzió generálás

A `vite.config.ts` minden build alkalmával generál egy `public/version.json` fájlt:

```json
{
  "version": "0.1.0-beta",
  "buildHash": "a1b2c3d4e5f6...",
  "timestamp": 1234567890123
}
```

- **version**: A `package.json`-ből származó verzió
- **buildHash**: MD5 hash a build időpontjából és egy random számból
- **timestamp**: Build időpont Unix timestamp

### 2. Kliens-oldali verzióellenőrzés

A `VersionChecker` komponens:

- **Első betöltéskor**: Letölti és elmenti a jelenlegi verziót
- **5 percenként**: Ellenőrzi a szervert új verzió után
- **Tab focus-kor**: Újraellenőrzi (ha a user visszavált a tab-ra)
- **Version.json lekérés**: Cache-busting (`?t=timestamp`) paraméterrel

### 3. Verzió változás észlelése

Ha a `buildHash` vagy `version` megváltozik:

1. Megjelenik egy **toast notification** a képernyő tetején
2. A user választhat:
   - **"Frissítés"** gomb: Azonnal frissít
   - **"Később"** gomb: 1 perc múlva újra ellenőriz

### 4. Cache törlés és frissítés

A "Frissítés" gombra:

```typescript
// Törli az összes cache-t
const cacheNames = await caches.keys();
await Promise.all(cacheNames.map(name => caches.delete(name)));

// Hard reload (server-ről tölt)
window.location.reload();
```

## Komponensek

### `VersionChecker.tsx`

Toast notification komponens verzió frissítéshez:

- Modern, animált megjelenés (slide down)
- Gradient background (lila/rózsaszín)
- Két gomb: "Frissítés" és "Később"
- Többnyelvű (i18n)

### `vite.config.ts`

Build plugin a `version.json` generálásához:

```typescript
{
  name: 'generate-version',
  buildStart() {
    generateVersionJson();
  },
}
```

### `TenantLayout.tsx`

Beépített komponens a publikus oldalakra:

```tsx
<VersionChecker />
```

## Fordítások

### Magyar (hu.json)
```json
{
  "updateAvailable": "Új verzió érhető el!",
  "updateDescription": "Frissítsd az alkalmazást a legújabb funkciók eléréséhez.",
  "refresh": "Frissítés",
  "later": "Később"
}
```

### Angol (en.json)
```json
{
  "updateAvailable": "Update Available!",
  "updateDescription": "Refresh the app to get the latest features.",
  "refresh": "Refresh",
  "later": "Later"
}
```

### Német (de.json)
```json
{
  "updateAvailable": "Update verfügbar!",
  "updateDescription": "Aktualisieren Sie die App, um die neuesten Funktionen zu erhalten.",
  "refresh": "Aktualisieren",
  "later": "Später"
}
```

## Tesztelés

### Lokális fejlesztés

1. Build az alkalmazást: `npm run build`
2. Ellenőrizd a `public/version.json` tartalmát
3. Indítsd el: `npm run preview`
4. Nyisd meg a böngésző DevTools Console-ját
5. Keresd a log-okat: `[VersionChecker] Initial version: ...`

### Production tesztelés

1. Deploy új verziót
2. Nyiss meg egy régi verziót a böngészőben
3. Várj 5 percet (vagy váltsd a tab-ot ki-be)
4. Meg kell jelennie a frissítés notification-nek

### Manuális verzió váltás tesztelése

1. Módosítsd a `package.json` verziót (pl. `0.1.0-beta` → `0.1.1-beta`)
2. Build újra: `npm run build`
3. A következő ellenőrzésnél meg kell jelennie a notification-nek

## Cache Stratégia

Az alkalmazás a következő cache stratégiát használja:

1. **Service Worker Cache**: Törlődik frissítéskor
2. **Browser HTTP Cache**: `version.json` mindig cache-bustinggal (`?t=timestamp`)
3. **LocalStorage**: Verzió információ perzisztálása

## Előnyök

✅ **Automatikus**: Nincs manuális frissítés szükséges
✅ **User-friendly**: Értesítés toast-tal, nem zavaró
✅ **Cache-safe**: Garantálja, hogy az új verzió betöltődik
✅ **Többnyelvű**: Teljes i18n támogatás
✅ **Performance**: Csak 5 percenként ellenőriz
✅ **Smart**: Tab focus-kor is ellenőriz

## Hibakeresés

Console log-ok a `[VersionChecker]` prefixszel:

```
[VersionChecker] Initial version: 0.1.0-beta (a1b2c3d)
[VersionChecker] Update detected! { old: "0.1.0-beta (a1b2c3d)", new: "0.1.1-beta (x9y8z7w)" }
[VersionChecker] Cleared 3 cache(s)
```

## Konfiguráció

Ellenőrzési gyakoriság módosítása:

```typescript
// VersionChecker.tsx
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 perc (alapértelmezett)
```

## Következő lépések

- [ ] Service Worker hozzáadása (PWA)
- [ ] Offline mód támogatása
- [ ] Version history megjelenítése
- [ ] Changelog automatikus betöltése

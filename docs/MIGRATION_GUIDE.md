# 🔄 Adatbázis Migrációs Útmutató

## Gyors Referencia

### Fejlesztési Környezet

#### Teljes Reset (új adatbázis vagy tiszta kezdés)
```bash
cd apps/api
pnpm db:reset
```
- ✅ Eldobja a helyi adatbázist
- ✅ Felteszi az init migrációt
- ✅ Betölti a demó seedet

#### Meglévő séma, csak a demó újratöltése
```bash
cd apps/api
pnpm db:seed
```
- ✅ Kiüríti a tartalmat és újra betölti a snapshotot
- ⚠️ A sémát nem módosítja

#### Csak Migrációk (seed nélkül)
```bash
cd apps/api
pnpm run migrate:deploy
```
- ✅ Alkalmazza a hiányzó migrációkat
- ❌ Nem futtat seed-et

### Production Környezet

#### Biztonságos Migráció
```bash
cd apps/api
pnpm run migrate:deploy
```
- ✅ Csak a migrációkat alkalmazza
- ✅ Nem futtat seed-et
- ✅ Biztonságos production használatra

## Részletes Leírás

### 1. Teljes Database Setup (Reset)

**Használat**: Új adatbázis vagy teljes tiszta kezdés

```bash
cd apps/api
pnpm db:reset
```

**Mit csinál**:
1. Eldobja a helyi adatbázist
2. Felteszi az init migrációt
3. Betölti a demó snapshotot (szuperadmin, Etyek–Budai, felületi szövegek)

**Figyelem**: ⚠️ **MINDEN ADAT TÖRLŐDIK!**

### 2. Meglévő Adatbázis Migrálása

**Használat**: Meglévő adatbázis, csak új migrációkat kell alkalmazni

```bash
cd apps/api
pnpm migrate:deploy
```

**Mit csinál**:
1. Alkalmazza a hiányzó migrációkat
2. Nem futtat seedet
3. Nem törli a meglévő adatokat

**Biztonságos**: ✅ Meglévő adatok megmaradnak

### 3. Production Migráció

**Használat**: Production környezetben, amikor új migrációkat kell alkalmazni

```bash
cd apps/api
pnpm run migrate:deploy
```

**Mit csinál**:
1. Csak a hiányzó migrációkat alkalmazza
2. Nem futtat seed-et
3. Nem törli az adatokat

**Biztonságos**: ✅ Production-ready, nem módosítja a meglévő adatokat

### 4. Manuális Prisma Parancsok

#### Új Migráció Létrehozása

```bash
cd apps/api
npx prisma migrate dev --name migration_name
```

**Példa**:
```bash
npx prisma migrate dev --name add_collections
```

#### Migrációk Alkalmazása

```bash
cd apps/api
npx prisma migrate deploy
```

#### Prisma Client Generálása

```bash
cd apps/api
npx prisma generate
```

#### Adatbázis Schema Szinkronizálása (DEV ONLY!)

```bash
cd apps/api
npx prisma db push
```

⚠️ **Figyelem**: `db push` csak fejlesztéshez! Production-ben mindig `migrate deploy`-t használj!

### 5. Teljes Reset + Seed

**Használat**: Fejlesztéshez, amikor tiszta adatbázist szeretnél

```bash
cd apps/api
pnpm db:reset
```

**Mit csinál**:
1. Törli az összes adatot
2. Újraalkalmazza az összes migrációt
3. Seedeli az adatbázist

## Hibaelhárítás

### Failed Migrations

Ha a migrációk sikertelenek voltak:

```bash
cd apps/api
pnpm exec prisma migrate resolve --applied migration_name
```

### Adatbázis Inkonzisztens Állapotban

Ha az adatbázis inkonzisztens állapotban van:

```bash
cd apps/api
pnpm db:reset
```

⚠️ **Figyelem**: Ez törli az összes adatot!

### Prisma Client Frissítése

Ha a Prisma Client nem friss:

```bash
cd apps/api
npx prisma generate
```

## Migrációs Fájlok Helye

```
apps/api/prisma/migrations/
├── 20260113205129_init/
│   └── migration.sql
├── 20260113221501_add_analytics/
│   └── migration.sql
├── 20260114111622_add_missing_event_columns/
│   └── migration.sql
├── 20260114184212_add_collections/
│   └── migration.sql
└── 20260114190000_add_collection_iscrawlable/
    └── migration.sql
```

## Production Deployment Checklist

- [ ] Backup készítése az adatbázisról
- [ ] `pnpm run migrate:deploy` futtatása
- [ ] Ellenőrzés, hogy minden migráció sikeres volt
- [ ] Prisma Client generálása: `npx prisma generate`
- [ ] Alkalmazás újraindítása
- [ ] Funkcionalitás tesztelése

## Gyakori Hibák

### P3009: Migration failed

**Ok**: Sikertelen migráció van az adatbázisban

**Megoldás**:
```bash
cd apps/api
pnpm db:reset
```

### P1001: Can't reach database server

**Ok**: Az adatbázis nem elérhető vagy a DATABASE_URL hibás

**Megoldás**:
- Ellenőrizd a `apps/api/.env` fájlban a `DATABASE_URL`-t
- Ellenőrizd, hogy az adatbázis fut-e
- Ellenőrizd a hálózati kapcsolatot

### P2025: Record not found

**Ok**: A migráció egy nem létező rekordot próbál módosítani

**Megoldás**:
- Ellenőrizd a migrációs SQL fájlt
- Lehet, hogy manuálisan kell javítani az adatbázist

## További Segítség

- [Prisma Migrate Dokumentáció](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Deploy Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-production)

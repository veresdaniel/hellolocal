# 🔄 Adatbázis Migrációs Útmutató

## Gyors Referencia

### Fejlesztési Környezet

#### Teljes Reset (új adatbázis vagy tiszta kezdés)
```bash
cd apps/api
pnpm run db:setup:reset
```
- ✅ Törli az összes adatot
- ✅ Alkalmazza az összes migrációt
- ✅ Seedeli az adatbázist

#### Meglévő Adatbázis Migrálása
```bash
cd apps/api
pnpm run db:setup
```
- ✅ Alkalmazza a hiányzó migrációkat
- ✅ Seedeli az adatbázist (ha üres)
- ⚠️ Nem törli a meglévő adatokat

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
pnpm run db:setup:reset
```

**Mit csinál**:
1. Törli az összes táblát és enum-ot
2. Alkalmazza az összes migrációt
3. Seedeli az adatbázist demo adatokkal
4. Aktiválja az összes site-ot
5. Létrehozza a szükséges SiteKey és SiteInstance bejegyzéseket

**Figyelem**: ⚠️ **MINDEN ADAT TÖRLŐDIK!**

### 2. Meglévő Adatbázis Migrálása

**Használat**: Meglévő adatbázis, csak új migrációkat kell alkalmazni

```bash
cd apps/api
pnpm run db:setup
```

**Mit csinál**:
1. Alkalmazza a hiányzó migrációkat
2. Ha az adatbázis üres, seedeli
3. Ellenőrzi és javítja a site-okat (SiteKeys, SiteInstances)
4. Nem törli a meglévő adatokat

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
pnpm run db:reset:seed
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
# Automatikus cleanup script
tsx scripts/delete-failed-migrations.ts

# Vagy manuálisan
npx prisma migrate resolve --applied migration_name
```

### Adatbázis Inkonzisztens Állapotban

Ha az adatbázis inkonzisztens állapotban van:

```bash
cd apps/api
pnpm run db:setup:reset
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
tsx scripts/delete-failed-migrations.ts
pnpm run migrate:deploy
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

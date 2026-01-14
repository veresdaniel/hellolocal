# 🔧 Prisma Client Generálás és TypeScript Hibák Javítása

## Probléma

A TypeScript hibák azt mutatják, hogy a Prisma Client nincs újragenerálva, ezért nem látja az új Collection modelleket.

## Megoldás

### 1. Futtasd a migrációkat (ha még nem futottak le)

```bash
cd apps/api
pnpm run migrate:deploy
```

### 2. Generáld újra a Prisma Client-et

```bash
cd apps/api
pnpm run generate
```

Vagy manuálisan:

```bash
cd apps/api
npx prisma generate
bash scripts/copy-prisma-client.sh
```

### 3. Ellenőrizd a TypeScript hibákat

A típus hibákat javítottam:
- ✅ Collection modellek típusai (`any` típusokkal ideiglenesen)
- ✅ Event-log helper hívások (legalPage/staticPage `title` → `name` mapping)
- ✅ `user.siteIds` típus hibák (explicit `any` cast)
- ✅ `isPublished` mező eltávolítva (nincs az Event modelben)

### 4. Ha még mindig vannak hibák

Ha a Prisma Client generálás után még mindig vannak hibák, próbáld:

```bash
cd apps/api
# Töröld a node_modules/.prisma mappát
rm -rf node_modules/.prisma
# Generáld újra
pnpm run generate
```

## Fontos

A Prisma Client generálása után a TypeScript hibáknak el kell tűnniük. Ha nem, akkor:
1. Ellenőrizd, hogy a migrációk lefutottak-e
2. Ellenőrizd, hogy a `schema.prisma` tartalmazza-e a Collection modelleket
3. Futtasd újra a `pnpm run generate` parancsot

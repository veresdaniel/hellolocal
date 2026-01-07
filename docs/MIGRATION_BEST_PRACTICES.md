# Prisma Migration Best Practices (Production)

## Probléma
Production környezetben a Prisma migrációk megszakadhatnak (timeout, network error), részben lefutnak, majd újrafuttatáskor hibát dobnak, mert nem idempontensek.

## Megoldás

### 1. Mindig tedd idempotenssé az új migrációkat

Miután generáltál egy új migrációt (`prisma migrate dev --name xxx`), módosítsd a migration.sql fájlt:

#### Enum értékek hozzáadása
```sql
-- Előtte:
ALTER TYPE "MyEnum" ADD VALUE 'new_value';

-- Utána:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'new_value' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'MyEnum')
    ) THEN
        ALTER TYPE "MyEnum" ADD VALUE 'new_value';
    END IF;
END $$;
```

#### Tábla létrehozása
```sql
-- Előtte:
CREATE TABLE "MyTable" (...);

-- Utána:
CREATE TABLE IF NOT EXISTS "MyTable" (...);
```

#### Oszlop hozzáadása
```sql
-- Előtte:
ALTER TABLE "MyTable" ADD COLUMN "myColumn" TEXT;

-- Utána:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'MyTable' AND column_name = 'myColumn'
    ) THEN
        ALTER TABLE "MyTable" ADD COLUMN "myColumn" TEXT;
    END IF;
END $$;
```

#### Index létrehozása
```sql
-- Előtte:
CREATE INDEX "my_index" ON "MyTable"("myColumn");

-- Utána:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'my_index'
    ) THEN
        CREATE INDEX "my_index" ON "MyTable"("myColumn");
    END IF;
END $$;
```

#### Foreign Key hozzáadása
```sql
-- Előtte:
ALTER TABLE "MyTable" ADD CONSTRAINT "my_fk" FOREIGN KEY ("columnId") REFERENCES "OtherTable"("id");

-- Utána:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'my_fk'
    ) THEN
        ALTER TABLE "MyTable" ADD CONSTRAINT "my_fk" FOREIGN KEY ("columnId") REFERENCES "OtherTable"("id");
    END IF;
END $$;
```

### 2. Teszteld lokálisan

Miután idempotenssé tetted:
```bash
# Futtasd kétszer, második alkalommal nem szabad hibát dobnia
pnpm prisma migrate deploy
pnpm prisma migrate deploy
```

### 3. Production deploy előtt

Commit-old a módosított migration.sql fájlt:
```bash
git add apps/api/prisma/migrations/
git commit -m "Make migration idempotent"
```

## Miért szükséges?

- **Network issues**: Production környezetben megszakadhat a kapcsolat
- **Timeouts**: Hosszú migrációk timeout-olhatnak
- **Rollback/retry**: Ha valami félbeszakad, újra lehessen futtatni
- **Zero-downtime**: Biztonságosabban lehet újra próbálni

## Automatizálás

A `setup-db.ts` script már kezeli a sikertelen migrációkat, de az idempotens migrációk biztonságosabbak és gyorsabbak.

## Fontos

- **Lokálban**: A Prisma generált migrációk működnek
- **Production-ban**: Mindig tedd idempotenssé őket
- **Jövőben**: Új migrációknál mindig alkalmazd ezeket a mintákat



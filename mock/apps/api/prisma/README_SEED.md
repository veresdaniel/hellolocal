# Seed package

This zip contains **only** the fixed seed file:

- `apps/api/prisma/seed.ts`

## Apply

From repo root:

```bash
unzip -o localo_seed_FIXED_ONE.zip -d .
```

(or manually copy it to `apps/api/prisma/seed.ts`)

Then:

```bash
pnpm -C apps/api generate
pnpm -C apps/api db:seed
```

## What was fixed

- `AnalyticsDaily`: site-level rows have `placeId = null`, which **cannot** be used in `upsert(where: { day_siteId_placeId: ... })` because Prisma requires a non-null `placeId` in the unique input. The seed now uses `findFirst + update/create` for `placeId: null`, and keeps `upsert` only for place-level rows.

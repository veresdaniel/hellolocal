# `@hellolocal/shared`

Cross-app constants and helpers for HelloLocal (API, web, SSR).

## Conventions

- **New magic strings are forbidden.** Put shared contracts in this package; app-local tokens go in `apps/*/src/constants/` (or CSS vars for UI).
- **Cross-app REST paths** → `apiPaths` / UC exports here. Resource CRUD paths that only the admin client uses may stay in `apps/web/src/api/admin.api.ts`.
- **Nest exception messages** → `ERROR_MESSAGES` keys in the API (`apps/api/src/common/constants/error-messages.ts`), never hardcoded English in controllers.
- **Admin UI** → CSS variables / classes in `admin-surfaces.css`; inline styles only for layout math.
- **Duplicated helpers** (>15 lines / 2+ call sites) → extract to shared or an app `lib/` module.

## Build

```bash
pnpm -C packages/shared build
```

Emits ESM (`dist/`) and CJS (`dist-cjs/`) for Nest + Vite + Node SSR.

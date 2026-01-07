# Kódminőség-ellenőrzés és Linting

Ez a projekt ESLint-et és Prettier-t használ a kódminőség biztosításához.

## Telepítés

```bash
pnpm install
```

## Használat

### Linting (hibakeresés)

**Backend (NestJS):**
```bash
cd apps/api
pnpm lint          # Hibák ellenőrzése
pnpm lint:fix       # Automatikus javítás
```

**Frontend (React):**
```bash
cd apps/web
pnpm lint          # Hibák ellenőrzése
pnpm lint:fix       # Automatikus javítás
```

**Mindkét projekt:**
```bash
pnpm lint          # Mindkét projekt lintelése
pnpm lint:fix      # Mindkét projekt automatikus javítása
```

### Formázás (Prettier)

**Backend:**
```bash
cd apps/api
pnpm format        # Fájlok formázása
pnpm format:check  # Formázás ellenőrzése (CI-hez)
```

**Frontend:**
```bash
cd apps/web
pnpm format        # Fájlok formázása
pnpm format:check  # Formázás ellenőrzése (CI-hez)
```

**Mindkét projekt:**
```bash
pnpm format        # Mindkét projekt formázása
pnpm format:check  # Mindkét projekt formázás ellenőrzése
```

## Konfiguráció

- **ESLint**: `apps/api/eslint.config.js` és `apps/web/eslint.config.js`
- **Prettier**: `.prettierrc` (root)
- **Ignore fájlok**: `.eslintignore` és `.prettierignore`

## Git Hooks (opcionális)

Ha szeretnél automatikus lintelést commit előtt, telepítsd a Husky-t:

```bash
pnpm add -D -w husky lint-staged
pnpm exec husky init
```

Ezután hozd létre a `.husky/pre-commit` fájlt:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

És add hozzá a `package.json`-hoz:

```json
{
  "lint-staged": {
    "apps/api/src/**/*.ts": ["eslint --fix", "prettier --write"],
    "apps/web/src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

## CI/CD

A CI/CD pipeline-ban használd a következő parancsokat:

```bash
pnpm lint          # Lint hibák ellenőrzése
pnpm format:check  # Formázás ellenőrzése
```


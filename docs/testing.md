# Tesztelés

## Parancsok (repo gyökér)

| Parancs | Mit csinál |
| --- | --- |
| `pnpm test` | Unit tesztek (`tests/unit/`) |
| `pnpm test:integration` | Integrációs tesztek (`tests/integration/`) — Nest HTTP / szolgáltatás mock Prisma-val, **nincs production DB** |
| `pnpm test:critical` | Kritikus regresszió (`tests/critical/`) |
| `pnpm test:coverage` | Unit + coverage → `coverage/` (lcov + HTML) |
| `pnpm test:report` | HTML teszteredmény-jelentés → `reports/html/index.html` |
| `pnpm lint` | ESLint (api + web) |

## HTML fájlok megnyitása

- Coverage: `coverage/index.html` (böngészőben, `file://` is jó).
- Teszteredmény: `reports/html/index.html` — single-file, vagy: `npx vite preview --outDir reports/html`

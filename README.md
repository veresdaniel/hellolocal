# HelloLocal

**Version:** [1.0.0-beta](CHANGELOG.md) · **License:** Proprietary — see [LICENSE](LICENSE)

Multi-tenant local tourism platform for Hungarian regions and destinations (e.g. Etyek–Budai). Operators manage places, events, collections, and towns; visitors explore via map/list, custom domains, and multilingual public sites. Live production: [hello-local.io](https://hello-local.io).

---

## What it does

### Public experience
- **Multi-tenant regions (Sites)** with path routing `/:lang/:siteKey/...` and optional **custom domains** for sites, towns, places, and collections
- **Places & events** — map (MapLibre) and list views, filters, detail pages, galleries, rich text, social share
- **Collections**, **static pages**, **legal pages**, **towns index**, platform **overview / landing**, **pricing / plans**
- **i18n** — Hungarian, English, German (i18next); per-language slugs and **hreflang** alternates
- **SEO & Open Graph** — SSR meta injection (`apps/web/server.js`), Schema.org/JSON-LD, chunked **sitemaps** + **robots.txt** scoped by hostname
- **Under-construction** gate with staff / preview access to public pages
- **Google Analytics 4** (consent-gated), platform and per-site measurement IDs
- **Web Push** subscriptions (VAPID); visitor accounts / starring where enabled
- Loading **skeletons** aimed at reducing CLS on public surfaces

### Admin
- Role-based access: superadmin, admin, editor, viewer (+ **2FA** TOTP)
- CRUD for sites, domains, places, events, collections, towns, categories, tags, price bands, galleries, static/legal pages
- Memberships, analytics dashboards, subscriptions / products, i18n & UI copy tools
- App settings: SEO, map defaults, **GA**, **platform landing crawl** toggle, **Facebook social-preview refresh**
- Plan entitlements for custom domains / aliases

### Platform / ops
- Hostname → tenant resolution (custom host first, then path site key)
- Caddy **on-demand TLS** ask endpoint (`/api/caddy/ask`)
- Domain-scoped crawl files proxied through the web SSR container

---

## Tech stack

| Layer | Stack |
|--------|--------|
| API | NestJS 11, Prisma 7, PostgreSQL (`@prisma/adapter-pg`), Passport JWT, bcrypt, optional reCAPTCHA / Web Push |
| Web | React 19, Vite, TypeScript, React Router, TanStack Query, TipTap, MapLibre (`react-map-gl`), i18next, Zustand |
| SSR | Node `apps/web/server.js` — bot SEO/OG injection, UC gate, sitemap/robots proxy |
| Shared | `@hellolocal/shared` — cross-app paths/constants |
| Data | PostgreSQL (local Docker or Neon / hosted) |
| Deploy | Docker Compose, Caddy, GitHub Actions → Hetzner VPS |

Engines: **Node ≥ 18**, **pnpm ≥ 10**. API production images use **Node 22** (Prisma 7).

---

## Monorepo layout

```
hellolocal/
├── apps/
│   ├── api/          # NestJS API + Prisma
│   └── web/          # Vite React SPA + server.js SSR
├── packages/
│   └── shared/       # @hellolocal/shared
├── deploy/           # Caddyfile, compose, remote deploy scripts
├── docs/             # Architecture, SEO, domain resolution, deploy notes
├── scripts/          # local:dev / staging / live, version bump, hooks
├── tests/            # Vitest unit / critical / integration
├── docker-compose.yml
├── CHANGELOG.md
└── package.json      # workspaces root (product version)
```

Versioning: root + `apps/web` share the product version (commit hook bumps patch, keeps `-beta`). `apps/api` is aligned to **1.0.0-beta** for this release. `packages/shared` keeps its own package version (`0.1.0`).

---

## Setup

### Prerequisites
- Node 18+ (22 recommended to match API images)
- pnpm 10+
- PostgreSQL 14+ (or Docker Compose / Neon connection string)
- Git

### Install

```bash
pnpm install
```

### Environment

Copy examples and fill values:

| File | Purpose |
|------|---------|
| `apps/api/.env` | From `apps/api/env.example` — `DATABASE_URL`, JWT, `FRONTEND_URL`, CORS, optional Facebook OG / VAPID / reCAPTCHA |
| `apps/api/.env.staging` | From `apps/api/env.staging.example` — staging DB |
| `apps/web/.env` | From `apps/web/env.example` — `VITE_API_URL`, VAPID, Cloudinary, reCAPTCHA site key |
| Root `.env` | From `env.example` — Docker Compose ports/secrets |
| `deploy/env.example` | Production / VPS compose |

Never point seed / migrate reset at staging or live databases.

### Database (local only)

```bash
cd apps/api
pnpm db:reset    # migrate + seed demo (127.0.0.1 only)
# or: pnpm db:seed
```

Seed loads a superadmin and sample region content when empty. Do not run against production.

### Run locally

Three parallel modes (separate ports):

```bash
pnpm local:dev       # web :5173, API :3002 — apps/api/.env
pnpm local:staging   # web :5174, API :3003 — .env.staging
pnpm local:live      # web :5175, API proxied to production — no local live DB writes
```

Or separately:

```bash
pnpm dev:api
pnpm dev:web
```

Useful scripts: `pnpm build`, `pnpm test`, `pnpm test:critical`, `pnpm lint`, `pnpm format`.

---

## Deployment (high level)

**Live stack:** Hetzner VPS + Docker Compose + Caddy (`deploy/`), deployed by GitHub Actions (`.github/workflows/deploy.yml`, `deploy-beta.yml`).

- Push to `main` / `devel` → production / devel stacks
- Staging / beta via beta workflow and `deploy/Caddyfile.beta`
- TLS: Caddy; on-demand certs for custom domains after DNS points at the VPS and `/api/caddy/ask` allows the host
- SEO: production indexing gated to the live platform host; beta/devel stay `Disallow: /`

Local one-shot compose: `docker-compose up -d` (root). Production-oriented compose lives under `deploy/`.

Render.com is **retired** in this repo. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/domain-based-tenant-resolution.md](docs/domain-based-tenant-resolution.md).

---

## Documentation

| Doc | Topic |
|-----|--------|
| [CHANGELOG.md](CHANGELOG.md) | Release notes |
| [docs/frontend-seo-middleware.md](docs/frontend-seo-middleware.md) | SSR SEO, sitemaps, robots |
| [docs/domain-based-tenant-resolution.md](docs/domain-based-tenant-resolution.md) | Host → site / entity |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy summary |
| [docs/hellolocal-backend-api-first-brief.md](docs/hellolocal-backend-api-first-brief.md) | API brief |
| [docs/hellolocal-frontend-brief.md](docs/hellolocal-frontend-brief.md) | Frontend brief |
| [packages/shared/README.md](packages/shared/README.md) | Shared package conventions |

---

## License

Proprietary — All Rights Reserved. See [LICENSE](LICENSE).

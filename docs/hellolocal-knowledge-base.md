# HelloLocal – Project Knowledge Base (Conversation Summary)

> This document is a **structured knowledge extract** from the full ChatGPT-assisted development
> of the HelloLocal project.  
> Intended for use in knowledge-base / note apps (Notion, Obsidian, etc.).

---

## 1. Project Overview

**Name:** HelloLocal  
**Goal:** SEO-first, multi-tenant, multilingual local tourism discovery platform  
**Initial focus:** Etyek–Budai wine region  
**Target market:** Finland (primary), Central Europe (secondary)

**Core principles:**
- API-first
- Clean architecture
- Production-grade learning project
- Strong SEO & shareability
- Whitelabel-ready (tenant-based)

---

## 2. Repository & Architecture

### Monorepo (pnpm workspace)

```
hellolocal/
 ├─ apps/
 │   ├─ web/   (React + Vite frontend)
 │   └─ api/   (NestJS backend)
 ├─ docs/
 ├─ package.json
 ├─ pnpm-workspace.yaml
```

- One Git repository
- Separate frontend & backend apps
- Shared documentation

---

## 3. Frontend (apps/web)

### Stack
- React
- Vite
- TypeScript
- React Router
- TanStack React Query

### Key concepts
- Language-aware routing (`/:lang/...`)
- Default tenant implicit (not in URL)
- SEO handled via API-delivered metadata
- Backend initially mocked with Mockoon, later replaced by NestJS

---

## 4. Backend (apps/api)

### Stack
- Node.js
- NestJS
- Prisma ORM (v7)
- PostgreSQL (Neon)
- pnpm workspace

### Key backend concepts
- API-first design
- Config-driven default tenant (`DEFAULT_TENANT_SLUG`)
- Language-aware endpoints
- Prisma adapter-based runtime connection (Prisma 7)

---

## 5. Database & ORM

### Database
- Neon (serverless PostgreSQL)
- Cloud-based, non-on-prem
- Free tier sufficient for v1

### Prisma
- Used as ORM + migration tool
- Prisma 7 configuration:
  - No datasource URL in `schema.prisma`
  - Connection defined in `prisma.config.ts`
  - Adapter-based runtime connection (`@prisma/adapter-pg`)

---

## 6. Prisma Workflow

1. `prisma migrate dev` – create schema in DB
2. `prisma generate` – generate Prisma Client
3. `prisma db seed` – seed initial data

Seed includes:
- Default tenant (`etyek-budai`)
- Town (`etyek`)
- Place (`hernak-estate`)
- Legal page (`privacy`)
- Translations (hu / en / de)

---

## 7. API Endpoints (v1)

### Health
```
GET /health
```

### Places
```
GET /api/:lang/places
GET /api/:lang/places/:slug
```

- Tenant resolved from config
- Language validated (`hu | en | de`)
- SEO metadata included
- Responses shaped for frontend consumption

---

## 8. Environment Configuration

**apps/api/.env**
```
DATABASE_URL=postgresql://...
DEFAULT_TENANT_SLUG=etyek-budai
PORT=3002
```

- `.env` loaded explicitly at NestJS startup
- Prisma CLI & runtime both use the same connection

---

## 9. Common Issues & Resolutions

### pnpm init
- `pnpm init -y` does NOT exist
- Use `pnpm init` or manual `package.json`

### Prisma 7 breaking changes
- No `url = env(...)` in schema
- Seed configured in `prisma.config.ts`
- Prisma Client must be generated manually

### TypeScript rootDir issues
- Runtime code must live under `src/`
- `prisma/seed.ts` excluded from TS build

### Env not loaded in NestJS
- Fixed via `import "dotenv/config"` or `@nestjs/config`

---

## 10. Current Status (Checkpoint)

✅ Monorepo initialized  
✅ Git repository created  
✅ Frontend running  
✅ Backend running  
✅ Database connected  
✅ Prisma schema migrated  
✅ Seed executed  
✅ API endpoints responding  

---

## 11. Recommended Next Steps

1. Connect frontend to NestJS API (replace Mockoon)
2. Implement legal pages endpoint
3. Add towns endpoint
4. Improve backend robustness (DTOs, validation, logging)
5. Introduce admin APIs (future)

---

## 12. Learning Outcome

This project demonstrates:
- Modern React usage
- API-first backend design
- Prisma + PostgreSQL best practices
- Cloud-native development
- Finnish-market-relevant tech stack

---

> **Guiding principle:**  
> *Build something that would not embarrass you in a Finnish technical interview.*

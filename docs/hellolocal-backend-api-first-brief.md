# HelloLocal – API-first Backend Brief v1.1

## Purpose
API-first public REST backend for a multi-tenant, multilingual local tourism platform.

## Stack
- Node.js (LTS)
- NestJS
- PostgreSQL
- Prisma ORM

## Core principles
- API-first
- Tenant-aware by design
- Configurable default tenant
- SEO-first
- Language-aware
- Clean, opinionated architecture

## Default tenant
If no tenant is explicitly provided, the backend resolves the tenant from configuration.

Environment variable:
DEFAULT_TENANT_SLUG=etyek-budai

## Base URL
/api/:lang/...

## Endpoints (v1)
- GET /api/:lang/tenants
- GET /api/:lang/towns
- GET /api/:lang/places
- GET /api/:lang/places/:slug
- GET /api/:lang/legal/:page

## Notes
- Frontend never decides tenant
- TenantSlug always returned in responses
- No auth/admin in v1

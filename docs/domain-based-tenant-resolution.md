# Domain-based site (tenant) resolution

How HelloLocal resolves a request host to a **Site** (régió), and optionally to a **Town** or **Place** custom domain.

## Resolution order

Implemented in `SiteResolveMiddleware` (`apps/api/src/common/middleware/site-resolve.middleware.ts`) and mirrored for the SPA bootstrap by `GET /api/domain/:host` (`DomainResolveController`).

1. **Custom hostname (highest priority)** — skip localhost / bare IPs
   - `SiteDomain.domain` (primary + aliases) → parent Site
   - Fallback: `Site.primaryDomain` when no `SiteDomain` row exists yet
   - `Town.customDomain` → parent Site (+ town entity slug)
   - `Place.customDomain` → parent Site (+ place entity slug)
2. **URL path** — `/:lang/:siteKey/...` via `SiteKey` (primary preferred)
3. **No match** — request continues without `req.site` (public routes that do not need a site, or 404 later)

`Event` has no `customDomain` (N/A).

## Entity model

| Entity | Domain storage | Notes |
|--------|----------------|-------|
| Site (régió) | `SiteDomain` rows + optional `Site.primaryDomain` | Plan-gated: Basic blocked; Pro may use aliases via `domainAliasesMax`; Business/Municipal enable `customDomainEnabled` |
| Town | single `Town.customDomain` | Requires `Town.siteId` (region). Inherits the parent Site plan entitlement |
| Place | single `Place.customDomain` | Requires `Place.siteId`. Inherits the parent Site plan entitlement |

Cross-entity hostname uniqueness is enforced in app code (`assertHostnameAvailable`), not only by DB unique indexes.

## Town region vs Place.siteId

- `Town.siteId` is **optional** (`null` = standalone település).
- `Place.siteId` (and denormalized `Event.siteId`) is **required** for tenant scoping.
- Assigning/moving a town to a region **cascades** `Place.siteId` / `Event.siteId` to that region.
- Detaching a town (`siteId → null`) **keeps** existing Place/Event `siteId` values (cannot clear a required FK) and clears `Town.customDomain`.

Standalone towns appear only in the admin **unassigned** bucket (`standaloneOnly`), not under every régió list.

## Local development

Add hosts (sudo):

```
127.0.0.1 etyek.local
127.0.0.1 budai.local
```

Create matching `SiteDomain` / `primaryDomain` / town-or-place `customDomain` via admin, then open e.g. `http://etyek.local:5173`. Platform slug path still works: `http://localhost:5173/hu/etyek-budai`.

## SPA host bootstrap

Frontend `pathForHostResolve` / `entityPublicAddress` prefer an entity `customDomain` root over the region slug path when present. See `tests/critical/domain-and-slug.test.ts`.

## Debugging

Middleware logs domain matches at debug level. `GET /api/domain/:host` returns `{ kind, slug, defaultLang, domain, entitySlug? }` or 404.

## SEO (robots / sitemap)

Crawl files use the same DB host resolution at request time (`X-Forwarded-Host` →
`SiteDomain` / `primaryDomain` / town-place-collection custom host). Adding a domain in
admin does **not** require an app redeploy. See [frontend-seo-middleware.md](./frontend-seo-middleware.md).

# Changelog

All notable changes to HelloLocal are documented in this file.

The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Product / domain names (HelloLocal, hello-local.io, Etyek–Budai, etc.) appear
in prose as used in the product.

## [Unreleased]

## [1.0.18-beta] - 2026-11-23

### Added

- Extensible `Currency` catalog (HUF/EUR seeded) and per-language currency map
  (`platform.currencyByLang`: hu→HUF, en/de→EUR by default) with admin CRUD on
  App Settings.
- Public plan amounts as `prices[code]` (separate editable values per currency);
  landing PlanPicker + SSR format with the lang’s currency from the catalog.

### Changed

- Plans lead / free-trial note / price unit copy no longer hardcodes forints;
  free note uses `{{currency}}` + `{{count}}`.

## [1.0.17-beta] - 2026-11-23

### Fixed

- Free plan price note hard-wired from `freeTrialDays` (not i18n/UI copy); clone
  locale JSON when registering i18n resources so DB UI-copy merge cannot mutate
  shared modules (lazy chunks were cloning after the stale merge).

## [1.0.16-beta] - 2026-11-23

### Fixed

- Free plan price note: clone bundled overview copy so i18n UI-copy deep-merge
  cannot overwrite `landingDefault` with stale "első hónapban".

## [1.0.15-beta] - 2026-11-23

### Changed

- Admin public plans editor: removed editable "Ingyenes megjegyzés" (`plans.freeForever`);
  the free price note is locale JSON + `freeTrialDays` only.

## [1.0.14-beta] - 2026-11-23

### Fixed

- Free plan card ignored `freeTrialDays` when DB UI copy still had
  "Ft az első hónapban" without `{{count}}` — fall back to bundled locale text.

## [1.0.13-beta] - 2026-11-23

### Fixed

- Free plan card price note uses `platform.freeTrialDays` (`{{count}}` nap) instead
  of a hardcoded first month — CSR PlanPicker and overview SSR.

## [1.0.12-beta] - 2026-11-23

### Fixed

- API Docker build: JSDoc in `robots.service.ts` no longer embeds `*/` (broke
  `tsc` with a premature comment close).

## [1.0.11-beta] - 2026-11-23

### Fixed

- Facebook / social OG scrapers: when global indexing is off, `robots.txt` now
  allowlists preview bots on **every known host** (platform + custom domains),
  not only the marketing landing — so shared place/list/event URLs scrape too.
  Drop `$` Allow anchors (Meta ignores them), allowlist `meta-externalagent` /
  `meta-externalfetcher`, and serve `robots.txt` as **206** on `Range` (Meta quirk).
- Custom-domain list first paint CLS: list-shaped skeleton + card body heights
  matching real `.list-card` instead of a detail-hero sheet.

## [1.0.9-beta] - 2026-11-23

### Added

- **Free-plan trial days** (`platform.freeTrialDays`, default 30): admin App
  Settings control; free signup creates `PlaceSubscription` with `validUntil`;
  daily cron auto-suspends the owner when the trial ends; pricing / plan cards
  show the configured length.
- **Paid plan apply / renew**: upgrading free→paid (or setting place subscription
  ACTIVE / extending a paid plan) unsuspends the owner and sets the place
  `isActive` so list/map content returns.

### Changed

- User **suspend** (`isActive=false`): owned places/events stay out of public
  list, map, detail, and sitemap (superadmin accounts cannot be suspended;
  their content is never hidden by this rule).
- User **delete** (superadmin only): cascade-deletes places the user owns
  (and related events); superadmin users still cannot be deleted.
- **Free-plan** places require **superadmin** publish approval; owners/managers
  cannot turn visibility on. Admin place list shows awaiting-approval /
  owner-suspended badges; user form labels suspend clearly.

### Fixed

- Facebook / social OG scrapers no longer see a synthetic **403** when global
  crawl is off but platform landing is on — `robots.txt` allowlists
  `facebookexternalhit` (and peers); Meta ignores `$` Allow + `Disallow: /`.

## [1.0.8-beta] - 2026-11-23

### Changed

- Platform landing crawl is independent of global indexing: global off + landing
  on still serves `index` meta, Allow for `/` and `/:lang` in robots.txt, and
  landing-only sitemap entries on the platform host.

### Fixed

- Google login no longer 404s on platform/custom hosts: OAuth start URL uses
  `VITE_API_URL` (`api.*`) instead of same-origin `/api/auth/google` (SPA shell).
- App-wide FOUC: boot path sets public navy vs admin light background, empty
  `#root` stays hidden until entry CSS applies, overview styles ship in the
  main CSS bundle, and SSR bodies (overview / place / event / region) get an
  inline first-paint shell so crawlable HTML never flashes unstyled.

## [1.0.7-beta] - 2026-11-23

### Added

- **Town admin SEO / Social** block (title, description, image, keywords) —
  optional overrides, same pattern as place / event / collection / site.
- **Site** admin SEO keywords field (previously schema-only).
- Google OAuth **return-origin state** so custom-domain admin login
  (`helloetyek.hu`, …) round-trips to the same host after Google callback.

### Changed

- Mobile explore **map dock** pins edge-to-edge at the bottom with no pill
  radius; filter/events/services panels open above the bar (no drag on mobile).
- **Show my location** control defaults just above the closed mobile dock bar
  when no device-specific position is persisted (`mapLocationControlPosition_mobile`).
- Desktop **Show my location** default sits in the map’s bottom-left corner
  (`bottom: 16`, `left: 16`) when no desktop position is persisted.
- Platform marketing landing URL is the bare domain or `/:lang` (SSR + SPA);
  legacy `/attekintes|overview|ueberblick` redirects to the language root;
  sitemap / canonical / hreflang / share `og:url` follow the same paths.
- Domain-capable entities (site, town, place, event, collection): empty admin
  SEO/social fields cascade from content (name → short description → first
  sentences → hero) then brand placeholder / platform `defaultShareImage`;
  filled admin fields win. Collection public API keeps `seo.*` null when unset
  so CSR/SSR can cascade. SSR `socialMeta` matches CSR `resolveSeoFields`.

### Fixed

- Google admin login no longer dumps staff onto the public list page; it opens
  the admin shell (same as password login). Visitors still leave via
  `ProtectedRoute`.
- Google OAuth callback no longer always redirects to `FRONTEND_URL` — returns
  to the validated originating custom domain when present.

## [1.0.0-beta] - 2026-11-23

First named **1.0.0-beta** product release. Package versions had auto-bumped
through the `1.0.x-beta` line (root/web); this release resets the documented
product version to **1.0.0-beta**. Consolidates work since **0.1.0-beta**,
including multi-domain hosting, SEO/social/SSR hardening, under-construction,
admin/plans, and current uncommitted CLS / social-preview / landing-crawl /
security polish.

### Added

- **Multi-tenant regions (Sites)** with path-based (`/:lang/:siteKey`) and
  **custom-domain** hosting for sites, towns, places, and collections;
  plan-gated domain entitlements.
- **Caddy on-demand TLS** via `GET /api/caddy/ask` so new hostnames can obtain
  certificates without redeploy.
- **Domain-scoped SEO crawl files**: per-host `robots.txt` and chunked
  `sitemap.xml` (static, sites, places, events, towns, pages, collections),
  with cache invalidation on admin writes.
- **SSR social / Open Graph meta** in `apps/web/server.js` and related SSR
  helpers (`socialMeta`, overview JSON-LD, under-construction gate HTML).
- **Facebook Graph OG scrape** service for admin “Refresh social preview”
  (and post-SEO-save), gated by `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`.
- **Platform landing crawl toggle** (`platform.landingCrawlable`) so the
  marketing overview can stay out of the index until enabled.
- **hreflang / language alternates** for public pages (client + SSR overview).
- **Under-construction (UC)** mode with staff/UC-preview access to public
  pages while visitors see the gate.
- **Curated collections**, static pages, legal pages, towns index,
  pricing/plans surfaces, and visitor-oriented auth flows (visitor users /
  starring).
- **`@hellolocal/shared`** package for cross-app constants, API paths, and UC
  helpers.
- **Google Analytics 4** (consent-gated) with platform and site
  measurement-ID settings.
- **Admin** expansions: domains, countries, memberships, analytics
  dashboards, subscriptions/products, i18n/UI copy, site status / cache tools,
  landing-crawlability card, social preview refresh.
- **Hetzner + Docker Compose + Caddy** production/devel/beta deploy paths
  (GitHub Actions); Render.com path retired.
- **Public loading skeletons** (`PublicSkeleton`, `ImageWithSkeleton`) to
  reduce layout shift (CLS) on lists and detail surfaces.
- **Cloudinary-aware share/SEO image** helpers and default share image
  resolution.
- Unit coverage for Facebook OG scrape, social meta, and overview JSON-LD
  (new test files in tree).

### Changed

- Production crawl gating uses live platform host (`hello-local.io`);
  beta/devel/local stay non-indexable.
- Site resolution order: custom hostname → path site key → unscoped; mirrored
  for SPA bootstrap via domain resolve API.
- Web production SSR image hardened (languages catalog, locale loading); map
  chunk points at `react-map-gl/maplibre`.
- API production images build on **Node 22** (Prisma 7); monorepo engines
  remain Node ≥18 / pnpm ≥10.
- Centralized magic strings into `@hellolocal/shared`; admin and public SEO
  field resolution refactored for consistency.
- Map / mobile UX refinements; rate limits and CORS/deploy hardening iterated
  for live traffic.

### Fixed

- Under-construction preview and staff browse of public pages while UC is on.
- Site edit / overview crashes (undefined site id), seed/domain saving, and
  multi-domain admin settings.
- Web-prod 502 from missing `languages.json` in the SSR image.
- Map load/resolution on production and mobile touch behavior.
- 2FA flows and assorted admin/i18n regressions from the refine-admin merge
  line.
- Merge-conflict leftovers that broke API/version parsing.

### Security

- Hostname uniqueness / entitlement checks for custom domains;
  known-public-hostname helpers for crawl/TLS ask paths.
- Stricter public URL validation for SEO/share and related admin inputs.
- JWT + role guards retained; 2FA (TOTP) fixes; optional reCAPTCHA v3 on
  public forms (honeypot/timing still apply when unset).
- Secrets for Facebook OG scrape never exposed to the admin UI
  (configured/status only).

### Known limitations (beta)

- Email delivery still largely placeholder; some advanced admin bulk/export
  flows remain roadmap items.
- Sitemap cache is in-memory (short TTL); no Redis layer yet.

---

## [0.1.0-beta] - 2026-01-07

Historical notes from the first beta documentation pass, translated to English
for consistency.

### Added in 0.1.0-beta

#### Content management

- **Multilingual system** — Hungarian, English, and German via i18next
- **Places management** — full CRUD in the admin UI
  - Dynamic categories
  - Tags system
  - Price bands
  - Towns management
  - Gallery and hero image support
  - GPS coordinates
- **Events system** — timed event management
  - Start and end dates
  - Pinned (featured) events
  - Places linked to events
  - Event categories
  - Rich text descriptions
- **Rich text editor** — TipTap-based
  - HTML formatting
  - Heading styles (H1, H2, H3)
  - Image insertion
  - Bold, italic, lists
- **SEO**
  - Automatic slug generation
  - Dynamic meta tags
  - Multilingual slugs
  - Fallback to Hungarian slugs when a locale is missing
- **Legal pages** — dynamic Terms, Privacy, and Cookies

#### User interface

- **Interactive map view** — MapLibre GL
  - Places shown as markers
  - Events on the map
  - Map position and zoom settings
  - Clustering for large marker sets
- **List view** — alternative presentation
  - Combined places and events listing
  - Infinite scroll
  - Search
  - Filter by category and price band
- **Drag-and-drop filters**
  - Position persisted in localStorage
  - Open/closed state persistence
  - Repositionable filter box
- **Events list box**
  - Shows up to 3 events
  - Internal scrolling
  - Drag-and-drop positioning
  - Pinned events sorted first
  - Past events filtered out
- **Detail pages** — places and events
  - Hero image
  - Gallery
  - Rich text descriptions
  - Contact information
  - Map integration
  - Social share buttons (Facebook, Twitter, Email)
  - Breadcrumb navigation
- **Responsive mobile design**
  - Adaptive padding and margins
  - Mobile-optimized image sizes
  - Overflow-x protection
  - Global `box-sizing: border-box`
  - Word-wrap for long text

#### Admin

- **Role-based access control**
  - Superadmin — full access
  - Admin — content and settings
  - Editor — content editing only
  - Viewer — read-only
- **2FA** — TOTP-based two-factor authentication
  - QR code generation
  - Backup codes
  - Admin enable/disable
- **Multi-tenant system**
  - Isolated tenant handling
  - Tenant-specific settings
  - Tenant switching in admin
- **User management**
  - CRUD operations
  - Role changes
  - 2FA management as admin
  - Password hashing (bcrypt)
- **Settings page** — collapsible sections
  - Default language
  - Map center and zoom
  - Page SEO settings (name, description, meta)
- **Automatic slug generation**
  - For places and events
  - Per-language slugs
  - Maintenance endpoint for existing records
- **Admin dashboard** — ordered tiles on the home screen
  1. Events
  2. Places
  3. Price bands
  4. Categories
  5. Tags
  6. Towns
  7. Settings
  8. Legal pages
  9. User profile

#### Notifications

- **Push notification system** — Web Push API
  - Subscribe and unsubscribe
  - Prisma model for push subscriptions
  - Immediate notification on event create (TODO)
  - Reminder 2 hours before an event
  - Cron job every 10 minutes for upcoming events

#### Technical

- **JWT authentication** — access-token based
- **Prisma ORM** — type-safe database access
- **React Query** — server state cache management
- **Error handling** — GlobalExceptionFilter
- **Tenant resolver** — automatic tenant resolution by slug/domain
- **Slug service** — centralized slug handling
- **Loading spinner** — 2-second delay, full-screen
- **Footer** — modern sticky design

### Fixed in 0.1.0-beta

- Place and Event detail pages made scrollable
- Slug fallback to Hungarian when the requested language is missing
- Site settings save works correctly
- MapFilters drag-and-drop fixes
- EventsList header fully clickable
- Price band filtering now by ID (not by name)
- Admin settings collapsible-section UX improvements
- Mobile overflow fixes (padding/margin tuning)
- Translation update clarifying "Cities" as "Towns" in the Hungarian locale
- Linter warnings addressed

### Changed in 0.1.0-beta

- Modern card-based design
- Hover effects and transitions
- Smaller, cleaner social share buttons
- Brand-colored checkboxes in filters

### Security in 0.1.0-beta

- Bcrypt password hashing
- JWT token-based authentication
- Role-based access via Guards
- 2FA TOTP implementation
- CORS configuration

### Dependencies (as of 0.1.0-beta docs)

#### Frontend

- React 19, Vite, TypeScript, TanStack Query, React Router, MapLibre GL,
  TipTap, i18next

#### Backend

- NestJS 11, Prisma 7, PostgreSQL (`@prisma/adapter-pg`), Passport JWT,
  bcryptjs, Web Push, Node.js 18+

### Known limitations (0.1.0-beta)

- Unit and E2E tests missing (partially addressed later)
- Email service not configured (EmailService placeholder)
- Image upload still file-path based (Cloudinary added later for editor/CDN)
- No cache layer (Redis)
- No rate limiting (rate limits added later for live)
- Audit log missing

---

## [Unreleased]

### Planned

- [ ] Redis cache layer
- [ ] Export/Import (CSV, JSON)
- [ ] Bulk admin operations
- [ ] Broader accessibility (a11y) pass
- [ ] Production email delivery

---

## Versioning notes

- **Product / release version**: root `package.json` and
  `apps/web/package.json` (kept in sync by
  `scripts/bump-version-on-commit.cjs`, which bumps the patch while preserving
  a prerelease suffix such as `-beta`).
- **API** (`apps/api/package.json`): aligned to **1.0.0-beta** for this
  release; not auto-bumped by the commit hook.
- **Shared** (`packages/shared/package.json`): independent package version
  (`0.1.0`); not the product semver.

[1.0.0-beta]: https://github.com/yourusername/hellolocal/releases/tag/v1.0.0-beta
[0.1.0-beta]: https://github.com/yourusername/hellolocal/releases/tag/v0.1.0-beta
[Unreleased]: https://github.com/yourusername/hellolocal/compare/v1.0.0-beta...HEAD

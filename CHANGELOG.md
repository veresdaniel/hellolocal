# Changelog

All notable changes to HelloLocal are documented in this file.

The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Product / domain names (HelloLocal, hello-local.io, Etyek–Budai, etc.) appear
in prose as used in the product.

## [Unreleased]

### Fixed

- Public login: free / subscriber / admin / superadmin users go to the admin
  dashboard (only true visitors stay on the public return URL).
- Admin mobile: drop `100vw` sizing that caused post-login horizontal scroll /
  “zoomed” layout; form controls clamp to the content column.
- Mobile wizard: readable step/lead/progress contrast on the gradient; cards and
  inputs no longer overflow the screen.
- Production web image: bake `VITE_CLOUDINARY_*` at build time so uploads work
  again (“Cloudinary not configured”).

### Added

- Mobile-only place/event upload wizard (`/admin/wizard`): step shell, camera
  compress upload, draft create (`isActive: false`); desktop keeps classic
  Places/Events forms (wizard entry hidden ≥768px, deep links redirect).
- P0 product specs for DMO-first roadmap: place claim + approval queue, embed
  map + campaign QR pack, CSV/JSON import–export + bulk admin — see
  [docs/p0-feature-specs.md](docs/p0-feature-specs.md).
- Public GTM `dataLayer` events (consent-gated, admin skipped): `page_view`,
  `scroll`, `view_item`, `select_item`, `contact_click`, `share`, `cta_click`,
  `generate_lead`, auth clicks, `select_content`; docs in
  [docs/analytics-gtm.md](docs/analytics-gtm.md) and README.
- Cookie settings re-open from mobile menu + footer; dismiss (“Most nem”) no
  longer counts as accept.
- Sample image seed script (`pnpm db:seed-sample-images`) for blank place
  hero/card/map and related translation image fields.
- Global public analytics + cookie consent shell (covers map view / overview).

### Changed

- Production deploy: clear leftover `\<id\>_hellolocal-*` containers before
  `compose up` so a raced/interrupted recreate does not fail the GitHub Deploy.
- Region home SEO: expose `seo.defaultKeywords` from SiteTranslation and inject
  them in SSR/CSR (so custom hosts like helloetyek.hu do not keep platform
  landing keywords).
- Platform SEO defaults (index.html + overview seoTitle/description/keywords
  hu/en/de): broader organic phrasing (sights/events tourism map; guests +
  councils/DMOs/businesses) instead of municipality-only or vague “helyi
  helyek” copy.
- Platform landing copy (hu/en/de): clearer marketing voice from the product
  concept — intro paragraphs, Google Maps FAQ, stronger region/domain framing;
  admin Landing copy editor fields for `introP1` / `introP2`.
- Superadmin dashboard cards: Countries → Region & memberships → Settlements.
- Place list filters: drop fixed 240px min-height so the panel hugs chip rows
  (skeleton matches).
- Place list cards: mobile collapses empty rating/tag/copy slots for tighter
  cards; desktop keeps equal-height grid rows (reserved slots + stretch).
- Place detail map: locked pan/zoom, marker centered; mobile height ~⅔.
- Mobile gallery lightbox: drag-follow swipe with settle animation (no hard
  cut), no arrows; stronger close control.
- Mobile nav secondary links: tighter spacing; platform GTM fallback UI removed
  (per-host GTM only).

### Fixed

- Platform overview load: no more brief place-card skeleton flash while the
  lazy OverviewPage chunk loads (`PublicBootShell` is plain navy; hellolocal.hu/.eu
  + overview SSR seed platform host scope immediately).
- Platform overview FOUC: park SSR + keep `#root` hidden until async SPA CSS and
  OverviewPage are ready (navy boot only — no CSS-less hero flash).
- Mobile map: tapping a place name chip opens the info bubble (not only the
  pin); selected bubble shrinks when zooming out instead of looking larger.
- Mobile gallery lightbox: one full image per viewport (clipped track); swipe
  no longer showed half of two slides side-by-side.
- Custom-domain “Áttekintés” (footer + mobile/desktop nav) opens the
  language-matched platform marketing landing (e.g. helloetyek.hu/en →
  hellolocal.eu/en) instead of the region `/:lang` home.
- SPA list → detail kept scroll position; `ScrollRestoration` resets on forward
  navigations.
- Admin towns edit crash: SEO fields referenced undefined `AiPostFillField`
  (correct export is `AiPostFormField`); EventsPage `?edit=` missing `getEvent`
  import.
- helloetyek explore lab LCP: SSR emit discover title + first `list-card` img
  (same markup PSI cites), preload `map-szeged-480.webp`, async `index.css`,
  `#hl-host-bootstrap` so HostScope skips `/api/domain` on first paint; SPA
  PlaceCard uses the 480 marketing ladder to match the preload.
- helloetyek explore lab LCP (earlier): paint `places-discover__title` during the list
  skeleton (og:title), preconnect `api.hello-local.io` on custom-host SSR, strip
  admin Google Fonts from that shell, idle-defer DB UI-copy fetch, keep
  OverviewPage lazy (modulepreload only on platform overview) so explore does
  not download unused overview JS.

### Added

- Free-account abuse stack: email normalize + disposable block, one free
  place/pending per user, optional Stripe SetupIntent card fingerprint
  (`platform.freeTrialRequireCard` + `STRIPE_*`), soft IP/device score with
  admin “Gyanús regisztrációk” list (`/admin/signup-signals`), migration
  `20261124160000_signup_abuse_signals`.
- Platform landing images CMS: per-language hero / story / closing / share
  Cloudinary URLs via AppSetting `platform.landingImages` (admin App settings);
  overview SSR + SPA resolve CMS URLs over bundled `/marketing` fallbacks.
- UI language auto-translate job after add-language (admin + public + common
  catalogs, plus `admin.*` in UiCopy). In-process job service
  (`ui-translate.service.ts`, reuses content-draft AI key/provider), endpoints
  `POST /api/admin/ui-copy/translate` and `GET .../translate/:jobId`,
  `addLanguage` returns `translateJobId`; UiCopyEditor polls progress and has an
  "Auto-fordítás" button; admin language switcher and currency-by-language card
  follow DB UI languages.
- Admin entity forms (places, events, towns, site edit) round-trip every code
  in `site.languages[]`: new `langFields` helpers (`emptyLangFields`,
  `translationsFromForm`, `primaryContentLang`, `requirePrimaryLangName`)
  replace hardcoded hu/en/de state, validation and payload building; site edit
  loads all translations and the Domain tab lists site keys per site language.

### Fixed

- helloetyek list view 500: a CSS comment inside the PlacesListView `<style>`
  template used backticks around `.hl-skel-list__filters`, which closed the
  template early and threw `ReferenceError: skel is not defined`.
- hellolocal.hu mobile LCP (~5.1s lab): previous `load`+3s-idle SPA defer let
  Lighthouse keep updating LCP after `createRoot` wiped the SSR hero; boot as
  soon as the hero WebP is ready, eager-load `OverviewPage` (no Suspense gap),
  navy platform Suspense fallback, preload `map-szeged-480.webp`, delay cookie
  banner past the lab LCP window.
- hellolocal.hu mobile LCP: defer SPA boot on overview SSR until `load`+idle so
  `createRoot` does not wipe the SSR hero before lab LCP settles; drop vendor
  `modulepreload` on that page (bandwidth for the map WebP); WebP as `<img src>`;
  long-cache hashed assets + marketing images; API `dns-prefetch` instead of
  unused CORS `preconnect`.
- hellolocal.hu overview critical path: async-load SPA `index-*.css` (shell +
  overview CSS stay blocking); strip admin Google Fonts hints; late API
  `preconnect` only as SPA boots; LCP image preload before font preloads;
  below-fold SSR images `fetchpriority=low`; idle-defer live-demo URL fetch.
- hellolocal.hu overview story map: serve responsive 480/720 WebP on mobile
  instead of always downloading `map-szeged-1100.webp`.
- Explore CLS (helloetyek): custom-host boot uses navy `PublicBootShell` instead
  of the white `LoadingSpinner`; filter chrome min-height 240px aligned with
  list skeleton; cookie banner fades in with opacity only.
- Explore PageSpeed (helloetyek): stop shipping MapLibre on first paint — drop
  stale `vite.config.js` (Vite preferred it over `.ts`) and its `map-vendor`
  `manualChunks` entry that hosted `__vitePreload`, so every lazy route
  statically imported ~1MB of map code.
- Explore LCP: Wikimedia place images rewrite to `thumb.wikimedia.org` at an
  allowed width (Cloudinary fetch is restricted on this account).
- Explore CLS: discover chrome skeleton matches search+filters height when the
  site has no `listIntroHtml` (no more tall intro placeholder dump).
- Explore CLS: wait for events before first grid paint so pinned events do not
  prepend after places and shove the list.
- Public image delivery (region / place / event / curator): list cards and map
  marker media request ~500w thumbs; detail heroes ~960w (not 1600–1920).
- Facebook Sharing Debugger false 403 on `robots.txt`: Meta UAs always get
  HTTP 206 for robots (even without `Range`), matching the known Meta quirk.
- Meta preview bots get a static Allow-only `robots.txt` (no empty `Disallow:`,
  no platform landing Disallow merge); drop empty Disallow from social UA groups.
- Share image URLs: align www/apex twin hosts to the request origin so
  `og:image` / `twitter:image` match `og:url`.
- PageSpeed: overview marketing images serve WebP (+ sized JPG fallbacks);
  LCP map shot preloaded; Google Fonts no longer render-block; preload Source Sans
  latin-ext (HU glyphs / CLS); `HomePage` lazy so overview skips map-vendor.
- Overview images: responsive WebP `srcset` (480/720/960/1100) with stronger
  compression; LCP preloads the 720w candidate.
- Overview mobile LCP: hero/story `picture` sources cap at 720w below 860px;
  preload `imagesrcset` omits 960w; hero mock animations desktop-only.
- Map “my location”: do not persist stale GPS coords; refresh on PWA/tab resume
  (`visibilitychange` / `pageshow` / `focus`) and `watchPosition` while moving.
- Admin: searchable `AdminAutocomplete` replaces native `<select>` for places,
  towns, sites, users, brands, currencies, hierarchy filters, roles, and similar
  entity pickers (language / pagination / tiny enums kept as select).

### Added

- Place `cardImage` field (list/card view); CDN upload for hero / card / map images
  in place admin; seed sample card + hero images in snapshot.
- Shared `AdminImageField` (CDN) wired across admin image inputs (places, events,
  towns, collections, sites, brands/domains, SEO images, products, share image).
- `/llms.txt` (Markdown H1 + links) for PageSpeed Agentic Browsing discoverability.
- Admin content hub: dashboard tiles for New content / Places / Events / Curated
  collections; one-step type picker at `/admin/content/new`.

### Changed

- Category CRUD (create/update/delete/reorder) is superadmin-only; editors still
  select categories on place/event forms. Categories tile moved to Platform.
- Event create/update requires a place; place is chosen via autocomplete of the
  user’s linked places (all places for superadmin/siteadmin).
- Admin place / event / curator forms: shared collapsible sections (images up
  front; SEO+GA+crawlable, contact, opening hours, domain folded); publish /
  inactive control always at the bottom.
- Place price list: currency is a dropdown of catalog currencies (not free text).
- PlaceCard / map popup prefer cardImage before heroImage fallback.
- Site explore (e.g. helloetyek): list intro + first cards use LCP priority; picsum
  placeholders fall back to marketing image; remote heroes (Wikimedia etc.) resize
  via Cloudinary fetch when configured; discover chrome skeleton reserves intro height (CLS).

## [1.0.26-beta] - 2026-11-23

### Added

- Places admin list: approve / activate / deactivate toggle in row actions
  (check vs pause icon). Free-plan publish remains superadmin-only.

## [1.0.25-beta] - 2026-11-23

### Changed

- Drop the visible “skip to content” link; public layout uses a `<main>`
  landmark (and admin already has `<main id="admin-main">`) for bypass-blocks.

## [1.0.24-beta] - 2026-11-23

### Fixed

- Skip-link parked off-screen (`left: -10000px`) until keyboard focus — the old
  `translateY` hide still left a white chip above the site title.

## [1.0.22-beta] - 2026-11-23

### Fixed

- Custom-domain `/hu` no longer flashes the platform overview while host scope
  loads; SSR content uses the same host-scope as OG (tenant home, not Régiók).
- Skip-link CSS in first-paint so hard reload does not flash a white box in the
  header before the main stylesheet.

## [1.0.21-beta] - 2026-11-23

### Changed

- Default social share image is the HelloLocal brand card
  (`/marketing/hellolocal-share.jpg`, pin + wordmark) instead of the Szeged map.

## [1.0.20-beta] - 2026-11-23

### Fixed

- Social OG: ignore picsum/placeholder hero URLs (Meta cannot scrape them) and
  fall back to same-origin brand share image; always emit `og:image:width` /
  `height` so Sharing Debugger can show image + description.

## [1.0.19-beta] - 2026-11-23

### Fixed

- Place subscription matrix admin label: show “Events / place” instead of raw
  `{{count}}` from the public pricing string.
- Admin login first-click “too fast” form shield: lower min dwell to 800ms and
  wait client-side before submit so password-manager autofill works.

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
- [ ] Export/Import (CSV, JSON) — scoped in [docs/p0-feature-specs.md](docs/p0-feature-specs.md) §3
- [ ] Bulk admin operations — same P0 spec §3
- [ ] Place self-claim + approval queue — P0 spec §1
- [ ] Embed map widget + campaign QR pack — P0 spec §2
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

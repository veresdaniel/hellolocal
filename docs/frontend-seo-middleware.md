# Frontend SEO Middleware (server.js)

## Crawl files (robots + sitemap)

Production Caddy sends public hosts to the **web** container (`server.js`), not the API host.
Crawl files are exposed on each public origin via web → API proxy. The web proxy forwards
`X-Forwarded-Host` / `X-Forwarded-Proto` so the API can resolve the tenant **at request time**.

| Public URL | Proxied API |
|------------|-------------|
| `https://{host}/robots.txt` | `GET /api/seo/robots.txt` |
| `https://{host}/sitemap.xml` | `GET /api/seo/sitemap.xml` (index) |
| `https://{host}/sitemap-{chunk}.xml` | `GET /api/seo/sitemap-{chunk}.xml` |

Chunks: `static`, `sites`, `places`, `events`, `towns`, `pages`, `collections`.

### Production vs non-prod

Live SEO is gated by `FRONTEND_URL` being `https://hello-local.io` (or `www`).
Beta (`beta.hello-local.io`), devel, and local all get `Disallow: /` and **no** `Sitemap:` line;
sitemap endpoints return 404. `NODE_ENV=production` alone is not enough (beta/devel also set it).

### Domain-scoped, DB-driven (no redeploy per domain)

On production, `Host` / `X-Forwarded-Host` is looked up against admin data:

1. `SiteDomain.domain` / `Site.primaryDomain` → that Site’s URLs only, origin = that host
2. `Town.customDomain` / `Place.customDomain` / `Collection.domain` → that entity only
3. Platform host (`hello-local.io`) → platform pages + sites **without** a custom domain

Adding a domain in admin takes effect immediately (Prisma lookup + sitemap cache invalidate).
No per-domain env vars and no app redeploy.

### Cache / invalidation

In-memory sitemap cache TTL: **60 seconds** (`SEO_CACHE_TTL_SECONDS`).
Admin writes to site / place / event / town / page / legal / collection / domains call
`SitemapService.invalidate()` and clear the cache immediately. HTTP `Cache-Control: max-age=60`.

After deploy: submit each public host’s `https://{domain}/sitemap.xml` in Google Search Console
(platform + each Site custom domain as needed).

## Áttekintés

A frontend `server.js` fájl tartalmaz egy SEO middleware-t, amely automatikusan injektálja a SEO meta tag-eket az `index.html`-be, amikor bot/crawler user agent-ek érkeznek. Ez biztosítja, hogy a social media platformok (Facebook, Twitter, LinkedIn, stb.) megfelelően jelenítsék meg a megosztott linkeket.

## Helye a rendszerben

A HelloLocal projektben **két helyen** van SEO middleware:

1. **Backend middleware** (`apps/api/src/common/middleware/seo-injector.middleware.ts`)
   - Akkor használatos, ha a NestJS app szolgálja ki a frontend static fájlokat
   - Lásd: [SEO Middleware dokumentáció](./seo-middleware.md)

2. **Frontend middleware** (`apps/web/server.js`) ← **Ez a dokumentum**
   - Akkor használatos, ha a frontend külön konténerben/szerveren fut (pl. Hetzner web service, Vercel)
   - Ez a jelenlegi deployment setup

## Miért van szükség rá?

A HelloLocal frontend egy **React SPA (Single Page Application)**, amely:
- Client-side renderel (JavaScript futtatása után jelennek meg a tartalmak)
- Az első HTML válasz csak egy üres `index.html`-t tartalmaz
- A meta tag-ek csak JavaScript futtatása után jelennek meg

**Probléma**: A bot/crawler-ek (Facebook, Twitter, LinkedIn, stb.) **nem futtatják le a JavaScript-et**, ezért nem látják a meta tag-eket.

**Megoldás**: A `server.js` middleware felismeri a bot-okat és dinamikusan injektálja a meta tag-eket az `index.html`-be, mielőtt visszaküldi a választ.

## Hogyan működik?

### 1. Bot detektálás

A middleware ellenőrzi a `User-Agent` header-t és felismeri a következő bot-okat:

- **Facebook**: `facebookexternalhit`, `Facebot`
- **Twitter**: `Twitterbot`
- **LinkedIn**: `LinkedInBot`
- **WhatsApp**: `WhatsApp`
- **Telegram**: `TelegramBot`
- **Slack**: `Slackbot`
- **Skype**: `SkypeUriPreview`
- **Google**: `Googlebot`
- **Bing**: `Bingbot`
- **Yandex**: `YandexBot`
- **DuckDuckGo**: `DuckDuckBot`
- És sok más...

### 2. URL parsing

A middleware automatikusan kinyeri az URL-ből:

- **Nyelv** (`lang`): `hu`, `en`, vagy `de` (első path segment)
- **Tenant kulcs** (`tenantKey`): Opcionális, második path segment (ha nem ismert route)
- **Route típus**: `place`, `event`, vagy `homepage`
- **Slug**: Az entitás slug-ja (place/event esetén)

**Példák**:
- `/{lang}/place/{slug}` → `hu`, `place`, `borostyan-pince`
- `/{lang}/{tenantKey}/place/{slug}` → `hu`, `etyek-budai`, `place`, `borostyan-pince`
- `/{lang}` → `hu`, `homepage`

### 3. SEO adatok lekérése

A middleware meghívja a backend SEO API endpoint-ot:

- **Place detail**: `GET {API_URL}/api/seo/{lang}/place/{slug}?tenantKey=...`
- **Event detail**: `GET {API_URL}/api/seo/{lang}/event/{slug}?tenantKey=...`
- **Homepage**: `GET {API_URL}/api/seo/{lang}?tenantKey=...`

**Timeout**: 5 másodperc

### 4. Meta tag injektálás

A middleware módosítja az `index.html`-t és hozzáadja a következő meta tag-eket:

```html
<title>Borostyán Pince - HelloLocal</title>
<meta name="description" content="Családi borászat 1850 óta...">
<meta property="og:title" content="Borostyán Pince - HelloLocal">
<meta property="og:description" content="Családi borászat 1850 óta...">
<meta property="og:type" content="website">
<meta property="og:url" content="https://example.com/hu/place/borostyan-pince">
<meta property="og:site_name" content="HelloLocal">
<meta property="og:image" content="https://example.com/hero-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Borostyán Pince - HelloLocal">
<meta name="twitter:description" content="Családi borászat 1850 óta...">
<meta name="twitter:image" content="https://example.com/hero-image.jpg">
<link rel="canonical" href="https://example.com/hu/place/borostyan-pince">
```

### 5. Válasz küldése

A middleware visszaküldi a módosított HTML-t a bot-nak, így a social media platformok látják a meta tag-eket.

## Konfiguráció

### Környezeti változók

A `server.js` a következő környezeti változókat használja:

```env
# Backend API URL (SEO adatok lekéréséhez)
API_URL=http://localhost:3002
# vagy
VITE_API_URL=http://localhost:3002

# Frontend URL (canonical URL-ekhez)
FRONTEND_URL=https://example.com
# vagy
VITE_FRONTEND_URL=https://example.com
```

**Prioritás**:
1. `API_URL` / `FRONTEND_URL` (ha be van állítva)
2. `VITE_API_URL` / `VITE_FRONTEND_URL` (Vite build-time változók)
3. Alapértelmezett értékek (`http://localhost:3002` / `http://localhost:3000`)

### Hetzner / Docker Compose deployment

Éles stack: `deploy/docker-compose.yml` állítja `API_URL` / `FRONTEND_URL` (pl. `https://api.hello-local.io`, `https://hello-local.io`).

## Támogatott útvonalak

A middleware csak a következő útvonalakra alkalmazódik:

- ✅ `/{lang}` - Homepage
- ✅ `/{lang}/{tenantKey}` - Homepage (multi-tenant)
- ✅ `/{lang}/place/{slug}` - Place detail
- ✅ `/{lang}/{tenantKey}/place/{slug}` - Place detail (multi-tenant)
- ✅ `/{lang}/event/{slug}` - Event detail
- ✅ `/{lang}/{tenantKey}/event/{slug}` - Event detail (multi-tenant)

**Kizárt útvonalak**:
- ❌ `/api/*` - API endpoint-ok (nem a frontend szerveren futnak)
- ❌ `/admin/*` - Admin felület (React Router kezeli)
- ❌ Statikus fájlok (van kiterjesztésük, pl. `.js`, `.css`, `.png`)

## Hibakezelés

A middleware robusztus hibakezeléssel rendelkezik:

1. **SEO fetch hiba**: Ha a SEO adatok lekérése sikertelen, a middleware logolja a hibát és visszaáll az eredeti `index.html`-re (fallback)
2. **Timeout**: 5 másodperces timeout a fetch hívásokhoz
3. **File read hiba**: Ha az `index.html` nem olvasható, a middleware továbbadja a kérést a következő middleware-nek (React Router catch-all)

**Log példák**:
```
[SEO] Bot detected: facebookexternalhit/1.1 - Processing: /hu/place/borostyan-pince
[SEO] Failed to fetch SEO data: 404 Not Found
[SEO] Fetch timeout for /hu/place/borostyan-pince
```

## Deployment

### Hetzner (live)

A web image `node server.js`-t futtat a Docker Compose stackben (`deploy/docker-compose.yml`). Caddy reverse-proxy-zza a public hostokat.

### Egyéb platformok

Bármely Node.js platformon, amely Express-t támogat, működik (Railway, Fly.io, stb.). `render.yaml` has been removed — do not treat Render as the primary deploy path.

## Tesztelés

### Bot user agent-tel tesztelés

```bash
# Facebook bot
curl -A "facebookexternalhit/1.1" http://localhost:3000/hu/place/test-slug

# Twitter bot
curl -A "Twitterbot/1.0" http://localhost:3000/hu/place/test-slug

# LinkedIn bot
curl -A "LinkedInBot/1.0" http://localhost:3000/hu/place/test-slug
```

### Facebook Sharing Debugger

Használd a [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) eszközt a meta tag-ek ellenőrzéséhez.

**Használat**:
1. Nyisd meg: https://developers.facebook.com/tools/debug/
2. Add meg a linket: `https://your-domain.com/hu/place/borostyan-pince`
3. Kattints a "Debug" gombra
4. A "Scrape Again" gombbal frissítsd a cache-t

### Twitter Card Validator

Használd a [Twitter Card Validator](https://cards-dev.twitter.com/validator) eszközt a Twitter Card meta tag-ek ellenőrzéséhez.

### LinkedIn Post Inspector

Használd a [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) eszközt a LinkedIn megosztások ellenőrzéséhez.

## Fejlesztés

### Dev környezet

Fejlesztés közben:
- A middleware csak akkor működik, ha a `server.js` fut (nem Vite dev server-rel)
- Production build esetén: `pnpm build && node server.js`
- A middleware logolja a bot detektálást és a hibákat

### Debug mód

A middleware részletes logolást végez:
- Bot detektálás
- URL parsing eredmények
- SEO fetch hívások
- Hibák és timeout-ok

**Log formátum**:
```
[SEO] Bot detected: {userAgent} - Processing: {path}
[SEO] Failed to fetch SEO data: {error}
[SEO] Fetch timeout for {path}
```

## Teljesítmény

- **Timeout**: 5 másodperc SEO fetch hívásokhoz
- **Caching**: A middleware nem cache-el, minden bot kérésre újra lekéri az adatokat
- **Fallback**: Ha a SEO fetch sikertelen, az eredeti HTML-t küldi (gyors válasz)
- **Non-bot kérések**: Normál felhasználók számára nincs teljesítménybeli hatás (közvetlenül az `index.html`-t kapják)

## Korlátok

1. **Csak bot-oknak**: A middleware csak bot/crawler user agent-ekre alkalmazódik
2. **Csak GET kérések**: Csak GET kérésekre működik
3. **Backend API függőség**: A backend SEO API-nak elérhetőnek kell lennie
4. **Production build**: Csak production build-ben működik (nem Vite dev server-rel)

## Backend vs Frontend Middleware

### Mikor használd a Backend middleware-t?

- Ha a NestJS app szolgálja ki a frontend static fájlokat
- Ha egyetlen szerveren fut mindkét alkalmazás
- Ha reverse proxy-t használsz (pl. nginx)

### Mikor használd a Frontend middleware-t? (jelenlegi setup)

- Ha a frontend külön konténerben/szerveren fut (pl. Hetzner web, Vercel)
- Ha a frontend és backend külön service-ként vannak deploy-olva
- Ha a frontend CDN-en vagy edge network-en fut

**Jelenlegi HelloLocal setup**: Frontend middleware on Hetzner (`server.js` web container + Caddy)

## Jövőbeli fejlesztések

- [ ] Cache mechanizmus a SEO adatokhoz (Redis vagy in-memory)
- [ ] Static page támogatás (blog, tudástár)
- [ ] Pre-rendering támogatás (pl. Prerender.io integráció)
- [ ] Teljes SSR migráció (opcionális, pl. Next.js)

## Kapcsolódó dokumentáció

- [Backend SEO Middleware](./seo-middleware.md)
- [SEO API Endpoints](../apps/api/src/seo/seo.controller.ts)
- [Frontend SEO Hook](../apps/web/src/seo/useSeo.ts)
- [Deployment Guide](./DEPLOYMENT.md)

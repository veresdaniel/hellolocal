# Backend SEO Injector Middleware

## Áttekintés

Az SEO Injector Middleware automatikusan injektálja a SEO meta tag-eket az `index.html`-be, amikor bot/crawler user agent-ek érkeznek (pl. Facebook, Twitter, LinkedIn, Google). Ez biztosítja, hogy a social media platformok és keresőmotorok megfelelően jelenítsék meg a megosztott linkeket, még akkor is, ha a frontend egy Single Page Application (SPA) és nincs teljes Server-Side Rendering (SSR).

## Helye a rendszerben

A HelloLocal projektben **két helyen** van SEO middleware:

1. **Backend middleware** (`apps/api/src/common/middleware/seo-injector.middleware.ts`) ← **Ez a dokumentum**
   - Akkor használatos, ha a NestJS app szolgálja ki a frontend static fájlokat
   - Egyetlen szerveren fut mindkét alkalmazás

2. **Frontend middleware** (`apps/web/server.js`)
   - Akkor használatos, ha a frontend külön szerveren fut (pl. Render.com, Vercel)
   - Ez a jelenlegi deployment setup
   - Lásd: [Frontend SEO Middleware dokumentáció](./frontend-seo-middleware.md)

## Probléma

A HelloLocal frontend egy React SPA, amely client-side renderel. Ez azt jelenti, hogy:
- Az első HTML válasz csak egy üres `index.html`-t tartalmaz
- A meta tag-ek csak JavaScript futtatása után jelennek meg
- A bot/crawler-ek (Facebook, Twitter, LinkedIn, stb.) **nem látják** a meta tag-eket, mert nem futtatják le a JavaScript-et

**Eredmény**: A megosztott linkek nem jelennek meg szépen a social media platformokon.

## Megoldás

A middleware:
1. **Felismeri** a bot/crawler user agent-eket
2. **Kiolvassa** az URL-ből a nyelvet, tenant kulcsot, és az oldal típusát
3. **Lekéri** a SEO adatokat a backend API-ból
4. **Módosítja** az `index.html`-t és hozzáadja a meta tag-eket
5. **Visszaküldi** a módosított HTML-t a bot-nak

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

A middleware meghívja a megfelelő SEO API endpoint-ot:

- **Place detail**: `GET /api/seo/:lang/place/:slug?tenantKey=...`
- **Event detail**: `GET /api/seo/:lang/event/:slug?tenantKey=...`
- **Homepage**: `GET /api/seo/:lang?tenantKey=...`

A válasz tartalmazza:
```json
{
  "title": "Borostyán Pince - HelloLocal",
  "description": "Családi borászat 1850 óta...",
  "image": "https://example.com/hero-image.jpg",
  "url": "https://example.com/hu/place/borostyan-pince",
  "type": "website",
  "siteName": "HelloLocal"
}
```

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

```env
# Frontend build útvonal (ahol az index.html található)
FRONTEND_BUILD_PATH=/path/to/web/dist/index.html

# Frontend URL (használva a canonical URL-ekben)
FRONTEND_URL=https://example.com

# API URL (belső API hívásokhoz, opcionális)
API_URL=http://localhost:3002
```

### Regisztráció

A middleware automatikusan regisztrálva van az `AppModule`-ban:

```typescript
// apps/api/src/app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SeoInjectorMiddleware)
      .forRoutes("*");
  }
}
```

## Támogatott útvonalak

A middleware csak a következő útvonalakra alkalmazódik:

- ✅ `/{lang}` - Homepage
- ✅ `/{lang}/{tenantKey}` - Homepage (multi-tenant)
- ✅ `/{lang}/place/{slug}` - Place detail
- ✅ `/{lang}/{tenantKey}/place/{slug}` - Place detail (multi-tenant)
- ✅ `/{lang}/event/{slug}` - Event detail
- ✅ `/{lang}/{tenantKey}/event/{slug}` - Event detail (multi-tenant)

**Kizárt útvonalak**:
- ❌ `/api/*` - API endpoint-ok
- ❌ `/admin/*` - Admin felület
- ❌ Statikus fájlok (van kiterjesztésük, pl. `.js`, `.css`, `.png`)

## Hibakezelés

A middleware robusztus hibakezeléssel rendelkezik:

1. **SEO fetch hiba**: Ha a SEO adatok lekérése sikertelen, a middleware logolja a hibát és visszaáll az eredeti `index.html`-re (fallback)
2. **Timeout**: 5 másodperces timeout a fetch hívásokhoz
3. **File read hiba**: Ha az `index.html` nem olvasható, egy minimális HTML fallback-et használ

**Log példák**:
```
[SeoInjectorMiddleware] Bot detected: facebookexternalhit/1.1 - Processing: /hu/place/borostyan-pince
[SeoInjectorMiddleware] Failed to fetch SEO data for /hu/place/borostyan-pince: 404 Not Found
```

## Production deployment

### Előfeltételek

1. **Frontend build**: A frontend build-elt fájljait a NestJS app-nak kell szolgálnia
2. **Static file serving**: A NestJS app-nak szolgálnia kell a frontend static fájlokat (pl. `express.static` middleware)
3. **Környezeti változók**: A `FRONTEND_BUILD_PATH` és `FRONTEND_URL` helyesen van beállítva

### Példa: Express static file serving

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { join } from "path";
import { NestExpressApplication } from "@nestjs/platform-express";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Serve static files from frontend build
  app.useStaticAssets(join(__dirname, "../web/dist"), {
    index: false, // Don't serve index.html automatically (middleware handles it)
  });
  
  await app.listen(3002);
}
```

### Render.com deployment

Render.com esetén a `FRONTEND_BUILD_PATH` a build output mappára mutasson:

```env
FRONTEND_BUILD_PATH=/opt/render/project/src/apps/web/dist/index.html
FRONTEND_URL=https://your-app.onrender.com
```

## Tesztelés

### Bot user agent-tel tesztelés

```bash
# Facebook bot
curl -A "facebookexternalhit/1.1" http://localhost:3002/hu/place/test-slug

# Twitter bot
curl -A "Twitterbot/1.0" http://localhost:3002/hu/place/test-slug

# LinkedIn bot
curl -A "LinkedInBot/1.0" http://localhost:3002/hu/place/test-slug
```

### Facebook Sharing Debugger

Használd a [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) eszközt a meta tag-ek ellenőrzéséhez.

### Twitter Card Validator

Használd a [Twitter Card Validator](https://cards-dev.twitter.com/validator) eszközt a Twitter Card meta tag-ek ellenőrzéséhez.

## Fejlesztés

### Dev környezet

Fejlesztés közben:
- A middleware csak akkor működik, ha a frontend build-elt és a NestJS app szolgálja ki
- Vite dev server esetén **nem működik** (csak production build-ben)
- A middleware logolja a bot detektálást és a hibákat

### Debug mód

A middleware részletes logolást végez:
- Bot detektálás
- URL parsing eredmények
- SEO fetch hívások
- Hibák és timeout-ok

## Teljesítmény

- **Timeout**: 5 másodperc SEO fetch hívásokhoz
- **Caching**: A middleware nem cache-el, minden bot kérésre újra lekéri az adatokat
- **Fallback**: Ha a SEO fetch sikertelen, az eredeti HTML-t küldi (gyors válasz)

## Korlátok

1. **Csak bot-oknak**: A middleware csak bot/crawler user agent-ekre alkalmazódik
2. **Csak GET kérések**: Csak GET kérésekre működik
3. **Static file serving szükséges**: A NestJS app-nak szolgálnia kell a frontend fájlokat
4. **Production build**: Csak production build-ben működik (nem Vite dev server-rel)

## Jövőbeli fejlesztések

- [ ] Cache mechanizmus a SEO adatokhoz
- [ ] Static page támogatás (blog, tudástár)
- [ ] Pre-rendering támogatás
- [ ] Teljes SSR migráció (opcionális)

## Backend vs Frontend Middleware

### Mikor használd a Backend middleware-t?

- Ha a NestJS app szolgálja ki a frontend static fájlokat
- Ha egyetlen szerveren fut mindkét alkalmazás
- Ha reverse proxy-t használsz (pl. nginx)

### Mikor használd a Frontend middleware-t?

- Ha a frontend külön szerveren fut (pl. Render.com, Vercel)
- Ha a frontend és backend külön service-ként vannak deploy-olva
- Ha a frontend CDN-en vagy edge network-en fut

**Jelenlegi HelloLocal setup**: Frontend middleware (Render.com külön service-ként)

## Kapcsolódó dokumentáció

- [Frontend SEO Middleware](./frontend-seo-middleware.md) - Frontend server.js middleware
- [SEO API Endpoints](../apps/api/src/seo/seo.controller.ts)
- [Frontend SEO Hook](../apps/web/src/seo/useSeo.ts)
- [Backend API Brief](./hellolocal-backend-api-first-brief.md)

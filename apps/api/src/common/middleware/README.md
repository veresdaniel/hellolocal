# SEO Injector Middleware

Ez a middleware automatikusan injektálja a SEO meta tag-eket az index.html-be, amikor bot/crawler user agent-ek érkeznek (pl. Facebook, Twitter, LinkedIn, Google).

## Hogyan működik?

1. **Bot detektálás**: A middleware ellenőrzi a user agent-et és felismeri a bot/crawler kéréseket
2. **URL parsing**: Kiolvassa az URL-ből a nyelvet, tenant kulcsot, és az oldal típusát (place/event/homepage)
3. **SEO adatok lekérése**: Meghívja a `/api/seo/:lang/:type/:slug` endpoint-ot
4. **Meta tag injektálás**: Módosítja az index.html-t és hozzáadja a meta tag-eket
5. **Válasz küldése**: Visszaküldi a módosított HTML-t a bot-nak

## Bot User Agents

A middleware felismeri a következő bot-okat:
- Facebook (`facebookexternalhit`, `Facebot`)
- Twitter (`Twitterbot`)
- LinkedIn (`LinkedInBot`)
- WhatsApp (`WhatsApp`)
- Telegram (`TelegramBot`)
- Google (`Googlebot`)
- Bing (`Bingbot`)
- És sok más...

## Környezeti változók

```env
# Frontend build útvonal (ahol az index.html található)
FRONTEND_BUILD_PATH=/path/to/web/dist/index.html

# Frontend URL (használva a canonical URL-ekben)
FRONTEND_URL=https://example.com

# API URL (belső API hívásokhoz)
API_URL=http://localhost:3002
```

## Használat

A middleware automatikusan regisztrálva van az `AppModule`-ban és minden GET kérésre alkalmazva lesz, kivéve:
- `/api/*` útvonalak
- `/admin/*` útvonalak
- Statikus fájlok (van kiterjesztésük)

## Támogatott oldalak

- **Homepage**: `/{lang}` vagy `/{lang}/{tenantKey}`
- **Place detail**: `/{lang}/place/{slug}` vagy `/{lang}/{tenantKey}/place/{slug}`
- **Event detail**: `/{lang}/event/{slug}` vagy `/{lang}/{tenantKey}/event/{slug}`

## Példa

Amikor a Facebook bot meglátogatja a `https://example.com/hu/place/borostyan-pince` URL-t:

1. A middleware felismeri hogy bot
2. Lekéri a SEO adatokat: `GET /api/seo/hu/place/borostyan-pince`
3. Injektálja a meta tag-eket:
   ```html
   <title>Borostyán Pince - HelloLocal</title>
   <meta property="og:title" content="Borostyán Pince - HelloLocal">
   <meta property="og:description" content="Családi borászat 1850 óta...">
   <meta property="og:image" content="https://example.com/hero-image.jpg">
   ```
4. Visszaküldi a módosított HTML-t

## Hibakezelés

Ha a SEO adatok lekérése sikertelen:
- A middleware logolja a hibát
- Visszaáll az eredeti index.html-re (fallback)
- A bot továbbra is megkapja a HTML-t, csak meta tag-ek nélkül

## Production deployment

Production-ben győződj meg róla hogy:
1. A `FRONTEND_BUILD_PATH` pontosan mutat a build-elt `index.html`-re
2. A `FRONTEND_URL` és `API_URL` helyesen van beállítva
3. A NestJS app szolgálja ki a frontend static fájlokat (pl. `express.static`)

## Fejlesztés

Fejlesztés közben:
- A middleware csak akkor működik ha a frontend build-elt és a NestJS app szolgálja ki
- Vite dev server esetén nem működik (csak production build-ben)
- Teszteléshez használhatsz bot user agent-et: `curl -A "facebookexternalhit/1.1" http://localhost:3002/hu/place/test`

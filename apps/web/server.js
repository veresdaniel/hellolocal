// Production SPA/SSR Node server (Hetzner Docker web container; Express).
// Serves static files, rewrites routes to index.html, and injects social/SEO tags.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { overviewLang, renderOverviewDocument } from './ssr/renderOverview.js';
import {
  applyAdminRobots,
  buildPublicContentHtml,
  injectRootContent,
  isAdminPath,
} from './ssr/renderPublicContent.js';
import { applySocialMeta, publicOrigin, resolvePublicShare } from './ssr/socialMeta.js';
import { UC_COOKIE_MAX_AGE_SEC, ucFailClosedCopy } from '@hellolocal/shared';
import {
  applyUnderConstructionDocument,
  buildSetCookieHeader,
  fetchUnderConstructionGate,
  langFromPath,
  readCookie,
  UC_COOKIE_NAME,
  UC_QUERY_PARAM,
} from './ssr/underConstruction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Bot/crawler user agents
const botUserAgents = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'TelegramBot',
  'Slackbot',
  'SkypeUriPreview',
  'Googlebot',
  'Bingbot',
  'Slurp',
  'DuckDuckBot',
  'Baiduspider',
  'YandexBot',
  'Sogou',
  'Exabot',
  'ia_archiver',
  'Applebot',
  'facebookexternalhit/1.1',
  'facebookexternalhit/1.0',
  'Twitterbot/1.0',
  'LinkedInBot/1.0',
];

// API URL for fetching SEO data
const API_URL = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:3002';

// Helper to check if user agent is a bot
function isBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return botUserAgents.some(bot => ua.includes(bot.toLowerCase()));
}

function readShell() {
  const candidates = [path.join(__dirname, 'dist', 'index.html'), path.join(__dirname, 'index.html')];
  for (const file of candidates) {
    try {
      return readFileSync(file, 'utf-8');
    } catch {
      // try the next shell
    }
  }
  throw new Error('index.html missing');
}

const KNOWN_PUBLIC_SEGMENTS = new Set([
  'place', 'hely', 'ort',
  'town', 'telepules', 'gemeinde',
  'lista', 'list', 'liste', 'terkep', 'map', 'karte',
  'event',
  'blog', 'tudastar', 'infok',
  'imprint', 'terms', 'privacy', 'impresszum', 'aszf', 'adatvedelem',
  'impressum', 'agb', 'datenschutz',
  'attekintes', 'overview', 'ueberblick', 'pricing', 'tarife', 'preise',
  'admin', 'teruletek', 'regiok', 'regions', 'regionen',
  'products', 'collections', 'static-pages', 'static-page', 'offline',
]);

function isPlaceSegment(segment) {
  return segment === 'place' || segment === 'hely' || segment === 'ort';
}

async function proxyApiText(apiPath, req, res, contentType) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    // Forward public Host so API resolves SiteDomain / customDomain at request time
    // (admin-configured domains — no redeploy per domain).
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const response = await fetch(`${API_URL}${apiPath}`, {
      signal: controller.signal,
      headers: {
        Accept: contentType,
        // Host is a forbidden fetch header; Nest reads X-Forwarded-Host for domain scope.
        'X-Forwarded-Host': host,
        'X-Forwarded-Proto': proto,
      },
    });
    if (!response.ok) {
      res.status(response.status).type('text/plain').send(`Upstream error ${response.status}`);
      return;
    }
    const body = await response.text();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', response.headers.get('cache-control') || 'public, max-age=60');
    res.send(body);
  } catch (error) {
    console.error(`[SEO] Proxy failed for ${apiPath}: ${error.message}`);
    res.status(502).type('text/plain').send('Bad gateway');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Same-origin `/api` proxy for the UC gate so the SPA on hello-local.io can receive
 * and send the HttpOnly preview cookie (api.* alone cannot see a host-only public cookie).
 */
app.get('/api/app-settings/under-construction', async (req, res) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const response = await fetch(`${API_URL}/api/app-settings/under-construction${qs}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'X-Forwarded-Host': host,
        'X-Forwarded-Proto': proto,
        ...(req.get('cookie') ? { Cookie: req.get('cookie') } : {}),
      },
    });
    const setCookies =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : [response.headers.get('set-cookie')].filter(Boolean);
    for (const cookie of setCookies) {
      res.append('Set-Cookie', cookie);
    }
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.status(response.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    const body = await response.text();
    res.send(body);
  } catch (error) {
    console.error(`[UC] Same-origin proxy failed: ${error.message}`);
    // Fail closed: pretend gate is on and blocked (copy from shared UC defaults).
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      enabled: true,
      allowed: false,
      queryParam: UC_QUERY_PARAM,
      cookieName: UC_COOKIE_NAME,
      cookieMaxAgeSec: UC_COOKIE_MAX_AGE_SEC,
      refreshCookie: false,
      clearCookie: false,
      copy: ucFailClosedCopy(),
    });
  } finally {
    clearTimeout(timer);
  }
});

/** When UC is enabled without a valid preview cookie/token, do not expose crawl maps. */
async function isCrawlBlockedByUnderConstruction(req) {
  const queryToken =
    typeof req.query?.[UC_QUERY_PARAM] === 'string' ? req.query[UC_QUERY_PARAM] : null;
  const gate = await fetchUnderConstructionGate({
    apiUrl: API_URL,
    lang: 'hu',
    queryToken,
    cookieHeader: req.get('cookie') || '',
  });
  return Boolean(gate?.enabled && !gate.allowed);
}

// Crawl files must be on the public host (Caddy → web), not only on api.*
app.get('/robots.txt', async (req, res) => {
  try {
    if (await isCrawlBlockedByUnderConstruction(req)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return res.status(503).send('User-agent: *\nDisallow: /\n');
    }
  } catch (error) {
    console.error(`[UC] robots gate failed: ${error.message}`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).send('User-agent: *\nDisallow: /\n');
  }
  return proxyApiText('/api/seo/robots.txt', req, res, 'text/plain; charset=utf-8');
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    if (await isCrawlBlockedByUnderConstruction(req)) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return res.status(503).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
  } catch (error) {
    console.error(`[UC] sitemap gate failed: ${error.message}`);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
  return proxyApiText('/api/seo/sitemap.xml', req, res, 'application/xml; charset=utf-8');
});

app.get('/sitemap-:chunk.xml', async (req, res) => {
  try {
    if (await isCrawlBlockedByUnderConstruction(req)) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return res.status(503).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
  } catch (error) {
    console.error(`[UC] sitemap chunk gate failed: ${error.message}`);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
  const chunk = encodeURIComponent(req.params.chunk || '');
  return proxyApiText(`/api/seo/sitemap-${chunk}.xml`, req, res, 'application/xml; charset=utf-8');
});

async function fetchBotSchema(req) {
  if (!isBot(req.get('user-agent') || '')) return null;
  const pathParts = req.path.split('/').filter(Boolean);
  const lang = pathParts[0] && ['hu', 'en', 'de'].includes(pathParts[0]) ? pathParts[0] : 'hu';
  const tenantKey = pathParts[1] && !KNOWN_PUBLIC_SEGMENTS.has(pathParts[1]) ? pathParts[1] : undefined;
  const routeIndex = tenantKey ? 2 : 1;
  const routeType = pathParts[routeIndex];
  const slug = pathParts[routeIndex + 1];
  let seoUrl;
  if (isPlaceSegment(routeType) && slug) {
    seoUrl = `${API_URL}/api/seo/${lang}/place/${encodeURIComponent(slug)}${tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : ''}`;
  } else if (routeType === 'event' && slug) {
    seoUrl = `${API_URL}/api/seo/${lang}/event/${encodeURIComponent(slug)}${tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : ''}`;
  } else {
    seoUrl = `${API_URL}/api/seo/${lang}${tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : ''}`;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(seoUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const json = await response.json();
    return json?.schemaOrg || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Serve static files from the dist directory
// This must come before other routes to ensure static files are served correctly
app.use(express.static(path.join(__dirname, 'dist'), {
  // Don't serve index.html for static file requests
  index: false,
  // Set proper MIME types
  setHeaders: (res, filePath) => {
    // Ensure JavaScript files have correct MIME type
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

const platformCache = new Map();

const uiCopyCache = new Map();

async function loadUiCopy(lang) {
  const cached = uiCopyCache.get(lang);
  if (cached && cached.until > Date.now()) return cached.value;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);
  try {
    const response = await fetch(`${API_URL}/api/public/ui/${lang}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    const value = await response.json();
    uiCopyCache.set(lang, { until: Date.now() + 60_000, value });
    return value;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadPlatformForOverview(lang) {
  const cached = platformCache.get(lang);
  if (cached && cached.until > Date.now()) return cached.value;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);
  try {
    const response = await fetch(`${API_URL}/api/public/${lang}/default/platform`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) return { landingCopy: null, planOverrides: null };
    const data = await response.json();
    const planOverrides = data?.featureMatrix?.planOverrides ?? null;
    const value = {
      landingCopy: planOverrides?.landingCopy?.[lang] ?? null,
      planOverrides,
    };
    platformCache.set(lang, { until: Date.now() + 60_000, value });
    return value;
  } catch {
    return { landingCopy: null, planOverrides: null };
  } finally {
    clearTimeout(timer);
  }
}

// Apply SEO middleware before the catch-all route (only for non-static files)
app.get('*', async (req, res, next) => {
  // Skip SEO middleware for static assets (JS, CSS, images, etc.)
  const staticExtensions = ['.js', '.mjs', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json', '.map'];
  const isStaticFile = staticExtensions.some(ext => req.path.endsWith(ext));
  
  if (isStaticFile) {
    // Let express.static handle it, or return 404 if not found
    return next();
  }

  // Admin always open (login + every console subpage). Public routes may be gated.
  const requestPath = String(req.originalUrl || req.url || req.path || '').split('?')[0];
  if (isAdminPath(requestPath)) {
    try {
      const html = applyAdminRobots(readShell());
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return res.send(html);
    } catch (error) {
      console.error(`[SEO] Admin HTML failed: ${error.message}`);
      return next();
    }
  }

  // Under-development gate (SSR + crawlers/meta). Valid ?access= sets HttpOnly cookie via API/SSR.
  try {
    const lang = langFromPath(req.path);
    const queryToken =
      typeof req.query?.[UC_QUERY_PARAM] === 'string' ? req.query[UC_QUERY_PARAM] : null;
    const cookieHeader = req.get('cookie') || '';
    const gate = await fetchUnderConstructionGate({
      apiUrl: API_URL,
      lang,
      queryToken,
      cookieHeader,
    });
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (gate?.enabled && !gate.allowed) {
      const html = applyUnderConstructionDocument(readShell(), gate.copy, lang);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      return res.status(503).send(html);
    }
    const forwarded = Array.isArray(gate?.setCookieHeaders) ? gate.setCookieHeaders : [];
    if (forwarded.length > 0) {
      for (const cookie of forwarded) {
        res.append('Set-Cookie', cookie);
      }
    } else if (gate?.refreshCookie && gate?.setCookieToken) {
      // Legacy fallback if an older API still returns the token field.
      res.append('Set-Cookie', buildSetCookieHeader(gate.setCookieToken, gate.cookieMaxAgeSec));
    } else if (gate?.clearCookie || (gate?.enabled === false && readCookie(cookieHeader, UC_COOKIE_NAME))) {
      res.append('Set-Cookie', buildSetCookieHeader('', 0, { clear: true }));
    }
    // Strip ?access= from the address bar for HTML navigations once cookie is set.
    if (queryToken && gate?.allowed) {
      const url = new URL(req.originalUrl || req.url, `${req.protocol}://${req.get('host')}`);
      if (url.searchParams.has(UC_QUERY_PARAM)) {
        url.searchParams.delete(UC_QUERY_PARAM);
        const next = `${url.pathname}${url.search}${url.hash}`;
        res.setHeader('Referrer-Policy', 'no-referrer');
        return res.redirect(302, next);
      }
    }
  } catch (error) {
    console.error(`[UC] Gate check failed: ${error.message}`);
    // Fail closed: do not serve the full public site when the gate cannot be verified.
    try {
      const lang = langFromPath(req.path);
      const html = applyUnderConstructionDocument(readShell(), null, lang);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      return res.status(503).send(html);
    } catch {
      return res.status(503).type('text/plain').send('Service Unavailable');
    }
  }

  const overview = overviewLang(req.path);
  if (overview) {
    try {
      const html = readShell();
      const origin = publicOrigin(`${req.protocol}://${req.get('host')}`);
      const [uiCopy, platform] = await Promise.all([
        loadUiCopy(overview),
        loadPlatformForOverview(overview),
      ]);
      const hasDatabaseCopy = Boolean(uiCopy?.messages && Object.keys(uiCopy.messages).length);
      const override = hasDatabaseCopy ? null : platform.landingCopy;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(
        renderOverviewDocument(html, {
          lang: overview,
          origin,
          override,
          messages: uiCopy?.messages,
          languages: uiCopy?.languages,
          planOverrides: platform.planOverrides,
        })
      );
    } catch (error) {
      console.error(`[SSR] Overview render failed: ${error.message}`);
    }
  }
  
  try {
    const requestOrigin = `${req.protocol}://${req.get('host')}`;
    const [meta, schema, contentBody] = await Promise.all([
      resolvePublicShare({ pathname: req.path, apiUrl: API_URL, requestOrigin }),
      fetchBotSchema(req),
      buildPublicContentHtml({ pathname: req.path, apiUrl: API_URL }),
    ]);
    let html = applySocialMeta(readShell(), meta);
    if (schema) {
      const json = JSON.stringify(schema).replace(/</g, '\\u003c');
      html = html.replace('</head>', `    <script type="application/ld+json">${json}</script>\n  </head>`);
    }
    html = injectRootContent(html, contentBody);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error(`[SEO] HTML meta failed: ${error.message}`);
    return next();
  }
});

// Fallback: Rewrite all routes to index.html for React Router (only if file doesn't exist)
app.get('*', (req, res, next) => {
  // Skip if this is a static file request (should have been handled by express.static)
  const staticExtensions = ['.js', '.mjs', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json', '.map'];
  const isStaticFile = staticExtensions.some(ext => req.path.endsWith(ext));
  
  if (isStaticFile) {
    // Static file not found - return 404
    return res.status(404).send('File not found');
  }
  
  // For non-static files, serve index.html for SPA routing
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Frontend server listening on port ${PORT}`);
  console.log(`✅ Social meta tags are in the first HTML response`);
});


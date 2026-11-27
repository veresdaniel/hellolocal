/**
 * Production SPA/SSR Node server (Hetzner Docker web container; Express).
 *
 * Responsibilities:
 * - Static `dist/` assets
 * - Same-origin UC gate proxy + robots/sitemap proxy (host-scoped via X-Forwarded-Host)
 * - Under-construction gate (fail-closed) before public HTML
 * - Platform overview SSR on platform hosts only
 * - Social/OG meta via {@link resolvePublicShare} / {@link applySocialMeta}; soft-404 → HTTP 404
 * - Extra JSON-LD for known crawler UAs
 *
 * Auth/host assumptions: public routes; custom domains resolved via `/api/domain/:host`.
 * Admin paths always open with noindex. UC preview uses HttpOnly cookie + `?access=` token.
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { overviewLang, overviewShareUrl, renderOverviewDocument } from './ssr/renderOverview.js';
import { guideRequest, renderGuideDocument } from './ssr/renderGuide.js';
import {
  applyAdminRobots,
  buildPublicContentHtml,
  injectRootContent,
  isAdminPath,
  loadPlatform,
} from './ssr/renderPublicContent.js';
import { injectHostBootstrap, injectPublicShellHead } from './ssr/publicShellCss.js';
import {
  applyHostScope,
  applySocialMeta,
  parsePublicPath,
  publicOrigin,
  resolveDomainHost,
  resolvePublicShare,
} from './ssr/socialMeta.js';
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
import {
  createPlatformHostLoader,
  matchPlatformHostEntry,
  platformHostCanonicalTarget,
} from './ssr/wwwRedirect.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/** Crawler UAs that receive extra JSON-LD via fetchBotSchema (social previews + search bots). */
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

// Platform hosts: www → apex, bare `/` → `/:lang`, legacy overview → `/:lang` (one 301 hop).
// Runs before robots/sitemaps/static/HTML so crawlers never see duplicate openers.
const loadPlatformHostEntries = createPlatformHostLoader(API_URL);
app.use(async (req, res, next) => {
  const rawHost = req.get('x-forwarded-host') || req.get('host') || '';
  const host = String(rawHost).split(',')[0].trim().toLowerCase();
  try {
    const target = platformHostCanonicalTarget(
      host,
      await loadPlatformHostEntries(),
      req.originalUrl || req.url
    );
    if (target) return res.redirect(301, target);
  } catch (error) {
    console.error(`[SEO] platform host redirect failed: ${error.message}`);
  }
  return next();
});

/** @param {string | undefined} userAgent */
function isBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return botUserAgents.some(bot => ua.includes(bot.toLowerCase()));
}

/** SPA index.html shell used for SSR meta / overview / UC responses. */
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

/** Meta / social preview UAs that mishandle robots.txt status codes. */
const META_ROBOTS_BOTS = [
  'facebookexternalhit',
  'facebot',
  'meta-externalagent',
  'meta-externalfetcher',
];

function isMetaRobotsBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return META_ROBOTS_BOTS.some((bot) => ua.includes(bot));
}

/**
 * Honor `Range: bytes=…` for small text bodies (robots.txt).
 * Meta's Sharing Debugger intermittently treats a full 200 robots response as
 * blocked (surfaces as HTTP 403) but accepts 206 Partial Content — see Meta
 * community threads on facebookexternalhit + robots.txt.
 * For known Meta UAs we always answer 206 (full body as a single range) even
 * when they omit Range, so Debugger does not invent a robots "403".
 */
function sendTextWithOptionalRange(req, res, body, contentType, cacheControl) {
  const buf = Buffer.from(body, 'utf8');
  const total = buf.length;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Accept-Ranges', 'bytes');

  const range = req.get('range');
  const forceMetaPartial = !range && isMetaRobotsBot(req.get('user-agent'));
  if (!range && !forceMetaPartial) {
    res.setHeader('Content-Length', String(total));
    return res.status(200).send(buf);
  }

  let start = 0;
  let end = total - 1;

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(String(range).trim());
    if (!match) {
      res.setHeader('Content-Range', `bytes */${total}`);
      return res.status(416).end();
    }

    start = match[1] === '' ? undefined : Number(match[1]);
    end = match[2] === '' ? undefined : Number(match[2]);
    if (start === undefined && end === undefined) {
      res.setHeader('Content-Range', `bytes */${total}`);
      return res.status(416).end();
    }
    if (start === undefined) {
      // suffix: bytes=-N
      const suffix = end;
      start = Math.max(0, total - suffix);
      end = total - 1;
    } else if (end === undefined || end >= total) {
      end = total - 1;
    }
    if (start < 0 || start >= total || end < start) {
      res.setHeader('Content-Range', `bytes */${total}`);
      return res.status(416).end();
    }
  }

  const slice = buf.subarray(start, end + 1);
  res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
  res.setHeader('Content-Length', String(slice.length));
  return res.status(206).send(slice);
}

/**
 * Proxy robots/sitemap text from the API onto the public host.
 * Forwards X-Forwarded-Host so sitemap scope matches the visitor's domain.
 */
async function proxyApiText(apiPath, req, res, contentType, { honorRange = false } = {}) {
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
    const cacheControl = response.headers.get('cache-control') || 'public, max-age=60';
    if (honorRange) {
      return sendTextWithOptionalRange(req, res, body, contentType, cacheControl);
    }
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', cacheControl);
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

/**
 * Static allow-all robots for Meta preview UAs.
 * Dynamically generated robots (platform landing Disallow rules + empty Disallow)
 * has caused Sharing Debugger to report HTTP 403 even when HTML returns 200 —
 * Meta docs / community threads recommend a plain Allow group for facebookexternalhit.
 */
function metaSocialRobotsBody() {
  return [
    '# HelloLocal — Meta / social preview scrapers',
    'User-agent: facebookexternalhit',
    'Allow: /',
    '',
    'User-agent: Facebot',
    'Allow: /',
    '',
    'User-agent: meta-externalagent',
    'Allow: /',
    '',
    'User-agent: meta-externalfetcher',
    'Allow: /',
    '',
  ].join('\n');
}

// Crawl files must be on the public host (Caddy → web), not only on api.*
app.get('/robots.txt', async (req, res) => {
  const ua = req.get('user-agent') || '';
  if (isMetaRobotsBot(ua)) {
    const ip = req.get('x-forwarded-for') || req.socket?.remoteAddress || '';
    console.info(
      `[SEO] Meta robots.txt hit ip=${ip} ua=${JSON.stringify(ua.slice(0, 120))}`
    );
    return sendTextWithOptionalRange(
      req,
      res,
      metaSocialRobotsBody(),
      'text/plain; charset=utf-8',
      'no-store'
    );
  }
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
  return proxyApiText('/api/seo/robots.txt', req, res, 'text/plain; charset=utf-8', {
    honorRange: true,
  });
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

/** Match apps/api requestHostname / requestProto: first hop only, no port/trailing dot. */
function requestForwardHeaders(req) {
  const rawHost = req.get('x-forwarded-host') || req.get('host') || '';
  const host = String(rawHost)
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
  const rawProto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const proto = String(rawProto).split(',')[0].trim().toLowerCase() === 'http' ? 'http' : 'https';
  return { host, proto };
}

/**
 * Custom domains (site/town/place/collection/event) must not use the platform
 * overview SSR for /:lang — that path is the entity home on that host.
 */
async function resolveCustomDomain(host) {
  const hostname = String(host || '')
    .toLowerCase()
    .split(':')[0]
    .replace(/\.$/, '');
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);
  try {
    const response = await fetch(`${API_URL}/api/domain/${encodeURIComponent(hostname)}`, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'X-Forwarded-Host': hostname,
        'X-Forwarded-Proto': 'https',
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.kind && data?.slug ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extra schema.org JSON for known bots only (keeps human HTML lean).
 * Path + host-scope match resolvePublicShare so custom domains get the right tenant.
 */
async function fetchBotSchema(req) {
  if (!isBot(req.get('user-agent') || '')) return null;
  // Match resolvePublicShare: parse path, then apply custom-domain host scope.
  let route = parsePublicPath(req.path);
  const { host, proto } = requestForwardHeaders(req);
  if (host) {
    const resolved = await resolveDomainHost(API_URL, host, { host, proto });
    if (resolved) route = applyHostScope(route, resolved);
  }
  const lang = route.lang || 'hu';
  const tenantKey = route.siteKey;
  const tenantQs = tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : '';
  let seoUrl;
  if (route.kind === 'place' && route.slug) {
    seoUrl = `${API_URL}/api/seo/${lang}/place/${encodeURIComponent(route.slug)}${tenantQs}`;
  } else if (route.kind === 'event' && route.slug) {
    seoUrl = `${API_URL}/api/seo/${lang}/event/${encodeURIComponent(route.slug)}${tenantQs}`;
  } else {
    seoUrl = `${API_URL}/api/seo/${lang}${tenantQs}`;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(seoUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(host ? { 'X-Forwarded-Host': host, 'X-Forwarded-Proto': proto } : {}),
      },
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
  // Set proper MIME types + long cache for hashed / marketing assets (PSI).
  setHeaders: (res, filePath) => {
    // Ensure JavaScript files have correct MIME type
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }

    const rel = filePath.replace(/\\/g, '/');
    if (/\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(js|css|woff2?)$/.test(rel)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (/\/marketing\/[^/]+\.(webp|jpe?g|png|svg)$/i.test(rel)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    } else if (/\/fonts\/[^/]+\.woff2$/i.test(rel)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

/** @type {Map<string, { until: number, value: object }>} */
const platformCache = new Map();

/** @type {Map<string, { until: number, value: object }>} */
const uiCopyCache = new Map();

/**
 * Cached public UI message catalog (`/api/public/ui/:lang`) for overview SSR.
 * @param {string} lang
 * @returns {Promise<object | null>}
 */
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

/**
 * Platform overview inputs: plan overrides, defaultShareImage, landing images,
 * and landingIndexable (platform.landingCrawlable; independent of global crawl).
 * Marketing copy comes from UiMessage (see /api/public/ui-copy), not planOverrides.
 */
async function loadPlatformGuides(lang) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);
  try {
    const response = await fetch(
      `${API_URL}/api/public/platform-guides?lang=${encodeURIComponent(lang)}`,
      { signal: controller.signal, headers: { accept: 'application/json' } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function loadPlatformForOverview(lang) {
  const cached = platformCache.get(lang);
  if (cached && cached.until > Date.now()) return cached.value;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);
  const empty = {
    planOverrides: null,
    defaultShareImage: null,
    landingImages: null,
    landingIndexable: false,
    freeTrialDays: 30,
    currencyByLang: { hu: "HUF", en: "EUR", de: "EUR" },
    currencies: [],
  };
  try {
    const response = await fetch(`${API_URL}/api/public/${lang}/default/platform`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) return empty;
    const data = await response.json();
    const planOverrides = data?.featureMatrix?.planOverrides ?? null;
    const trialRaw = Number(data?.platform?.freeTrialDays);
    const landingImages = data?.platform?.landingImages || null;
    const shareFromCms =
      landingImages?.[lang]?.share ||
      landingImages?.en?.share ||
      landingImages?.hu?.share ||
      null;
    const value = {
      planOverrides,
      defaultShareImage:
        shareFromCms || data?.platform?.defaultShareImage || data?.seo?.defaultImage || null,
      landingImages,
      // Platform overview only; missing/false → noindex (gradual rollout default).
      landingIndexable: data?.seo?.landingIndexable === true,
      freeTrialDays: Number.isFinite(trialRaw) && trialRaw > 0 ? Math.floor(trialRaw) : 30,
      currencyByLang: data?.platform?.currencyByLang || { hu: "HUF", en: "EUR", de: "EUR" },
      currencies: Array.isArray(data?.platform?.currencies) ? data.platform.currencies : [],
    };
    platformCache.set(lang, { until: Date.now() + 60_000, value });
    return value;
  } catch {
    return empty;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Primary HTML handler: trailing-slash hygiene → admin noindex → UC gate →
 * platform overview SSR (platform hosts) → social meta + optional bot JSON-LD + content inject.
 * Soft-404 entity routes return HTTP 404 with noindex.
 */
app.get('*', async (req, res, next) => {
  // Skip SEO middleware for static assets (JS, CSS, images, etc.)
  const staticExtensions = ['.js', '.mjs', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json', '.map'];
  const isStaticFile = staticExtensions.some(ext => req.path.endsWith(ext));
  
  if (isStaticFile) {
    // Let express.static handle it, or return 404 if not found
    return next();
  }

  const requestUa = req.get('user-agent') || '';
  if (isMetaRobotsBot(requestUa)) {
    const ip = req.get('x-forwarded-for') || req.socket?.remoteAddress || '';
    console.info(
      `[SEO] Meta HTML hit ip=${ip} host=${req.get('x-forwarded-host') || req.get('host') || ''} path=${req.path} ua=${JSON.stringify(requestUa.slice(0, 120))}`
    );
  }

  // URL hygiene: trailing slash → single canonical (except site root).
  const barePath = String(req.path || '/').split('?')[0];
  if (barePath.length > 1 && barePath.endsWith('/')) {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return res.redirect(301, `${barePath.replace(/\/+$/, '')}${qs}`);
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

  const { host: forwardHost, proto: forwardProto } = requestForwardHeaders(req);
  const requestOrigin = `${forwardProto}://${forwardHost || req.get('host') || 'localhost'}`;
  const customDomain = await resolveCustomDomain(forwardHost);

  // Platform guides (`/:lang/tema/:slug`) before the language-root overview.
  const guide = !customDomain ? guideRequest(req.path) : null;
  if (guide) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 800);
    try {
      const response = await fetch(
        `${API_URL}/api/public/platform-guides/${encodeURIComponent(guide.slug)}?lang=${guide.lang}`,
        { signal: controller.signal, headers: { accept: 'application/json' } }
      );
      if (response.ok) {
        const data = await response.json();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(
          renderGuideDocument(readShell(), data, publicOrigin(requestOrigin))
        );
      }
    } catch (error) {
      console.error(`[SSR] Guide render failed: ${error.message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  // Platform overview only on platform hosts (`/:lang`; `/` and legacy overview already 301).
  // Custom domains use resolvePublicShare.
  const overview = !customDomain ? overviewLang(req.path) : null;
  if (overview) {
    try {
      const html = readShell();
      const origin = publicOrigin(requestOrigin);
      const [uiCopy, platform, guides, platformEntries] = await Promise.all([
        loadUiCopy(overview),
        loadPlatformForOverview(overview),
        loadPlatformGuides(overview),
        loadPlatformHostEntries(),
      ]);
      const hostEntry = matchPlatformHostEntry(forwardHost, platformEntries);
      // UiMessage is the live source; locale JSON is seed/fallback inside renderOverview.
      // planOverrides.landingCopy is retired — do not pass it as override.
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(
        renderOverviewDocument(html, {
          lang: overview,
          origin,
          pathname: req.path,
          shareUrl: overviewShareUrl(origin, req.path, overview),
          override: null,
          messages: uiCopy?.messages,
          languages: uiCopy?.languages,
          planOverrides: platform.planOverrides,
          shareImage: platform.defaultShareImage || null,
          landingImages: platform.landingImages || null,
          indexable: platform.landingIndexable === true,
          freeTrialDays: platform.freeTrialDays ?? 30,
          currencyByLang: platform.currencyByLang,
          currencies: platform.currencies,
          guides,
          xDefaultLang: hostEntry?.lang || overview,
        })
      );
    } catch (error) {
      console.error(`[SSR] Overview render failed: ${error.message}`);
    }
  }
  
  try {
    const [meta, schema, content] = await Promise.all([
      resolvePublicShare({
        pathname: req.path,
        apiUrl: API_URL,
        requestOrigin,
        requestHost: forwardHost,
        requestProto: forwardProto,
      }),
      fetchBotSchema(req),
      buildPublicContentHtml({
        pathname: req.path,
        apiUrl: API_URL,
        requestHost: forwardHost,
        requestProto: forwardProto,
        resolvedHost: customDomain,
      }),
    ]);
    const contentBody = content?.html || null;
    const lcpImage = content?.lcpImage || null;
    let html = applySocialMeta(readShell(), meta);
    if (schema) {
      const json = JSON.stringify(schema).replace(/</g, '\\u003c');
      html = html.replace('</head>', `    <script type="application/ld+json">${json}</script>\n  </head>`);
    }
    html = injectRootContent(html, contentBody);
    if (customDomain) {
      html = injectHostBootstrap(html, customDomain);
      let siteTheme = content?.siteTheme ?? null;
      let brandTheme = content?.brandTheme ?? null;
      // Nested custom-host paths can miss crawl SSR; still pin atelier/classic from platform.
      if (siteTheme == null && brandTheme == null && customDomain.slug) {
        try {
          const lang =
            parsePublicPath(req.path)?.lang || customDomain.defaultLang || "hu";
          const platform = await loadPlatform(API_URL, lang, customDomain.slug, {
            host: forwardHost,
            proto: forwardProto,
          });
          siteTheme = platform?.siteTheme ?? null;
          brandTheme = platform?.brand?.theme ?? null;
        } catch (error) {
          console.warn(`[SSR] Theme fallback failed: ${error.message}`);
        }
      }
      html = injectPublicShellHead(html, {
        lcpImage,
        siteTheme,
        brandTheme,
      });
    } else if (contentBody) {
      html = injectPublicShellHead(html, {
        lcpImage,
        siteTheme: content?.siteTheme,
        brandTheme: content?.brandTheme,
      });
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (meta?.notFound) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return res.status(404).send(html);
    }
    return res.send(html);
  } catch (error) {
    console.error(`[SEO] HTML meta failed: ${error.message}`);
    return next();
  }
});

/** SPA fallback when SEO handler calls next() (e.g. meta fetch failure). Static misses → 404. */
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


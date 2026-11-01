// Simple Node.js server for Render.com to handle SPA routing
// This server serves static files and rewrites all routes to index.html
// Public HTML responses include Open Graph and Twitter card tags.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { overviewLang, renderOverviewDocument } from './ssr/renderOverview.js';
import { applySocialMeta, publicOrigin, resolvePublicShare } from './ssr/socialMeta.js';

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

async function fetchBotSchema(req) {
  if (!isBot(req.get('user-agent') || '')) return null;
  const pathParts = req.path.split('/').filter(Boolean);
  const lang = pathParts[0] && ['hu', 'en', 'de'].includes(pathParts[0]) ? pathParts[0] : 'hu';
  const knownRoutes = ['place', 'event', 'blog', 'tudastar', 'infok', 'imprint', 'terms', 'privacy', 'overview', 'pricing', 'tarife', 'preise', 'impresszum', 'aszf', 'adatvedelem', 'admin', 'teruletek', 'regions', 'regionen', 'products', 'collections', 'static-pages', 'static-page', 'offline'];
  const tenantKey = pathParts[1] && !knownRoutes.includes(pathParts[1]) ? pathParts[1] : undefined;
  const routeIndex = tenantKey ? 2 : 1;
  const routeType = pathParts[routeIndex];
  const slug = pathParts[routeIndex + 1];
  let seoUrl;
  if (routeType === 'place' && slug) {
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
    const [meta, schema] = await Promise.all([
      resolvePublicShare({ pathname: req.path, apiUrl: API_URL, requestOrigin }),
      fetchBotSchema(req),
    ]);
    let html = applySocialMeta(readShell(), meta);
    if (schema) {
      const json = JSON.stringify(schema).replace(/</g, '\\u003c');
      html = html.replace('</head>', `    <script type="application/ld+json">${json}</script>\n  </head>`);
    }
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


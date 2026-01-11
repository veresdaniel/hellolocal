// Simple Node.js server for Render.com to handle SPA routing
// This server serves static files and rewrites all routes to index.html
// Also handles SEO meta tag injection for bot/crawler requests
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

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
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || 'http://localhost:3000';

// Helper to check if user agent is a bot
function isBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return botUserAgents.some(bot => ua.includes(bot.toLowerCase()));
}

// Helper to escape HTML entities
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper to inject meta tags into HTML
function injectMetaTags(html, seoData) {
  const title = escapeHtml(seoData.title);
  const description = escapeHtml(seoData.description);
  const image = escapeHtml(seoData.image);
  const url = escapeHtml(seoData.url);
  const siteName = escapeHtml(seoData.siteName);

  const metaTags = `
    <!-- SEO Meta Tags (injected by server middleware) -->
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="${seoData.type || 'website'}">
    <meta property="og:url" content="${url}">
    <meta property="og:site_name" content="${siteName}">
    ${image ? `<meta property="og:image" content="${image}">` : ''}
    <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    ${image ? `<meta name="twitter:image" content="${image}">` : ''}
    <link rel="canonical" href="${url}">
    <!-- End SEO Meta Tags -->`;

  // Inject into <head>
  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>${metaTags}`);
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', `${metaTags}</head>`);
  } else {
    html = `<head>${metaTags}</head>${html}`;
  }

  // Update existing title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

  return html;
}

// Middleware to handle bot requests with SEO injection
async function handleBotRequest(req, res, next) {
  const userAgent = req.get('user-agent') || '';
  
  if (!isBot(userAgent)) {
    return next();
  }

  console.log(`[SEO] Bot detected: ${userAgent} - Processing: ${req.path}`);

  try {
    // Parse URL
    const urlPath = req.path;
    const pathParts = urlPath.split('/').filter(Boolean);

    // Extract language
    const lang = pathParts[0] && ['hu', 'en', 'de'].includes(pathParts[0])
      ? pathParts[0]
      : 'hu';

    // Extract tenant key
    const knownRoutes = ['place', 'event', 'blog', 'tudastar', 'infok', 'imprint', 'terms', 'privacy'];
    const tenantKey = pathParts[1] && !knownRoutes.includes(pathParts[1])
      ? pathParts[1]
      : undefined;

    // Extract route type and slug
    const routeIndex = tenantKey ? 2 : 1;
    const routeType = pathParts[routeIndex];
    const slug = pathParts[routeIndex + 1];

    // Fetch SEO data
    let seoData = null;
    try {
      let seoUrl;
      if (routeType === 'place' && slug) {
        seoUrl = `${API_URL}/api/seo/${lang}/place/${slug}${tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : ''}`;
      } else if (routeType === 'event' && slug) {
        seoUrl = `${API_URL}/api/seo/${lang}/event/${slug}${tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : ''}`;
      } else {
        seoUrl = `${API_URL}/api/seo/${lang}${tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : ''}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(seoUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        seoData = await response.json();
      } else {
        console.warn(`[SEO] Failed to fetch SEO data: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`[SEO] Fetch timeout for ${req.path}`);
      } else {
        console.warn(`[SEO] Error fetching SEO data: ${error.message}`);
      }
    }

    // Read index.html
    let html;
    try {
      html = readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf-8');
    } catch (error) {
      console.error(`[SEO] Could not read index.html: ${error.message}`);
      return next();
    }

    // Inject meta tags if SEO data is available
    if (seoData) {
      html = injectMetaTags(html, seoData);
    }

    // Send modified HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error(`[SEO] Error handling bot request: ${error.message}`);
    // Fallback to normal request
    next();
  }
}

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Apply SEO middleware before the catch-all route
app.get('*', handleBotRequest);

// Fallback: Rewrite all routes to index.html for React Router (non-bot requests)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Frontend server listening on port ${PORT}`);
  console.log(`✅ SEO injection enabled for bot/crawler requests`);
});


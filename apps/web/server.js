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

  // Default image dimensions (Facebook recommended: 1200x630px)
  // If image dimensions are provided in seoData, use them; otherwise use defaults
  const imageWidth = seoData.imageWidth || '1200';
  const imageHeight = seoData.imageHeight || '630';

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
    ${image ? `<meta property="og:image:width" content="${imageWidth}">` : ''}
    ${image ? `<meta property="og:image:height" content="${imageHeight}">` : ''}
    <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    ${image ? `<meta name="twitter:image" content="${image}">` : ''}
    <link rel="canonical" href="${url}">
    <!-- End SEO Meta Tags -->`;

  // Generate Schema.org JSON-LD if schemaOrg data is provided
  let jsonLdScript = '';
  if (seoData.schemaOrg) {
    const jsonLd = JSON.stringify(seoData.schemaOrg, null, 2);
    jsonLdScript = `
    <!-- Schema.org JSON-LD (injected by server middleware) -->
    <script type="application/ld+json">${jsonLd}</script>
    <!-- End Schema.org JSON-LD -->`;
  }

  // Inject meta tags and JSON-LD into <head>
  const allTags = metaTags + jsonLdScript;
  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>${allTags}`);
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', `${allTags}</head>`);
  } else {
    html = `<head>${allTags}</head>${html}`;
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
        const jsonData = await response.json();
        // Validate response structure
        if (jsonData && typeof jsonData === 'object' && 'title' in jsonData) {
          seoData = jsonData;
          console.log(`[SEO] Successfully fetched SEO data for ${req.path}`);
        } else {
          console.warn(`[SEO] Invalid SEO data structure received for ${req.path}`);
        }
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
      // Override URL if backend returned localhost (backend FRONTEND_URL not set)
      if (seoData.url && seoData.url.includes('localhost')) {
        const protocol = req.protocol || 'https';
        const host = req.get('host') || FRONTEND_URL.replace(/^https?:\/\//, '');
        const fullUrl = `${protocol}://${host}${req.path}`;
        seoData.url = fullUrl;
        console.log(`[SEO] Overriding localhost URL with: ${seoData.url}`);
      }
      
      console.log(`[SEO] Injecting meta tags for ${req.path}:`, {
        title: seoData.title,
        description: seoData.description?.substring(0, 50) + '...',
        image: seoData.image,
        url: seoData.url,
      });
      html = injectMetaTags(html, seoData);
    } else {
      console.warn(`[SEO] No SEO data available for ${req.path}`);
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

// Apply SEO middleware before the catch-all route (only for non-static files)
app.get('*', (req, res, next) => {
  // Skip SEO middleware for static assets (JS, CSS, images, etc.)
  const staticExtensions = ['.js', '.mjs', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json', '.map'];
  const isStaticFile = staticExtensions.some(ext => req.path.endsWith(ext));
  
  if (isStaticFile) {
    // Let express.static handle it, or return 404 if not found
    return next();
  }
  
  // For non-static files, check if it's a bot request
  handleBotRequest(req, res, next);
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
  console.log(`✅ SEO injection enabled for bot/crawler requests`);
});


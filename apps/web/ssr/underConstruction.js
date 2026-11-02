/** SSR helpers for the public under-development gate (Express `server.js`). */

export const UC_QUERY_PARAM = 'access';
export const UC_COOKIE_NAME = 'hl_uc_access';
/** Persistent until token regen/invalidate (browsers may clamp ~400 days). */
export const UC_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400;

const FALLBACK_COPY = {
  hu: {
    title: 'Fejlesztés alatt',
    body: 'Az oldal jelenleg fejlesztés alatt áll. Hamarosan visszatérünk.',
  },
  en: {
    title: 'Under development',
    body: 'This site is currently under development. Please check back soon.',
  },
  de: {
    title: 'In Entwicklung',
    body: 'Diese Seite befindet sich derzeit in Entwicklung. Bitte schauen Sie bald wieder vorbei.',
  },
};

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function readCookie(header, name) {
  if (!header) return null;
  const parts = String(header).split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      return part.slice(idx + 1).trim();
    }
  }
  return null;
}

export function langFromPath(pathname) {
  const first = String(pathname || '')
    .split('/')
    .filter(Boolean)[0];
  if (first === 'en' || first === 'de' || first === 'hu') return first;
  return 'hu';
}

function resolveCookieDomain() {
  const configured = (process.env.COOKIE_DOMAIN || '').trim();
  if (configured) return configured.startsWith('.') ? configured : `.${configured}`;
  const frontend = (process.env.FRONTEND_URL || '').trim();
  if (!frontend) return undefined;
  try {
    const host = new URL(frontend).hostname;
    if (!host || host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return undefined;
    const parts = host.split('.');
    if (parts.length < 2) return undefined;
    return `.${parts.slice(-2).join('.')}`;
  } catch {
    return undefined;
  }
}

/** HttpOnly Secure cookie for SSR responses (token never returned to JS). */
export function buildSetCookieHeader(token, maxAgeSec = UC_COOKIE_MAX_AGE_SEC, options = {}) {
  const clear = Boolean(options.clear) || !token;
  const maxAge = clear ? 0 : Math.max(0, Math.floor(Number(maxAgeSec) || UC_COOKIE_MAX_AGE_SEC));
  const secure =
    process.env.NODE_ENV === 'production' ||
    process.env.COOKIE_SECURE === 'true' ||
    String(process.env.FRONTEND_URL || '').startsWith('https:');
  const parts = [
    `${UC_COOKIE_NAME}=${clear ? '' : encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  const domain = resolveCookieDomain();
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join('; ');
}

export function renderUnderConstructionBody(copy, lang = 'hu') {
  const fallback = FALLBACK_COPY[lang] || FALLBACK_COPY.hu;
  const title = escapeHtml((copy && copy.title) || fallback.title);
  const body = escapeHtml((copy && copy.body) || fallback.body).replace(/\n/g, '<br />');
  const button = copy && copy.buttonLabel ? escapeHtml(copy.buttonLabel) : '';
  return `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;background:linear-gradient(160deg,#1f2937 0%,#0f172a 55%,#111827 100%);color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
      <div style="max-width:560px;">
        <p style="margin:0 0 12px;letter-spacing:0.08em;text-transform:uppercase;font-size:12px;color:rgba(248,250,252,0.7);font-weight:600;">HelloLocal</p>
        <h1 style="margin:0 0 16px;font-size:clamp(28px,6vw,42px);line-height:1.15;font-weight:700;">${title}</h1>
        <p style="margin:0;font-size:clamp(16px,3.5vw,18px);line-height:1.6;color:rgba(248,250,252,0.85);">${body}</p>
        ${button ? `<p style="margin:28px 0 0;color:rgba(248,250,252,0.65);font-size:14px;">${button}</p>` : ''}
      </div>
    </main>`;
}

export function applyUnderConstructionDocument(html, copy, lang = 'hu') {
  const fallback = FALLBACK_COPY[lang] || FALLBACK_COPY.hu;
  const title = escapeHtml((copy && copy.title) || fallback.title);
  const description = escapeHtml((copy && copy.body) || fallback.body);
  let next = html;
  const robots = '<meta name="robots" content="noindex, nofollow" />';
  const referrer = '<meta name="referrer" content="no-referrer" />';
  if (/<meta\s+name\s*=\s*"robots"/i.test(next)) {
    next = next.replace(/<meta\s+name\s*=\s*"robots"\s+content\s*=\s*"[^"]*"\s*\/?>/i, robots);
  } else {
    next = next.replace('</head>', `    ${robots}\n  </head>`);
  }
  if (!/<meta\s+name\s*=\s*"referrer"/i.test(next)) {
    next = next.replace('</head>', `    ${referrer}\n  </head>`);
  }
  next = next.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  if (/<meta\s+property\s*=\s*"og:title"/i.test(next)) {
    next = next.replace(
      /<meta\s+property\s*=\s*"og:title"\s+content\s*=\s*"[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${title}" />`
    );
  }
  if (/<meta\s+name\s*=\s*"description"/i.test(next)) {
    next = next.replace(
      /<meta\s+name\s*=\s*"description"\s+content\s*=\s*"[^"]*"\s*\/?>/i,
      `<meta name="description" content="${description}" />`
    );
  }
  const body = renderUnderConstructionBody(copy, lang);
  if (next.includes('<div id="root"></div>')) {
    next = next.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  } else {
    next = next.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${body}</div>`);
  }
  return next;
}

function failClosedCopy(lang) {
  return FALLBACK_COPY[lang] || FALLBACK_COPY.hu;
}

/**
 * Fetch gate status from API.
 * Fail-CLOSED on errors: when the check cannot complete, treat as gated (do not serve the full site).
 * Captures Set-Cookie headers so SSR can forward HttpOnly cookies without putting the token in JSON.
 */
export async function fetchUnderConstructionGate({
  apiUrl,
  lang,
  queryToken,
  cookieHeader,
  timeoutMs = 800,
}) {
  const params = new URLSearchParams();
  if (lang) params.set('lang', lang);
  if (queryToken) params.set(UC_QUERY_PARAM, queryToken);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const blocked = {
    enabled: true,
    allowed: false,
    refreshCookie: false,
    clearCookie: false,
    copy: failClosedCopy(lang),
    setCookieHeaders: [],
  };
  try {
    const response = await fetch(
      `${apiUrl}/api/app-settings/under-construction?${params.toString()}`,
      {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      }
    );
    if (!response.ok) {
      return blocked;
    }
    const data = await response.json();
    const setCookieHeaders =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : [response.headers.get('set-cookie')].filter(Boolean);
    return {
      ...data,
      setCookieHeaders,
    };
  } catch {
    return blocked;
  } finally {
    clearTimeout(timer);
  }
}

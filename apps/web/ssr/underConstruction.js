/** SSR helpers for the public under-development gate (Express `server.js`). */
import {
  UC_COOKIE_MAX_AGE_SEC,
  UC_COOKIE_NAME,
  UC_DEFAULT_COPY,
  UC_PUBLIC_API_PATH,
  UC_QUERY_PARAM,
  buildUcSetCookieHeader,
  readCookieHeader,
  ucFailClosedCopy,
} from '@hellolocal/shared';

export { UC_QUERY_PARAM, UC_COOKIE_NAME, UC_COOKIE_MAX_AGE_SEC };

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function readCookie(header, name) {
  return readCookieHeader(header, name);
}

export function langFromPath(pathname) {
  const first = String(pathname || '')
    .split('/')
    .filter(Boolean)[0];
  if (first === 'en' || first === 'de' || first === 'hu') return first;
  return 'hu';
}

/** HttpOnly Secure cookie for SSR responses (token never returned to JS). */
export function buildSetCookieHeader(token, maxAgeSec = UC_COOKIE_MAX_AGE_SEC, options = {}) {
  return buildUcSetCookieHeader(token, maxAgeSec, {
    clear: Boolean(options.clear) || !token,
    env: {
      cookieDomain: process.env.COOKIE_DOMAIN,
      frontendUrl: process.env.FRONTEND_URL,
      nodeEnv: process.env.NODE_ENV,
      cookieSecure: process.env.COOKIE_SECURE,
    },
  });
}

/** Keep in sync with `apps/web/src/styles/under-construction.css`. */
const UC_GATE_CSS = `
.uc-gate{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;background:linear-gradient(160deg,#1f2937 0%,#0f172a 55%,#111827 100%);color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;position:relative;overflow:hidden;box-sizing:border-box}
.uc-gate__glow{position:absolute;inset:-20%;background:radial-gradient(circle at 30% 20%,rgba(148,163,184,.18),transparent 45%),radial-gradient(circle at 70% 80%,rgba(100,116,139,.16),transparent 40%);pointer-events:none}
.uc-gate__inner{position:relative;max-width:560px;z-index:1}
.uc-gate__brand{margin:0 0 12px;letter-spacing:.08em;text-transform:uppercase;font-size:12px;color:rgba(248,250,252,.7);font-weight:600}
.uc-gate__title{margin:0 0 16px;font-size:clamp(28px,6vw,42px);line-height:1.15;font-weight:700}
.uc-gate__body{margin:0;font-size:clamp(16px,3.5vw,18px);line-height:1.6;color:rgba(248,250,252,.85)}
.uc-gate__button{margin:28px 0 0;color:rgba(248,250,252,.65);font-size:14px}
`;

export function renderUnderConstructionBody(copy, lang = 'hu') {
  const fallback = UC_DEFAULT_COPY[lang] || UC_DEFAULT_COPY.hu;
  const title = escapeHtml((copy && copy.title) || fallback.title);
  const body = escapeHtml((copy && copy.body) || fallback.body).replace(/\n/g, '<br />');
  const button = copy && copy.buttonLabel ? escapeHtml(copy.buttonLabel) : '';
  return `
    <style>${UC_GATE_CSS}</style>
    <div class="uc-gate">
      <div class="uc-gate__glow" aria-hidden="true"></div>
      <main class="uc-gate__inner">
        <p class="uc-gate__brand">HelloLocal</p>
        <h1 class="uc-gate__title">${title}</h1>
        <p class="uc-gate__body">${body}</p>
        ${button ? `<p class="uc-gate__button">${button}</p>` : ''}
      </main>
    </div>`;
}

export function applyUnderConstructionDocument(html, copy, lang = 'hu') {
  const fallback = UC_DEFAULT_COPY[lang] || UC_DEFAULT_COPY.hu;
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
    copy: ucFailClosedCopy(lang),
    setCookieHeaders: [],
  };
  try {
    const response = await fetch(`${apiUrl}${UC_PUBLIC_API_PATH}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
    if (response.status === 429) {
      return { ...blocked, enabled: false, allowed: true };
    }
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

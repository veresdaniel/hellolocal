import { publicThemeInlineCss } from "./publicThemePresets.js";

/**
 * First-paint styles for crawlable SSR bodies injected into `#root`
 * (region / town / place / event). Complements index.html `hl-first-paint`.
 */
export const PUBLIC_SSR_SHELL_CSS = `
:root{--hl-bg:#1b1730;--hl-bg-mid:#1f2140;--hl-bg-deep:#16132a;--hl-on-dark:#f2f4fb;--hl-on-dark-strong:#fff;--hl-muted-on-dark:#a8b0c8;--hl-mist:#7a92c8;--hl-card:#fffdf9;--hl-ink:#1b1730;--font-body:"Source Sans 3",system-ui,-apple-system,sans-serif}
html{background-color:var(--hl-bg);color:var(--hl-on-dark)}
body{margin:0;min-height:100vh;background-color:var(--hl-bg);color:var(--hl-on-dark);font-family:var(--font-body);-webkit-font-smoothing:antialiased}
#root.hl-public,#hl-ssr-hold.hl-public{box-sizing:border-box;min-height:100vh;color:inherit;background:transparent;visibility:visible}
#root>.hl-ssr,#hl-ssr-hold>.hl-ssr{box-sizing:border-box;min-height:100vh;padding:clamp(24px,4vw,48px) clamp(16px,4vw,28px);color:var(--hl-on-dark);font-size:17px;line-height:1.65;background:transparent}
#root>.hl-ssr h1,#root>.hl-ssr h2,#hl-ssr-hold>.hl-ssr h1,#hl-ssr-hold>.hl-ssr h2{margin:0 0 .65em;font-weight:700;line-height:1.2;color:var(--hl-on-dark-strong)}
#root>.hl-ssr h1,#hl-ssr-hold>.hl-ssr h1{font-size:clamp(1.75rem,4vw,2.5rem)}
#root>.hl-ssr h2,#hl-ssr-hold>.hl-ssr h2{font-size:clamp(1.2rem,2.8vw,1.5rem);margin-top:2rem}
#root>.hl-ssr p,#root>.hl-ssr li,#hl-ssr-hold>.hl-ssr p,#hl-ssr-hold>.hl-ssr li{color:var(--hl-on-dark)}
#root>.hl-ssr a,#hl-ssr-hold>.hl-ssr a{color:var(--hl-mist);font-weight:600}
#root>.hl-ssr ul,#hl-ssr-hold>.hl-ssr ul{padding-left:1.25rem}
#root>.hl-ssr img,#hl-ssr-hold>.hl-ssr img{max-width:100%;height:auto;border-radius:12px}
#root>.hl-ssr .places-discover__title,#hl-ssr-hold>.hl-ssr .places-discover__title{margin:0 0 1rem;font-size:clamp(1.65rem,5vw,2.25rem);letter-spacing:-0.02em}
#root>.hl-ssr .hl-ssr-discover,#hl-ssr-hold>.hl-ssr .hl-ssr-discover{margin:0 0 1.5rem;max-width:420px}
#root>.hl-ssr a.list-card--ssr,#hl-ssr-hold>.hl-ssr a.list-card--ssr{display:block;text-decoration:none;color:inherit;background:var(--hl-card);border-radius:14px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.22)}
#root>.hl-ssr .list-card__media,#hl-ssr-hold>.hl-ssr .list-card__media{position:relative;aspect-ratio:16/10;background:#2a2540;overflow:hidden}
#root>.hl-ssr .list-card__media-fill,#hl-ssr-hold>.hl-ssr .list-card__media-fill{position:absolute;inset:0}
#root>.hl-ssr .list-card__media-fill img,#hl-ssr-hold>.hl-ssr .list-card__media-fill img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;border-radius:0;max-width:none}
#root>.hl-ssr .list-card__body,#hl-ssr-hold>.hl-ssr .list-card__body{padding:12px 14px;color:var(--hl-ink);font-size:1rem}
#root>.hl-ssr .hl-ssr-links,#hl-ssr-hold>.hl-ssr .hl-ssr-links{opacity:.92}
html.hl-spa-pending #root{visibility:hidden!important;pointer-events:none;position:fixed;inset:0;z-index:0}
html.hl-spa-pending #hl-ssr-hold{position:relative;z-index:1;min-height:100vh}
`;

/**
 * Custom-host explore: early API preconnect, drop admin Google Fonts, async
 * index.css (inline shell paints first), keep SSR h1/card as lab LCP until SPA.
 * @param {string} html
 */
export function deferPublicSpaBoot(html) {
  let next = html;

  next = next.replace(
    /<link\s+rel="preconnect"\s+href="https:\/\/fonts\.googleapis\.com"\s*\/?>\s*/gi,
    ""
  );
  next = next.replace(
    /<link\s+rel="preconnect"\s+href="https:\/\/fonts\.gstatic\.com"[^>]*>\s*/gi,
    ""
  );
  next = next.replace(
    /<link\s+rel="preload"\s+as="style"\s+href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+"[^>]*>\s*/gi,
    ""
  );
  next = next.replace(
    /<noscript>\s*<link\s+href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+"\s+rel="stylesheet"\s*\/?>\s*<\/noscript>\s*/gi,
    ""
  );

  // PSI: dns-prefetch alone leaves ~300ms on the table for api.hello-local.io.
  if (!next.includes('rel="preconnect" href="https://api.hello-local.io"')) {
    next = next.replace(
      /(<link\s+rel="dns-prefetch"\s+href="https:\/\/api\.hello-local\.io"\s*\/?>)/i,
      `$1\n    <link rel="preconnect" href="https://api.hello-local.io" crossorigin />`
    );
  }

  // Render-blocking index.css (~12KiB / 150ms) — shell CSS already covers first paint.
  next = next.replace(
    /<link\s+rel="stylesheet"\s+crossorigin\s+href="(\/assets\/index-[^"]+\.css)"\s*\/?>/i,
    `<link rel="preload" as="style" href="$1" onload="this.onload=null;this.rel='stylesheet'" />
    <noscript><link rel="stylesheet" crossorigin href="$1" /></noscript>`
  );

  next = next.replace(
    /<script\s+type="module"\s+crossorigin\s+src="(\/assets\/index-[^"]+\.js)"\s*><\/script>/i,
    `<script type="module">
(function(){
  var src="$1";
  var booted=false;
  function boot(){
    if(booted) return;
    booted=true;
    var s=document.createElement("script");
    s.type="module";
    s.crossOrigin="";
    s.src=src;
    document.body.appendChild(s);
  }
  // Let the SSR h1 / list-card img paint as LCP, then boot on the next frames.
  function afterSsr(go){
    var h1=document.querySelector("#root.hl-public h1");
    if(!h1){ go(); return; }
    requestAnimationFrame(function(){ requestAnimationFrame(go); });
  }
  function schedule(){ afterSsr(boot); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",schedule,{once:true});
  else schedule();
})();
</script>`
  );
  return next;
}

/**
 * @param {string} html
 * @param {{ lcpImage?: string | null, siteTheme?: unknown, brandTheme?: unknown }} [opts]
 */
export function injectPublicShellHead(html, opts = {}) {
  let next = html;
  const lcp = String(opts.lcpImage || "").trim();
  if (lcp && !next.includes('data-hl-explore-lcp="1"')) {
    const isMap = /map-szeged/i.test(lcp);
    const preload = isMap
      ? `<link data-hl-explore-lcp="1" rel="preload" as="image" href="/marketing/map-szeged-480.webp" type="image/webp" imagesrcset="/marketing/map-szeged-480.webp 480w, /marketing/map-szeged-720.webp 720w" imagesizes="(max-width: 680px) 92vw, (max-width: 1040px) 45vw, 30vw" fetchpriority="high" />`
      : `<link data-hl-explore-lcp="1" rel="preload" as="image" href="${lcp.replace(/"/g, "")}" fetchpriority="high" />`;
    if (next.includes('id="hl-first-paint"')) {
      next = next.replace(
        /(<style id="hl-first-paint">[\s\S]*?<\/style>)/i,
        `$1\n    ${preload}`
      );
    } else if (next.includes("</head>")) {
      next = next.replace("</head>", `    ${preload}\n  </head>`);
    } else {
      next = `${preload}${next}`;
    }
  }
  const theme = publicThemeInlineCss(opts.siteTheme, opts.brandTheme);
  if (!next.includes('id="public-ssr-shell"')) {
    const block = `    <style id="public-ssr-shell">${PUBLIC_SSR_SHELL_CSS}\n${theme.css}</style>`;
    next = next.includes("</head>")
      ? next.replace("</head>", `${block}\n  </head>`)
      : `${block}${next}`;
  } else if (!next.includes("data-hl-theme-vars")) {
    // Shell already present — still inject preset vars for first paint.
    const block = `    <style id="public-ssr-theme" data-hl-theme-vars="1">${theme.css}</style>`;
    next = next.includes("</head>")
      ? next.replace("</head>", `${block}\n  </head>`)
      : `${block}${next}`;
  }
  // Mark document + root for atelier/classic attribute selectors before SPA boot.
  next = next.replace(/<html(\s[^>]*)?>/i, (full, attrs = "") => {
    if (/\bdata-theme=/.test(attrs)) return full;
    return `<html${attrs} data-theme="${theme.presetId}">`;
  });
  next = next.replace(
    /<div id="root"([^>]*)>/i,
    (full, attrs = "") => {
      if (/\bdata-theme=/.test(attrs)) return full;
      const withClass = /\bclass=/.test(attrs)
        ? attrs.replace(/\bclass=(["'])([^"']*)\1/, (m, q, c) =>
            c.includes("hl-public") ? m : `class=${q}${c} hl-public${q}`
          )
        : `${attrs} class="hl-public"`;
      return `<div id="root"${withClass} data-theme="${theme.presetId}">`;
    }
  );
  return deferPublicSpaBoot(next);
}

/**
 * Embed domain resolve so HostScope skips /api/domain on first paint.
 * @param {string} html
 * @param {{ kind?: string, slug: string, defaultLang?: string, entitySlug?: string } | null} domain
 */
export function injectHostBootstrap(html, domain) {
  if (!domain?.slug || html.includes('id="hl-host-bootstrap"')) return html;
  const payload = JSON.stringify({
    kind: domain.kind || "site",
    slug: domain.slug,
    defaultLang: domain.defaultLang || "hu",
    ...(domain.entitySlug ? { entitySlug: domain.entitySlug } : {}),
  }).replace(/</g, "\\u003c");
  const script = `<script type="application/json" id="hl-host-bootstrap">${payload}</script>`;
  return html.includes("</head>")
    ? html.replace("</head>", `    ${script}\n  </head>`)
    : `${script}${html}`;
}

import { publicThemeInlineCss } from "./publicThemePresets.js";

/**
 * First-paint styles for crawlable SSR bodies injected into `#root`
 * (region / town / place / event). Complements index.html `hl-first-paint`.
 */
/** Structural shell only — colors come from `publicThemeInlineCss` on `<html style>`. */
export const PUBLIC_SSR_SHELL_CSS = `
:root{--font-body:"Source Sans 3",system-ui,-apple-system,sans-serif}
body{margin:0;min-height:100vh;font-family:var(--font-body);-webkit-font-smoothing:antialiased}
#root.hl-public{box-sizing:border-box;min-height:100vh;color:inherit;background:transparent;visibility:visible}
/* Humans never paint crawl SSR (avoids list-page flash); bots still read the HTML. */
#root.hl-public>.hl-ssr,#hl-ssr-hold{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;clip-path:inset(50%)!important;white-space:nowrap!important;border:0!important;pointer-events:none!important}
html.hl-spa-pending #root{visibility:hidden!important;pointer-events:none}
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
  // Boot ASAP — crawl SSR is visually clipped; waiting for its h1 only delayed the SPA.
  function schedule(){
    if(typeof requestAnimationFrame==="function"){
      requestAnimationFrame(function(){ requestAnimationFrame(boot); });
    } else {
      setTimeout(boot, 0);
    }
  }
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
    const block = `    <style id="public-ssr-shell" data-hl-theme-vars="1">${PUBLIC_SSR_SHELL_CSS}\n${theme.css}</style>`;
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
  // Theme on <html style> beats SPA `:root` navy defaults; data-theme for atelier CSS.
  const safeStyle = String(theme.styleAttr || "").replace(/"/g, "&quot;");
  next = next.replace(/<html(\s[^>]*)?>/i, (full, attrs = "") => {
    let nextAttrs = attrs || "";
    if (!/\bdata-theme=/.test(nextAttrs)) {
      nextAttrs += ` data-theme="${theme.presetId}"`;
    }
    if (/\bstyle=/.test(nextAttrs)) {
      nextAttrs = nextAttrs.replace(/\bstyle=(["'])([\s\S]*?)\1/i, (_, q, existing) => {
        const merged = existing ? `${existing};${theme.styleAttr}` : theme.styleAttr;
        return `style=${q}${String(merged).replace(new RegExp(q, "g"), "")}${q}`;
      });
    } else {
      nextAttrs += ` style="${safeStyle}"`;
    }
    return `<html${nextAttrs}>`;
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

/**
 * First-paint styles for crawlable SSR bodies injected into `#root`
 * (region / town / place / event). Complements index.html `hl-first-paint`.
 */
export const PUBLIC_SSR_SHELL_CSS = `
:root{--hl-bg:#1b1730;--hl-bg-mid:#1f2140;--hl-bg-deep:#16132a;--hl-on-dark:#f2f4fb;--hl-on-dark-strong:#fff;--hl-muted-on-dark:#a8b0c8;--hl-mist:#7a92c8;--hl-card:#fffdf9;--hl-ink:#1b1730;--font-body:"Source Sans 3",system-ui,-apple-system,sans-serif}
html{background-color:var(--hl-bg);color:var(--hl-on-dark)}
body{margin:0;min-height:100vh;background-color:var(--hl-bg);color:var(--hl-on-dark);font-family:var(--font-body);-webkit-font-smoothing:antialiased}
#root.hl-public{box-sizing:border-box;min-height:100vh;color:inherit;background:transparent;visibility:visible}
#root>.hl-ssr{box-sizing:border-box;min-height:100vh;padding:clamp(24px,4vw,48px) clamp(16px,4vw,28px);color:var(--hl-on-dark);font-size:17px;line-height:1.65;background:transparent}
#root>.hl-ssr h1,#root>.hl-ssr h2{margin:0 0 .65em;font-weight:700;line-height:1.2;color:var(--hl-on-dark-strong)}
#root>.hl-ssr h1{font-size:clamp(1.75rem,4vw,2.5rem)}
#root>.hl-ssr h2{font-size:clamp(1.2rem,2.8vw,1.5rem);margin-top:2rem}
#root>.hl-ssr p,#root>.hl-ssr li{color:var(--hl-on-dark)}
#root>.hl-ssr a{color:var(--hl-mist);font-weight:600}
#root>.hl-ssr ul{padding-left:1.25rem}
#root>.hl-ssr img{max-width:100%;height:auto;border-radius:12px}
`;

/**
 * @param {string} html
 */
export function injectPublicShellHead(html) {
  if (html.includes('id="public-ssr-shell"')) return html;
  const block = `    <style id="public-ssr-shell">${PUBLIC_SSR_SHELL_CSS}</style>`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${block}\n  </head>`);
  }
  return `${block}${html}`;
}

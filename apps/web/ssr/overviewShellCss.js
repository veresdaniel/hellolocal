/**
 * Platform overview first-paint shell (SSR + index.html).
 * Keep default colors in sync with `DEFAULT_PUBLIC_THEME_COLORS` in publicThemeColors.ts.
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";

/** Blocking inline theme + readable SSR fallback until overview.css + the app bundle load. */
export const OVERVIEW_SHELL_CSS = `
:root{--hl-bg:#1b1730;--hl-bg-mid:#1f2140;--hl-bg-deep:#16132a;--hl-on-dark:#f2f4fb;--hl-on-dark-strong:#fff;--hl-muted-on-dark:#a8b0c8;--hl-accent:#c45c26;--hl-mist:#7a92c8;--font-body:"Source Sans 3",system-ui,-apple-system,sans-serif}
html{background-color:var(--hl-bg);color:var(--hl-on-dark)}
body{margin:0;min-height:100vh;background-color:var(--hl-bg);background-image:radial-gradient(980px 560px at 8% -4%,rgba(61,90,154,.55),transparent 58%),radial-gradient(820px 520px at 100% 8%,rgba(122,146,200,.28),transparent 52%),linear-gradient(180deg,var(--hl-bg) 0%,var(--hl-bg-mid) 38%,var(--hl-bg) 72%,var(--hl-bg-deep) 100%);color:var(--hl-on-dark);font-family:var(--font-body);-webkit-font-smoothing:antialiased}
#root.hl-public{min-height:100vh;color:inherit;background:transparent;visibility:visible}
#root>.overview--ssr{box-sizing:border-box;max-width:1120px;margin:0 auto;padding:clamp(96px,14vw,128px) clamp(16px,4vw,28px) clamp(64px,8vw,96px);color:var(--hl-on-dark);font-size:17px;line-height:1.65}
#root>.overview--ssr h1,#root>.overview--ssr h2,#root>.overview--ssr h3{margin:0 0 .65em;font-weight:700;line-height:1.15;color:var(--hl-on-dark-strong)}
#root>.overview--ssr h1{font-size:clamp(2rem,5vw,3.25rem)}
#root>.overview--ssr h2{font-size:clamp(1.35rem,3.2vw,1.85rem);margin-top:2.5rem}
#root>.overview--ssr p,#root>.overview--ssr li{color:var(--hl-on-dark)}
#root>.overview--ssr a{color:var(--hl-mist);font-weight:600}
#root>.overview--ssr img{max-width:100%;height:auto;border-radius:12px}
#root>.overview--ssr figure{margin:2rem 0}
#root>.overview--ssr figcaption{margin-top:.5rem;color:var(--hl-muted-on-dark);font-size:.95rem}
`;

let cachedOverviewCssHref = /** @type {string | null | undefined} */ (undefined);

/** Built overview chunk path (prod), or Vite dev source path. */
export function resolveOverviewStylesheetHref(webRoot) {
  if (cachedOverviewCssHref !== undefined) return cachedOverviewCssHref;

  const assetsDir = join(webRoot, "dist", "assets");
  if (existsSync(assetsDir)) {
    try {
      const match = readdirSync(assetsDir).find((file) => /^overview-[A-Za-z0-9_-]+\.css$/.test(file));
      cachedOverviewCssHref = match ? `/assets/${match}` : null;
      return cachedOverviewCssHref;
    } catch {
      cachedOverviewCssHref = null;
      return null;
    }
  }

  const devSheet = join(webRoot, "src", "styles", "overview.css");
  cachedOverviewCssHref = existsSync(devSheet) ? "/src/styles/overview.css" : null;
  return cachedOverviewCssHref;
}

/**
 * @param {string} html
 * @param {string} webRoot apps/web directory (dirname of server.js)
 */
export function injectOverviewShellHead(html, webRoot) {
  const sheet = resolveOverviewStylesheetHref(webRoot);
  const block = `
    <style id="overview-shell">${OVERVIEW_SHELL_CSS}</style>
    ${sheet ? `<link rel="stylesheet" href="${sheet}" />` : ""}`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${block}\n  </head>`);
  }
  return `${block}${html}`;
}
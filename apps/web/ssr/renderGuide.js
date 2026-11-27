/**
 * Platform guide SSR (`/:lang/{guide}/:slug`) for crawlers and the first HTML paint.
 */
import { applySocialMeta, publicOrigin } from "./socialMeta.js";
import { sanitizeRichHtml } from "./sanitizeRichHtml.js";
import { guidePathSync, isGuideSegmentSync, loadPathSegments } from "./pathSegments.js";

const LANG_RE = /^[a-z]{2,8}$/;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function asLang(lang) {
  const code = String(lang || "")
    .trim()
    .toLowerCase()
    .split("-")[0];
  return LANG_RE.test(code) ? code : "hu";
}

/**
 * @param {string} pathname
 * @param {object} [payload] path-segments payload (optional; sync fallback)
 * @returns {{ lang: string, slug: string } | null}
 */
export function guideRequest(pathname, payload) {
  const parts = String(pathname || "/")
    .split("?")[0]
    .split("/")
    .filter(Boolean);
  if (parts.length !== 3 || !LANG_RE.test(parts[0]) || !parts[2]) return null;
  if (!isGuideSegmentSync(parts[1], payload)) return null;
  return { lang: parts[0], slug: decodeURIComponent(parts[2]) };
}

/** Resolve guide request using a fresh (or cached) path-segments payload. */
export async function resolveGuideRequest(pathname, apiUrl) {
  const payload = await loadPathSegments(apiUrl);
  return guideRequest(pathname, payload);
}

/** Hungarian guides are canonical on hellolocal.hu; other langs on hellolocal.eu. */
export function guideCanonical(origin, lang, slug, payload) {
  let host = "";
  try {
    host = new URL(origin).hostname.replace(/^www\./, "");
  } catch {
    host = "";
  }
  const marketing = host === "hellolocal.hu" || host === "hellolocal.eu" || host === "hello-local.io";
  const base = !marketing
    ? String(origin || "").replace(/\/$/, "")
    : lang === "hu"
      ? "https://hellolocal.hu"
      : "https://hellolocal.eu";
  return `${base}${guidePathSync(lang, slug, payload)}`;
}

function absoluteAsset(origin, url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = String(origin || "").replace(/\/$/, "");
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

export function renderGuideDocument(indexHtml, guide, origin, payload) {
  origin = publicOrigin(origin);
  const slug = String(guide.slug || "");
  const lang = asLang(guide.lang);
  const languages =
    Array.isArray(guide.languages) && guide.languages.length
      ? guide.languages.map(asLang)
      : [lang];
  const url = guideCanonical(origin, lang, slug, payload);
  const title = String(guide.seoTitle || guide.title || "HelloLocal");
  const description = String(guide.seoDescription || "");
  const image = absoluteAsset(origin, guide.imageUrl) || `${origin}/marketing/hellolocal-share.jpg`;
  const robots = guide.indexable === true ? "index,follow" : "noindex,nofollow";
  const alternates = languages
    .map(
      (code) =>
        `<link rel="alternate" hreflang="${code}" href="${escapeHtml(guideCanonical(origin, code, slug, payload))}" />`
    )
    .join("");
  const xDefault = guideCanonical(origin, languages.includes("hu") ? "hu" : lang, slug, payload);
  const caption = String(guide.imageCaption || "").trim();
  const figure = guide.imageUrl
    ? `<figure class="guide__figure"><img src="${escapeHtml(absoluteAsset(origin, guide.imageUrl))}" alt="${escapeHtml(caption || guide.title || "")}" />${
        caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""
      }</figure>`
    : "";
  const body = `
    <main class="overview guide">
      <article>
        <p><a href="/${lang}">HelloLocal</a></p>
        <h1>${escapeHtml(guide.title || "")}</h1>
        ${figure}
        <div>${sanitizeRichHtml(guide.body || "")}</div>
      </article>
    </main>`;
  let html = applySocialMeta(indexHtml, {
    lang,
    title,
    description,
    url,
    image,
    type: "article",
    siteName: "HelloLocal",
    origin,
  });
  const head = `
    <meta name="robots" content="${robots}" />
    ${alternates}
    <link rel="alternate" hreflang="x-default" href="${escapeHtml(xDefault)}" />`;
  return html
    .replace("</head>", `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root" class="hl-public">${body}</div>`);
}

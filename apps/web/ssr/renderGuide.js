/**
 * Platform guide SSR (`/:lang/tema/:slug`) for crawlers and the first HTML paint.
 */
import { applySocialMeta, publicOrigin } from "./socialMeta.js";
import { sanitizeRichHtml } from "./sanitizeRichHtml.js";

const LANGS = new Set(["hu", "en", "de"]);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @returns {{ lang: string, slug: string } | null} */
export function guideRequest(pathname) {
  const parts = String(pathname || "/")
    .split("?")[0]
    .split("/")
    .filter(Boolean);
  if (parts.length !== 3 || !LANGS.has(parts[0]) || parts[1] !== "tema" || !parts[2]) return null;
  return { lang: parts[0], slug: decodeURIComponent(parts[2]) };
}

/** Hungarian guides are canonical on hellolocal.hu; English and German on hellolocal.eu. */
export function guideCanonical(origin, lang, slug) {
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
  return `${base}/${lang}/tema/${slug}`;
}

function absoluteAsset(origin, url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = String(origin || "").replace(/\/$/, "");
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

export function renderGuideDocument(indexHtml, guide, origin) {
  origin = publicOrigin(origin);
  const slug = String(guide.slug || "");
  const lang = LANGS.has(guide.lang) ? guide.lang : "hu";
  const languages = Array.isArray(guide.languages) && guide.languages.length ? guide.languages : [lang];
  const url = guideCanonical(origin, lang, slug);
  const title = String(guide.seoTitle || guide.title || "HelloLocal");
  const description = String(guide.seoDescription || "");
  const image = absoluteAsset(origin, guide.imageUrl) || `${origin}/marketing/hellolocal-share.jpg`;
  const robots = guide.indexable === true ? "index,follow" : "noindex,nofollow";
  const alternates = languages
    .filter((code) => LANGS.has(code))
    .map(
      (code) =>
        `<link rel="alternate" hreflang="${code}" href="${escapeHtml(guideCanonical(origin, code, slug))}" />`
    )
    .join("");
  const xDefault = guideCanonical(origin, languages.includes("hu") ? "hu" : lang, slug);
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

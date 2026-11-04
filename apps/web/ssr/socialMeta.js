import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));

export const SHARE_IMAGE_PATH = "/marketing/map-szeged.jpg";
export const SHARE_IMAGE_WIDTH = "1024";
export const SHARE_IMAGE_HEIGHT = "656";

const LOCALES = { hu: "hu_HU", en: "en_US", de: "de_DE" };
const LANGS = ["hu", "en", "de"];
const PLACE_SEGMENTS = new Set(["hely", "place", "ort"]);
const TOWN_SEGMENTS = new Set(["telepules", "town", "gemeinde"]);
const VIEW_SEGMENTS = new Set(["lista", "list", "liste", "terkep", "map", "karte"]);
const REGION_LIST_SEGMENTS = new Set(["regiok", "teruletek", "regions", "regionen"]);
const LEGAL_PAGE_BY_SEGMENT = {
  impresszum: "imprint",
  imprint: "imprint",
  impressum: "imprint",
  aszf: "terms",
  terms: "terms",
  agb: "terms",
  adatvedelem: "privacy",
  privacy: "privacy",
  datenschutz: "privacy",
};
const PLACE_SEGMENT_BY_LANG = { hu: "hely", en: "place", de: "ort" };
const OVERVIEW_SEGMENTS = new Set(["attekintes", "overview", "ueberblick"]);
const RESERVED = new Set([
  "attekintes",
  "overview",
  "ueberblick",
  "pricing",
  "tarife",
  "preise",
  "impresszum",
  "aszf",
  "adatvedelem",
  "imprint",
  "terms",
  "privacy",
  "impressum",
  "agb",
  "datenschutz",
  "teruletek",
  "regiok",
  "regions",
  "regionen",
  "hely",
  "place",
  "ort",
  "telepules",
  "town",
  "gemeinde",
  "lista",
  "list",
  "liste",
  "terkep",
  "map",
  "karte",
  "event",
  "collections",
  "admin",
  "offline",
  "static-pages",
  "products",
  "static-page",
]);

export function placePathSegment(lang) {
  return PLACE_SEGMENT_BY_LANG[LANGS.includes(lang) ? lang : "hu"];
}

const copyCache = new Map();
const jsonCache = new Map();

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function plainText(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function clip(value, max) {
  const clean = plainText(value);
  if (!clean || clean === "(missing translation)") return "";
  if (clean.length <= max) return clean;
  const sliced = clean.slice(0, max - 1);
  const space = sliced.lastIndexOf(" ");
  const cut = space > Math.floor(max * 0.6) ? sliced.slice(0, space) : sliced;
  return `${cut.trim()}...`;
}

function isLocalHost(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
  } catch {
    return /localhost|127\.0\.0\.1/i.test(String(value));
  }
}

export function publicOrigin(requestOrigin) {
  const configured = String(process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (configured && !isLocalHost(configured)) return configured;
  const request = String(requestOrigin || "")
    .trim()
    .replace(/\/$/, "");
  if (request && !isLocalHost(request)) return request;
  return "https://hello-local.io";
}

export function absoluteShareImage(origin, image) {
  const fallback = {
    url: `${origin}${SHARE_IMAGE_PATH}`,
    width: SHARE_IMAGE_WIDTH,
    height: SHARE_IMAGE_HEIGHT,
  };
  const raw = String(image || "").trim();
  if (!raw) return fallback;
  let url = "";
  if (/^https?:\/\//i.test(raw)) url = raw;
  else if (raw.startsWith("//")) url = `https:${raw}`;
  else if (raw.startsWith("/")) url = `${origin}${raw}`;
  if (!url || isLocalHost(url)) return fallback;
  if (url === fallback.url) return fallback;
  return { url, width: "", height: "" };
}

function loadCopy(lang) {
  const code = LANGS.includes(lang) ? lang : "hu";
  if (copyCache.has(code)) return copyCache.get(code);
  const candidates = [
    join(here, "locales", code, "public.json"),
    join(here, "../src/i18n/locales", code, "public.json"),
  ];
  for (const file of candidates) {
    try {
      const json = JSON.parse(readFileSync(file, "utf8"));
      copyCache.set(code, json);
      return json;
    } catch {
      // try the next location
    }
  }
  if (code !== "hu") return loadCopy("hu");
  return {};
}

function text(copy, ...keys) {
  let node = copy;
  for (const key of keys) node = node?.[key];
  return typeof node === "string" ? node : "";
}

function decodePart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parsePublicPath(pathname) {
  const parts = String(pathname || "/")
    .split("?")[0]
    .split("/")
    .filter(Boolean)
    .map(decodePart);
  const lang = LANGS.includes(parts[0]) ? parts[0] : "hu";
  if (!parts.length || !LANGS.includes(parts[0])) return { kind: "brand", lang: "hu" };
  if (parts.length === 1) return { kind: "sites", lang };
  const second = parts[1];
  if (second === "admin") return { kind: "admin", lang };
  if (OVERVIEW_SEGMENTS.has(second)) return { kind: "overview", lang };
  if (second === "pricing" || second === "tarife" || second === "preise") return { kind: "pricing", lang };
  if (LEGAL_PAGE_BY_SEGMENT[second]) return { kind: "legal", lang, page: LEGAL_PAGE_BY_SEGMENT[second] };
  if (REGION_LIST_SEGMENTS.has(second)) return { kind: "sites", lang };
  if (second === "collections") return { kind: "collections", lang };
  if (second === "products") return { kind: "products", lang };
  if (PLACE_SEGMENTS.has(second) && parts[2]) {
    return { kind: "place", lang, siteKey: undefined, slug: parts[2] };
  }
  if (second === "event" && parts[2]) {
    return { kind: "event", lang, siteKey: undefined, slug: parts[2] };
  }
  if (RESERVED.has(second)) return { kind: "brand", lang };

  const siteKey = second;
  const route = parts[2];
  const slug = parts[3] || "";
  if (!route) return { kind: "site", lang, siteKey };
  if (PLACE_SEGMENTS.has(route) && slug) return { kind: "place", lang, siteKey, slug };
  if (route === "event" && slug) return { kind: "event", lang, siteKey, slug };
  if (TOWN_SEGMENTS.has(route) && slug) return { kind: "town", lang, siteKey, slug };
  if (route && !RESERVED.has(route) && (!slug || VIEW_SEGMENTS.has(slug))) {
    return { kind: "town", lang, siteKey, slug: route };
  }
  if (OVERVIEW_SEGMENTS.has(route)) return { kind: "overview", lang };
  if (route === "pricing" || route === "tarife" || route === "preise") return { kind: "pricing", lang };
  if (LEGAL_PAGE_BY_SEGMENT[route]) return { kind: "legal", lang, page: LEGAL_PAGE_BY_SEGMENT[route] };
  if (route === "products") return { kind: "products", lang, siteKey };
  if (route === "collections") return { kind: "collections", lang };
  if (route === "admin") return { kind: "admin", lang, siteKey };
  return { kind: "site", lang, siteKey };
}

function copyFor(route, copy) {
  const brandTitle = text(copy, "overview", "seoTitle") || "HelloLocal";
  const brandDesc = text(copy, "overview", "seoDescription");
  switch (route.kind) {
    case "sites":
      return {
        title: text(copy, "sites", "title") || brandTitle,
        description: text(copy, "sites", "description") || brandDesc,
      };
    case "pricing":
      return {
        title: text(copy, "pricing", "title") || brandTitle,
        description: text(copy, "pricing", "description") || brandDesc,
      };
    case "legal":
      return {
        title: text(copy, "legal", route.page, "title") || brandTitle,
        description: brandDesc,
      };
    case "products":
      return {
        title: text(copy, "catalog", "title") || brandTitle,
        description: text(copy, "catalog", "lead") || brandDesc,
      };
    case "collections":
      return {
        title: text(copy, "collections", "title") || brandTitle,
        description: text(copy, "collections", "description") || brandDesc,
      };
    case "place":
      return {
        title: text(copy, "place", "title") || brandTitle,
        description: text(copy, "place", "description") || brandDesc,
        type: "article",
      };
    case "event":
      return {
        title: text(copy, "event", "title") || brandTitle,
        description: text(copy, "event", "description") || brandDesc,
        type: "article",
      };
    case "site":
    case "town":
      return {
        title: text(copy, "home", "title") || brandTitle,
        description: text(copy, "home", "description") || brandDesc,
      };
    case "admin":
      return {
        title: "Admin · HelloLocal",
        description: brandDesc,
      };
    default:
      return { title: brandTitle, description: brandDesc };
  }
}

export async function fetchPublicJson(url, timeoutMs = 1000) {
  const cached = jsonCache.get(url);
  if (cached && cached.until > Date.now()) return cached.value;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      jsonCache.set(url, { until: Date.now() + 10_000, value: null });
      return null;
    }
    const value = await response.json();
    jsonCache.set(url, { until: Date.now() + 60_000, value });
    return value;
  } catch {
    jsonCache.set(url, { until: Date.now() + 10_000, value: null });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function siteShare(data) {
  if (!data?.site) return null;
  const title = clip(data.seo?.defaultTitle, 140) || clip(data.site.name, 140);
  const description =
    clip(data.seo?.defaultDescription, 300) ||
    clip(data.site.shortDescription, 300) ||
    clip(data.site.description, 300);
  if (!title && !description) return null;
  return {
    title,
    description,
    siteName: clip(data.site.name, 80) || clip(data.brand?.name, 80),
    hero: data.placeholders?.placeHero || "",
  };
}

function entityShare(data) {
  const title = clip(data?.seo?.title, 140) || clip(data?.name, 140);
  if (!title) return null;
  return {
    title,
    description:
      clip(data.seo?.description, 300) ||
      clip(data.shortDescription, 300) ||
      clip(data.description, 300),
    hero: data.seo?.image || data.heroImage || "",
    type: "article",
  };
}

async function enrich(route, apiUrl, origin) {
  const base = String(apiUrl || "").replace(/\/$/, "");
  if (!base) return null;
  const key = route.siteKey ? encodeURIComponent(route.siteKey) : "";
  if (route.kind === "site" || route.kind === "town") {
    if (!key) return null;
    let share = siteShare(await fetchPublicJson(`${base}/api/public/${route.lang}/${key}/platform`));
    if (!share && route.lang !== "hu") {
      share = siteShare(await fetchPublicJson(`${base}/api/public/hu/${key}/platform`));
    }
    if (!share) return null;
    const patch = { title: share.title, description: share.description, siteName: share.siteName };
    if (route.kind === "town" && route.slug) {
      patch.title = clip(`${route.slug} · ${share.title || share.siteName || ""}`, 140) || patch.title;
    }
    if (share.hero) {
      const image = absoluteShareImage(origin, share.hero);
      patch.image = image.url;
      patch.imageWidth = image.width;
      patch.imageHeight = image.height;
    }
    return patch;
  }
  if (route.kind !== "place" && route.kind !== "event") return null;
  const collection = route.kind === "place" ? "places" : "events";
  const sitePart = key || "default";
  const suffix = `${sitePart}/${collection}/${encodeURIComponent(route.slug)}`;
  let share = entityShare(await fetchPublicJson(`${base}/api/public/${route.lang}/${suffix}`));
  if (!share && route.lang !== "hu") {
    share = entityShare(await fetchPublicJson(`${base}/api/public/hu/${suffix}`));
  }
  if (!share) return null;
  const patch = { title: share.title, description: share.description, type: share.type };
  if (share.hero) {
    const image = absoluteShareImage(origin, share.hero);
    patch.image = image.url;
    patch.imageWidth = image.width;
    patch.imageHeight = image.height;
  }
  return patch;
}

export async function resolvePublicShare({ pathname, apiUrl, requestOrigin }) {
  const route = parsePublicPath(pathname);
  const origin = publicOrigin(requestOrigin);
  const path = String(pathname || "/").split("?")[0];
  const canonical = path === "/" ? `${origin}/` : `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  const defaults = copyFor(route, loadCopy(route.lang));
  const image = absoluteShareImage(origin, null);
  let meta = {
    lang: route.lang,
    title: defaults.title,
    description: defaults.description,
    url: canonical,
    image: image.url,
    imageWidth: image.width,
    imageHeight: image.height,
    type: defaults.type || "website",
    siteName: "HelloLocal",
  };
  const patch = await enrich(route, apiUrl, origin);
  if (!patch) return meta;
  if (patch.title) meta.title = patch.title;
  if (patch.description) meta.description = patch.description;
  if (patch.siteName) meta.siteName = patch.siteName;
  if (patch.type) meta.type = patch.type;
  if (patch.image) {
    meta.image = patch.image;
    meta.imageWidth = patch.imageWidth || "";
    meta.imageHeight = patch.imageHeight || "";
  }
  return meta;
}

function metaTag(attr, name, content) {
  return `<meta ${attr}="${name}" content="${escapeHtml(content)}" />`;
}

function findMeta(html, attr, name) {
  const pattern = new RegExp(
    `<meta\\s+${attr}\\s*=\\s*"${name}"\\s+content\\s*=\\s*"[^"]*"\\s*/?>`,
    "i"
  );
  return pattern.test(html);
}

function replaceMeta(html, attr, name, content) {
  const tag = metaTag(attr, name, content);
  const pattern = new RegExp(
    `<meta\\s+${attr}\\s*=\\s*"${name}"\\s+content\\s*=\\s*"[^"]*"\\s*/?>`,
    "i"
  );
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html;
}

function removeMeta(html, attr, name) {
  const pattern = new RegExp(
    `\\n?\\s*<meta\\s+${attr}\\s*=\\s*"${name}"\\s+content\\s*=\\s*"[^"]*"\\s*/?>`,
    "i"
  );
  return html.replace(pattern, "");
}

export function applySocialMeta(html, meta) {
  const lang = LOCALES[meta.lang] ? meta.lang : "hu";
  const locale = LOCALES[lang];
  const title = clip(meta.title, 140) || "HelloLocal";
  const description = clip(meta.description, 300);
  const image = absoluteShareImage(publicOrigin(), meta.image);
  const imageUrl = image.url;
  const url = meta.url || "https://hello-local.io/";
  const type = meta.type || "website";
  const siteName = clip(meta.siteName, 80) || "HelloLocal";
  const width = meta.imageWidth || image.width || "";
  const height = meta.imageHeight || image.height || "";

  const specs = [
    ["name", "description", description],
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:image", imageUrl],
    ["property", "og:image:width", width],
    ["property", "og:image:height", height],
    ["property", "og:url", url],
    ["property", "og:type", type],
    ["property", "og:locale", locale],
    ["property", "og:site_name", siteName],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", title],
    ["name", "twitter:description", description],
    ["name", "twitter:image", imageUrl],
  ];

  let out = html.replace(/<html lang="[^"]*">/i, `<html lang="${lang}">`);
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  const canonical = `<link rel="canonical" href="${escapeHtml(url)}" />`;
  if (/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i.test(out)) {
    out = out.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, canonical);
  } else {
    out = out.replace("</head>", `    ${canonical}\n  </head>`);
  }

  const missing = [];
  for (const [attr, name, content] of specs) {
    if (!content) {
      out = removeMeta(out, attr, name);
      continue;
    }
    if (findMeta(out, attr, name)) out = replaceMeta(out, attr, name, content);
    else missing.push(metaTag(attr, name, content));
  }
  if (missing.length) {
    out = out.replace("</head>", `    ${missing.join("\n    ")}\n  </head>`);
  }
  return out;
}

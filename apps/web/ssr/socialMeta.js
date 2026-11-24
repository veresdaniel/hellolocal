/**
 * SSR social / Open Graph meta for the Express HTML shell.
 *
 * Cascade (admin overrides win when non-empty):
 *   seo* → name / shortDescription / heroImage → brand placeholder → platform defaultShareImage
 *
 * Custom domains: parse path first, then {@link applyHostScope} so /:lang on a tenant
 * host still enriches as that entity's home (not the platform overview).
 *
 * Soft-404: slug entity routes with no API content set `meta.notFound` → noindex + HTTP 404.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));

/** Built-in HelloLocal brand OG image when no AppSetting / site SEO image is set. */
export const SHARE_IMAGE_PATH = "/marketing/hellolocal-share.jpg";
export const SHARE_IMAGE_WIDTH = "1200";
export const SHARE_IMAGE_HEIGHT = "630";

/** FB-recommended defaults when the asset has no known pixel size. */
export const OG_IMAGE_WIDTH_DEFAULT = "1200";
export const OG_IMAGE_HEIGHT_DEFAULT = "630";

/**
 * Seed / demo hosts Meta often cannot scrape (HEAD 405, redirect CDNs).
 * Treat as missing so OG falls back to same-origin {@link SHARE_IMAGE_PATH}.
 */
const UNUSABLE_SHARE_IMAGE_HOSTS = new Set([
  "picsum.photos",
  "fastly.picsum.photos",
  "loremflickr.com",
  "placekitten.com",
  "via.placeholder.com",
  "placehold.co",
  "placehold.it",
]);

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

/** Localized place path segment (`hely` / `place` / `ort`). */
export function placePathSegment(lang) {
  return PLACE_SEGMENT_BY_LANG[LANGS.includes(lang) ? lang : "hu"];
}

const copyCache = new Map();
const jsonCache = new Map();

/** Escape text for HTML attribute / element content (attribute-safe quotes). */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Strip tags and decode common entities for OG description text. */
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

/** Plain-text clip at word boundary for title/description length limits. */
export function clip(value, max) {
  const clean = plainText(value);
  if (!clean || clean === "(missing translation)") return "";
  if (clean.length <= max) return clean;
  const sliced = clean.slice(0, max - 1);
  const space = sliced.lastIndexOf(" ");
  const cut = space > Math.floor(max * 0.6) ? sliced.slice(0, space) : sliced;
  return `${cut.trim()}...`;
}

/** First N sentences (or a short clip) — mirrors CSR `resolveSeoFields.firstSentences`. */
function firstSentences(value, count = 2) {
  const text = plainText(value);
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  if (!sentences.length) return clip(text, 280);
  return clip(sentences.slice(0, count).join(" "), 300);
}

/** Pick first non-empty clipped string. */
function pickClip(max, ...values) {
  for (const value of values) {
    const clean = clip(value, max);
    if (clean) return clean;
  }
  return "";
}

function isLocalHost(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
  } catch {
    return /localhost|127\.0\.0\.1/i.test(String(value));
  }
}

/**
 * Absolute origin for og:url / og:image.
 * Prefer the request host (custom domains); FRONTEND_URL is fallback; never emit localhost.
 */
export function publicOrigin(requestOrigin) {
  // Prefer the request host so custom domains (helloetyek.hu, hellolocal.hu)
  // get same-origin og:url / og:image. FRONTEND_URL is only a fallback.
  const request = String(requestOrigin || "")
    .trim()
    .replace(/\/$/, "");
  if (request && !isLocalHost(request)) return request;
  const configured = String(process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (configured && !isLocalHost(configured)) return configured;
  return "https://hello-local.io";
}

function hostnameFromOrigin(value) {
  try {
    return new URL(value).hostname.toLowerCase().split(":")[0];
  } catch {
    return String(value || "")
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      ?.split(":")[0]
      ?.toLowerCase() || "";
  }
}

function shareImageHost(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isUnusableShareImageUrl(url) {
  const host = shareImageHost(url);
  if (!host) return true;
  if (UNUSABLE_SHARE_IMAGE_HOSTS.has(host)) return true;
  // Subdomains of listed hosts (e.g. i.picsum.photos).
  for (const blocked of UNUSABLE_SHARE_IMAGE_HOSTS) {
    if (host.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

/**
 * If `url` is only a www/apex variant of `origin`, rewrite to `origin` + same path.
 * Keeps og:image / twitter:image on the same host as og:url (Meta is picky).
 */
function alignShareImageToOrigin(origin, url) {
  try {
    const base = new URL(origin);
    const abs = new URL(url);
    const baseHost = base.hostname.replace(/^www\./, "");
    const absHost = abs.hostname.replace(/^www\./, "");
    if (baseHost && absHost === baseHost && abs.hostname !== base.hostname) {
      abs.protocol = base.protocol;
      abs.hostname = base.hostname;
      abs.port = base.port;
      return abs.toString();
    }
  } catch {
    // keep original
  }
  return url;
}

/**
 * Resolve a share image to an absolute https URL.
 * Relative paths join `origin`; empty / localhost / placeholder CDNs → built-in
 * marketing fallback (+ known dimensions). Other absolute URLs get default OG
 * width/height so Meta does not warn about missing dimensions.
 */
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
  if (!url || isLocalHost(url) || isUnusableShareImageUrl(url)) return fallback;
  url = alignShareImageToOrigin(origin, url);
  if (url === fallback.url) return fallback;
  return {
    url,
    width: OG_IMAGE_WIDTH_DEFAULT,
    height: OG_IMAGE_HEIGHT_DEFAULT,
  };
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

/**
 * Parse a public pathname into `{ kind, lang, siteKey?, slug?, page? }`.
 * Host scope is applied separately via {@link applyHostScope}.
 */
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
  if (second === "collections") {
    if (parts[2]) return { kind: "collection", lang, slug: parts[2] };
    return { kind: "collections", lang };
  }
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
  if (route === "collections") {
    if (slug) return { kind: "collection", lang, siteKey, slug };
    return { kind: "collections", lang, siteKey };
  }
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
    case "collection":
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

/**
 * Short-timeout public API GET with optional X-Forwarded-Host forwarding.
 * Caches successes ~60s and failures ~10s (keyed by URL + host).
 */
export async function fetchPublicJson(url, timeoutMs = 1000, forward = null) {
  const cacheKey = forward?.host ? `${url}::${forward.host}` : url;
  const cached = jsonCache.get(cacheKey);
  if (cached && cached.until > Date.now()) return cached.value;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { accept: "application/json" };
    if (forward?.host) {
      headers["X-Forwarded-Host"] = forward.host;
      headers["X-Forwarded-Proto"] = forward.proto || "https";
    }
    const response = await fetch(url, {
      signal: controller.signal,
      headers,
    });
    if (!response.ok) {
      jsonCache.set(cacheKey, { until: Date.now() + 10_000, value: null });
      return null;
    }
    const value = await response.json();
    jsonCache.set(cacheKey, { until: Date.now() + 60_000, value });
    return value;
  } catch {
    jsonCache.set(cacheKey, { until: Date.now() + 10_000, value: null });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Site/region share fields. Empty SEO overrides cascade automatically:
 * seo* → name / shortDescription / heroImage → brand placeholder → platform defaultShareImage.
 */
export function siteShare(data) {
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
    hero:
      data.seo?.defaultImage ||
      data.site.heroImage ||
      data.placeholders?.placeHero ||
      data.platform?.defaultShareImage ||
      "",
  };
}

function collectionShare(data, platformFallback = "") {
  if (!data) return null;
  const title = pickClip(140, data.seo?.title, data.title);
  if (!title) return null;
  return {
    title,
    description: pickClip(
      300,
      data.seo?.description,
      firstSentences(data.description, 2),
      data.description
    ),
    hero: data.seo?.image || data.heroImage || platformFallback || "",
    siteName: clip(data.title, 80),
  };
}

function entityShare(data, platformFallback = "") {
  const title = pickClip(140, data?.seo?.title, data?.name);
  if (!title) return null;
  return {
    title,
    description: pickClip(
      300,
      data.seo?.description,
      data.shortDescription,
      firstSentences(data.description, 2),
      data.description
    ),
    hero: data.seo?.image || data.heroImage || platformFallback || "",
    type: "article",
  };
}

function imagePatch(origin, hero) {
  if (!hero) return null;
  const image = absoluteShareImage(origin, hero);
  return { image: image.url, imageWidth: image.width, imageHeight: image.height };
}

/** Resolve custom domain → `{ kind, slug, entitySlug? }` via `/api/domain/:host` (null on platform/local). */
export async function resolveDomainHost(apiUrl, host, forward) {
  const base = String(apiUrl || "").replace(/\/$/, "");
  const hostname = String(host || "")
    .toLowerCase()
    .split(":")[0]
    .replace(/\.$/, "");
  if (!base || !hostname || hostname === "localhost" || hostname === "127.0.0.1") return null;
  return fetchPublicJson(`${base}/api/domain/${encodeURIComponent(hostname)}`, 800, forward);
}

/** Root-like paths on a custom domain (Host already names the entity). */
function isHostRootKind(kind) {
  return kind === "sites" || kind === "brand" || kind === "site";
}

/**
 * When the Host already names a site/town/place/collection/event, paths without a
 * siteKey (e.g. /hu on helloetyek.hu) still need tenant-scoped enrich.
 * Covers every DomainResolveKind: site | town | place | collection | event.
 */
export function applyHostScope(route, resolved) {
  if (!resolved?.slug || !resolved?.kind) return route;
  const next = { ...route };

  if (resolved.kind === "site") {
    if (!next.siteKey && isHostRootKind(next.kind)) {
      next.kind = "site";
      next.siteKey = resolved.slug;
    } else if (!next.siteKey) {
      next.siteKey = resolved.slug;
    }
    return next;
  }

  if (resolved.kind === "collection") {
    if (isHostRootKind(next.kind) || next.kind === "collections") {
      next.kind = "collection";
      next.slug = resolved.slug;
      delete next.siteKey;
    }
    return next;
  }

  if (resolved.kind === "town" || resolved.kind === "place" || resolved.kind === "event") {
    // Parent region slug is always resolved.slug; entitySlug is the public path slug.
    if (!next.siteKey) next.siteKey = resolved.slug;
    if (isHostRootKind(next.kind) && resolved.entitySlug) {
      next.kind = resolved.kind;
      next.slug = resolved.entitySlug;
    }
    return next;
  }

  return next;
}

async function enrich(route, apiUrl, origin, forward = null, platformFallback = "") {
  const base = String(apiUrl || "").replace(/\/$/, "");
  if (!base) return null;
  const key = route.siteKey ? encodeURIComponent(route.siteKey) : "";

  if (route.kind === "collection" && route.slug) {
    let share = collectionShare(
      await fetchPublicJson(
        `${base}/api/public/collections/by-slug/${encodeURIComponent(route.slug)}?lang=${route.lang}`,
        1000,
        forward
      ),
      platformFallback
    );
    if (!share && route.lang !== "hu") {
      share = collectionShare(
        await fetchPublicJson(
          `${base}/api/public/collections/by-slug/${encodeURIComponent(route.slug)}?lang=hu`,
          1000,
          forward
        ),
        platformFallback
      );
    }
    if (!share && forward?.host) {
      share = collectionShare(
        await fetchPublicJson(
          `${base}/api/public/collections/by-domain/${encodeURIComponent(forward.host)}?lang=${route.lang}`,
          1000,
          forward
        ),
        platformFallback
      );
    }
    if (!share) return null;
    const patch = { title: share.title, description: share.description, siteName: share.siteName };
    Object.assign(patch, imagePatch(origin, share.hero) || {});
    return patch;
  }

  if (route.kind === "site") {
    if (!key) return null;
    let share = siteShare(
      await fetchPublicJson(`${base}/api/public/${route.lang}/${key}/platform`, 1000, forward)
    );
    if (!share && route.lang !== "hu") {
      share = siteShare(
        await fetchPublicJson(`${base}/api/public/hu/${key}/platform`, 1000, forward)
      );
    }
    if (!share) return null;
    const patch = { title: share.title, description: share.description, siteName: share.siteName };
    Object.assign(patch, imagePatch(origin, share.hero) || {});
    return patch;
  }

  if (route.kind === "town" && route.slug) {
    if (!key) return null;
    const [platform, townsPayload] = await Promise.all([
      fetchPublicJson(`${base}/api/public/${route.lang}/${key}/platform`, 1000, forward),
      fetchPublicJson(`${base}/api/public/${route.lang}/${key}/towns`, 1000, forward),
    ]);
    const site = siteShare(platform);
    const towns = Array.isArray(townsPayload?.towns)
      ? townsPayload.towns
      : Array.isArray(townsPayload?.items)
        ? townsPayload.items
        : Array.isArray(townsPayload)
          ? townsPayload
          : [];
    const town = towns.find((item) => item?.slug === route.slug) || null;
    const title =
      pickClip(140, town?.seo?.title || town?.seoTitle, town?.name) ||
      (site ? clip(`${route.slug} · ${site.title || site.siteName || ""}`, 140) : "");
    const description =
      pickClip(
        300,
        town?.seo?.description || town?.seoDescription,
        firstSentences(town?.description, 2),
        town?.description,
        site?.description
      ) || "";
    if (!title && !description) return null;
    const patch = {
      title,
      description,
      siteName: site?.siteName || clip(town?.name, 80),
    };
    Object.assign(
      patch,
      imagePatch(
        origin,
        town?.seo?.image ||
          town?.seoImage ||
          town?.heroImage ||
          site?.hero ||
          platformFallback ||
          ""
      ) || {}
    );
    return patch;
  }

  if (route.kind !== "place" && route.kind !== "event") return null;
  const collection = route.kind === "place" ? "places" : "events";
  const sitePart = key || "default";
  const suffix = `${sitePart}/${collection}/${encodeURIComponent(route.slug)}`;
  let share = entityShare(
    await fetchPublicJson(`${base}/api/public/${route.lang}/${suffix}`, 1000, forward),
    platformFallback
  );
  if (!share && route.lang !== "hu") {
    share = entityShare(
      await fetchPublicJson(`${base}/api/public/hu/${suffix}`, 1000, forward),
      platformFallback
    );
  }
  if (!share) return null;
  const patch = { title: share.title, description: share.description, type: share.type };
  Object.assign(patch, imagePatch(origin, share.hero) || {});
  return patch;
}

async function loadPlatformShareDefaults(apiUrl, lang, forward) {
  const base = String(apiUrl || "").replace(/\/$/, "");
  if (!base) return null;
  const data = await fetchPublicJson(
    `${base}/api/public/${lang}/default/platform`,
    800,
    forward
  );
  if (!data) return null;
  return {
    shareImage: data.platform?.defaultShareImage || data.seo?.defaultImage || "",
    siteName: clip(data.brand?.name, 80) || "HelloLocal",
  };
}

/**
 * Build share meta for one request: parse path → host-scope → i18n defaults →
 * platform share image → entity enrich. Sets `notFound` when a slug entity has no content.
 */
export async function resolvePublicShare({ pathname, apiUrl, requestOrigin, requestHost, requestProto }) {
  let route = parsePublicPath(pathname);
  const origin = publicOrigin(requestOrigin);
  const host = requestHost || hostnameFromOrigin(requestOrigin);
  const forward = host
    ? { host, proto: requestProto || (String(requestOrigin || "").startsWith("http:") ? "http" : "https") }
    : null;
  if (forward?.host) {
    const resolved = await resolveDomainHost(apiUrl, forward.host, forward);
    if (resolved) route = applyHostScope(route, resolved);
  }
  const rawPath = String(pathname || "/").split("?")[0];
  // Single canonical form: no trailing slash except site root.
  const path =
    rawPath !== "/" && rawPath.endsWith("/") ? rawPath.replace(/\/+$/, "") || "/" : rawPath;
  const canonical = path === "/" ? `${origin}/` : `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  const defaults = copyFor(route, loadCopy(route.lang));
  const platformDefaults = await loadPlatformShareDefaults(apiUrl, route.lang, forward);
  const image = absoluteShareImage(origin, platformDefaults?.shareImage || null);
  let meta = {
    lang: route.lang,
    title: defaults.title,
    description: defaults.description,
    url: canonical,
    image: image.url,
    imageWidth: image.width,
    imageHeight: image.height,
    type: defaults.type || "website",
    siteName: platformDefaults?.siteName || "HelloLocal",
    origin,
    notFound: false,
  };
  const patch = await enrich(
    route,
    apiUrl,
    origin,
    forward,
    platformDefaults?.shareImage || ""
  );
  const entityKinds = new Set(["place", "event", "collection", "town"]);
  if (!patch) {
    // Soft-404: slug entity routes with no content must not look like a thin 200.
    if (entityKinds.has(route.kind) && route.slug) meta.notFound = true;
    return meta;
  }
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

/**
 * Inject / replace title, canonical, description, OG, and Twitter tags in the HTML shell.
 * Empty fields remove stale tags; `meta.notFound` forces robots noindex,nofollow.
 * SSR titles stay bare (no ` - siteName`); CSR `useSeo` adds the tab suffix.
 */
export function applySocialMeta(html, meta) {
  const lang = LOCALES[meta.lang] ? meta.lang : "hu";
  const locale = LOCALES[lang];
  const title = clip(meta.title, 140) || "HelloLocal";
  const description = clip(meta.description, 300);
  const origin = meta.origin || publicOrigin(meta.url);
  const image = absoluteShareImage(origin, meta.image);
  const imageUrl = image.url;
  const url = meta.url || `${origin}/`;
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
  if (meta.notFound) {
    const robots = metaTag("name", "robots", "noindex, nofollow");
    if (findMeta(out, "name", "robots")) out = replaceMeta(out, "name", "robots", "noindex, nofollow");
    else out = out.replace("</head>", `    ${robots}\n  </head>`);
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

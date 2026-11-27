/**
 * Language-specific public URL path segments.
 * Sync helpers use the built-in dictionary (EN fallback). Live DB values are
 * preferred via PathSegmentsService in sitemap/robots.
 */

import { PATH_SEGMENT_DICT, pathSegmentsForLang } from "../ui-copy/path-segment.dict";

export type PublicLang = string;

/** Shipped UI languages — still the default SEO language set. */
export const PUBLIC_LANGS = ["hu", "en", "de"] as const;

/** In-memory sitemap/robots cache TTL (seconds). Explicit invalidate clears earlier. */
export const SEO_CACHE_TTL_SECONDS = 60;

/** Primary subtag; empty → hu. */
export function asPublicLang(lang: string): string {
  const code = String(lang || "")
    .trim()
    .toLowerCase()
    .split("-")[0];
  return code || "hu";
}

/** Localized place detail segment (dictionary / EN fallback). */
export function placePathSegment(lang: string): string {
  return pathSegmentsForLang(asPublicLang(lang)).place;
}

/** Localized town path segment used in legacy / redirect helpers. */
export function townPathSegment(lang: string): string {
  return pathSegmentsForLang(asPublicLang(lang)).town;
}

/** Localized region-list segment. */
export function regionListPathSegment(lang: string): string {
  return pathSegmentsForLang(asPublicLang(lang)).regionList;
}

/** Localized platform pricing segment. */
export function pricingPathSegment(lang: string): string {
  return pathSegmentsForLang(asPublicLang(lang)).pricing;
}

/** Localized map-view segment. */
export function mapPathSegment(lang: string): string {
  return pathSegmentsForLang(asPublicLang(lang)).map;
}

/** True when `segment` is a place detail path label in the built-in dictionary. */
export function isPlacePathSegment(segment: string | undefined): boolean {
  if (!segment) return false;
  return Object.values(PATH_SEGMENT_DICT).some((map) => map.place === segment);
}

/**
 * Live public SEO (crawlable robots + real sitemaps) only on the production platform
 * stack. Beta/devel also set NODE_ENV=production; distinguish via FRONTEND_URL
 * (compose: api-prod → https://hello-local.io, api-beta → beta.hello-local.io).
 */
export function isProductionSeoEnvironment(): boolean {
  const host = hostnameFromUrl(process.env.FRONTEND_URL || "");
  return host === "hello-local.io" || host === "www.hello-local.io";
}

/** Public frontend origin from `FRONTEND_URL` (no trailing slash). */
export function frontendOrigin(): string {
  return (process.env.FRONTEND_URL || "https://hello-local.io").replace(/\/$/, "");
}

/** Hostname from a URL or host-like string (scheme optional). */
export function hostnameFromUrl(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
    return new URL(withScheme).hostname.replace(/\.$/, "");
  } catch {
    return raw
      .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
      .split("/")[0]
      ?.split(":")[0]
      ?.replace(/\.$/, "") || "";
  }
}

/** Platform hosts that serve multi-tenant path URLs (not admin SiteDomain rows). */
export function isPlatformHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0];
  if (!host) return true;
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "hello-local.io" ||
    host === "www.hello-local.io" ||
    host === "api.hello-local.io" ||
    host.endsWith(".hello-local.io")
  ) {
    return true;
  }
  // FRONTEND_URL host counts as platform for this deployment (beta/devel/local).
  const configured = hostnameFromUrl(process.env.FRONTEND_URL || "");
  if (configured && host === configured) return true;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/** Absolute public URL on the platform host (legacy helpers). */
export function absolutePublicUrl(path: string): string {
  return absoluteUrlOnOrigin(frontendOrigin(), path);
}

/** Join origin + path without a trailing slash (except bare origin). */
export function absoluteUrlOnOrigin(origin: string, path: string): string {
  const base = origin.replace(/\/$/, "");
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${base}${clean}`.replace(/\/$/, "") || base;
}

/**
 * Prefer X-Forwarded-Host (set by web proxy / Caddy) then Host.
 * Looked up against SiteDomain / customDomain at request time — no deploy per domain.
 */
export function requestHostname(headers: {
  host?: string;
  "x-forwarded-host"?: string | string[];
}): string {
  const xf = headers["x-forwarded-host"];
  const raw = (Array.isArray(xf) ? xf[0] : xf) || headers.host || "";
  return String(raw)
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

/** First hop of X-Forwarded-Proto; defaults to https. */
export function requestProto(headers: {
  "x-forwarded-proto"?: string | string[];
}): string {
  const xf = headers["x-forwarded-proto"];
  const raw = (Array.isArray(xf) ? xf[0] : xf) || "https";
  const proto = String(raw).split(",")[0].trim().toLowerCase();
  return proto === "http" ? "http" : "https";
}

/** Public origin for sitemap `<loc>` / robots Sitemap: for this request host. */
export function publicOriginForHost(hostname: string, proto = "https"): string {
  if (!hostname || isPlatformHostname(hostname)) {
    return frontendOrigin();
  }
  return `${proto}://${hostname}`;
}

/**
 * OG / share origin for a request — mirrors apps/web/ssr/socialMeta.js `publicOrigin`.
 * Prefer the request host (custom domains) over FRONTEND_URL; never emit API host as og:url.
 */
export function publicOriginFromHeaders(headers: {
  host?: string;
  "x-forwarded-host"?: string | string[];
  "x-forwarded-proto"?: string | string[];
}): string {
  const host = requestHostname(headers);
  const proto = requestProto(headers);
  if (host && !isLocalHostname(host) && !isApiHostname(host)) {
    return `${proto}://${host}`;
  }
  const configured = frontendOrigin();
  if (configured && !isLocalHostname(hostnameFromUrl(configured))) return configured;
  return "https://hello-local.io";
}

function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0];
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
}

function isApiHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0];
  return host === "api.hello-local.io" || host.startsWith("api.");
}

/** Rebase an absolute or path URL onto a preferred public origin (path + query preserved). */
export function rebasePublicUrl(url: string, origin: string): string {
  const base = origin.replace(/\/$/, "");
  const raw = String(url || "").trim();
  if (!raw) return base;
  if (raw.startsWith("/")) return `${base}${raw}`;
  try {
    const parsed = new URL(raw);
    return `${base}${parsed.pathname}${parsed.search}${parsed.hash}`.replace(/\/$/, "") || base;
  } catch {
    return `${base}/${raw.replace(/^\//, "")}`;
  }
}

/** Platform-host path for a region home: `/{lang}/{siteKey}`. */
export function siteHomePath(lang: string, siteKey: string): string {
  return `/${lang}/${siteKey}`;
}

/** Drop /:lang/:siteKey when the host already is that region, town, place, or collection. */
export function withoutOwnerPrefix(path: string, lang: string, siteKey: string): string {
  const prefix = `/${lang}/${siteKey}`;
  if (path === prefix) return `/${lang}`;
  if (path.startsWith(`${prefix}/`)) return `/${lang}${path.slice(prefix.length)}`;
  return path;
}

/** Place detail on the platform host (or under a region path prefix). */
export function placeDetailPath(lang: string, siteKey: string, slug: string): string {
  return `/${lang}/${siteKey}/${placePathSegment(lang)}/${slug}`;
}

/** Town directory. The map is townMapPath. Legacy telepules/town/gemeinde and lista redirect on the web. */
export function townDetailPath(lang: string, siteKey: string, slug: string): string {
  return `/${lang}/${siteKey}/${slug}`;
}

/** Town map view segment under the town directory. */
export function townMapPath(lang: string, siteKey: string, slug: string): string {
  return `/${lang}/${siteKey}/${slug}/${mapPathSegment(lang)}`;
}

/** Event detail path under a region. */
export function eventDetailPath(lang: string, siteKey: string, slug: string): string {
  return `/${lang}/${siteKey}/event/${slug}`;
}

/** Static page detail under a region. */
export function staticPagePath(lang: string, siteKey: string, slug: string): string {
  return `/${lang}/${siteKey}/static-page/${slug}`;
}

/** Static pages index under a region. */
export function staticPagesListPath(lang: string, siteKey: string): string {
  return `/${lang}/${siteKey}/static-pages`;
}

/** Product catalog under a region. */
export function productsPath(lang: string, siteKey: string): string {
  return `/${lang}/${siteKey}/products`;
}

/**
 * Legal page path for imprint/terms/privacy under a region.
 * @returns null when `key` is not a known legal page id
 */
export function legalPagePath(lang: string, siteKey: string, key: string): string | null {
  const map = pathSegmentsForLang(asPublicLang(lang));
  const segmentKey =
    key === "imprint"
      ? "legal.imprint"
      : key === "terms"
        ? "legal.terms"
        : key === "privacy"
          ? "legal.privacy"
          : null;
  if (!segmentKey) return null;
  return `/${lang}/${siteKey}/${map[segmentKey]}`;
}

/** Platform collection detail (not region-prefixed). */
export function collectionPath(lang: string, slug: string): string {
  return `/${lang}/collections/${slug}`;
}

/**
 * Platform marketing landing path (`/:lang`).
 * Legacy `/attekintes|overview|ueberblick` segments redirect here client-side.
 */
export function overviewPath(lang: string): string {
  return `/${asPublicLang(lang)}`;
}

/** Localized guide folder from the built-in dictionary (EN fallback). */
export function guidePathSegment(lang: string): string {
  return pathSegmentsForLang(asPublicLang(lang)).guide;
}

/** Platform guide article (`/:lang/{guide}/:slug`). */
export function platformGuidePath(lang: string, slug: string): string {
  const code = asPublicLang(lang);
  return `/${code}/${guidePathSegment(code)}/${slug}`;
}

/**
 * Which guide languages to list/allow on this public host.
 * hellolocal.hu and hellolocal.eu both expose every UiLanguage (language switcher
 * works on both). hello-local.io stays guide-free (app/product host).
 */
export function guideLangsForSitemapHost(origin: string, allLangs: readonly string[] = PUBLIC_LANGS): readonly string[] {
  const host = hostnameFromUrl(origin).replace(/^www\./, "");
  if (host === "hello-local.io") return [];
  if (host === "hellolocal.hu" || host === "hellolocal.eu") {
    return allLangs.length ? [...allLangs] : [...PUBLIC_LANGS];
  }
  return allLangs;
}

/** Platform region list path. */
export function regionListPath(lang: string): string {
  return `/${lang}/${regionListPathSegment(lang)}`;
}

/** Platform pricing path. */
export function platformPricingPath(lang: string): string {
  return `/${lang}/${pricingPathSegment(lang)}`;
}

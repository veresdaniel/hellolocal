// src/app/urls.ts
import { HAS_MULTIPLE_SITES } from "./config";
import type { Lang } from "./config";
import { placeEntityPath, regionListSegment, townEntityPath } from "./entityPaths";
import { getHostScope } from "./hostScope";
import { getPlatformOrigin, platformHostMatches } from "./platformOrigin";

type BuildArgs = {
  lang: Lang;
  /** Public region slug (Prisma Site). Param name kept for API compatibility. */
  siteKey?: string;
  path?: string; // pl. "hely/xyz" / "place/xyz"
};

const PLATFORM_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "hello-local.io",
  "www.hello-local.io",
  "api.hello-local.io",
  "beta.hello-local.io",
  "api.beta.hello-local.io",
  "devel.hello-local.io",
  "api.devel.hello-local.io",
]);

/**
 * Platform multi-tenant hosts (slug paths). Custom SiteDomain hosts are false.
 * Includes beta/devel — without this, DomainRedirect treats beta as a custom domain
 * and mis-routes `/` and `/:lang`.
 */
export function isPlatformHost(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0];
  if (!host || PLATFORM_HOSTS.has(host)) return true;
  if (host.endsWith(".hello-local.io")) return true;
  if (platformHostMatches(host)) return true;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function hostFromDomain(raw?: string | null): string | null {
  const domain = raw?.trim().replace(/^https?:\/\//, "").split("/")[0];
  return domain || null;
}

/** Custom domain when the region has one. Otherwise the slug path on this site. */
export function regionAddress({
  lang,
  slug,
  primaryDomain,
  path = "",
}: {
  lang: string;
  slug: string;
  primaryDomain?: string | null;
  path?: string;
}): string {
  const clean = path.replace(/^\//, "");
  const tail = clean ? `/${clean}` : "";
  const domain = hostFromDomain(primaryDomain);
  if (domain) {
    const root = `https://${domain}/${lang}${tail}`;
    return root.replace(/\/$/, "");
  }
  return buildUrl({ lang: lang as Lang, siteKey: slug, path });
}

/**
 * Public URL for a town or place. Prefer the entity's own customDomain (root of that host);
 * otherwise fall back to the region host or platform slug path.
 */
export function entityPublicAddress({
  lang,
  siteSlug,
  entityType,
  entitySlug,
  primaryDomain,
  customDomain,
}: {
  lang: string;
  siteSlug: string;
  entityType: "town" | "place";
  entitySlug: string;
  primaryDomain?: string | null;
  customDomain?: string | null;
}): string {
  const own = hostFromDomain(customDomain);
  if (own) return `https://${own}/${lang}`;
  const path =
    entityType === "town"
      ? townEntityPath(lang, entitySlug)
      : placeEntityPath(lang, entitySlug);
  return regionAddress({
    lang,
    slug: siteSlug,
    primaryDomain,
    path,
  });
}

function platformAbsolute(lang: string, siteKey: string, clean: string): string {
  const path = clean ? `/${lang}/${siteKey}/${clean}` : `/${lang}/${siteKey}`;
  if (typeof window === "undefined" || isPlatformHost(window.location.hostname)) return path;
  const origin = import.meta.env.DEV ? window.location.origin : getPlatformOrigin();
  return `${origin}${path}`;
}

export function buildUrl({ lang, siteKey, path = "" }: BuildArgs) {
  const clean = path.replace(/^\//, "").replace(/\/$/, "");
  const scope = getHostScope();
  if (scope.status === "ready" && scope.kind !== "platform") {
    if (scope.kind === "collection") {
      if (!siteKey) return `/${lang}`;
      return platformAbsolute(lang, siteKey, clean);
    }
    const sameRegion = !siteKey || siteKey === scope.siteSlug;
    if (!sameRegion && siteKey) return platformAbsolute(lang, siteKey, clean);
    let tail = clean;
    if (scope.kind === "town" && tail === townEntityPath(lang, scope.entitySlug)) tail = "";
    if (scope.kind === "place" && tail === placeEntityPath(lang, scope.entitySlug)) tail = "";
    if (scope.kind === "event" && tail === `event/${scope.entitySlug}`) tail = "";
    return tail ? `/${lang}/${tail}` : `/${lang}`;
  }
  const key = siteKey;
  if (HAS_MULTIPLE_SITES) {
    // If siteKey is not provided in multi-site mode, use lang-only URL
    // This is used for site list pages and other pages without site context
    if (!key) {
      return `/${lang}/${clean}`.replace(/\/$/, "");
    }
    return `/${lang}/${key}/${clean}`.replace(/\/$/, "");
  }
  return `/${lang}/${clean}`.replace(/\/$/, "");
}

/**
 * Builds a public URL for an entity based on its type and slug.
 * Path segments are language-specific (hely/place/ort, telepules/town/gemeinde, regiok/regions/regionen).
 *
 * @returns Public URL path (e.g., "/hu/etyek-budai/hely/borostyan-pince")
 */
export function buildPublicUrl({
  lang,
  siteKey,
  entityType,
  slug,
}: {
  lang: string;
  siteKey?: string;
  entityType: "place" | "event" | "town" | "page" | "region" | "placeType";
  slug: string;
}): string {
  const safeLang = lang as Lang;
  let path: string;
  switch (entityType) {
    case "place":
      path = placeEntityPath(safeLang, slug);
      break;
    case "town":
      path = townEntityPath(safeLang, slug);
      break;
    case "region":
      // Region list index (slug unused); language-specific list path
      path = regionListSegment(safeLang);
      break;
    case "page":
      path = `static-page/${slug}`;
      break;
    case "placeType":
      path = `place-type/${slug}`;
      break;
    case "event":
    default:
      path = `event/${slug}`;
      break;
  }
  return buildUrl({
    lang: safeLang,
    siteKey: entityType === "region" ? undefined : siteKey,
    path,
  });
}

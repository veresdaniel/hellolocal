/**
 * Client-side SEO head sync for SPA navigations (mirrors SSR applySocialMeta where possible).
 * Admin seo* fields win when provided by page builders; otherwise pages pass content cascade.
 * Hreflang is auto-generated from published languages — not an admin field.
 */
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Seo } from "../types/seo";
import {
  injectJsonLd,
  removeJsonLd,
  generateLocalBusinessSchema,
  generateEventSchema,
  generateArticleSchema,
  generateWebPageSchema,
  generateWebSiteSchema,
  generateOrganizationSchema,
  generateBreadcrumbListSchema,
  generateGraphSchema,
} from "./schemaOrg";
import { absoluteCanonical } from "./canonical";
import { applyHreflangAlternates } from "./hreflang";

/** Remove a meta tag by CSS selector (CSR cleanup between navigations). */
function removeMeta(sel: string) {
  document.head.querySelector(sel)?.remove();
}

/**
 * Upsert a meta tag; empty `content` removes a stale tag left by a previous route.
 * Mirrors SSR {@link applySocialMeta} empty-field behavior.
 */
function upsertMeta(sel: string, attrs: Record<string, string>, content?: string) {
  // Mirror SSR applySocialMeta: empty content removes stale tags from prior navigations.
  if (!content) {
    removeMeta(sel);
    return;
  }
  let el = document.head.querySelector<HTMLMetaElement>(sel);
  if (!el) {
    el = document.createElement("meta");
    Object.entries(attrs).forEach(([k, v]) => {
      if (el) el.setAttribute(k, v);
    });
    if (el) document.head.appendChild(el);
  }
  if (el) el.setAttribute("content", content);
}

/** Upsert `<link rel="…">`; missing href removes the link. */
function upsertLink(rel: string, href?: string) {
  const sel = `link[rel="${rel}"]`;
  if (!href) {
    document.head.querySelector(sel)?.remove();
    return;
  }
  let el = document.head.querySelector<HTMLLinkElement>(sel);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export type UseSeoOptions = {
  defaultOgType?: string;
  siteName?: string;
  /** Published language codes for automatic hreflang alternates. */
  languages?: readonly string[];
  /** Current page language (defaults to i18n language). */
  lang?: string;
  /** Default language for x-default (defaults to first published / hu). */
  defaultLang?: string;
};

/**
 * Client-side SEO meta sync.
 *
 * Title note: CSR sets `document.title` to `"${title} - ${siteName}"` for the browser tab.
 * SSR (`applySocialMeta`) and OG/Twitter titles use the bare `title` only — intentional
 * so share previews stay uncluttered while the tab stays branded.
 */
export function useSeo(seo?: Seo, opts?: UseSeoOptions) {
  const { t, i18n } = useTranslation();

  // Primitive fingerprints so inline seo / languages arrays do not thrash head tags every render.
  const languagesKey = opts?.languages?.join(",") ?? "";
  const keywordsKey = seo?.keywords?.join(",") ?? "";
  const schemaKey = seo?.schemaOrg ? JSON.stringify(seo.schemaOrg) : "";

  useEffect(() => {
    if (!seo) return;

    const siteName = opts?.siteName || t("common.siteName", { defaultValue: "" });
    const title = (seo.title || "").trim();
    const description = (seo.description || "").trim();

    if (title) {
      document.title = siteName ? `${title} - ${siteName}` : title;
    } else if (siteName) {
      document.title = siteName;
    }

    upsertMeta(`meta[name="description"]`, { name: "description" }, description || undefined);
    if (seo.keywords?.length) {
      upsertMeta(`meta[name="keywords"]`, { name: "keywords" }, seo.keywords.join(", "));
    } else {
      removeMeta(`meta[name="keywords"]`);
    }
    upsertMeta(`meta[name="robots"]`, { name: "robots" }, seo.robots || undefined);

    const canonical = seo.canonical || absoluteCanonical();
    upsertLink("canonical", canonical);

    const ogTitle = (seo.og?.title ?? title).trim();
    const ogDesc = (seo.og?.description ?? description).trim();
    const ogImg = seo.og?.image ?? seo.image;
    const ogType = seo.og?.type ?? opts?.defaultOgType ?? "website";
    const ogUrl = canonical;

    upsertMeta(`meta[property="og:title"]`, { property: "og:title" }, ogTitle || undefined);
    upsertMeta(
      `meta[property="og:description"]`,
      { property: "og:description" },
      ogDesc || undefined
    );
    upsertMeta(`meta[property="og:type"]`, { property: "og:type" }, ogType);
    upsertMeta(`meta[property="og:url"]`, { property: "og:url" }, ogUrl);
    upsertMeta(
      `meta[property="og:site_name"]`,
      { property: "og:site_name" },
      siteName || undefined
    );
    upsertMeta(`meta[property="og:image"]`, { property: "og:image" }, ogImg || undefined);

    const card = seo.twitter?.card ?? (ogImg ? "summary_large_image" : "summary");
    upsertMeta(`meta[name="twitter:card"]`, { name: "twitter:card" }, card);
    upsertMeta(
      `meta[name="twitter:title"]`,
      { name: "twitter:title" },
      (seo.twitter?.title ?? ogTitle) || undefined
    );
    upsertMeta(
      `meta[name="twitter:description"]`,
      { name: "twitter:description" },
      (seo.twitter?.description ?? ogDesc) || undefined
    );
    const twImg = seo.twitter?.image ?? ogImg;
    upsertMeta(`meta[name="twitter:image"]`, { name: "twitter:image" }, twImg || undefined);

    if (seo.schemaOrg) {
      let schema: object | null = null;
      switch (seo.schemaOrg.type) {
        case "LocalBusiness":
          schema = generateLocalBusinessSchema(seo.schemaOrg.data, "LocalBusiness");
          break;
        case "TouristAttraction":
          schema = generateLocalBusinessSchema(seo.schemaOrg.data, "TouristAttraction");
          break;
        case "Event":
          schema = generateEventSchema(seo.schemaOrg.data);
          break;
        case "Article":
          schema = generateArticleSchema(seo.schemaOrg.data);
          break;
        case "WebPage":
          schema = generateWebPageSchema(seo.schemaOrg.data);
          break;
        case "WebSite":
          schema = generateWebSiteSchema(seo.schemaOrg.data);
          break;
        case "Organization":
          schema = generateOrganizationSchema(seo.schemaOrg.data);
          break;
        case "BreadcrumbList":
          schema = generateBreadcrumbListSchema(seo.schemaOrg.data);
          break;
        case "Graph":
          schema = generateGraphSchema(
            Array.isArray(seo.schemaOrg.data) ? seo.schemaOrg.data : seo.schemaOrg.data?.nodes || []
          );
          break;
        default:
          schema = null;
      }
      if (schema) injectJsonLd(schema);
    } else {
      removeJsonLd();
    }

    let clearHreflang: (() => void) | undefined;
    if (opts?.languages?.length) {
      clearHreflang = applyHreflangAlternates({
        languages: opts.languages,
        currentLang: opts.lang || i18n.language || "hu",
        defaultLang: opts.defaultLang,
        origin: typeof window !== "undefined" ? window.location.origin : undefined,
        pathname: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
    }

    return () => {
      removeJsonLd();
      clearHreflang?.();
    };
  }, [
    seo?.title,
    seo?.description,
    seo?.image,
    seo?.canonical,
    seo?.robots,
    seo?.og?.title,
    seo?.og?.description,
    seo?.og?.image,
    seo?.og?.type,
    seo?.twitter?.card,
    seo?.twitter?.title,
    seo?.twitter?.description,
    seo?.twitter?.image,
    keywordsKey,
    schemaKey,
    opts?.defaultOgType,
    opts?.siteName,
    languagesKey,
    opts?.lang,
    opts?.defaultLang,
    i18n.language,
    t,
  ]);
}

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Seo } from "../types/seo";
import { injectJsonLd, generateLocalBusinessSchema, generateEventSchema, generateArticleSchema, generateWebPageSchema, generateWebSiteSchema } from "./schemaOrg";

function upsertMeta(sel: string, attrs: Record<string, string>, content?: string) {
  if (!content) return;
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

function upsertLink(rel: string, href?: string) {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function useSeo(seo?: Seo, opts?: { defaultOgType?: string; siteName?: string }) {
  const { t } = useTranslation();
  
  useEffect(() => {
    if (!seo) return;

    // Get site name from i18n or use provided siteName or default
    const siteName = opts?.siteName || t("common.siteName", { defaultValue: "" });
    const fullTitle = seo.title ? `${seo.title} - ${siteName}` : siteName;
    
    document.title = fullTitle;

    upsertMeta(`meta[name="description"]`, { name: "description" }, seo.description);
    if (seo.keywords?.length) {
      upsertMeta(`meta[name="keywords"]`, { name: "keywords" }, seo.keywords.join(", "));
    }
    if (seo.robots) upsertMeta(`meta[name="robots"]`, { name: "robots" }, seo.robots);

    if (seo.canonical) upsertLink("canonical", seo.canonical);

    // OG defaults
    const ogTitle = seo.og?.title ?? seo.title;
    const ogDesc = seo.og?.description ?? seo.description;
    const ogImg = seo.og?.image ?? seo.image;
    const ogType = seo.og?.type ?? opts?.defaultOgType ?? "website";
    const ogUrl = seo.canonical || window.location.href;

    upsertMeta(`meta[property="og:title"]`, { property: "og:title" }, ogTitle);
    upsertMeta(`meta[property="og:description"]`, { property: "og:description" }, ogDesc);
    upsertMeta(`meta[property="og:type"]`, { property: "og:type" }, ogType);
    upsertMeta(`meta[property="og:url"]`, { property: "og:url" }, ogUrl);
    if (siteName) upsertMeta(`meta[property="og:site_name"]`, { property: "og:site_name" }, siteName);
    if (ogImg) upsertMeta(`meta[property="og:image"]`, { property: "og:image" }, ogImg);

    // Twitter defaults
    const card = seo.twitter?.card ?? (ogImg ? "summary_large_image" : "summary");
    upsertMeta(`meta[name="twitter:card"]`, { name: "twitter:card" }, card);
    upsertMeta(`meta[name="twitter:title"]`, { name: "twitter:title" }, seo.twitter?.title ?? ogTitle);
    upsertMeta(
      `meta[name="twitter:description"]`,
      { name: "twitter:description" },
      seo.twitter?.description ?? ogDesc
    );
    const twImg = seo.twitter?.image ?? ogImg;
    if (twImg) upsertMeta(`meta[name="twitter:image"]`, { name: "twitter:image" }, twImg);

    // Inject Schema.org JSON-LD if provided
    if (seo.schemaOrg) {
      let schema: any;
      switch (seo.schemaOrg.type) {
        case "LocalBusiness":
          schema = generateLocalBusinessSchema(seo.schemaOrg.data);
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
        default:
          return;
      }
      injectJsonLd(schema);
    }
  }, [seo, opts?.defaultOgType, opts?.siteName, t]);
}

import { useEffect } from "react";
import type { Seo } from "../types/seo";

function upsertMeta(sel: string, attrs: Record<string, string>, content?: string) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(sel);
  if (!el) {
    el = document.createElement("meta");
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
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

export function useSeo(seo?: Seo, opts?: { defaultOgType?: string }) {
  useEffect(() => {
    if (!seo) return;

    document.title = seo.title;

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

    upsertMeta(`meta[property="og:title"]`, { property: "og:title" }, ogTitle);
    upsertMeta(`meta[property="og:description"]`, { property: "og:description" }, ogDesc);
    upsertMeta(`meta[property="og:type"]`, { property: "og:type" }, ogType);
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
  }, [seo, opts?.defaultOgType]);
}

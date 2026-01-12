// src/app/useRouteCtx.ts
import { useParams } from "react-router-dom";
import { APP_LANGS, DEFAULT_LANG, DEFAULT_SITE_SLUG, HAS_MULTIPLE_SITES, type Lang } from "./config";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function useRouteCtx() {
  const { lang: langParam, siteKey: siteKeyParam } = useParams<{
    lang?: string;
    siteKey?: string;
  }>();

  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;

  // multi-site-nál siteKey kötelező a site layout alatt
  // itt fallback maradhat, de tipikusan SiteLayout-on belül amúgy is adott lesz
  const siteKey = HAS_MULTIPLE_SITES
    ? (siteKeyParam ?? DEFAULT_SITE_SLUG)
    : DEFAULT_SITE_SLUG;

  return { lang, siteKey, langParam, siteKeyParam };
}

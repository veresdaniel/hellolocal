// src/app/useRouteCtx.ts
import { useParams } from "react-router-dom";
import { DEFAULT_LANG, DEFAULT_SITE_SLUG, HAS_MULTIPLE_SITES, type Lang, isLang } from "./config";
import { useHostScope } from "./hostScope";


export function useRouteCtx() {
  const { lang: langParam, siteKey: siteKeyParam } = useParams<{
    lang?: string;
    siteKey?: string;
  }>();
  const scope = useHostScope();

  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  const hostSlug =
    scope.status === "ready" && scope.kind !== "platform" && scope.kind !== "collection"
      ? scope.siteSlug
      : undefined;

  // On a custom host the region slug is not in the path; the host supplies it.
  const siteKey = HAS_MULTIPLE_SITES
    ? (siteKeyParam ?? hostSlug ?? DEFAULT_SITE_SLUG)
    : DEFAULT_SITE_SLUG;

  return { lang, siteKey, langParam, siteKeyParam };
}

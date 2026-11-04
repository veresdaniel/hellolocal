import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resolveSlug } from "../api/resolve.api";
import {
  getCollectionByDomain,
  getCollectionBySlug,
  getEventById,
  getPlaceById,
  getPublicTowns,
} from "../api/places.api";
import { usePlatformSettingsContextOptional } from "../context/PlatformSettingsContext";
import {
  collectionSlugFromPath,
  eventSlugFromPath,
  placeSlugFromPath,
  townEntityPath,
  townSlugFromPath,
} from "./entityPaths";
import { useHostScope } from "./hostScope";
import { useRouteCtx } from "./useRouteCtx";
import { buildUrl } from "./urls";

export type ViewCrumb = { label: string; to?: string };

/** Name of whatever the visitor is looking at: event, place, curator list, town, or region. */
export function useViewTitle(): string {
  return useViewHeading().title;
}

/**
 * On a place or event page, the header trail is the town (or the region)
 * and then the page name. The page name has no link.
 */
export function useViewHeading(): { title: string; crumbs: ViewCrumb[] | null } {
  const { t } = useTranslation();
  const { lang, siteKey } = useRouteCtx();
  const location = useLocation();
  const hostScope = useHostScope();
  const platformSettings = usePlatformSettingsContextOptional();
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";

  const pathEvent = eventSlugFromPath(location.pathname);
  const pathPlace = placeSlugFromPath(location.pathname);
  const pathCollection = collectionSlugFromPath(location.pathname);
  const hostReady = hostScope.status === "ready";
  const eventSlug =
    pathEvent ||
    (!pathPlace && !pathCollection && hostReady && hostScope.kind === "event"
      ? hostScope.entitySlug
      : "");
  const placeSlug =
    pathPlace ||
    (!pathEvent && !pathCollection && hostReady && hostScope.kind === "place"
      ? hostScope.entitySlug
      : "");
  const entitySlug = eventSlug || placeSlug;
  const townSlug =
    !entitySlug && !pathCollection
      ? townSlugFromPath(location.pathname, hostReady ? hostScope : undefined) ||
        (hostReady && hostScope.kind === "town" ? hostScope.entitySlug : "")
      : "";
  const domainCollection = hostReady && hostScope.kind === "collection";
  const collectionSlug =
    pathCollection ||
    (!entitySlug && hostReady && hostScope.kind === "collection" ? hostScope.slug : "");

  const towns = useQuery({
    queryKey: ["publicTowns", lang, siteKey],
    queryFn: () => getPublicTowns(lang, siteKey || "default"),
    enabled: !!townSlug && !collectionSlug,
    staleTime: 5 * 60 * 1000,
  });

  const resolved = useQuery({
    queryKey: ["resolve", lang, siteKey, entitySlug],
    queryFn: () => resolveSlug({ lang, siteKey: siteKey || "", slug: entitySlug }),
    enabled: !!entitySlug && !!lang && !!siteKey,
    staleTime: 60_000,
  });
  const resolvedId = resolved.data?.entityId;
  const resolvedType = resolved.data?.entityType;

  const place = useQuery({
    queryKey: ["place", resolvedId, lang, siteKey],
    queryFn: () => getPlaceById(lang, siteKey || "", resolvedId || ""),
    enabled: resolvedType === "place" && !!resolvedId && !!lang && !!siteKey,
    staleTime: 60_000,
  });

  const event = useQuery({
    queryKey: ["event", resolvedId, lang, siteKey],
    queryFn: () => getEventById(lang, siteKey || "", resolvedId || ""),
    enabled: resolvedType === "event" && !!resolvedId && !!lang && !!siteKey,
    staleTime: 60_000,
  });

  const collection = useQuery({
    queryKey: ["collection", lang, pathCollection || undefined, hostname],
    queryFn: () =>
      domainCollection && !pathCollection
        ? getCollectionByDomain(hostname, lang)
        : getCollectionBySlug(collectionSlug, lang),
    enabled: !!collectionSlug,
    staleTime: 5 * 60 * 1000,
  });

  const detailTownSlug =
    (placeSlug && place.data?.townSlug) || (eventSlug && event.data?.townSlug) || "";
  const detailTownName =
    (placeSlug && place.data?.townName) || (eventSlug && event.data?.townName) || "";
  const detailTowns = useQuery({
    queryKey: ["publicTowns", lang, siteKey],
    queryFn: () => getPublicTowns(lang, siteKey || "default"),
    enabled: !!detailTownSlug && !detailTownName,
    staleTime: 5 * 60 * 1000,
  });

  const regionName =
    platformSettings?.site.name || t("common.siteName", { defaultValue: "" });
  const named = (title: string) => ({ title, crumbs: null as ViewCrumb[] | null });

  const trail = (pageName: string): { title: string; crumbs: ViewCrumb[] | null } => {
    if (!pageName) return named("");
    const listed =
      detailTownSlug &&
      (towns.data ?? detailTowns.data)?.towns.find((item) => item.slug === detailTownSlug)?.name;
    const townLabel = detailTownName || listed || "";
    if (detailTownSlug && !townLabel && (detailTowns.isPending || towns.isPending)) {
      return named("");
    }
    const parent: ViewCrumb | null =
      detailTownSlug && townLabel
        ? {
            label: townLabel,
            to: buildUrl({
              lang,
              siteKey: siteKey || undefined,
              path: townEntityPath(lang, detailTownSlug),
            }),
          }
        : regionName
          ? {
              label: regionName,
              to: buildUrl({ lang, siteKey: siteKey || undefined, path: "" }),
            }
          : null;
    if (!parent) return { title: pageName, crumbs: [{ label: pageName }] };
    return { title: pageName, crumbs: [parent, { label: pageName }] };
  };

  if (eventSlug) {
    if (resolvedType === "event" && event.data?.name) return trail(event.data.name);
    if (resolved.isError || event.isError || (resolved.data && resolvedType !== "event")) {
      return named(regionName);
    }
    return named("");
  }

  if (placeSlug) {
    if (resolvedType === "place" && place.data?.name) return trail(place.data.name);
    if (resolved.isError || place.isError || (resolved.data && resolvedType !== "place")) {
      return named(regionName);
    }
    return named("");
  }

  if (collectionSlug) {
    if (collection.data?.title) return named(collection.data.title);
    if (collection.isPending) return named("");
    return named(regionName);
  }

  if (townSlug) {
    const town = towns.data?.towns.find((item) => item.slug === townSlug);
    if (town?.name) return named(town.name);
    if (towns.isPending) return named("");
    return named(regionName);
  }

  return named(regionName);
}

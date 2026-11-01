import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { getPlaces, getTowns } from "../api/admin.api";
import { AuthContext } from "../contexts/AuthContext";
import { useAdminSite } from "../contexts/useAdminSite";
import type { Lang } from "../types/enums";
import { findTranslation, getHuTranslation } from "../utils/langHelpers";
import { isSuperadmin } from "../utils/roleHelpers";

export type HierarchyFilterOption = {
  id: string;
  label: string;
  townId?: string | null;
};

export type UseAdminHierarchyFiltersOptions = {
  /** Keep townId/placeId in the URL (default true). */
  syncUrl?: boolean;
  showSite?: boolean;
  showTown?: boolean;
  showPlace?: boolean;
};

export type UseAdminHierarchyFiltersResult = {
  siteId: string | null;
  townId: string;
  placeId: string;
  setSiteId: (siteId: string) => void;
  setTownId: (townId: string) => void;
  setPlaceId: (placeId: string) => void;
  clearFilters: () => void;
  siteOptions: HierarchyFilterOption[];
  townOptions: HierarchyFilterOption[];
  /** Places for the current town filter (or all when no town). */
  placeOptions: HierarchyFilterOption[];
  /** All places for the site (unfiltered by town) — for forms. */
  allPlaceOptions: HierarchyFilterOption[];
  /** Place ids belonging to the selected town (all places if no town). */
  matchingPlaceIds: string[];
  showSite: boolean;
  showTown: boolean;
  showPlace: boolean;
  /** Superadmin can clear Régió (header / filter); region-bound users cannot. */
  canPickSite: boolean;
  isLoadingOptions: boolean;
  filtersActive: boolean;
};

type NamedEntity = {
  id: string;
  name?: string;
  townId?: string | null;
  translations?: Array<{ lang: string; name: string }>;
};

function entityLabel(entity: NamedEntity, lang: Lang): string {
  const translations = (entity.translations || []) as Array<{ lang: Lang; name: string }>;
  return (
    findTranslation(translations, lang)?.name ||
    getHuTranslation(translations)?.name ||
    translations[0]?.name ||
    entity.name ||
    entity.id
  );
}

/**
 * Shared Site → Town → Place filter state for admin list pages.
 * Site syncs with the global admin site selector; town/place optionally sync to URL.
 */
export function useAdminHierarchyFilters(
  options: UseAdminHierarchyFiltersOptions = {}
): UseAdminHierarchyFiltersResult {
  const {
    syncUrl = true,
    showSite = true,
    showTown = true,
    showPlace = true,
  } = options;

  const { i18n } = useTranslation();
  const contentLang = (i18n.language || "hu").split("-")[0] as Lang;
  const authContext = useContext(AuthContext);
  const canPickSite = authContext?.user?.role
    ? isSuperadmin(authContext.user.role)
    : false;
  const { selectedSiteId, sites, setSelectedSiteId } = useAdminSite();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTownId = syncUrl ? searchParams.get("townId")?.trim() || "" : "";
  const urlPlaceId = syncUrl ? searchParams.get("placeId")?.trim() || "" : "";

  const [townId, setTownIdState] = useState(urlTownId);
  const [placeId, setPlaceIdState] = useState(urlPlaceId);
  const [townsRaw, setTownsRaw] = useState<NamedEntity[]>([]);
  const [placesRaw, setPlacesRaw] = useState<NamedEntity[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    if (syncUrl) {
      setTownIdState(urlTownId);
      setPlaceIdState(urlPlaceId);
    }
  }, [syncUrl, urlTownId, urlPlaceId]);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      if (!selectedSiteId) {
        setTownsRaw([]);
        setPlacesRaw([]);
        return;
      }
      setIsLoadingOptions(true);
      try {
        const [townsResponse, placesResponse] = await Promise.all([
          getTowns(selectedSiteId, 1, 500),
          getPlaces(selectedSiteId, 1, 500),
        ]);
        if (cancelled) return;
        const towns = Array.isArray(townsResponse)
          ? townsResponse
          : townsResponse?.towns || [];
        const places = Array.isArray(placesResponse)
          ? placesResponse
          : placesResponse?.places || [];
        setTownsRaw(towns);
        setPlacesRaw(places);
      } catch {
        if (!cancelled) {
          setTownsRaw([]);
          setPlacesRaw([]);
        }
      } finally {
        if (!cancelled) setIsLoadingOptions(false);
      }
    }
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [selectedSiteId]);

  const patchUrl = useCallback(
    (nextTownId: string, nextPlaceId: string) => {
      if (!syncUrl) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextTownId) next.set("townId", nextTownId);
          else next.delete("townId");
          if (nextPlaceId) next.set("placeId", nextPlaceId);
          else next.delete("placeId");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, syncUrl]
  );

  // When deep-linked with placeId only, derive town from the place and sync the URL.
  useEffect(() => {
    if (!placeId || townId || placesRaw.length === 0) return;
    const place = placesRaw.find((row) => row.id === placeId);
    if (place?.townId) {
      setTownIdState(place.townId);
      patchUrl(place.townId, placeId);
    }
  }, [placeId, townId, placesRaw, patchUrl]);

  const setSiteId = useCallback(
    (nextSiteId: string) => {
      if (!nextSiteId) {
        if (!canPickSite) return;
        setSelectedSiteId(null);
      } else {
        setSelectedSiteId(nextSiteId);
      }
      setTownIdState("");
      setPlaceIdState("");
      patchUrl("", "");
    },
    [canPickSite, patchUrl, setSelectedSiteId]
  );

  const setTownId = useCallback(
    (nextTownId: string) => {
      setTownIdState(nextTownId);
      // Clear place when town changes (unless place still belongs to the new town).
      // Resolve next place outside the setState updater so patchUrl is not impure/StrictMode-doubled.
      let nextPlaceId = placeId;
      if (placeId && nextTownId) {
        const place = placesRaw.find((row) => row.id === placeId);
        if (!place || place.townId !== nextTownId) nextPlaceId = "";
      } else if (!placeId) {
        nextPlaceId = "";
      }
      // Keep place when clearing town filter.
      if (!nextTownId && placeId) nextPlaceId = placeId;
      if (nextPlaceId !== placeId) setPlaceIdState(nextPlaceId);
      patchUrl(nextTownId, nextPlaceId);
    },
    [patchUrl, placesRaw, placeId]
  );

  const setPlaceId = useCallback(
    (nextPlaceId: string) => {
      setPlaceIdState(nextPlaceId);
      if (nextPlaceId) {
        const place = placesRaw.find((row) => row.id === nextPlaceId);
        const nextTownId = place?.townId || townId;
        if (nextTownId && nextTownId !== townId) {
          setTownIdState(nextTownId);
        }
        patchUrl(nextTownId || townId, nextPlaceId);
      } else {
        patchUrl(townId, "");
      }
    },
    [patchUrl, placesRaw, townId]
  );

  const clearFilters = useCallback(() => {
    setTownIdState("");
    setPlaceIdState("");
    patchUrl("", "");
  }, [patchUrl]);

  const siteOptions = useMemo<HierarchyFilterOption[]>(
    () =>
      sites.map((site) => {
        const translations = site.translations as Array<{ lang: Lang; name: string }>;
        return {
          id: site.id,
          label:
            getHuTranslation(translations)?.name ||
            translations[0]?.name ||
            site.slug ||
            site.id,
        };
      }),
    [sites]
  );

  const townOptions = useMemo<HierarchyFilterOption[]>(
    () =>
      townsRaw.map((town) => ({
        id: town.id,
        label: entityLabel(town, contentLang),
      })),
    [townsRaw, contentLang]
  );

  const allPlaceOptions = useMemo<HierarchyFilterOption[]>(
    () =>
      placesRaw.map((place) => ({
        id: place.id,
        label: entityLabel(place, contentLang),
        townId: place.townId,
      })),
    [placesRaw, contentLang]
  );

  const placeOptions = useMemo<HierarchyFilterOption[]>(() => {
    if (!townId) return allPlaceOptions;
    return allPlaceOptions.filter((place) => place.townId === townId);
  }, [allPlaceOptions, townId]);

  const matchingPlaceIds = useMemo(() => {
    if (placeId) return [placeId];
    if (townId) {
      return placesRaw
        .filter((place) => place.townId === townId)
        .map((place) => place.id);
    }
    return placesRaw.map((place) => place.id);
  }, [placeId, townId, placesRaw]);

  return {
    siteId: selectedSiteId,
    townId,
    placeId,
    setSiteId,
    setTownId,
    setPlaceId,
    clearFilters,
    siteOptions,
    townOptions,
    placeOptions,
    allPlaceOptions,
    matchingPlaceIds,
    showSite,
    showTown,
    showPlace,
    canPickSite,
    isLoadingOptions,
    filtersActive: Boolean(townId || placeId),
  };
}

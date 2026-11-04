// src/components/PlacesListView.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouteCtx } from "../app/useRouteCtx";
import { useViewTitle } from "../app/viewTitle";
import { getPlaces, getEvents, type Event, getPlatformSettings } from "../api/places.api";
import type { Place } from "../types/place";
import { PlaceCard } from "../ui/place/PlaceCard";
import { EventGridCard } from "../ui/event/EventGridCard";
import "../styles/list-card.css";
import { MapFilters } from "./MapFilters";
import { FloatingHeader } from "./FloatingHeader";
import { HAS_MULTIPLE_SITES } from "../app/config";
import { PublicCardSkeletonGrid } from "./PublicSkeleton";
import { EmptyResults } from "./EmptyResults";
import { SafeHtml } from "./SafeHtml";
import { useFiltersStore } from "../stores/useFiltersStore";
import { hasVisibleHtml } from "../utils/hasVisibleHtml";
import { sanitizeImageUrl } from "../utils/urlValidation";

interface PlacesListViewProps {
  onMapViewClick: () => void;
  selectedCategories?: string[];
  selectedPriceBands?: string[];
  onCategoriesChange?: (categories: string[]) => void;
  onPriceBandsChange?: (priceBands: string[]) => void;
  isOpenNow?: boolean;
  hasEventToday?: boolean;
  within30Minutes?: boolean;
  rainSafe?: boolean;
  onOpenNowChange?: (value: boolean) => void;
  onHasEventTodayChange?: (value: boolean) => void;
  onWithin30MinutesChange?: (value: boolean) => void;
  onRainSafeChange?: (value: boolean) => void;
}

const ITEMS_PER_PAGE = 12;

export function PlacesListView({
  onMapViewClick,
  selectedCategories: propSelectedCategories,
  selectedPriceBands: propSelectedPriceBands,
  onCategoriesChange: propOnCategoriesChange,
  onPriceBandsChange: propOnPriceBandsChange,
  isOpenNow: propIsOpenNow,
  hasEventToday: propHasEventToday,
  within30Minutes: propWithin30Minutes,
  rainSafe: propRainSafe,
  onOpenNowChange: propOnOpenNowChange,
  onHasEventTodayChange: propOnHasEventTodayChange,
  onWithin30MinutesChange: propOnWithin30MinutesChange,
  onRainSafeChange: propOnRainSafeChange,
}: PlacesListViewProps) {
  const { t } = useTranslation();
  const { lang, siteKey } = useRouteCtx();
  const viewTitle = useViewTitle();

  const storeFilters = useFiltersStore();
  const selectedCategories = propSelectedCategories ?? storeFilters.selectedCategories;
  const selectedPriceBands = propSelectedPriceBands ?? storeFilters.selectedPriceBands;
  const isOpenNow = propIsOpenNow ?? storeFilters.isOpenNow;
  const hasEventToday = propHasEventToday ?? storeFilters.hasEventToday;
  const within30Minutes = propWithin30Minutes ?? storeFilters.within30Minutes;
  const rainSafe = propRainSafe ?? storeFilters.rainSafe;
  const userLocation = storeFilters.userLocation;

  const setSelectedCategories = propOnCategoriesChange ?? storeFilters.setSelectedCategories;
  const setSelectedPriceBands = propOnPriceBandsChange ?? storeFilters.setSelectedPriceBands;
  const setIsOpenNow = propOnOpenNowChange ?? storeFilters.setIsOpenNow;
  const setHasEventToday = propOnHasEventTodayChange ?? storeFilters.setHasEventToday;
  const setWithin30Minutes = propOnWithin30MinutesChange ?? storeFilters.setWithin30Minutes;
  const setRainSafe = propOnRainSafeChange ?? storeFilters.setRainSafe;

  const [searchQuery, setSearchQuery] = useState("");
  const [section, setSection] = useState<"places" | "services" | "events" | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch places with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    // error, // unused for now
  } = useInfiniteQuery({
    queryKey: ["places", lang, siteKey, selectedCategories, selectedPriceBands, searchQuery, section],
    queryFn: async ({ pageParam = 0 }) => {
      // Note: getPlaces now accepts arrays for OR logic filtering
      const categoryParam = selectedCategories.length > 0 ? selectedCategories : undefined;
      const priceBandParam = selectedPriceBands.length > 0 ? selectedPriceBands : undefined;

      const places = await getPlaces(
        lang,
        siteKey,
        categoryParam,
        priceBandParam,
        searchQuery || undefined,
        ITEMS_PER_PAGE,
        pageParam as number,
        section === "services" ? "service" : "place"
      );

      return {
        places,
        nextOffset:
          places.length === ITEMS_PER_PAGE ? (pageParam as number) + ITEMS_PER_PAGE : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
  });

  const allPlaces = data?.pages.flatMap((page) => page.places) ?? [];

  // Fetch events for context-based filters
  const { data: eventsData = [] } = useQuery({
    queryKey: ["events", lang, siteKey],
    queryFn: () => getEvents(lang, siteKey ?? "", undefined, undefined, 100, 0),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch site settings for placeholder image (shares cache with SiteLayout)
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", lang, siteKey],
    queryFn: ({ signal }) => getPlatformSettings(lang, siteKey, { signal }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get user location for "within30Minutes" filter
  useEffect(() => {
    if (within30Minutes && navigator.geolocation && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          storeFilters.setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Geolocation error:", error);
        }
      );
    }
  }, [within30Minutes, userLocation, storeFilters]);

  // Helper function to calculate distance in km using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper function to check if place is open now
  const isPlaceOpenNow = (place: Place): boolean => {
    if (!place.openingHours || place.openingHours.length === 0) return false;

    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // Convert Sunday (0) to last (6), Monday (1) to 0, etc.
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Find today's opening hours
    const todayHours = place.openingHours.find((oh) => oh.dayOfWeek === currentDayOfWeek);

    if (!todayHours) return false;
    if (todayHours.isClosed) return false;
    if (!todayHours.openTime || !todayHours.closeTime) return false;

    // Check if current time is between open and close time
    return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
  };

  // Helper function to check if place has event today
  const hasEventTodayForPlace = (placeId: string | null | undefined): boolean => {
    if (!eventsData || !placeId) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return eventsData.some((event) => {
      if (event.placeId !== placeId) return false;
      const eventStart = new Date(event.startDate);
      const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
      return eventStart < tomorrow && eventEnd >= today;
    });
  };

  // Helper function to check if place is within 10 minutes walking distance (~1 km)
  const isWithin10MinutesWalk = (place: Place): boolean => {
    if (!within30Minutes || !userLocation || !place.location) return false;
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      place.location.lat,
      place.location.lng
    );
    return distance <= 1; // 1 km ≈ 10 minutes walking at average pace
  };

  // Helper function to check if place is rain-safe
  // A place is rain-safe if it has at least one event today that is rain-safe
  const isRainSafe = (place: Place): boolean => {
    if (!rainSafe || !eventsData || !place.id) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if place has a rain-safe event today
    return eventsData.some((event) => {
      if (event.placeId !== place.id) return false;
      if (!event.isRainSafe) return false;

      const eventStart = new Date(event.startDate);
      const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
      return eventStart < tomorrow && eventEnd >= today;
    });
  };

  // Filter places based on context filters. Category/price are also applied
  // client-side so a stale page cache cannot mix other categories into the list.
  const places = useMemo(() => {
    const categorySet = new Set(selectedCategories.map((name) => name.toLowerCase()));
    const priceSet = new Set(selectedPriceBands.map((id) => id.toLowerCase()));
    return allPlaces.filter((place) => {
      if (
        section !== "services" &&
        categorySet.size > 0 &&
        !categorySet.has((place.category || "").toLowerCase())
      ) {
        return false;
      }
      if (priceSet.size > 0) {
        const priceId = (place.priceBandId || place.priceBand || "").toLowerCase();
        if (!priceSet.has(priceId)) return false;
      }
      if (isOpenNow && !isPlaceOpenNow(place)) return false;
      if (hasEventToday && !hasEventTodayForPlace(place.id)) return false;
      if (within30Minutes && !isWithin10MinutesWalk(place)) return false;
      if (rainSafe && !isRainSafe(place)) return false;
      return true;
    });
  }, [
    allPlaces,
    section,
    selectedCategories,
    selectedPriceBands,
    isOpenNow,
    hasEventToday,
    within30Minutes,
    rainSafe,
    userLocation,
    eventsData,
  ]);

  // Fetch events (filtered and deduplicated)
  const events = useMemo(() => {
    const now = new Date();
    const filtered = eventsData.filter((event) => {
      if (event.endDate) {
        return new Date(event.endDate) >= now;
      }
      return new Date(event.startDate) >= now;
    });

    // Deduplicate events by ID and slug (in case backend returns duplicates with/without slugs)
    // Prefer events with valid slugs (slug !== id) over those without
    const seenById = new Map<string, Event>();
    const seenBySlug = new Map<string, Event>(); // Also track by slug to catch duplicates with different IDs

    filtered.forEach((event) => {
      const hasValidSlug = event.slug && event.slug !== event.id;

      // Check for duplicate by ID
      const existingById = seenById.get(event.id);
      if (existingById) {
        // Duplicate ID found - prefer the one with a valid slug
        const existingHasValidSlug = existingById.slug && existingById.slug !== existingById.id;

        if (hasValidSlug && !existingHasValidSlug) {
          // Current event has valid slug, existing doesn't - replace
          seenById.set(event.id, event);
          if (hasValidSlug) {
            seenBySlug.set(event.slug, event);
          }
        }
        // Otherwise keep existing (do nothing)
        return; // Skip this duplicate
      }

      // Check for duplicate by slug (if valid slug)
      if (hasValidSlug) {
        const existingBySlug = seenBySlug.get(event.slug);
        if (existingBySlug) {
          // Same slug but different ID - prefer the one with valid slug over ID fallback
          const existingHasValidSlug =
            existingBySlug.slug && existingBySlug.slug !== existingBySlug.id;
          if (hasValidSlug && !existingHasValidSlug) {
            // Current has valid slug, existing doesn't - replace
            seenById.delete(existingBySlug.id);
            seenById.set(event.id, event);
            seenBySlug.set(event.slug, event);
          }
          // Otherwise keep existing (do nothing)
          return; // Skip this duplicate
        }
      }

      // New event - add it
      seenById.set(event.id, event);
      if (hasValidSlug) {
        seenBySlug.set(event.slug, event);
      }
    });

    return Array.from(seenById.values());
  }, [eventsData]);

  // Combine places and events, sort by date (pinned events first, then by start date)
  const combinedItems = useMemo(() => {
    // Additional deduplication check - ensure no duplicate events by ID
    const eventIds = new Set<string>();
    const uniqueEvents = events.filter((event) => {
      if (eventIds.has(event.id)) {
        return false; // Skip duplicate
      }
      eventIds.add(event.id);
      return true;
    });

    const pinnedEvents = uniqueEvents.filter((e) => e.isPinned);
    const regularEvents = uniqueEvents.filter((e) => !e.isPinned);
    const eventItems = [
      ...pinnedEvents.map((event) => ({
        type: "event" as const,
        data: event,
        sortDate: new Date(event.startDate),
      })),
      ...regularEvents.map((event) => ({
        type: "event" as const,
        data: event,
        sortDate: new Date(event.startDate),
      })),
    ];
    if (section === "events") return eventItems;

    // Use a fixed date for places (far in the past) so events are sorted by date and appear first
    const placesDefaultDate = new Date(2000, 0, 1);
    const visiblePlaces = places.filter((place) =>
      section === "services" ? place.categoryKind === "service" : (place.categoryKind ?? "place") !== "service"
    );
    // A place category (for example Szállás) is a place filter. Events stay on the
    // unfiltered places list and on the events tab, and must not be merged back in.
    if (section != null || selectedCategories.length > 0) {
      return visiblePlaces.map((place) => ({
        type: "place" as const,
        data: place,
        sortDate: placesDefaultDate,
      }));
    }

    // Create a combined array with type information
    const items: Array<{ type: "place" | "event"; data: Place | Event; sortDate: Date }> = [
      ...visiblePlaces.map((place) => ({
        type: "place" as const,
        data: place,
        sortDate: placesDefaultDate,
      })),
      ...regularEvents.map((event) => ({
        type: "event" as const,
        data: event,
        sortDate: new Date(event.startDate),
      })),
    ];

    // Sort by date (newest first)
    items.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

    // Prepend pinned events at the top
    return [
      ...pinnedEvents.map((event) => ({
        type: "event" as const,
        data: event,
        sortDate: new Date(event.startDate),
      })),
      ...items,
    ];
  }, [places, events, section, selectedCategories]);

  const listIntroHtml = platformSettings?.site?.listIntroHtml;
  const listIntroImage = sanitizeImageUrl(platformSettings?.site?.listIntroImage);
  const showListIntro = hasVisibleHtml(listIntroHtml);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const renderDiscoverControls = (inIntro: boolean) => (
    <div
      className={`places-discover__controls${inIntro ? " is-in-intro" : ""}`}
    >
      <div className="places-discover__form">
        <label htmlFor="places-discover-search" className="hl-visually-hidden">
          {t("public.searchPlaces") || t("common.search")}
        </label>
        <input
          id="places-discover-search"
          type="search"
          className="places-discover__search"
          placeholder={t("public.searchPlaces") || "Keresés..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label={t("public.searchPlaces") || t("common.search")}
        />
        <div className="places-discover__filters">
          <MapFilters
            selectedCategories={selectedCategories}
            selectedPriceBands={selectedPriceBands}
            onCategoriesChange={setSelectedCategories}
            onPriceBandsChange={setSelectedPriceBands}
            isOpenNow={isOpenNow}
            hasEventToday={hasEventToday}
            within30Minutes={within30Minutes}
            rainSafe={rainSafe}
            onOpenNowChange={setIsOpenNow}
            onHasEventTodayChange={setHasEventToday}
            onWithin30MinutesChange={setWithin30Minutes}
            onRainSafeChange={setRainSafe}
            section={section}
            onSectionChange={setSection}
            lang={lang}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <FloatingHeader visitorAuth onMapViewClick={onMapViewClick} />
      <style>{`
        /* Spacing scale: 8 / 12 / 16 / 24 */
        .places-discover {
          --pd-1: 8px;
          --pd-2: 12px;
          --pd-3: var(--hl-public-pad-x, 16px);
          --pd-4: 24px;
          --pd-5: 32px;
          min-height: 100vh;
          background: transparent;
          padding: clamp(68px, 7vw, 80px) var(--pd-3) var(--pd-5);
        }
        .places-discover__title {
          margin: 0 0 var(--pd-3);
          font-size: clamp(28px, 2.2vw, 44px);
          font-weight: 700;
          font-family: var(--font-heading);
          color: var(--hl-ink-strong);
          letter-spacing: -0.02em;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .places-discover__intro {
          display: grid;
          gap: var(--pd-3);
          margin: 0 0 clamp(28px, 4vw, 40px);
          padding: var(--pd-3);
          border-radius: 14px;
          background: var(--hl-card);
          border: 1px solid var(--hl-line-on-card, rgba(27, 23, 48, 0.1));
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
          color: var(--hl-ink-on-card, var(--hl-ink, #1b1730));
        }
        .places-discover__intro-media {
          margin: 0;
          border-radius: 10px;
          overflow: hidden;
          aspect-ratio: 16 / 9;
          background: rgba(27, 23, 48, 0.06);
        }
        .places-discover__intro-media img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .places-discover__intro-main {
          display: flex;
          flex-direction: column;
          gap: var(--pd-3);
          min-width: 0;
        }
        .places-discover__intro-copy {
          font-family: var(--font-body);
          font-size: clamp(17px, 2.4vw, 19px);
          line-height: 1.6;
          color: var(--hl-ink-on-card, var(--hl-ink, #1b1730));
        }
        .places-discover__intro-copy :is(p, ul, ol) {
          margin: 0 0 0.75em;
        }
        .places-discover__intro-copy :is(p, ul, ol):last-child {
          margin-bottom: 0;
        }
        .places-discover__intro-copy a {
          color: var(--hl-accent, #c45c26);
        }
        .places-discover__intro:not(.has-image) .places-discover__intro-copy {
          max-width: 68ch;
        }
        @media (min-width: 720px) {
          .places-discover__intro.has-image {
            grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
            align-items: start;
          }
          .places-discover__intro.has-image .places-discover__intro-media {
            aspect-ratio: 4 / 3;
          }
        }
        .places-discover__form {
          display: flex;
          flex-direction: column;
          gap: var(--pd-3);
        }
        .places-discover__controls {
          display: flex;
          flex-direction: column;
          gap: var(--pd-3);
        }
        .places-discover__controls:not(.is-in-intro) {
          margin-bottom: clamp(28px, 4vw, 40px);
        }
        .places-discover__intro .places-discover__controls {
          margin-top: var(--pd-1);
          padding-top: var(--pd-3);
          border-top: 1px solid var(--hl-line-on-card, rgba(27, 23, 48, 0.1));
        }
        .places-discover__search {
          display: block;
          width: 100%;
          min-height: 44px;
          padding: var(--pd-2) var(--pd-3);
          font-size: 16px;
          font-family: var(--font-body);
          border: 1px solid var(--hl-line-on-card);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.72);
          color: var(--hl-ink-on-card);
          box-sizing: border-box;
        }
        .places-discover__search::placeholder {
          color: var(--hl-muted-on-card);
        }
        .places-discover__search:focus {
          outline: none;
          border-color: var(--hl-accent);
          box-shadow: 0 0 0 3px rgba(196, 92, 38, 0.22);
        }
        .places-discover__filters {
          min-width: 0;
          width: 100%;
        }
        .places-discover__filters .map-filters-inline {
          padding: var(--pd-3);
          border-radius: 14px;
          box-shadow: none;
          border: 1px solid var(--hl-line-on-card, rgba(27, 23, 48, 0.1));
          background: rgba(255, 255, 255, 0.55);
        }
        .places-discover__controls:not(.is-in-intro) .places-discover__search,
        .places-discover__controls:not(.is-in-intro) .places-discover__filters .map-filters-inline {
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
          background: var(--hl-card);
        }
        .places-discover__filters .map-filters-inline__head {
          margin-bottom: var(--pd-2);
          min-height: 0;
        }
        .places-discover__filters .map-dock__section {
          margin: 0 0 var(--pd-3);
        }
        .places-discover__filters .map-dock__section:last-child {
          margin-bottom: 0;
        }
        .places-discover__filters .map-filters-inline,
        .places-discover__filters .map-filters-inline * {
          font-family: "Source Sans 3", Inter, system-ui, -apple-system, "Segoe UI", sans-serif !important;
        }
        .places-discover__filters .map-filters-inline__head h2,
        .places-discover__filters .map-filters-inline h3,
        .places-discover__filters .map-dock__section h3,
        .places-discover__filters .map-dock__chip-label {
          margin: 0 0 var(--pd-1);
          font-size: 18px;
          font-weight: 650;
          color: var(--hl-ink, #1b1730);
        }
        .places-discover__filters .map-dock__chip-label {
          margin: 0 2px 0 0;
          font-size: 14px;
        }
        .places-discover__filters .map-dock__filter-row .map-dock__chip {
          min-height: 40px;
          padding: 6px 14px;
          font-size: clamp(16px, 0.95vw, 18px);
          font-weight: 600;
          color: var(--hl-ink, #1b1730);
        }
        @media (max-width: 767px) {
          .places-discover__filters .map-dock__filter-row {
            column-gap: 16px;
          }
          .places-discover__filters .map-dock__filter-row .map-dock__chip {
            min-height: 40px;
            padding: 6px 12px;
            font-size: 15px;
          }
        }
        .places-discover__filters .map-dock__chip[aria-pressed="true"] {
          background: var(--hl-navy, #1b1730);
          border-color: var(--hl-navy, #1b1730);
          color: #fff;
        }
        .places-list {
          container-type: inline-size;
          container-name: places;
        }
        .places-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(16px, 1.6vw, 24px);
          margin-bottom: var(--pd-5);
          width: 100%;
          max-width: 100%;
        }
        .places-grid > * {
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }
        .places-grid > * > article {
          max-width: 100%;
          min-width: 0;
        }
        @container (min-width: 680px) {
          .places-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @container (min-width: 1040px) {
          .places-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @container (min-width: 1400px) {
          .places-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
      `}</style>
      <div className="places-discover">
        <div className="places-list hl-public-width">
          <h1 className="places-discover__title">
            {(viewTitle || platformSettings?.siteName)
              ? t("public.explore.siteTitle", {
                  name: viewTitle || platformSettings?.siteName,
                  defaultValue: "{{name}} felfedezése",
                })
              : t("public.explore.title")}
          </h1>
          {showListIntro ? (
            <section
              className={`places-discover__intro${listIntroImage ? " has-image" : ""}`}
              aria-label={t("public.explore.introLabel", { defaultValue: "Bevezető" })}
            >
              {listIntroImage ? (
                <figure className="places-discover__intro-media">
                  <img src={listIntroImage} alt="" loading="lazy" decoding="async" />
                </figure>
              ) : null}
              <div className="places-discover__intro-main">
                <SafeHtml html={listIntroHtml} className="places-discover__intro-copy" />
                {renderDiscoverControls(true)}
              </div>
            </section>
          ) : (
            renderDiscoverControls(false)
          )}

          {!isLoading && isError ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#f87171" }}>
              {t("public.errorLoadingPlaces") || "Hiba a helyek betöltésekor"}
            </div>
          ) : isLoading && places.length === 0 ? (
            <PublicCardSkeletonGrid
              count={ITEMS_PER_PAGE}
              variant="places"
              label={t("common.loading")}
            />
          ) : !isLoading && combinedItems.length === 0 ? (
            <EmptyResults
              title={
                section === "services"
                  ? t("public.noServices")
                  : section === "events"
                    ? t("public.noEvents")
                    : t("public.noPlacesFound")
              }
              description={
                section === "services" || section === "events"
                  ? undefined
                  : t("public.emptyResultsDefaultHint")
              }
            />
          ) : (
            <>
              <div className="places-grid">
                {combinedItems.map((item) => {
                  if (item.type === "place") {
                    const place = item.data as Place;
                    return <PlaceCard key={place.slug || place.id} place={place} />;
                  } else {
                    const event = item.data as Event;
                    return (
                      <EventGridCard
                        key={event.id}
                        event={event}
                        placeholderImage={platformSettings?.defaultEventPlaceholderCardImage}
                      />
                    );
                  }
                })}
              </div>
              {/* Only reserve space for the next batch while fetching — not blank void. */}
              {hasNextPage ? (
                <div ref={observerTarget} style={{ marginTop: 16, marginBottom: 24 }}>
                  {isFetchingNextPage ? (
                    <PublicCardSkeletonGrid
                      count={Math.min(ITEMS_PER_PAGE, 6)}
                      variant="places"
                      label={t("common.loading")}
                    />
                  ) : (
                    <div style={{ height: 1 }} aria-hidden="true" />
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}

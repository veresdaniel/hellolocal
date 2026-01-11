// src/components/PlacesListView.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { getPlaces, getEvents, type Event } from "../api/places.api";
import type { Place } from "../types/place";
import { PlaceCard } from "../ui/place/PlaceCard";
import { MapFilters } from "./MapFilters";
import { FloatingHeader } from "./FloatingHeader";
import { HAS_MULTIPLE_TENANTS } from "../app/config";
import { buildPath } from "../app/routing/buildPath";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "./LoadingSpinner";
import { useFiltersStore } from "../stores/useFiltersStore";

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
  const { lang, tenantSlug } = useTenantContext();
  
  // Use Zustand store as default, props override if provided
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
  const observerTarget = useRef<HTMLDivElement>(null);
  const tenantKey = HAS_MULTIPLE_TENANTS ? tenantSlug : undefined;

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
    queryKey: ["places", lang, tenantKey, selectedCategories, selectedPriceBands, searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      // Note: getPlaces now accepts arrays for OR logic filtering
      const categoryParam = selectedCategories.length > 0 ? selectedCategories : undefined;
      const priceBandParam = selectedPriceBands.length > 0 ? selectedPriceBands : undefined;
      
      console.log('[PlacesListView] Filtering with:', { 
        categories: categoryParam, 
        priceBands: priceBandParam,
      });
      
      const places = await getPlaces(
        lang,
        tenantKey,
        categoryParam,
        priceBandParam,
        searchQuery || undefined,
        ITEMS_PER_PAGE,
        pageParam as number
      );

      return {
        places,
        nextOffset: places.length === ITEMS_PER_PAGE ? (pageParam as number) + ITEMS_PER_PAGE : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
  });

  const allPlaces = data?.pages.flatMap((page) => page.places) ?? [];

  // Fetch events for context-based filters
  const { data: eventsData = [] } = useQuery({
    queryKey: ["events", lang, tenantKey],
    queryFn: () => getEvents(lang, undefined, undefined, 100, 0, tenantKey),
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
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper function to check if place is open now
  const isPlaceOpenNow = (place: Place): boolean => {
    if (!place.openingHours || place.openingHours.length === 0) return false;
    
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // Convert Sunday (0) to last (6), Monday (1) to 0, etc.
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
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

  // Filter places based on context filters
  const places = useMemo(() => {
    return allPlaces.filter((place) => {
      if (isOpenNow && !isPlaceOpenNow(place)) return false;
      if (hasEventToday && !hasEventTodayForPlace(place.id)) return false;
      if (within30Minutes && !isWithin10MinutesWalk(place)) return false;
      if (rainSafe && !isRainSafe(place)) return false;
      return true;
    });
  }, [allPlaces, isOpenNow, hasEventToday, within30Minutes, rainSafe, userLocation, eventsData]);

  // Fetch events (filtered)
  const events = useMemo(() => {
    const now = new Date();
    return eventsData.filter((event) => {
      if (event.endDate) {
        return new Date(event.endDate) >= now;
      }
      return new Date(event.startDate) >= now;
    });
  }, [eventsData]);

  // Combine places and events, sort by date (pinned events first, then by start date)
  const combinedItems = useMemo(() => {
    const pinnedEvents = events.filter((e) => e.isPinned);
    const regularEvents = events.filter((e) => !e.isPinned);
    
    // Use a fixed date for places (far in the past) so events are sorted by date and appear first
    const placesDefaultDate = new Date(2000, 0, 1);
    
    // Create a combined array with type information
    const items: Array<{ type: "place" | "event"; data: Place | Event; sortDate: Date }> = [
      ...places.map((place) => ({
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
  }, [places, events]);

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

  return (
    <>
      <FloatingHeader onMapViewClick={onMapViewClick} />
      <style>{`
        .places-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 32px;
        }
        @media (min-width: 640px) {
          .places-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }
        }
        @media (min-width: 900px) {
          .places-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
          }
        }
        .places-grid > * {
          width: 100%;
        }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)",
          padding: "72px 12px 24px",
        }}
      >
        {/* Header */}
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: 24,
              fontSize: "clamp(24px, 5vw, 36px)",
              fontWeight: 700,
              color: "#1a1a1a",
              letterSpacing: "-0.02em",
              wordWrap: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {t("public.explore.title")}
          </h1>

          {/* Search Bar */}
          <div style={{ marginBottom: 24 }}>
            <input
              type="text"
              placeholder={t("public.searchPlaces") || "Keresés..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 20px",
                fontSize: 16,
                border: "2px solid #e0e0e0",
                borderRadius: 12,
                background: "white",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                transition: "all 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e0e0e0";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.04)";
              }}
            />
          </div>
        </div>
        
        {/* Filters and Places Grid - Same width as searchbar */}
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {/* Filters */}
          <div style={{ marginBottom: 32 }}>
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
              lang={lang}
            />
          </div>

          {/* Places and Events Grid */}
          <LoadingSpinner isLoading={isLoading && places.length === 0} />
          {!isLoading && isError ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "#c00" }}>
              {t("public.errorLoadingPlaces") || "Hiba a helyek betöltésekor"}
            </div>
          ) : !isLoading && combinedItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "#666" }}>
              {t("public.noPlacesFound") || "Nincs találat"}
            </div>
          ) : isLoading && places.length === 0 ? null : (
            <>
              <div className="places-grid">
              {combinedItems.map((item, index) => {
                if (item.type === "place") {
                  const place = item.data as Place;
                  return <PlaceCard key={place.slug || place.id} place={place} index={index} />;
                } else {
                  const event = item.data as Event;
                  return (
                    <Link
                      key={event.id}
                      to={buildPath({ tenantSlug, lang, path: `event/${event.slug}` })}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div
                        style={{
                          background: "white",
                          borderRadius: 12,
                          overflow: "hidden",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                          borderBottom: event.category ? `3px solid #667eea` : "none",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-4px)";
                          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
                        }}
                      >
                        {event.heroImage && (
                          <div
                            style={{
                              width: "100%",
                              height: 200,
                              backgroundImage: `url(${event.heroImage})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              position: "relative",
                            }}
                          />
                        )}
                        <div style={{ padding: 20 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>
                              {event.isPinned && <span style={{ marginRight: 8 }}>📌</span>}
                              {event.name}
                            </h3>
                          </div>
                          <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
                            {new Date(event.startDate).toLocaleDateString(
                              lang === "hu" ? "hu-HU" : lang === "de" ? "de-DE" : "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                          {event.shortDescription && (
                            <p style={{ fontSize: 14, color: "#666", margin: "8px 0", lineHeight: 1.6 }}>
                              {event.shortDescription}
                            </p>
                          )}
                          {event.placeName && (
                            <div style={{ fontSize: 13, color: "#667eea", marginTop: 8 }}>
                              📍 {event.placeName}
                            </div>
                          )}
                          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#667eea" }}>
                              {t("public.readMore")} →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                }
              })}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} style={{ height: 20, marginBottom: 32 }}>
              <LoadingSpinner isLoading={isFetchingNextPage} />
            </div>
          </>
        )}
        </div>
      </div>
    </>
  );
}


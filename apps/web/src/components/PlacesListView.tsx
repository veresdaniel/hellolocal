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

interface PlacesListViewProps {
  onMapViewClick: () => void;
}

const ITEMS_PER_PAGE = 12;

export function PlacesListView({ onMapViewClick }: PlacesListViewProps) {
  const { t } = useTranslation();
  const { lang, tenantSlug } = useTenantContext();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPriceBands, setSelectedPriceBands] = useState<string[]>([]);
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
      // Note: getPlaces now accepts both IDs and names for priceBand filtering
      const categoryParam = selectedCategories.length > 0 ? selectedCategories[0] : undefined;
      const priceBandParam = selectedPriceBands.length > 0 ? selectedPriceBands[0] : undefined;
      
      console.log('[PlacesListView] Filtering with:', { 
        category: categoryParam, 
        priceBand: priceBandParam,
        priceBandLength: priceBandParam?.length,
        priceBandStartsWith: priceBandParam?.startsWith('c')
      });
      
      const places = await getPlaces(
        lang,
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

  const places = data?.pages.flatMap((page) => page.places) ?? [];

  // Fetch events
  const { data: events = [] } = useQuery({
    queryKey: ["events", lang, tenantKey],
    queryFn: () => getEvents(lang, undefined, undefined, 100, 0),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => {
      // Filter out past events (events that have ended)
      const now = new Date();
      return data.filter((event) => {
        if (event.endDate) {
          return new Date(event.endDate) >= now;
        }
        // If no endDate, check startDate
        return new Date(event.startDate) >= now;
      });
    },
  });

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
          gap: 24px;
          margin-bottom: 32px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .places-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .places-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)",
          padding: "72px 12px 24px",
        }}
      >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Header */}
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

        {/* Filters */}
        <div style={{ marginBottom: 32 }}>
          <MapFilters
            selectedCategories={selectedCategories}
            selectedPriceBands={selectedPriceBands}
            onCategoriesChange={setSelectedCategories}
            onPriceBandsChange={setSelectedPriceBands}
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
                  return <PlaceCard key={item.data.slug} place={item.data as Place} index={index} />;
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


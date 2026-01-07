// src/components/PlacesListView.tsx
import { useState, useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { getPlaces } from "../api/places.api";
import { PlaceCard } from "../ui/place/PlaceCard";
import { MapFilters } from "./MapFilters";
import { FloatingHeader } from "./FloatingHeader";
import { HAS_MULTIPLE_TENANTS } from "../app/config";

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
  } = useInfiniteQuery({
    queryKey: ["places", lang, tenantKey, selectedCategories, selectedPriceBands, searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      const places = await getPlaces(
        lang,
        selectedCategories[0] || undefined,
        selectedPriceBands[0] || undefined,
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
          padding: "24px 16px",
          paddingTop: "72px", // Exact height of FloatingHeader (16px top + ~40px content + 16px bottom)
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
            marginBottom: 32,
            fontSize: "clamp(24px, 5vw, 36px)",
            fontWeight: 700,
            color: "#1a1a1a",
            letterSpacing: "-0.02em",
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

        {/* Places Grid */}
        {isLoading && places.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "#666" }}>
            {t("common.loading")}...
          </div>
        ) : isError ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "#c00" }}>
            {t("public.errorLoadingPlaces") || "Hiba a helyek betöltésekor"}
          </div>
        ) : places.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "#666" }}>
            {t("public.noPlacesFound") || "Nincs találat"}
          </div>
        ) : (
          <>
            <div className="places-grid">
              {places.map((place, index) => (
                <PlaceCard key={place.slug} place={place} index={index} />
              ))}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} style={{ height: 20, marginBottom: 32 }}>
              {isFetchingNextPage && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#666" }}>
                  {t("common.loading")}...
                </div>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </>
  );
}


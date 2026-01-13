// src/components/MapFilters.tsx
import { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSiteContext } from "../app/site/useSiteContext";
import { HAS_MULTIPLE_SITES } from "../app/config";
import type { Place } from "../types/place";
import { useFiltersStore } from "../stores/useFiltersStore";

interface MapFiltersProps {
  selectedCategories: string[];
  selectedPriceBands: string[];
  onCategoriesChange: (categories: string[]) => void;
  onPriceBandsChange: (priceBands: string[]) => void;
  // Context-based filters
  isOpenNow: boolean;
  hasEventToday: boolean;
  within30Minutes: boolean;
  rainSafe: boolean;
  onOpenNowChange: (value: boolean) => void;
  onHasEventTodayChange: (value: boolean) => void;
  onWithin30MinutesChange: (value: boolean) => void;
  onRainSafeChange: (value: boolean) => void;
  lang: string;
}

export function MapFilters({
  selectedCategories,
  selectedPriceBands,
  onCategoriesChange,
  onPriceBandsChange,
  isOpenNow,
  hasEventToday,
  within30Minutes,
  rainSafe,
  onOpenNowChange,
  onHasEventTodayChange,
  onWithin30MinutesChange,
  onRainSafeChange,
  lang,
}: MapFiltersProps) {
  const { siteKey } = useSiteContext();
  const effectiveSiteKey = HAS_MULTIPLE_SITES ? siteKey : undefined;
  const { t } = useTranslation();
  const userLocation = useFiltersStore((state) => state.userLocation);
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Default positions: jobb, listanézet alatt (right, below list view button)
  // List view button is at top: 16, so filters should be at top: ~80
  const defaultPositionDesktop = { top: 80, right: 16 };
  const defaultPositionMobile = { top: 70, right: 12 };
  
  // Load saved position from localStorage with lazy initializer (device-specific)
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return defaultPositionDesktop;
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = localStorage.getItem(`mapFiltersPosition_${deviceKey}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return isDesktop ? defaultPositionDesktop : defaultPositionMobile;
      }
    }
    return isDesktop ? defaultPositionDesktop : defaultPositionMobile;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const filtersRef = useRef<HTMLDivElement>(null);
  const [shouldAnimateUp, setShouldAnimateUp] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Detect mobile viewport changes
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load position when device type changes
  useEffect(() => {
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = localStorage.getItem(`mapFiltersPosition_${deviceKey}`);
    if (saved) {
      try {
        const savedPos = JSON.parse(saved);
        setPosition(savedPos);
      } catch {
        setPosition(isDesktop ? defaultPositionDesktop : defaultPositionMobile);
      }
    } else {
      setPosition(isDesktop ? defaultPositionDesktop : defaultPositionMobile);
    }
  }, [isDesktop]);
  
  // Save position to localStorage (device-specific)
  useEffect(() => {
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const defaultPos = isDesktop ? defaultPositionDesktop : defaultPositionMobile;
    // Only save if position differs from default (user has moved it)
    if (position.top !== defaultPos.top || position.right !== defaultPos.right) {
      localStorage.setItem(`mapFiltersPosition_${deviceKey}`, JSON.stringify(position));
    } else {
      // Remove saved position if it's back to default
      localStorage.removeItem(`mapFiltersPosition_${deviceKey}`);
    }
  }, [position, isDesktop]);

  // Lock body scroll when drawer is open (best practice)
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDesktop || !filtersRef.current) return;
    // Don't allow dragging from input elements
    if ((e.target as HTMLElement).closest("input")) {
      return;
    }
    // Don't allow dragging from label elements (checkboxes)
    if ((e.target as HTMLElement).closest("label")) {
      return;
    }
    // Allow dragging from header area and anywhere else except inputs/labels
    e.preventDefault();
    setHasDragged(false); // Reset drag flag
    const rect = filtersRef.current.getBoundingClientRect();
    dragStartPosRef.current = { x: e.clientX, y: e.clientY }; // Store initial mouse position
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!filtersRef.current) return;
    // Don't allow dragging from input elements
    if ((e.target as HTMLElement).closest("input")) {
      return;
    }
    // Don't allow dragging from label elements (checkboxes)
    if ((e.target as HTMLElement).closest("label")) {
      return;
    }
    e.preventDefault();
    setHasDragged(false);
    const touch = e.touches[0];
    const rect = filtersRef.current.getBoundingClientRect();
    dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Detect if we've actually moved (dragged) - check distance from start position
      const moved = Math.abs(e.clientX - dragStartPosRef.current.x) > 5 || Math.abs(e.clientY - dragStartPosRef.current.y) > 5;
      if (moved) {
        setHasDragged(true);
      }

      const newLeft = e.clientX - dragOffset.x;
      const newTop = e.clientY - dragOffset.y;

      // Constrain to viewport
      const elementWidth = filtersRef.current?.offsetWidth || 280;
      const elementHeight = filtersRef.current?.offsetHeight || 200;
      const maxTop = window.innerHeight - elementHeight;

      // Convert left to right for positioning
      const newRight = window.innerWidth - newLeft - elementWidth;

      setPosition({
        top: Math.max(0, Math.min(newTop, maxTop)),
        right: Math.max(0, Math.min(newRight, window.innerWidth - elementWidth)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      e.preventDefault(); // Prevent scroll only during drag
      const touch = e.touches[0];

      // Detect if we've actually moved (dragged)
      const moved = Math.abs(touch.clientX - dragStartPosRef.current.x) > 5 || Math.abs(touch.clientY - dragStartPosRef.current.y) > 5;
      if (moved) {
        setHasDragged(true);
      }

      const newLeft = touch.clientX - dragOffset.x;
      const newTop = touch.clientY - dragOffset.y;

      // Constrain to viewport
      const elementWidth = filtersRef.current?.offsetWidth || 280;
      const elementHeight = filtersRef.current?.offsetHeight || 200;
      const maxTop = window.innerHeight - elementHeight;

      // Convert left to right for positioning
      const newRight = window.innerWidth - newLeft - elementWidth;

      setPosition({
        top: Math.max(0, Math.min(newTop, maxTop)),
        right: Math.max(0, Math.min(newRight, window.innerWidth - elementWidth)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    // Use passive: false only during actual drag to prevent scroll
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, dragOffset]);

  // Use cached places data from React Query if available (don't fetch separately)
  // This avoids duplicate API calls - we'll extract categories/price bands from existing cache
  const queryClient = useQueryClient();
  const places = queryClient.getQueryData<Place[]>(["places", lang, effectiveSiteKey]) ||
                 queryClient.getQueryData<Place[]>(["places", lang, effectiveSiteKey, undefined, undefined]);

  // Extract unique categories and price bands from places
  // Note: For price bands, we use IDs. For categories, we still use names (can be updated later)
  const categories = useMemo(() => {
    if (!places) return [];
    const categorySet = new Set<string>();
    places.forEach((place) => {
      if (place.category) {
        categorySet.add(place.category);
      }
    });
    return Array.from(categorySet).map((name) => ({ id: name, name }));
  }, [places]);

  const priceBands = useMemo(() => {
    if (!places) return [];
    const priceBandMap = new Map<string, { id: string; name: string }>();
    places.forEach((place) => {
      if (place.priceBand) {
        // Use ID if available, otherwise use name as ID (fallback for backward compatibility)
        const priceBandId = place.priceBandId || place.priceBand;
        const priceBandName = place.priceBand;
        
        // Use ID/name as key to avoid duplicates
        if (!priceBandMap.has(priceBandId)) {
          priceBandMap.set(priceBandId, { id: priceBandId, name: priceBandName });
        }
      }
    });
    const result = Array.from(priceBandMap.values());
    return result;
  }, [places]);

  // Calculate dynamic z-index: higher only when actively dragging (not when just open)
  const baseZIndex = 3000;
  const activeZIndex = 10000; // High z-index when actively being used (dragging)
  const currentZIndex = isDragging ? activeZIndex : baseZIndex;

  return (
    <div
      ref={filtersRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: "absolute",
        top: position.top,
        right: position.right,
        zIndex: currentZIndex, // Dynamic z-index based on active state
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: isMobile ? 12 : 16,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
        border: "1px solid rgba(0, 0, 0, 0.06)",
        overflow: "hidden",
        minWidth: isMobile && !isOpen ? "auto" : 280,
        maxWidth: isMobile && !isOpen ? 44 : 320,
        maxHeight: isOpen ? (isMobile ? "85vh" : "80vh") : "auto",
        cursor: isDesktop ? (isDragging ? "grabbing" : "grab") : "default",
        userSelect: "none",
        transition: isDragging 
          ? "none" 
          : shouldAnimateUp 
            ? "top 0.5s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease"
            : isOpen
              ? "box-shadow 0.2s ease, transform 0.3s ease-out"
              : "box-shadow 0.2s ease",
        touchAction: "none", // Prevent default touch behaviors
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        if (isDesktop && !isDragging) {
          e.currentTarget.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)";
        }
      }}
    >
      {/* Header */}
      <div
        onClick={() => {
          // Only toggle if we didn't drag
          if (!hasDragged) {
            const wasOpen = isOpen;
            const willBeOpen = !isOpen;
            
            // If opening and position is low (near bottom), animate up
            if (!wasOpen && willBeOpen) {
              const viewportHeight = window.innerHeight;
              const elementHeight = filtersRef.current?.offsetHeight || 200;
              const isNearBottom = position.top > viewportHeight - elementHeight - 100;
              
              if (isNearBottom) {
                setIsAnimating(true);
                setShouldAnimateUp(true);
                // Calculate optimal position (near top but not too high)
                const optimalTop = Math.min(80, viewportHeight * 0.1);
                setPosition(prev => ({ ...prev, top: optimalTop }));
                
                // Reset animation flag after transition
                setTimeout(() => {
                  setShouldAnimateUp(false);
                  setIsAnimating(false);
                }, 500);
              }
            }
            
            setIsOpen(willBeOpen);
          }
          setHasDragged(false);
        }}
        style={{
          padding: isMobile && !isOpen ? 10 : 10,
          paddingLeft: isMobile && !isOpen ? 10 : 16,
          display: "flex",
          justifyContent: isMobile && !isOpen ? "center" : "space-between",
          alignItems: "center",
          cursor: isDesktop ? (isDragging ? "grabbing" : "grab") : "pointer",
          userSelect: "none",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          width: isMobile && !isOpen ? 44 : "auto",
          height: isMobile && !isOpen ? 44 : "auto",
          minWidth: isMobile && !isOpen ? 44 : "auto",
          minHeight: isMobile && !isOpen ? 44 : "auto",
          maxWidth: isMobile && !isOpen ? 44 : "auto",
          maxHeight: isMobile && !isOpen ? 44 : "auto",
          borderRadius: isMobile && !isOpen ? 12 : 0,
          boxSizing: "border-box",
        }}
      >
        <h3 style={{
          margin: 0,
          color: "white",
          fontSize: isMobile && !isOpen ? 20 : "clamp(15px, 3.5vw, 16px)",
          fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: isMobile && !isOpen ? 0 : 8,
          paddingLeft: 0,
          minWidth: isMobile && !isOpen ? 44 : "auto",
          minHeight: isMobile && !isOpen ? 44 : "auto",
          flexShrink: 0,
        }}>
          <span style={{ 
            display: "flex", 
            alignItems: "center", 
            lineHeight: 1,
            minWidth: isMobile && !isOpen ? 44 : "auto",
            minHeight: isMobile && !isOpen ? 44 : "auto",
            flexShrink: 0,
          }}>🔍</span>
          {(!isMobile || isOpen) && <span style={{ display: "flex", alignItems: "center", lineHeight: 1 }}>{t("public.filtersTitle") || "Szűrők"}</span>}
        </h3>
        {(!isMobile || isOpen) && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: 8,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 16,
              transition: "background 0.2s",
              pointerEvents: "none", // Let clicks pass through to parent
            }}
          >
            {isOpen ? "−" : "+"}
          </div>
        )}
      </div>

      {isOpen && (
        <div 
          style={{ 
            padding: 16,
            overflowY: "auto",
            overflowX: "hidden",
            flex: 1,
            // Custom scrollbar styling
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(90, 61, 122, 0.3) transparent",
          }}
          // Webkit scrollbar styling
          onScroll={(e) => {
            // Prevent scroll from propagating to parent
            e.stopPropagation();
          }}
        >
          <style>{`
            div::-webkit-scrollbar {
              width: 6px;
            }
            div::-webkit-scrollbar-track {
              background: transparent;
            }
            div::-webkit-scrollbar-thumb {
              background-color: rgba(90, 61, 122, 0.3);
              border-radius: 3px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background-color: rgba(90, 61, 122, 0.5);
            }
          `}</style>
          {/* Categories */}
          <div style={{ marginBottom: 18 }}>
            <h3
              style={{
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontWeight: 600,
                color: "#5a3d7a",
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Kategóriák
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {categories?.map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <label
                    key={category.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: isSelected ? "rgba(90, 61, 122, 0.1)" : "transparent",
                      transition: "all 0.2s",
                      border: isSelected ? "1px solid rgba(90, 61, 122, 0.25)" : "1px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "rgba(90, 61, 122, 0.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onCategoriesChange([...selectedCategories, category.id]);
                        } else {
                          onCategoriesChange(selectedCategories.filter((id) => id !== category.id));
                        }
                      }}
                      style={{
                        width: 14,
                        height: 14,
                        cursor: "pointer",
                        accentColor: "#5a3d7a",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        color: isSelected ? "#3d2952" : "#5a3d7a",
                        fontWeight: isSelected ? 500 : 400,
                        lineHeight: 1.4,
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {category.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Price Bands */}
          <div style={{ marginBottom: 18 }}>
            <h3
              style={{
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontWeight: 600,
                color: "#5a3d7a",
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Ár sávok
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {priceBands && priceBands.length > 0 ? (
                priceBands.map((priceBand) => {
                  const isSelected = selectedPriceBands.includes(priceBand.id);
                  return (
                    <label
                      key={priceBand.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        borderRadius: 6,
                        cursor: "pointer",
                        background: isSelected ? "rgba(90, 61, 122, 0.1)" : "transparent",
                        transition: "all 0.2s",
                        border: isSelected ? "1px solid rgba(90, 61, 122, 0.25)" : "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = "rgba(90, 61, 122, 0.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onPriceBandsChange([...selectedPriceBands, priceBand.id]);
                          } else {
                            onPriceBandsChange(selectedPriceBands.filter((id) => id !== priceBand.id));
                          }
                        }}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: "pointer",
                          accentColor: "#5a3d7a",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "clamp(14px, 3.5vw, 16px)",
                          color: isSelected ? "#3d2952" : "#5a3d7a",
                          fontWeight: isSelected ? 500 : 400,
                          lineHeight: 1.4,
                          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        {priceBand.name}
                      </span>
                    </label>
                  );
                })
              ) : (
                <div style={{ padding: "8px 10px", color: "#8a7a9a", fontSize: 14, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  Nincs elérhető ár sáv
                </div>
              )}
            </div>
          </div>

          {/* Context-based filters */}
          <div>
            <h3
              style={{
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontWeight: 600,
                color: "#5a3d7a",
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Kontextus alapú szűrők
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                onClick={() => onOpenNowChange(!isOpenNow)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: isOpenNow ? "rgba(90, 61, 122, 0.15)" : "rgba(90, 61, 122, 0.05)",
                  color: isOpenNow ? "#3d2952" : "#5a3d7a",
                  fontWeight: isOpenNow ? 600 : 500,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  transition: "all 0.2s",
                  textAlign: "left",
                  border: isOpenNow ? "1px solid rgba(90, 61, 122, 0.3)" : "1px solid transparent",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!isOpenNow) {
                    e.currentTarget.style.background = "rgba(90, 61, 122, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isOpenNow) {
                    e.currentTarget.style.background = "rgba(90, 61, 122, 0.05)";
                  }
                }}
              >
                🕐 {t("public.filters.openNow")}
              </button>
              <button
                onClick={() => onHasEventTodayChange(!hasEventToday)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: hasEventToday ? "rgba(90, 61, 122, 0.15)" : "rgba(90, 61, 122, 0.05)",
                  color: hasEventToday ? "#3d2952" : "#5a3d7a",
                  fontWeight: hasEventToday ? 600 : 500,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  transition: "all 0.2s",
                  textAlign: "left",
                  border: hasEventToday ? "1px solid rgba(90, 61, 122, 0.3)" : "1px solid transparent",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!hasEventToday) {
                    e.currentTarget.style.background = "rgba(90, 61, 122, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!hasEventToday) {
                    e.currentTarget.style.background = "rgba(90, 61, 122, 0.05)";
                  }
                }}
              >
                📅 {t("public.filters.eventToday")}
              </button>
              {userLocation && (
                <button
                  onClick={() => onWithin30MinutesChange(!within30Minutes)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: within30Minutes ? "rgba(90, 61, 122, 0.15)" : "rgba(90, 61, 122, 0.05)",
                    color: within30Minutes ? "#3d2952" : "#5a3d7a",
                    fontWeight: within30Minutes ? 600 : 500,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    transition: "all 0.2s",
                    textAlign: "left",
                    border: within30Minutes ? "1px solid rgba(90, 61, 122, 0.3)" : "1px solid transparent",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    if (!within30Minutes) {
                      e.currentTarget.style.background = "rgba(90, 61, 122, 0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!within30Minutes) {
                      e.currentTarget.style.background = "rgba(90, 61, 122, 0.05)";
                    }
                  }}
                >
                  🚶 {t("public.filters.within10MinutesWalk")}
                </button>
              )}
              <button
                onClick={() => onRainSafeChange(!rainSafe)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: rainSafe ? "rgba(90, 61, 122, 0.15)" : "rgba(90, 61, 122, 0.05)",
                  color: rainSafe ? "#3d2952" : "#5a3d7a",
                  fontWeight: rainSafe ? 600 : 500,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  transition: "all 0.2s",
                  textAlign: "left",
                  border: rainSafe ? "1px solid rgba(90, 61, 122, 0.3)" : "1px solid transparent",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!rainSafe) {
                    e.currentTarget.style.background = "rgba(90, 61, 122, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!rainSafe) {
                    e.currentTarget.style.background = "rgba(90, 61, 122, 0.05)";
                  }
                }}
              >
                ☂️ {t("public.filters.rainSafe")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


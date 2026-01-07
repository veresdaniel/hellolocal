// src/components/MapFilters.tsx
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPlaces } from "../api/places.api";

interface MapFiltersProps {
  selectedCategories: string[];
  selectedPriceBands: string[];
  onCategoriesChange: (categories: string[]) => void;
  onPriceBandsChange: (priceBands: string[]) => void;
  lang: string;
}

export function MapFilters({
  selectedCategories,
  selectedPriceBands,
  onCategoriesChange,
  onPriceBandsChange,
  lang,
}: MapFiltersProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // Load saved position from localStorage with lazy initializer
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return { top: 100, right: 24 };
    const saved = localStorage.getItem("mapFiltersPosition");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { top: 100, right: 24 };
      }
    }
    return { top: 100, right: 24 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const filtersRef = useRef<HTMLDivElement>(null);
  const isDesktop = typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;

  // Save position to localStorage
  useEffect(() => {
    if (position.top !== 100 || position.right !== 24) {
      localStorage.setItem("mapFiltersPosition", JSON.stringify(position));
    }
  }, [position]);

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
      const maxTop = window.innerHeight - (filtersRef.current?.offsetHeight || 200);

      // Convert left to right for positioning
      const newRight = window.innerWidth - newLeft - (filtersRef.current?.offsetWidth || 280);

      setPosition({
        top: Math.max(0, Math.min(newTop, maxTop)),
        right: Math.max(0, Math.min(newRight, window.innerWidth - 280)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Fetch places to extract unique categories and price bands
  const { data: places } = useQuery({
    queryKey: ["places", lang],
    queryFn: () => getPlaces(lang),
  });

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
    console.log('[MapFilters] Processing places for price bands:', places.length);
    const priceBandMap = new Map<string, { id: string; name: string }>();
    places.forEach((place) => {
      if (place.priceBand) {
        // Use ID if available, otherwise use name as ID (fallback for backward compatibility)
        const priceBandId = place.priceBandId || place.priceBand;
        const priceBandName = place.priceBand;
        
        console.log('[MapFilters] Place price band:', { 
          placeName: place.name, 
          priceBandId, 
          priceBandName 
        });
        
        // Use ID/name as key to avoid duplicates
        if (!priceBandMap.has(priceBandId)) {
          priceBandMap.set(priceBandId, { id: priceBandId, name: priceBandName });
        }
      }
    });
    const result = Array.from(priceBandMap.values());
    console.log('[MapFilters] Final price bands:', result);
    return result;
  }, [places]);

  return (
    <div
      ref={filtersRef}
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        top: position.top,
        right: position.right,
        zIndex: 200,
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
        border: "1px solid rgba(0, 0, 0, 0.06)",
        overflow: "hidden",
        minWidth: 280,
        cursor: isDesktop ? (isDragging ? "grabbing" : "grab") : "default",
        userSelect: "none",
        transition: isDragging ? "none" : "box-shadow 0.2s ease",
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
            setIsOpen(!isOpen);
          }
          setHasDragged(false);
        }}
        style={{
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: isDesktop ? (isDragging ? "grabbing" : "grab") : "pointer",
          userSelect: "none",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <h3 style={{ margin: 0, color: "white", fontSize: 18, fontWeight: 700 }}>
          🔍 {t("public.filters") || "Szűrők"}
        </h3>
        <div
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            border: "none",
            borderRadius: 8,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 18,
            transition: "background 0.2s",
            pointerEvents: "none", // Let clicks pass through to parent
          }}
        >
          {isOpen ? "−" : "+"}
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: 20 }}>
          {/* Categories */}
          <div style={{ marginBottom: 24 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#5a3d7a",
                marginBottom: 12,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Kategóriák
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {categories?.map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <label
                    key={category.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
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
                        width: 16,
                        height: 16,
                        cursor: "pointer",
                        accentColor: "#5a3d7a",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 15,
                        color: isSelected ? "#3d2952" : "#5a3d7a",
                        fontWeight: isSelected ? 600 : 500,
                        lineHeight: 1.5,
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
          <div>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#5a3d7a",
                marginBottom: 12,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Ár sávok
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {priceBands && priceBands.length > 0 ? (
                priceBands.map((priceBand) => {
                  const isSelected = selectedPriceBands.includes(priceBand.id);
                  return (
                    <label
                      key={priceBand.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 8,
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
                          fontSize: 15,
                          color: isSelected ? "#3d2952" : "#5a3d7a",
                          fontWeight: isSelected ? 600 : 500,
                          lineHeight: 1.5,
                        }}
                      >
                        {priceBand.name}
                      </span>
                    </label>
                  );
                })
              ) : (
                <div style={{ padding: "8px 10px", color: "#8a7a9a", fontSize: 14 }}>
                  Nincs elérhető ár sáv
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


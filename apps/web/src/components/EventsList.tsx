// src/components/EventsList.tsx
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getEvents } from "../api/places.api";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { buildPath } from "../app/routing/buildPath";
import { Link } from "react-router-dom";
import { HAS_MULTIPLE_TENANTS } from "../app/config";

interface EventsListProps {
  lang: string;
}

export function EventsList({ lang }: EventsListProps) {
  const { t } = useTranslation();
  const { tenantSlug } = useTenantContext();
  const tenantKey = HAS_MULTIPLE_TENANTS ? tenantSlug : undefined;
  
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("eventsListOpen");
    return saved !== "false"; // Default to open
  });
  
  // Load saved position and open state from localStorage with lazy initializer
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return { top: 200, right: 24 };
    const saved = localStorage.getItem("eventsListPosition");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure both top and right are present
        return {
          top: parsed.top ?? 200,
          right: parsed.right ?? 24,
        };
      } catch {
        return { top: 200, right: 24 };
      }
    }
    return { top: 200, right: 24 };
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const eventsListRef = useRef<HTMLDivElement>(null);
  const isDesktop = typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("eventsListPosition", JSON.stringify(position));
  }, [position]);

  // Save open state to localStorage
  useEffect(() => {
    localStorage.setItem("eventsListOpen", String(isOpen));
  }, [isOpen]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", lang, tenantKey],
    queryFn: () => getEvents(lang, undefined, undefined, 50, 0),
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
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes to check for new events
  });

  const [hasDragged, setHasDragged] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDesktop || !eventsListRef.current) return;
    // Don't start drag if clicking on the toggle button
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    
    e.preventDefault();
    setIsDragging(true);
    setHasDragged(false);
    const rect = eventsListRef.current.getBoundingClientRect();
    dragStartPosRef.current = {
      x: e.clientX,
      y: e.clientY,
    };
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!eventsListRef.current || isMobile) return;
    // Don't start drag if touching on the toggle button
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    
    e.preventDefault();
    setIsDragging(true);
    setHasDragged(false);
    const touch = e.touches[0];
    const rect = eventsListRef.current.getBoundingClientRect();
    dragStartPosRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!eventsListRef.current) return;
      
      // Check if we've actually moved (dragged)
      const moved = Math.abs(e.clientX - dragStartPosRef.current.x) > 5 || 
                    Math.abs(e.clientY - dragStartPosRef.current.y) > 5;
      if (moved) {
        setHasDragged(true);
      }
      
      const newLeft = e.clientX - dragOffset.x;
      const newTop = e.clientY - dragOffset.y;
      
      // Constrain to viewport
      const maxLeft = window.innerWidth - eventsListRef.current.offsetWidth - 24;
      const maxTop = window.innerHeight - eventsListRef.current.offsetHeight - 24;
      
      const clampedLeft = Math.max(24, Math.min(newLeft, maxLeft));
      const clampedTop = Math.max(24, Math.min(newTop, maxTop));
      
      setPosition({
        top: clampedTop,
        right: window.innerWidth - clampedLeft - eventsListRef.current.offsetWidth,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!eventsListRef.current || isMobile) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      if (!touch) return;
      
      // Check if we've actually moved (dragged)
      const moved = Math.abs(touch.clientX - dragStartPosRef.current.x) > 5 || 
                    Math.abs(touch.clientY - dragStartPosRef.current.y) > 5;
      if (moved) {
        setHasDragged(true);
      }
      
      const newLeft = touch.clientX - dragOffset.x;
      const newTop = touch.clientY - dragOffset.y;
      
      // Constrain to viewport
      const maxLeft = window.innerWidth - eventsListRef.current.offsetWidth - 24;
      const maxTop = window.innerHeight - eventsListRef.current.offsetHeight - 24;
      
      const clampedLeft = Math.max(24, Math.min(newLeft, maxLeft));
      const clampedTop = Math.max(24, Math.min(newTop, maxTop));
      
      setPosition({
        top: clampedTop,
        right: window.innerWidth - clampedLeft - eventsListRef.current.offsetWidth,
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
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, dragOffset, isMobile]);

  // Sort events: pinned first, then by start date
  const sortedEvents = [...events].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  // Hide on mobile
  if (isMobile) {
    return null;
  }

  return (
    <div
      ref={eventsListRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        right: `${position.right}px`,
        width: 320, // Fixed width, doesn't change when opening/closing
        maxHeight: "calc(100vh - 48px)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
        zIndex: 200,
        cursor: isDragging ? "grabbing" : isDesktop ? "grab" : "default",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: isDragging ? "none" : "box-shadow 0.2s",
        userSelect: "none",
        touchAction: "none", // Prevent default touch behaviors
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = "0 12px 48px rgba(0, 0, 0, 0.3)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.2)";
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
        }}
      >
        <h3 style={{ margin: 0, color: "white", fontSize: 18, fontWeight: 700 }}>
          📅 {t("public.events")}
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

      {/* Content */}
      {isOpen && (
        <div
          style={{
            overflowY: "auto",
            padding: "0 16px 16px",
            maxHeight: "200px", // Height for ~1.5 events
          }}
        >
          {isLoading ? (
            <div style={{ color: "white", padding: 16, textAlign: "center" }}>
              {t("common.loading")}
            </div>
          ) : sortedEvents.length === 0 ? (
            <div style={{ color: "rgba(255, 255, 255, 0.8)", padding: 16, textAlign: "center" }}>
              {t("public.noEvents")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sortedEvents.map((event) => (
                <Link
                  key={event.id}
                  to={buildPath({ tenantSlug, lang, path: `event/${event.slug}` })}
                  style={{
                    display: "block",
                    padding: 14,
                    background: "rgba(255, 255, 255, 0.15)",
                    borderRadius: 12,
                    textDecoration: "none",
                    color: "white",
                    transition: "all 0.2s",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* Title */}
                  <h4 style={{ 
                    margin: "0 0 8px 0", 
                    fontSize: 16, 
                    fontWeight: 700, 
                    lineHeight: 1.4,
                    letterSpacing: "-0.01em",
                  }}>
                    {event.isPinned && <span style={{ marginRight: 6 }}>📌</span>}
                    {event.name}
                  </h4>

                  {/* Date */}
                  <div style={{ 
                    fontSize: 14, 
                    opacity: 0.95, 
                    marginBottom: 8,
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}>
                    🗓️ {new Date(event.startDate).toLocaleDateString(
                      lang === "hu" ? "hu-HU" : lang === "de" ? "de-DE" : "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </div>

                  {/* Place */}
                  {event.placeName && (
                    <div style={{ 
                      fontSize: 14, 
                      opacity: 0.9, 
                      marginBottom: 8,
                      fontWeight: 500,
                      lineHeight: 1.5,
                    }}>
                      📍 {event.placeName}
                    </div>
                  )}

                  {/* First Tag as Badge */}
                  {event.tags && event.tags.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        background: "rgba(255, 255, 255, 0.25)",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}>
                        {event.tags[0]}
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


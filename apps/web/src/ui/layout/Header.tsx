// src/ui/layout/Header.tsx
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenantContext } from "../../app/tenant/useTenantContext";
import { buildPath } from "../../app/routing/buildPath";
import { getSiteSettings } from "../../api/places.api";

export function Header() {
  const { lang, tenantSlug } = useTenantContext();
  const queryClient = useQueryClient();
  const isDesktop = typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  
  // Default positions: bal fent (top left)
  const defaultPositionDesktop = { top: 16, left: 16 };
  const defaultPositionMobile = { top: 12, left: 12 };
  
  // Load saved position from localStorage with lazy initializer (device-specific)
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return defaultPositionDesktop;
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = localStorage.getItem(`headerPosition_${deviceKey}`);
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
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const headerRef = useRef<HTMLElement>(null);

  // Calculate dynamic z-index: higher only when actively dragging
  const baseZIndex = 1000;
  const activeZIndex = 10000; // High z-index when actively being used (dragging)
  const currentZIndex = isDragging ? activeZIndex : baseZIndex;

  // Load site name from settings
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", lang, tenantSlug],
    queryFn: () => getSiteSettings(lang, tenantSlug),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Listen for site settings changes from admin
  useEffect(() => {
    const handleSiteSettingsChanged = () => {
      // Refetch site settings when changed in admin
      queryClient.invalidateQueries({ queryKey: ["siteSettings", lang, tenantSlug] });
      queryClient.refetchQueries({ queryKey: ["siteSettings", lang, tenantSlug] });
    };

    window.addEventListener("admin:siteSettings:changed", handleSiteSettingsChanged);
    return () => {
      window.removeEventListener("admin:siteSettings:changed", handleSiteSettingsChanged);
    };
  }, [lang, tenantSlug]);

  const siteName = siteSettings?.siteName || "HelloLocal";
  const brandBadgeIcon = siteSettings?.brandBadgeIcon;

  // Load position when device type changes
  useEffect(() => {
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = localStorage.getItem(`headerPosition_${deviceKey}`);
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
    if (position.top !== defaultPos.top || position.left !== defaultPos.left) {
      localStorage.setItem(`headerPosition_${deviceKey}`, JSON.stringify(position));
    } else {
      // Remove saved position if it's back to default
      localStorage.removeItem(`headerPosition_${deviceKey}`);
    }
  }, [position, isDesktop]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDesktop || !headerRef.current) return;
    e.preventDefault();
    const rect = headerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!headerRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = headerRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newLeft = e.clientX - dragOffset.x;
      const newTop = e.clientY - dragOffset.y;

      // Constrain to viewport
      const maxLeft = window.innerWidth - (headerRef.current?.offsetWidth || 200);
      const maxTop = window.innerHeight - (headerRef.current?.offsetHeight || 60);

      setPosition({
        left: Math.max(0, Math.min(newLeft, maxLeft)),
        top: Math.max(0, Math.min(newTop, maxTop)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;

      const newLeft = touch.clientX - dragOffset.x;
      const newTop = touch.clientY - dragOffset.y;

      // Constrain to viewport
      const maxLeft = window.innerWidth - (headerRef.current?.offsetWidth || 200);
      const maxTop = window.innerHeight - (headerRef.current?.offsetHeight || 60);

      setPosition({
        left: Math.max(0, Math.min(newLeft, maxLeft)),
        top: Math.max(0, Math.min(newTop, maxTop)),
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
  }, [isDragging, dragOffset]);

  return (
    <header
      ref={headerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: currentZIndex, // Dynamic z-index based on active state
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: isMobile ? 12 : 16,
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
        border: "1px solid rgba(0, 0, 0, 0.06)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        cursor: isDesktop ? (isDragging ? "grabbing" : "grab") : "default",
        userSelect: "none",
        transition: isDragging ? "none" : "box-shadow 0.2s ease",
        touchAction: "none", // Prevent default touch behaviors
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
      {(siteName || brandBadgeIcon) && (
        <Link
          to={buildPath({ tenantSlug, lang, path: "" })}
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "white",
            pointerEvents: isDragging ? "none" : "auto",
          }}
          onClick={(e) => {
            if (isDragging) {
              e.preventDefault();
            }
          }}
        >
          {brandBadgeIcon && (
            <img 
              src={brandBadgeIcon} 
              alt={siteName || ""}
              style={{ 
                width: 28, 
                height: 28, 
                objectFit: "contain",
                borderRadius: 4,
              }}
            />
          )}
          {siteName && (
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {siteName}
            </span>
          )}
        </Link>
      )}
    </header>
  );
}


// src/ui/layout/Header.tsx
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTenantContext } from "../../app/tenant/useTenantContext";
import { buildPath } from "../../app/routing/buildPath";
import { getSiteSettings } from "../../api/places.api";

export function Header() {
  const { lang, tenantSlug } = useTenantContext();
  // Load saved position from localStorage with lazy initializer
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return { top: 32, left: 32 };
    const saved = localStorage.getItem("headerPosition");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { top: 32, left: 32 };
      }
    }
    return { top: 32, left: 32 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const headerRef = useRef<HTMLElement>(null);
  const isDesktop = typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;

  // Load site name from settings
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", lang],
    queryFn: () => getSiteSettings(lang),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const siteName = siteSettings?.siteName || "HelloLocal";

  // Save position to localStorage
  useEffect(() => {
    if (position.top !== 32 || position.left !== 32) {
      localStorage.setItem("headerPosition", JSON.stringify(position));
    }
  }, [position]);

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
        zIndex: 1000,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: 16,
        padding: "12px 24px",
        boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3), 0 4px 8px rgba(0, 0, 0, 0.1)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(10px)",
        cursor: isDesktop ? (isDragging ? "grabbing" : "grab") : "default",
        userSelect: "none",
        transition: isDragging ? "none" : "box-shadow 0.2s ease",
        touchAction: "none", // Prevent default touch behaviors
      }}
      onMouseEnter={(e) => {
        if (isDesktop && !isDragging) {
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.3), 0 4px 8px rgba(0, 0, 0, 0.1)";
        }
      }}
    >
      <Link
        to={buildPath({ tenantSlug, lang, path: "" })}
        style={{
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "white",
          pointerEvents: isDragging ? "none" : "auto",
        }}
        onClick={(e) => {
          if (isDragging) {
            e.preventDefault();
          }
        }}
      >
        <span style={{ fontSize: 28 }}>📍</span>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
          {siteName}
        </span>
      </Link>
    </header>
  );
}


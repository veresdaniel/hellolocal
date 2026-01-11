// src/components/FloatingHeader.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { buildPath } from "../app/routing/buildPath";
import { Link, useLocation } from "react-router-dom";
import { getSiteSettings } from "../api/places.api";

interface FloatingHeaderProps {
  onMapViewClick?: () => void;
}

export function FloatingHeader({ onMapViewClick }: FloatingHeaderProps = {}) {
  const { t } = useTranslation();
  const { lang, tenantSlug } = useTenantContext();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Load site name from settings
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", lang, tenantSlug],
    queryFn: () => getSiteSettings(lang, tenantSlug),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const siteName = siteSettings?.siteName || "HelloLocal";

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show header when scrolling up, hide when scrolling down
      if (currentScrollY < 100) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-mobile-menu]') && !target.closest('[data-mobile-menu-button]')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isMobileMenuOpen]);

  // Always show - this component is only called from PlacesListView and PlaceDetailPage
  // which are already in list/detail view context

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        transform: isVisible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.3s ease-in-out",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: isMobile ? "12px 16px" : "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link
          to={buildPath({ tenantSlug, lang, path: "" })}
          style={{
            textDecoration: "none",
            color: "#1a1a1a",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ fontSize: 24 }}>📍</span>
          <span>{siteName}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav style={{ display: isMobile ? "none" : "flex", gap: 24, alignItems: "center" }}>
          <Link
            to={buildPath({ tenantSlug, lang, path: "" })}
            style={{
              textDecoration: "none",
              color: "#666",
              fontSize: 14,
              fontWeight: 500,
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#667eea";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#666";
            }}
          >
            {t("public.home.title")}
          </Link>
          {onMapViewClick && (
            <button
              onClick={onMapViewClick}
              style={{
                background: "none",
                border: "none",
                color: "#666",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                padding: 0,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#667eea";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#666";
              }}
            >
              {t("public.mapView")}
            </button>
          )}
        </nav>

        {/* Mobile Menu Button */}
        {isMobile && (
          <button
            data-mobile-menu-button
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label={t("public.menu") || "Menu"}
          >
            <span
              style={{
                width: 24,
                height: 2,
                background: isMobileMenuOpen ? "transparent" : "#1a1a1a",
                transition: "all 0.3s ease",
                transform: isMobileMenuOpen ? "rotate(45deg)" : "none",
                position: isMobileMenuOpen ? "absolute" : "relative",
              }}
            />
            <span
              style={{
                width: 24,
                height: 2,
                background: "#1a1a1a",
                transition: "all 0.3s ease",
                opacity: isMobileMenuOpen ? 0 : 1,
              }}
            />
            <span
              style={{
                width: 24,
                height: 2,
                background: "#1a1a1a",
                transition: "all 0.3s ease",
                transform: isMobileMenuOpen ? "rotate(-45deg)" : "none",
                position: isMobileMenuOpen ? "absolute" : "relative",
              }}
            />
          </button>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {isMobile && (
        <>
          <div
            data-mobile-menu
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 1000,
              opacity: isMobileMenuOpen ? 1 : 0,
              visibility: isMobileMenuOpen ? "visible" : "hidden",
              transition: "opacity 0.3s ease, visibility 0.3s ease",
            }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <nav
            data-mobile-menu
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "280px",
              maxWidth: "85vw",
              background: "white",
              zIndex: 1001,
              boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.15)",
              transform: isMobileMenuOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.3s ease",
              padding: "80px 24px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              overflowY: "auto",
            }}
          >
            <Link
              to={buildPath({ tenantSlug, lang, path: "" })}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                textDecoration: "none",
                color: "#1a1a1a",
                fontSize: 18,
                fontWeight: 600,
                padding: "16px 20px",
                borderRadius: 12,
                transition: "all 0.2s",
                background: location.pathname === buildPath({ tenantSlug, lang, path: "" }) ? "rgba(102, 126, 234, 0.1)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== buildPath({ tenantSlug, lang, path: "" })) {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== buildPath({ tenantSlug, lang, path: "" })) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {t("public.home.title")}
            </Link>
            {onMapViewClick && (
              <button
                onClick={() => {
                  onMapViewClick();
                  setIsMobileMenuOpen(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#1a1a1a",
                  fontSize: 18,
                  fontWeight: 600,
                  padding: "16px 20px",
                  borderRadius: 12,
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {t("public.mapView")}
              </button>
            )}
            <Link
              to={buildPath({ tenantSlug, lang, path: "impresszum" })}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                textDecoration: "none",
                color: "#1a1a1a",
                fontSize: 18,
                fontWeight: 600,
                padding: "16px 20px",
                borderRadius: 12,
                transition: "all 0.2s",
                background: location.pathname.includes("impresszum") ? "rgba(102, 126, 234, 0.1)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!location.pathname.includes("impresszum")) {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!location.pathname.includes("impresszum")) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {t("public.legal.imprint.title")}
            </Link>
            <Link
              to={buildPath({ tenantSlug, lang, path: "aszf" })}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                textDecoration: "none",
                color: "#1a1a1a",
                fontSize: 18,
                fontWeight: 600,
                padding: "16px 20px",
                borderRadius: 12,
                transition: "all 0.2s",
                background: location.pathname.includes("aszf") ? "rgba(102, 126, 234, 0.1)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!location.pathname.includes("aszf")) {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!location.pathname.includes("aszf")) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {t("public.legal.terms.title")}
            </Link>
            <Link
              to={buildPath({ tenantSlug, lang, path: "adatvedelem" })}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                textDecoration: "none",
                color: "#1a1a1a",
                fontSize: 18,
                fontWeight: 600,
                padding: "16px 20px",
                borderRadius: 12,
                transition: "all 0.2s",
                background: location.pathname.includes("adatvedelem") ? "rgba(102, 126, 234, 0.1)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!location.pathname.includes("adatvedelem")) {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!location.pathname.includes("adatvedelem")) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {t("public.legal.privacy.title")}
            </Link>
          </nav>
        </>
      )}
    </header>
  );
}


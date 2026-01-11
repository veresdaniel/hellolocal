// src/components/FloatingHeader.tsx
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { buildPath } from "../app/routing/buildPath";
import { Link, useLocation } from "react-router-dom";
import { getSiteSettings } from "../api/places.api";
import { LanguageSelector } from "./LanguageSelector";

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
  const queryClient = useQueryClient();
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
  }, [lang, tenantSlug, queryClient]);

  const siteName = siteSettings?.siteName || t("common.siteName", { defaultValue: "" });
  const brandBadgeIcon = siteSettings?.brandBadgeIcon;
  const [logoError, setLogoError] = useState(false);
  
  // Log when brandBadgeIcon changes
  useEffect(() => {
    if (brandBadgeIcon) {
      console.log("[FloatingHeader] Setting brandBadgeIcon:", brandBadgeIcon);
    }
  }, [brandBadgeIcon]);

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

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobile && isMobileMenuOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isMobile, isMobileMenuOpen]);

  // Always show - this component is only called from PlacesListView and PlaceDetailPage
  // which are already in list/detail view context

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: isMobileMenuOpen ? 10001 : 1000,
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
          padding: isMobile ? "12px 16px" : "16px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {(siteName || brandBadgeIcon) && (
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
                fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {brandBadgeIcon && !logoError && (
                <img 
                  src={brandBadgeIcon} 
                  alt={siteName || ""}
                  style={{ 
                    height: 32, 
                    width: "auto",
                    objectFit: "contain",
                    borderRadius: 4,
                    display: "block",
                  }}
                  onError={(e) => {
                    console.warn("[FloatingHeader] Failed to load brandBadgeIcon:", brandBadgeIcon);
                    setLogoError(true);
                    e.currentTarget.style.display = "none";
                  }}
                  onLoad={() => {
                    setLogoError(false);
                  }}
                />
              )}
              {siteName && (
                <span>{siteName}</span>
              )}
            </Link>
          )}
        </div>

        {/* Desktop Navigation */}
        <nav style={{ display: isMobile ? "none" : "flex", gap: 24, alignItems: "center", marginLeft: "auto" }}>
          {/* Map view button - only show on list view */}
          {onMapViewClick && (
            <>
              <button
                onClick={onMapViewClick}
                style={{
                  background: "rgba(102, 126, 234, 0.1)",
                  border: "1px solid rgba(102, 126, 234, 0.3)",
                  borderRadius: 8,
                  color: "#667eea",
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  cursor: "pointer",
                  padding: "8px 16px",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: "auto",
                  lineHeight: 1,
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(102, 126, 234, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(102, 126, 234, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.3)";
                }}
              >
                📍 {t("public.mapView")}
              </button>
              {/* Vertical separator */}
              <div
                style={{
                  width: 1,
                  height: 24,
                  background: "rgba(0, 0, 0, 0.08)",
                }}
              />
            </>
          )}
          {/* Language selector on list view - on the right side */}
          <LanguageSelector />
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

      {/* Mobile Menu Overlay - Full Screen */}
      {isMobile && (
        <nav
          data-mobile-menu
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            background: "white",
            zIndex: 10000,
            opacity: isMobileMenuOpen ? 1 : 0,
            visibility: isMobileMenuOpen ? "visible" : "hidden",
            transition: "opacity 0.3s ease, visibility 0.3s ease",
            pointerEvents: isMobileMenuOpen ? "auto" : "none",
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            padding: "80px 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
          onClick={(e) => {
            // Close menu when clicking on the overlay (not on menu items)
            if (e.target === e.currentTarget) {
              setIsMobileMenuOpen(false);
            }
          }}
        >
          {/* Close Button - Top Right */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen(false);
            }}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10001,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "rgba(0, 0, 0, 0.1)",
            }}
            aria-label={t("public.close") || "Bezárás"}
          >
            <span
              style={{
                width: 24,
                height: 2,
                background: "#1a1a1a",
                transition: "all 0.3s ease",
                transform: "rotate(45deg)",
                position: "absolute",
              }}
            />
            <span
              style={{
                width: 24,
                height: 2,
                background: "#1a1a1a",
                transition: "all 0.3s ease",
                transform: "rotate(-45deg)",
                position: "absolute",
              }}
            />
          </button>
            {/* Language selector in mobile menu */}
            <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(0, 0, 0, 0.1)", marginTop: 12 }}>
              <LanguageSelector />
            </div>
            <Link
              to={buildPath({ tenantSlug, lang, path: "impresszum" })}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                textDecoration: "none",
                color: "#1a1a1a",
                fontSize: 20,
                fontWeight: 500,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                padding: "20px 24px",
                minHeight: "56px",
                borderRadius: 12,
                transition: "all 0.2s",
                background: location.pathname.includes("impresszum") ? "rgba(102, 126, 234, 0.1)" : "transparent",
                display: "flex",
                alignItems: "center",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "rgba(102, 126, 234, 0.2)",
              }}
              onTouchStart={(e) => {
                if (!location.pathname.includes("impresszum")) {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                }
              }}
              onTouchEnd={(e) => {
                if (!location.pathname.includes("impresszum")) {
                  setTimeout(() => {
                    e.currentTarget.style.background = "transparent";
                  }, 150);
                }
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
                fontSize: 20,
                fontWeight: 500,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                padding: "20px 24px",
                minHeight: "56px",
                borderRadius: 12,
                transition: "all 0.2s",
                background: location.pathname.includes("aszf") ? "rgba(102, 126, 234, 0.1)" : "transparent",
                display: "flex",
                alignItems: "center",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "rgba(102, 126, 234, 0.2)",
              }}
              onTouchStart={(e) => {
                if (!location.pathname.includes("aszf")) {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                }
              }}
              onTouchEnd={(e) => {
                if (!location.pathname.includes("aszf")) {
                  setTimeout(() => {
                    e.currentTarget.style.background = "transparent";
                  }, 150);
                }
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
                fontSize: 20,
                fontWeight: 500,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                padding: "20px 24px",
                minHeight: "56px",
                borderRadius: 12,
                transition: "all 0.2s",
                background: location.pathname.includes("adatvedelem") ? "rgba(102, 126, 234, 0.1)" : "transparent",
                display: "flex",
                alignItems: "center",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "rgba(102, 126, 234, 0.2)",
              }}
              onTouchStart={(e) => {
                if (!location.pathname.includes("adatvedelem")) {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                }
              }}
              onTouchEnd={(e) => {
                if (!location.pathname.includes("adatvedelem")) {
                  setTimeout(() => {
                    e.currentTarget.style.background = "transparent";
                  }, 150);
                }
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
            <Link
              to={buildPath({ tenantSlug, lang, path: "static-pages" })}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                textDecoration: "none",
                color: "#1a1a1a",
                fontSize: 20,
                fontWeight: 500,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                padding: "20px 24px",
                minHeight: "56px",
                borderRadius: 12,
                transition: "all 0.2s",
                background: location.pathname.includes("static-pages") ? "rgba(102, 126, 234, 0.1)" : "transparent",
                display: "flex",
                alignItems: "center",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "rgba(102, 126, 234, 0.2)",
              }}
              onTouchStart={(e) => {
                if (!location.pathname.includes("static-pages")) {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                }
              }}
              onTouchEnd={(e) => {
                if (!location.pathname.includes("static-pages")) {
                  setTimeout(() => {
                    e.currentTarget.style.background = "transparent";
                  }, 150);
                }
              }}
              onMouseEnter={(e) => {
                if (!location.pathname.includes("static-pages")) {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!location.pathname.includes("static-pages")) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {t("admin.dashboardCards.staticPages")}
            </Link>
          </nav>
      )}
    </header>
  );
}


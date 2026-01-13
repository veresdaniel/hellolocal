// src/components/FloatingHeader.tsx
import { useState, useEffect, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { buildUrl } from "../app/urls";
import { useRouteCtx } from "../app/useRouteCtx";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePlatformSettingsContextOptional } from "../context/PlatformSettingsContext";
import { LanguageSelector } from "./LanguageSelector";
import { AuthContext } from "../contexts/AuthContext";
import { activateFreeSite } from "../api/sites.api";
import { useToast } from "../contexts/ToastContext";
import { DEFAULT_LANG } from "../app/config";

interface FloatingHeaderProps {
  onMapViewClick?: () => void;
}

export function FloatingHeader({ onMapViewClick }: FloatingHeaderProps = {}) {
  const { t } = useTranslation();
  const { lang, tenantKey } = useRouteCtx();
  const location = useLocation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const isLoading = authContext?.isLoading ?? false;
  const { showToast } = useToast();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // Use site settings from context (loaded once at TenantLayout level)
  // If context is not available (e.g., on TenantsListPage), use undefined
  const platformSettings = usePlatformSettingsContextOptional();

  const siteName = platformSettings?.site.name || t("common.siteName", { defaultValue: "" });
  const brandBadgeIcon = platformSettings?.placeholders.avatar;
  const [logoError, setLogoError] = useState(false);

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

  // Check if user is a visitor (activeSiteId === null)
  const isVisitor = user && (user.activeSiteId === null || user.activeSiteId === undefined);
  const hasActiveSite = user && user.activeSiteId !== null && user.activeSiteId !== undefined;
  // Show auth buttons on all non-map view pages
  // FloatingHeader only appears on non-map view pages, so we should always show buttons here
  // The onMapViewClick prop indicates we're on a list view page (definitely show buttons)
  // If onMapViewClick is undefined, we're still on a non-map page (like detail pages), so show buttons
  const showAuthButtons = true; // Always show on FloatingHeader pages (all non-map views)

  const handleActivateFree = async () => {
    try {
      setIsActivating(true);
      const result = await activateFreeSite(lang);
      showToast(t("public.activateFree.success") || "Free site activated successfully!", "success");
      // Refresh user data and redirect to dashboard
      if (authContext) {
        // Reload user data
        window.location.href = `/${lang}/admin`;
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : (t("public.activateFree.error") || "Failed to activate free site"),
        "error"
      );
    } finally {
      setIsActivating(false);
      setShowActivationModal(false);
    }
  };

  // Always show header - works on all pages including TenantsListPage

  return (
    <>
      {/* Modal animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
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
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          padding: isMobile ? "12px 0" : "16px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxSizing: "border-box",
          gap: "clamp(16px, 4vw, 32px)",
        }}
      >
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 16, 
          flexShrink: 0,
          paddingLeft: isMobile ? 16 : 24,
          boxSizing: "border-box",
        }}>
          <Link
            to={buildUrl({ lang, tenantKey: tenantKey || undefined, path: "" })}
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
              lineHeight: 1,
              margin: 0,
              padding: 0,
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
                  verticalAlign: "middle",
                  flexShrink: 0,
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
            <span style={{ 
              display: "inline-flex",
              alignItems: "center",
              lineHeight: 1,
            }}>
              {siteName ? (
                <span>{siteName}</span>
              ) : (
                <span>{t("common.siteName", { defaultValue: "HelloLocal" }) || "HelloLocal"}</span>
              )}
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav style={{ 
          display: isMobile ? "none" : "flex", 
          gap: "clamp(8px, 1.5vw, 16px)", 
          alignItems: "center", 
          flexShrink: 0,
          paddingRight: isMobile ? 16 : 24,
          boxSizing: "border-box",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          maxWidth: "100%",
        }}>
          {/* Not logged in: Sign in and Sign up buttons */}
            {!user && !isLoading && showAuthButtons && (
            <>
              <Link
                to={buildUrl({ lang, path: "admin/login" })}
                style={{
                  textDecoration: "none",
                  color: "#1a1a1a",
                  fontSize: "clamp(12px, 2.5vw, 16px)",
                  fontWeight: 500,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  padding: "clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 16px)",
                  borderRadius: 8,
                  transition: "all 0.2s",
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                  background: "white",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  height: "clamp(36px, 4vw, 40px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f5f5f5";
                  e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.1)";
                }}
              >
                {t("admin.login") || "Bejelentkezés"}
              </Link>
              <Link
                to={buildUrl({ lang, path: "admin/register" })}
                style={{
                  textDecoration: "none",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  fontSize: "clamp(12px, 2.5vw, 16px)",
                  fontWeight: 600,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  padding: "clamp(8px, 1.5vw, 10px) clamp(16px, 2.5vw, 20px)",
                  borderRadius: 8,
                  transition: "all 0.2s",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  height: "clamp(36px, 4vw, 40px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                }}
              >
                {t("admin.register") || "Regisztráció"}
              </Link>
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

          {/* Logged in: User info and action buttons */}
          {user && showAuthButtons && (
            <>
              {/* Username */}
              <span
                style={{
                  fontSize: "clamp(12px, 2.5vw, 16px)",
                  fontWeight: 500,
                  color: "#1a1a1a",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  maxWidth: "clamp(80px, 15vw, 200px)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flexShrink: 1,
                }}
                title={user.username || user.email || t("admin.user") || "User"}
              >
                {user.username || user.email || t("admin.user") || "User"}
              </span>
              {/* Vertical separator */}
              <div
                style={{
                  width: 1,
                  height: 24,
                  background: "rgba(0, 0, 0, 0.08)",
                }}
              />
              {/* Visitor - Switch to free plan */}
              {isVisitor && (
                <>
                  <button
                    onClick={() => setShowActivationModal(true)}
                    style={{
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      border: "none",
                      borderRadius: 8,
                      color: "white",
                      fontSize: "clamp(12px, 2.5vw, 16px)",
                      fontWeight: 600,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      cursor: "pointer",
                      padding: "clamp(8px, 1.5vw, 10px) clamp(16px, 2.5vw, 20px)",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "clamp(4px, 1vw, 8px)",
                      height: "clamp(36px, 4vw, 40px)",
                      lineHeight: 1,
                      boxSizing: "border-box",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                    }}
                  >
                    ✨ {t("public.activateFree.cta") || "Ingyenes oldal aktiválása"}
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
              {/* Has active site - Dashboard button */}
              {hasActiveSite && (
                <>
                  <Link
                    to={buildUrl({ lang, path: "admin" })}
                    style={{
                      textDecoration: "none",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      fontSize: "clamp(12px, 2.5vw, 16px)",
                      fontWeight: 600,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      padding: "clamp(8px, 1.5vw, 10px) clamp(16px, 2.5vw, 20px)",
                      borderRadius: 8,
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "clamp(4px, 1vw, 8px)",
                      height: "clamp(36px, 4vw, 40px)",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                    }}
                  >
                    📊 {t("admin.dashboard") || "Dashboard"}
                  </Link>
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
              {/* Logout button */}
              <button
                onClick={async () => {
                  if (authContext) {
                    await authContext.logout(true);
                  }
                }}
                style={{
                  background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  border: "none",
                  borderRadius: 8,
                  color: "white",
                  fontSize: "clamp(12px, 2.5vw, 16px)",
                  fontWeight: 500,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  cursor: "pointer",
                  padding: "clamp(8px, 1.5vw, 10px) clamp(16px, 2.5vw, 20px)",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "clamp(4px, 1vw, 8px)",
                  height: "clamp(36px, 4vw, 40px)",
                  boxShadow: "0 4px 12px rgba(245, 87, 108, 0.3)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(245, 87, 108, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 87, 108, 0.3)";
                }}
              >
                🚪 {t("admin.logout") || "Kijelentkezés"}
              </button>
            </>
          )}

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
                  fontSize: "clamp(12px, 2.5vw, 16px)",
                  fontWeight: 500,
                  height: "clamp(36px, 4vw, 40px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  cursor: "pointer",
                  padding: "8px 16px",
                  transition: "all 0.2s",
                  gap: 6,
                  lineHeight: 1,
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
              marginRight: 16,
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
            {/* Not logged in: Sign in and Sign up buttons - Mobile */}
            {!user && !isLoading && showAuthButtons && (
              <>
                <Link
                  to={buildUrl({ lang, path: "admin/login" })}
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
                    background: "transparent",
                    display: "flex",
                    alignItems: "center",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "rgba(0, 0, 0, 0.1)",
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                  }}
                  onTouchEnd={(e) => {
                    setTimeout(() => {
                      e.currentTarget.style.background = "transparent";
                    }, 150);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {t("admin.login") || "Bejelentkezés"}
                </Link>
                <Link
                  to={buildUrl({ lang, path: "admin/register" })}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    textDecoration: "none",
                    margin: "0 24px 20px 24px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    fontSize: 18,
                    fontWeight: 600,
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    padding: "16px 24px",
                    borderRadius: 12,
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "rgba(102, 126, 234, 0.2)",
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = "scale(0.98)";
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {t("admin.register") || "Regisztráció"}
                </Link>
              </>
            )}

            {/* Logged in: User info and action buttons - Mobile */}
            {user && showAuthButtons && (
              <>
                {/* Username - Mobile */}
                <div
                  style={{
                    padding: "20px 24px",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#1a1a1a",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
                  }}
                >
                  {user.username || user.email || t("admin.user") || "User"}
                </div>
                {/* Visitor - Switch to free plan - Mobile */}
                {isVisitor && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowActivationModal(true);
                    }}
                    style={{
                      margin: "20px 24px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      border: "none",
                      borderRadius: 12,
                      color: "white",
                      fontSize: 18,
                      fontWeight: 600,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      cursor: "pointer",
                      padding: "16px 24px",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "rgba(102, 126, 234, 0.2)",
                    }}
                    onTouchStart={(e) => {
                      e.currentTarget.style.transform = "scale(0.98)";
                    }}
                    onTouchEnd={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    ✨ {t("public.activateFree.cta") || "Ingyenes oldal aktiválása"}
                  </button>
                )}
                {/* Has active site - Dashboard button - Mobile */}
                {hasActiveSite && (
                  <Link
                    to={buildUrl({ lang, path: "admin" })}
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      textDecoration: "none",
                      margin: "20px 24px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      fontSize: 18,
                      fontWeight: 600,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      padding: "16px 24px",
                      borderRadius: 12,
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "rgba(102, 126, 234, 0.2)",
                    }}
                    onTouchStart={(e) => {
                      e.currentTarget.style.transform = "scale(0.98)";
                    }}
                    onTouchEnd={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    📊 {t("admin.dashboard") || "Dashboard"}
                  </Link>
                )}
                {/* Logout button - Mobile */}
                <button
                  onClick={async () => {
                    setIsMobileMenuOpen(false);
                    if (authContext) {
                      await authContext.logout(true);
                    }
                  }}
                  style={{
                    margin: "0 24px 20px 24px",
                    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    border: "none",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 18,
                    fontWeight: 500,
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    cursor: "pointer",
                    padding: "16px 24px",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "0 4px 12px rgba(245, 87, 108, 0.3)",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "rgba(245, 87, 108, 0.2)",
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = "scale(0.98)";
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  🚪 {t("admin.logout") || "Kijelentkezés"}
                </button>
              </>
            )}
            {/* Language selector in mobile menu */}
            <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(0, 0, 0, 0.1)", marginTop: 12 }}>
              <LanguageSelector />
            </div>
            <Link
              to={buildUrl({ lang, tenantKey: tenantKey || undefined, path: "impresszum" })}
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
              to={buildUrl({ lang, tenantKey: tenantKey || undefined, path: "aszf" })}
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
              to={buildUrl({ lang, tenantKey: tenantKey || undefined, path: "adatvedelem" })}
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
              to={buildUrl({ lang, tenantKey: tenantKey || undefined, path: "static-pages" })}
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

      {/* Activation Confirmation Modal */}
      {showActivationModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10002,
            padding: isMobile ? 16 : 24,
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isActivating) {
              setShowActivationModal(false);
            }
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: "clamp(20px, 4vw, 32px)",
              maxWidth: isMobile ? "calc(100% - 32px)" : "min(500px, calc(100% - 48px))",
              width: "100%",
              maxHeight: "calc(100vh - 48px)",
              overflowY: "auto",
              boxSizing: "border-box",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              animation: "modalSlideIn 0.3s ease-out",
              transform: "translateY(0)",
              display: "flex",
              flexDirection: "column",
              gap: "clamp(16px, 3vw, 24px)",
              position: "relative",
              margin: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: 16,
                fontSize: isMobile ? 20 : 24,
                fontWeight: 700,
                fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                color: "#1a1a1a",
              }}
            >
              {t("public.activateFree.modal.title") || "Ingyenes oldal aktiválása"}
            </h2>
            <p
              style={{
                margin: 0,
                marginBottom: 24,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                color: "#666",
                lineHeight: 1.6,
              }}
            >
              {t("public.activateFree.modal.description") || "Biztosan aktiválni szeretnéd az ingyenes oldalt? Ez lehetővé teszi, hogy hozzáférj a dashboardhoz és kezdj el dolgozni az oldaladon."}
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setShowActivationModal(false)}
                disabled={isActivating}
                style={{
                  padding: "10px 20px",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontWeight: 500,
                  background: "#f5f5f5",
                  color: "#666",
                  border: "none",
                  borderRadius: 8,
                  cursor: isActivating ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  opacity: isActivating ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isActivating) {
                    e.currentTarget.style.background = "#e0e0e0";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActivating) {
                    e.currentTarget.style.background = "#f5f5f5";
                  }
                }}
              >
                {t("common.cancel") || "Mégse"}
              </button>
              <button
                onClick={handleActivateFree}
                disabled={isActivating}
                style={{
                  padding: "10px 20px",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontWeight: 600,
                  background: isActivating
                    ? "#999"
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: isActivating ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  boxShadow: isActivating
                    ? "none"
                    : "0 4px 12px rgba(102, 126, 234, 0.3)",
                }}
                onMouseEnter={(e) => {
                  if (!isActivating) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActivating) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                  }
                }}
              >
                {isActivating
                  ? t("common.loading") || "Betöltés..."
                  : t("public.activateFree.modal.confirm") || "Aktiválás"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
    </>
  );
}


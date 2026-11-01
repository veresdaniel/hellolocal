// src/components/FloatingHeader.tsx
import { useState, useEffect, useContext, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { buildUrl } from "../app/urls";
import { useRouteCtx } from "../app/useRouteCtx";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePlatformSettingsContextOptional } from "../context/PlatformSettingsContext";
import { LanguageSelector } from "./LanguageSelector";
import { AuthContext } from "../contexts/AuthContext";
import { useAdminSite } from "../contexts/useAdminSite";
import { activateFreeSite } from "../api/sites.api";
import { getCurrentUser } from "../api/admin.api";
import { useToast } from "../contexts/ToastContext";
import { DEFAULT_LANG, DEFAULT_SITE_SLUG } from "../app/config";
import { ROLE_SUPERADMIN } from "../types/enums";
import { useViewStore } from "../stores/useViewStore";
import { openSiteExplore } from "../utils/siteLanding";
import { BREAKPOINTS } from "../utils/viewport";

interface FloatingHeaderProps {
  onMapViewClick?: () => void;
  editUrl?: string; // Admin edit URL for current page (e.g., "/hu/admin/places/123")
  showEditButton?: boolean; // Whether to show edit button (based on permissions)
  hideMapViewButton?: boolean; // Whether to hide the map view button
  landingMode?: boolean; // Opening page: keep the map action available
}

export function FloatingHeader({
  onMapViewClick,
  editUrl,
  showEditButton = false,
  hideMapViewButton = false,
  landingMode = false,
}: FloatingHeaderProps = {}) {
  const { t } = useTranslation();
  const { lang, siteKey, siteKeyParam } = useRouteCtx();
  const location = useLocation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const isLoading = authContext?.isLoading ?? false;
  const { reloadSites } = useAdminSite();
  const { showToast } = useToast();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // Get showMap state from store to check if we're actually on map view (not just on home page)
  const { showMap } = useViewStore();
  const isOverview = location.pathname.includes("/overview");
  const homePath = buildUrl({ lang, siteKey: siteKey || DEFAULT_SITE_SLUG, path: "" });
  const isOnSiteHome =
    location.pathname === homePath || location.pathname === `${homePath}/`;
  // List discovery: site name belongs in the page H1 ("Szeged felfedezése"), not as a left nav label.
  const isListDiscover = isOnSiteHome && !showMap && !landingMode && !isOverview;
  const openExplore = (mode: "map" | "list") => {
    setIsMobileMenuOpen(false);
    openSiteExplore(mode);
    const homePath = buildUrl({ lang, siteKey: siteKey || DEFAULT_SITE_SLUG, path: "" });
    if (location.pathname !== homePath && location.pathname !== `${homePath}/`) {
      navigate(homePath);
    }
  };
  const menuButton = (primary: boolean, wide: boolean): CSSProperties => ({
    flex: wide ? 1 : undefined,
    minHeight: wide ? 52 : 44,
    padding: wide ? "12px 16px" : "0 18px",
    border: primary
      ? "1px solid #fffdf9"
      : "1px solid rgba(242, 244, 251, 0.28)",
    borderRadius: 999,
    background: primary ? "#fffdf9" : "rgba(242, 244, 251, 0.08)",
    color: primary ? "#1b1730" : "#f2f4fb",
    fontWeight: 700,
    fontSize: wide ? 16 : 15,
    letterSpacing: "-0.01em",
    cursor: "pointer",
    fontFamily: "Inter, system-ui, sans-serif",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    lineHeight: 1,
  });
  const exploreModes = (wide: boolean) => (
    <div
      style={{
        display: "flex",
        gap: 8,
        width: wide ? "100%" : "auto",
      }}
    >
      {(
        [
          ["map", t("public.mapView"), true],
          ["list", t("public.listView"), false],
        ] as const
      ).map(([mode, label, primary]) => (
        <button key={mode} type="button" onClick={() => openExplore(mode)} style={menuButton(primary, wide)}>
          {label}
        </button>
      ))}
    </div>
  );

  // Use site settings from context (loaded once at TenantLayout level)
  // If context is not available (e.g., on TenantsListPage), use undefined
  const platformSettings = usePlatformSettingsContextOptional();

  const siteName = platformSettings?.site.name || t("common.siteName", { defaultValue: "" });
  const brandBadgeIcon = platformSettings?.placeholders.avatar;
  const [logoError, setLogoError] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.tablet);
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
      if (!target.closest("[data-mobile-menu]") && !target.closest("[data-mobile-menu-button]")) {
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
  // Superadmin is never a visitor - they have access to everything
  const isSuperadmin = user?.role === ROLE_SUPERADMIN;
  const isVisitor =
    user && !isSuperadmin && (user.activeSiteId === null || user.activeSiteId === undefined);
  const hasActiveSite =
    user && (isSuperadmin || (user.activeSiteId !== null && user.activeSiteId !== undefined));
  // Show auth buttons on all non-map view pages
  // FloatingHeader only appears on non-map view pages, so we should always show buttons here
  // The onMapViewClick prop indicates we're on a list view page (definitely show buttons)
  // If onMapViewClick is undefined, we're still on a non-map page (like detail pages), so show buttons
  const showAuthButtons = true; // Always show on FloatingHeader pages (all non-map views)

  const handleActivateFree = async () => {
    try {
      setIsActivating(true);
      // Pass the current siteKey so the backend knows which site to assign
      // Only pass siteKey if it's actually in the URL (not the default fallback)
      const effectiveSiteKey = siteKeyParam || undefined;
      const result = await activateFreeSite(lang, effectiveSiteKey);
      showToast(t("public.activateFree.success"), "success");

      // Fetch fresh user data from API to get updated activeSiteId
      try {
        const freshUser = await getCurrentUser();
        // Backend now returns siteIds directly, but also has sites array
        // Use siteIds if available, otherwise extract from sites array
        const siteIds =
          (freshUser as any).siteIds ||
          freshUser.sites?.map((s: { siteId: string }) => s.siteId) ||
          [];
        const userData = {
          ...freshUser,
          siteIds,
          role: freshUser.role.toLowerCase() as "superadmin" | "admin" | "editor" | "viewer",
        };
        // Update localStorage with fresh user data
        localStorage.setItem("user", JSON.stringify(userData));

        // Trigger AuthContext refresh to update UI
        if (authContext && authContext.refreshUser) {
          await authContext.refreshUser();
          // Wait a bit for AuthContext to update, then reload sites in AdminSiteContext
          // This ensures the user object with updated siteIds is available
          setTimeout(() => {
            reloadSites();
          }, 200);
        } else {
          // If refreshUser is not available, still try to reload sites
          reloadSites();
        }
      } catch (refreshError) {
        console.error("Failed to refresh user data after activation:", refreshError);
        // Still try to refresh from context even if API call fails
        if (authContext && authContext.refreshUser) {
          await authContext.refreshUser();
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("public.activateFree.error"), "error");
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
          background: "rgba(22, 19, 42, 0.78)",
          backdropFilter: "blur(18px) saturate(1.2)",
          WebkitBackdropFilter: "blur(18px) saturate(1.2)",
          borderBottom: "1px solid rgba(242, 244, 251, 0.12)",
          boxShadow: "0 10px 28px rgba(0, 0, 0, 0.28)",
          transform: isVisible ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.3s ease-in-out",
          width: "100%",
          boxSizing: "border-box",
          color: "#f2f4fb",
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexShrink: 0,
              paddingLeft: isMobile ? 16 : 24,
              boxSizing: "border-box",
            }}
          >
            <Link
              to={buildUrl({ lang, siteKey: siteKey || undefined, path: "" })}
              aria-label={siteName || t("common.siteName", { defaultValue: "HelloLocal" }) || "HelloLocal"}
              style={{
                textDecoration: "none",
                color: "#fffdf9",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                fontFamily:
                  "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                lineHeight: 1,
                margin: 0,
                padding: 0,
              }}
            >
              {brandBadgeIcon && !logoError && (
                <img
                  src={brandBadgeIcon}
                  alt=""
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
              {/* On list discovery the site name lives in the page title; keep logo or product brand only. */}
              {(!isListDiscover || !brandBadgeIcon || logoError) && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    lineHeight: 1,
                    maxWidth: isMobile ? "min(58vw, 220px)" : "none",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isListDiscover
                      ? t("common.siteName", { defaultValue: "HelloLocal" }) || "HelloLocal"
                      : siteName ||
                        t("common.siteName", { defaultValue: "HelloLocal" }) ||
                        "HelloLocal"}
                  </span>
                </span>
              )}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav
            style={{
              display: isMobile ? "none" : "flex",
              gap: "clamp(8px, 1.5vw, 16px)",
              alignItems: "center",
              flexShrink: 0,
              paddingRight: isMobile ? 16 : 24,
              boxSizing: "border-box",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              maxWidth: "100%",
              alignSelf: "center",
            }}
          >
            {(isOverview || (!user && !isLoading && showAuthButtons)) && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {isOverview && (
                  <>
                    <button type="button" onClick={() => openExplore("map")} style={menuButton(true, false)}>
                      {t("public.mapView")}
                    </button>
                    <button type="button" onClick={() => openExplore("list")} style={menuButton(false, false)}>
                      {t("public.listView")}
                    </button>
                  </>
                )}
                {!user && !isLoading && showAuthButtons && (
                  <>
                    <Link to={buildUrl({ lang, path: "admin/login" })} style={menuButton(false, false)}>
                      {t("admin.login")}
                    </Link>
                    <Link to={buildUrl({ lang, path: "admin/register" })} style={menuButton(true, false)}>
                      {t("admin.register")}
                    </Link>
                  </>
                )}
              </div>
            )}
            {!user && !isLoading && showAuthButtons && (
              <div
                style={{
                  width: 1,
                  height: 24,
                  background: "rgba(242, 244, 251, 0.18)",
                }}
              />
            )}

            {/* Logged in: User info and action buttons */}
            {user && showAuthButtons && (
              <>
                {/* Edit button - shown if user has edit permissions for current page */}
                {showEditButton && editUrl && (
                  <>
                    <button
                      onClick={() => navigate(editUrl)}
                      style={{
                        padding: "6px 10px",
                        background: "rgba(196, 92, 38, 0.1)",
                        border: "1px solid rgba(196, 92, 38, 0.3)",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: "clamp(12px, 2.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#c45c26",
                        fontWeight: 600,
                        height: "clamp(36px, 4vw, 40px)",
                        boxSizing: "border-box",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(196, 92, 38, 0.2)";
                        e.currentTarget.style.borderColor = "rgba(196, 92, 38, 0.5)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(196, 92, 38, 0.1)";
                        e.currentTarget.style.borderColor = "rgba(196, 92, 38, 0.3)";
                      }}
                      title={t("admin.edit") || "Szerkesztés"}
                    >
                      ✏️
                    </button>
                    {/* Vertical separator */}
                    <div
                      style={{
                        width: 1,
                        height: 24,
                        background: "rgba(242, 244, 251, 0.18)",
                      }}
                    />
                  </>
                )}
                {/* Visitor - Switch to free plan */}
                {isVisitor && (
                  <>
                    <button
                      onClick={() => setShowActivationModal(true)}
                      style={{
                        background: "#fffdf9",
                        border: "none",
                        borderRadius: 8,
                        color: "#1b1730",
                        fontSize: "clamp(12px, 2.5vw, 16px)",
                        fontWeight: 600,
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.22)",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.22)";
                      }}
                    >
                      ✨ {t("public.activateFree.cta")}
                    </button>
                    {/* Vertical separator */}
                    <div
                      style={{
                        width: 1,
                        height: 24,
                        background: "rgba(242, 244, 251, 0.18)",
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
                        background: "#fffdf9",
                        color: "#1b1730",
                        fontSize: "clamp(12px, 2.5vw, 16px)",
                        fontWeight: 600,
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        padding: "clamp(8px, 1.5vw, 10px) clamp(16px, 2.5vw, 20px)",
                        borderRadius: 8,
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "clamp(4px, 1vw, 8px)",
                        height: "clamp(36px, 4vw, 40px)",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.22)",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        boxSizing: "border-box",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.22)";
                      }}
                    >
                      📊 {t("admin.dashboard")}
                    </Link>
                    {/* Vertical separator */}
                    <div
                      style={{
                        width: 1,
                        height: 24,
                        background: "rgba(242, 244, 251, 0.18)",
                      }}
                    />
                  </>
                )}
              </>
            )}

            {!location.pathname.includes("/admin") && !isOverview && (
              <Link
                to={buildUrl({ lang, path: "overview" })}
                style={{
                  background: "rgba(242, 244, 251, 0.08)",
                  border: "1px solid rgba(242, 244, 251, 0.28)",
                  borderRadius: 999,
                  color: "#f2f4fb",
                  fontSize: "clamp(12px, 2.5vw, 16px)",
                  fontWeight: 600,
                  height: "clamp(36px, 4vw, 40px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  cursor: "pointer",
                  padding: "8px 16px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {t("public.overview.menu")}
              </Link>
            )}
            {/* Map view button - show on all non-map view pages */}
            {(() => {
              // Don't show if explicitly hidden
              if (hideMapViewButton) return null;
              // Don't show on admin pages
              if (location.pathname.includes("/admin")) return null;

              // Check if we're on home page
              const isOnHomePage =
                location.pathname === buildUrl({ lang, siteKey: siteKey || undefined, path: "" }) ||
                location.pathname ===
                  buildUrl({ lang, siteKey: siteKey || undefined, path: "" }) + "/";

              // Check if we're actually on map view (homepage with showMap=true)
              // If we're on home page, check the showMap state from store
              // Otherwise, we're not on map view
              const isOnMapView = isOnHomePage && showMap && !landingMode;

              // Don't show on map view
              if (isOnMapView) return null;

              return (
                <>
                  <button
                    onClick={() => {
                      openSiteExplore("map");
                      if (onMapViewClick) {
                        onMapViewClick();
                        return;
                      }
                      const homePath = buildUrl({
                        lang,
                        siteKey: siteKey || undefined,
                        path: "",
                      });
                      if (location.pathname !== homePath && location.pathname !== `${homePath}/`) {
                        navigate(homePath);
                      }
                    }}
                    style={{
                      background: "rgba(242, 244, 251, 0.08)",
                      border: "1px solid rgba(242, 244, 251, 0.28)",
                      borderRadius: 999,
                      color: "#f2f4fb",
                      fontSize: "clamp(12px, 2.5vw, 16px)",
                      fontWeight: 600,
                      height: "clamp(36px, 4vw, 40px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxSizing: "border-box",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      cursor: "pointer",
                      padding: "8px 16px",
                      transition: "all 0.2s",
                      gap: 6,
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(242, 244, 251, 0.16)";
                      e.currentTarget.style.borderColor = "rgba(242, 244, 251, 0.42)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(242, 244, 251, 0.08)";
                      e.currentTarget.style.borderColor = "rgba(242, 244, 251, 0.28)";
                    }}
                  >
                    📍 {t("public.mapView")}
                  </button>
                  {/* Vertical separator */}
                  <div
                    style={{
                      width: 1,
                      height: 24,
                      background: "rgba(242, 244, 251, 0.18)",
                    }}
                  />
                </>
              );
            })()}
            {/* Language selector on list view */}
            <div className="hl-floating-header__lang">
              <LanguageSelector />
              <style>{`
                .hl-floating-header__lang select {
                  color: #f2f4fb !important;
                  border-color: rgba(242, 244, 251, 0.28) !important;
                  background: rgba(242, 244, 251, 0.08) !important;
                }
                .hl-floating-header__lang select option {
                  color: #1b1730 !important;
                  background: #fffdf9 !important;
                }
              `}</style>
            </div>

            {/* Username + logout — far right, after primary nav */}
            {user && showAuthButtons && (
              <>
                <div
                  style={{
                    width: 1,
                    height: 24,
                    background: "rgba(242, 244, 251, 0.18)",
                  }}
                />
                <span
                  style={{
                    fontSize: "clamp(12px, 2.5vw, 16px)",
                    fontWeight: 500,
                    color: "#f2f4fb",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    maxWidth: "clamp(80px, 15vw, 200px)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flexShrink: 1,
                    display: "flex",
                    alignItems: "center",
                    lineHeight: 1,
                  }}
                  title={user.username || user.email || t("admin.user") || ""}
                >
                  {user.username || user.email || t("admin.user") || "User"}
                </span>
                <div
                  style={{
                    width: 1,
                    height: 24,
                    background: "rgba(242, 244, 251, 0.18)",
                  }}
                />
                <button
                  onClick={async () => {
                    if (authContext) {
                      await authContext.logout(true);
                    }
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(242, 244, 251, 0.28)",
                    borderRadius: 999,
                    color: "#f2f4fb",
                    fontSize: "clamp(12px, 2.5vw, 16px)",
                    fontWeight: 500,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    cursor: "pointer",
                    padding: "clamp(8px, 1.5vw, 10px) clamp(16px, 2.5vw, 20px)",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "clamp(4px, 1vw, 8px)",
                    height: "clamp(36px, 4vw, 40px)",
                    boxShadow: "none",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    boxSizing: "border-box",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.background = "#fffdf9";
                    e.currentTarget.style.color = "#1b1730";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#f2f4fb";
                  }}
                >
                  🚪 {t("admin.logout")}
                </button>
              </>
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
                padding: 10,
                minWidth: 44,
                minHeight: 44,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
                boxSizing: "border-box",
                position: "relative",
                flexShrink: 0,
              }}
              aria-label={t("public.menu") || "Menu"}
            >
              <span
                style={{
                  width: 24,
                  height: 2,
                  background: isMobileMenuOpen ? "transparent" : "#f2f4fb",
                  transition: "all 0.3s ease",
                  transform: isMobileMenuOpen ? "rotate(45deg)" : "none",
                  position: isMobileMenuOpen ? "absolute" : "relative",
                }}
              />
              <span
                style={{
                  width: 24,
                  height: 2,
                  background: "#f2f4fb",
                  transition: "all 0.3s ease",
                  opacity: isMobileMenuOpen ? 0 : 1,
                }}
              />
              <span
                style={{
                  width: 24,
                  height: 2,
                  background: "#f2f4fb",
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
              width: "100%",
              maxWidth: "100%",
              height: "100%",
              background: "#fffdf9",
              zIndex: 10000,
              opacity: isMobileMenuOpen ? 1 : 0,
              visibility: isMobileMenuOpen ? "visible" : "hidden",
              transition: "opacity 0.3s ease, visibility 0.3s ease",
              pointerEvents: isMobileMenuOpen ? "auto" : "none",
              overflowY: "auto",
              overflowX: "hidden",
              WebkitOverflowScrolling: "touch",
              padding: "80px 24px max(24px, env(safe-area-inset-bottom))",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxSizing: "border-box",
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
                top: 12,
                right: 12,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 12,
                minWidth: 44,
                minHeight: 44,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10001,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "rgba(0, 0, 0, 0.1)",
                boxSizing: "border-box",
              }}
              aria-label={t("public.close")}
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
            {isOverview && exploreModes(true)}
            {/* Not logged in: Sign in and Sign up buttons - Mobile */}
            {!user && !isLoading && showAuthButtons && (
              <>
                <div style={{ display: "flex", gap: 8, width: "100%" }}>
                  <Link
                    to={buildUrl({ lang, path: "admin/login" })}
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={menuButton(false, true)}
                  >
                    {t("admin.login")}
                  </Link>
                  <Link
                    to={buildUrl({ lang, path: "admin/register" })}
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={menuButton(true, true)}
                  >
                    {t("admin.register")}
                  </Link>
                </div>
              </>
            )}

            {/* Logged in: primary action buttons - Mobile */}
            {user && showAuthButtons && (
              <>
                {/* Visitor - Switch to free plan - Mobile */}
                {isVisitor && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowActivationModal(true);
                    }}
                    style={{
                      margin: "20px 24px",
                      background: "#1b1730",
                      border: "none",
                      borderRadius: 12,
                      color: "white",
                      fontSize: 18,
                      fontWeight: 600,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      cursor: "pointer",
                      padding: "16px 24px",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 4px 12px rgba(196, 92, 38, 0.3)",
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "rgba(196, 92, 38, 0.2)",
                    }}
                    onTouchStart={(e) => {
                      e.currentTarget.style.transform = "scale(0.98)";
                    }}
                    onTouchEnd={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    ✨ {t("public.activateFree.cta")}
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
                      background: "#1b1730",
                      color: "white",
                      fontSize: 18,
                      fontWeight: 600,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      padding: "16px 24px",
                      borderRadius: 12,
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 4px 12px rgba(196, 92, 38, 0.3)",
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "rgba(196, 92, 38, 0.2)",
                    }}
                    onTouchStart={(e) => {
                      e.currentTarget.style.transform = "scale(0.98)";
                    }}
                    onTouchEnd={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    📊 {t("admin.dashboard")}
                  </Link>
                )}
              </>
            )}
            {!location.pathname.includes("/admin") && !isOverview && (
              <Link
                to={buildUrl({ lang, path: "overview" })}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  margin: "20px 24px 0",
                  background: "rgba(242, 244, 251, 0.08)",
                  border: "1px solid rgba(27, 23, 48, 0.16)",
                  borderRadius: 12,
                  color: "#1b1730",
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  textDecoration: "none",
                  padding: "16px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {t("public.overview.menu")}
              </Link>
            )}
            {/* Map view button - Mobile */}
            {(() => {
              // Don't show if explicitly hidden
              if (hideMapViewButton) return null;
              // Don't show on admin pages
              if (location.pathname.includes("/admin")) return null;

              // Check if we're on home page
              const isOnHomePage =
                location.pathname === buildUrl({ lang, siteKey: siteKey || undefined, path: "" }) ||
                location.pathname ===
                  buildUrl({ lang, siteKey: siteKey || undefined, path: "" }) + "/";

              // Check if we're actually on map view (homepage with showMap=true)
              // If we're on home page, check the showMap state from store
              // Otherwise, we're not on map view
              const isOnMapView = isOnHomePage && showMap && !landingMode;

              // Don't show on map view
              if (isOnMapView) return null;

              return (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openSiteExplore("map");
                    if (onMapViewClick) {
                      onMapViewClick();
                      return;
                    }
                    const homePath = buildUrl({ lang, siteKey: siteKey || undefined, path: "" });
                    if (location.pathname !== homePath && location.pathname !== `${homePath}/`) {
                      navigate(homePath);
                    }
                  }}
                  style={{
                    margin: "20px 24px",
                    background: "rgba(196, 92, 38, 0.1)",
                    border: "1px solid rgba(196, 92, 38, 0.3)",
                    borderRadius: 12,
                    color: "#c45c26",
                    fontSize: 18,
                    fontWeight: 600,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    cursor: "pointer",
                    padding: "16px 24px",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "0 2px 8px rgba(196, 92, 38, 0.2)",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "rgba(196, 92, 38, 0.2)",
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = "scale(0.98)";
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  📍 {t("public.mapView")}
                </button>
              );
            })()}

            {/* Language selector in mobile menu */}
            <div
              style={{
                padding: "20px 24px",
                borderTop: "1px solid rgba(0, 0, 0, 0.1)",
                marginTop: 12,
              }}
            >
              <LanguageSelector />
            </div>
            <Link
              to={buildUrl({ lang, siteKey, path: "impresszum" })}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                textDecoration: "none",
                color: "#1a1a1a",
                fontSize: 20,
                fontWeight: 500,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                padding: "20px 24px",
                minHeight: "56px",
                borderRadius: 12,
                transition: "all 0.2s",
                background: location.pathname.includes("impresszum")
                  ? "rgba(196, 92, 38, 0.1)"
                  : "transparent",
                display: "flex",
                alignItems: "center",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "rgba(196, 92, 38, 0.2)",
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
              to={buildUrl({ lang, siteKey, path: "aszf" })}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                textDecoration: "none",
                color: "#1a1a1a",
                fontSize: 20,
                fontWeight: 500,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                padding: "20px 24px",
                minHeight: "56px",
                borderRadius: 12,
                transition: "all 0.2s",
                background: location.pathname.includes("aszf")
                  ? "rgba(196, 92, 38, 0.1)"
                  : "transparent",
                display: "flex",
                alignItems: "center",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "rgba(196, 92, 38, 0.2)",
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
              to={buildUrl({ lang, siteKey, path: "adatvedelem" })}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                textDecoration: "none",
                color: "#1a1a1a",
                fontSize: 20,
                fontWeight: 500,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                padding: "20px 24px",
                minHeight: "56px",
                borderRadius: 12,
                transition: "all 0.2s",
                background: location.pathname.includes("adatvedelem")
                  ? "rgba(196, 92, 38, 0.1)"
                  : "transparent",
                display: "flex",
                alignItems: "center",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "rgba(196, 92, 38, 0.2)",
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
              to={buildUrl({ lang, siteKey, path: "static-pages" })}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                textDecoration: "none",
                color: "#1a1a1a",
                fontSize: 20,
                fontWeight: 500,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                padding: "20px 24px",
                minHeight: "56px",
                borderRadius: 12,
                transition: "all 0.2s",
                background: location.pathname.includes("static-pages")
                  ? "rgba(196, 92, 38, 0.1)"
                  : "transparent",
                display: "flex",
                alignItems: "center",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "rgba(196, 92, 38, 0.2)",
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

            {/* Username + logout — end of mobile menu */}
            {user && showAuthButtons && (
              <>
                <div
                  style={{
                    margin: "12px 24px 0",
                    padding: "20px 0 0",
                    borderTop: "1px solid rgba(0, 0, 0, 0.08)",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#1a1a1a",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {user.username || user.email || t("admin.user") || "User"}
                </div>
                <button
                  onClick={async () => {
                    setIsMobileMenuOpen(false);
                    if (authContext) {
                      await authContext.logout(true);
                    }
                  }}
                  style={{
                    margin: "12px 24px 20px 24px",
                    background: "transparent",
                    border: "1px solid rgba(27, 23, 48, 0.16)",
                    borderRadius: 12,
                    color: "#1b1730",
                    fontSize: 18,
                    fontWeight: 500,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    cursor: "pointer",
                    padding: "16px 24px",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "none",
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
                  🚪 {t("admin.logout")}
                </button>
              </>
            )}
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
              role="dialog"
              aria-modal="true"
              aria-labelledby="activate-free-modal-title"
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
                id="activate-free-modal-title"
                style={{
                  margin: 0,
                  marginBottom: 16,
                  fontSize: isMobile ? 20 : 24,
                  fontWeight: 700,
                  fontFamily:
                    "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  color: "#1a1a1a",
                }}
              >
                {t("public.activateFree.modal.title")}
              </h2>
              <p
                style={{
                  margin: 0,
                  marginBottom: 24,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  color: "#666",
                  lineHeight: 1.6,
                }}
              >
                {t("public.activateFree.modal.description")}
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
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleActivateFree}
                  disabled={isActivating}
                  style={{
                    padding: "10px 20px",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 600,
                    background: isActivating
                      ? "#999"
                      : "#1b1730",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: isActivating ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: isActivating ? "none" : "0 4px 12px rgba(196, 92, 38, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActivating) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(196, 92, 38, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActivating) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(196, 92, 38, 0.3)";
                    }
                  }}
                >
                  {isActivating ? t("common.loading") : t("public.activateFree.modal.confirm")}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

// src/components/AdminLayout.tsx
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { AdminSiteContext } from "../contexts/AdminSiteContext";
import { useSessionWarning } from "../hooks/useSessionWarning";
import { useAdminCache } from "../hooks/useAdminCache";
import { useVersionCheck } from "../hooks/useVersionCheck";
import { SiteSelector } from "./SiteSelector";
import { UserInfoDropdown } from "./UserInfoDropdown";
import { LanguageSelector } from "./LanguageSelector";
import { ToastContainer } from "./Toast";
import { VersionDisplay } from "./VersionDisplay";
import { Link, useLocation, useParams, useNavigation, useNavigate } from "react-router-dom";
import { buildUrl } from "../app/urls";
import { APP_LANGS, DEFAULT_LANG, HAS_MULTIPLE_SITES, DEFAULT_SITE_SLUG, type Lang } from "../app/config";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlatformSettings } from "../api/places.api";
import { AdminPageSkeleton } from "./AdminPageSkeleton";
import "../styles/sessionWarning.css";
import "../styles/admin-inputs.css";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  // Track if component is unmounting to prevent hook errors during logout/navigation
  const isUnmountingRef = useRef(false);
  
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const { lang: langParam } = useParams<{ lang?: string }>();
  
  // Track previous location to detect route changes
  const [previousLocation, setPreviousLocation] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Set unmounting flag on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
    };
  }, []);
  
  // Get language from URL or use current i18n language or default
  const lang: Lang = isLang(langParam) ? langParam : (isLang(i18n.language) ? i18n.language : DEFAULT_LANG);
  
  // Initialize previous location on mount (only once)
  useEffect(() => {
    if (isUnmountingRef.current) return;
    if (previousLocation === null) {
      setPreviousLocation(location.pathname);
    }
  }, [location.pathname, previousLocation]);
  
  // Detect route changes and show skeleton during navigation
  useEffect(() => {
    if (isUnmountingRef.current) return;
    
    // Skip if previousLocation is not initialized yet
    if (previousLocation === null) {
      return;
    }
    
    // Only show skeleton for admin route changes (not for initial load)
    if (location.pathname !== previousLocation && previousLocation.includes("/admin") && location.pathname.includes("/admin")) {
      setIsNavigating(true);
      setPreviousLocation(location.pathname);
      
      // Safety timeout: reset isNavigating after 2 seconds if it's still true
      // This prevents the skeleton from getting stuck
      const safetyTimer = setTimeout(() => {
        if (!isUnmountingRef.current) {
          setIsNavigating(false);
        }
      }, 2000);
      
      return () => clearTimeout(safetyTimer);
    } else if (location.pathname !== previousLocation) {
      // Update previous location even if not showing skeleton
      setPreviousLocation(location.pathname);
      // Make sure navigating is false if we're not on admin routes
      if (!location.pathname.includes("/admin")) {
        setIsNavigating(false);
      }
    }
  }, [location.pathname, previousLocation]);
  
  // Check navigation state from React Router and reset isNavigating when navigation completes
  const isNavigationPending = navigation?.state === "loading" || navigation?.state === "submitting";
  
  // Reset isNavigating when navigation completes
  useEffect(() => {
    if (isUnmountingRef.current) return;
    if (navigation?.state === "idle" && isNavigating) {
      // Navigation completed, reset after a short delay to allow page to render
      const timer = setTimeout(() => {
        if (!isUnmountingRef.current) {
          setIsNavigating(false);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [navigation?.state, isNavigating]);
  
  // Use useContext directly to avoid throwing error if AuthContext is not available
  const authContext = useContext(AuthContext);
  
  // IMPORTANT: All hooks must be called before any conditional returns
  // This ensures React hooks are called in the same order every render
  // Initialize global cache management for all admin pages
  useAdminCache();
  // Version check - will check for updates and show toast if new version available
  useVersionCheck();
  
  // Get selected site from AdminSiteContext
  const siteContext = useContext(AdminSiteContext);
  const selectedSiteId = siteContext?.selectedSiteId;
  const sites = siteContext?.sites ?? [];
  const siteError = siteContext?.error ?? null;
  const currentSite = sites.find((s) => s.id === selectedSiteId);
  
  // Determine site slug: use current site slug if available, otherwise undefined
  // Don't use DEFAULT_SITE_SLUG in multi-site mode as it may not exist
  const siteSlug = currentSite?.slug;
  
  const { showWarning, secondsRemaining } = useSessionWarning();
  const queryClient = useQueryClient();
  
  // Load site name and brand badge icon from settings
  // IMPORTANT: This hook must be called before any conditional returns
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", lang, siteSlug],
    queryFn: () => getPlatformSettings(lang, siteSlug),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!siteSlug && !siteContext?.isLoading, // Only fetch if we have a valid site slug and sites are loaded
  });
  
  // Listen for site settings changes
  useEffect(() => {
    if (isUnmountingRef.current) return;
    
    const handlePlatformSettingsChanged = () => {
      if (isUnmountingRef.current) return;
      queryClient.invalidateQueries({ queryKey: ["platformSettings", lang, siteSlug] });
      queryClient.refetchQueries({ queryKey: ["platformSettings", lang, siteSlug] });
    };

    window.addEventListener("admin:platformSettings:changed", handlePlatformSettingsChanged);
    return () => {
      window.removeEventListener("admin:platformSettings:changed", handlePlatformSettingsChanged);
    };
  }, [lang, siteSlug, queryClient]);

  // Check screen size for responsive behavior
  useEffect(() => {
    if (isUnmountingRef.current) return;
    
    const checkScreenSize = () => {
      if (isUnmountingRef.current) return;
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Sync i18n language with URL parameter
  useEffect(() => {
    if (isUnmountingRef.current) return;
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
    }
  }, [lang, i18n]);

  // Close mobile menu when route changes
  useEffect(() => {
    if (isUnmountingRef.current) return;
    setIsMobileMenuOpen(false);
  }, [location.pathname]);
  
  // Now we can check conditions after all hooks are called
  if (!authContext) {
    // If AuthContext is not available, show error or redirect
    return <div>Error: Authentication context not available</div>;
  }
  const { user, logout, isLoading } = authContext;

  const siteName = platformSettings?.siteName;
  const brandBadgeIcon = platformSettings?.brandBadgeIcon;

  // If still loading, show skeleton screen (prevents layout shift)
  // Note: ProtectedRoute already handles authentication, so we don't need to check for user here
  if (isLoading) {
    return (
      <div style={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }} />
    );
  }

  const handleLogout = async () => {
    // Mark component as unmounting to prevent hook errors
    isUnmountingRef.current = true;
    
    // Store current language before logout
    const currentLang = lang;
    localStorage.setItem("logoutRedirectLang", currentLang);
    await logout(true); // Manual logout - will be redirected to admin login
  };

  const isActive = (path: string) => location.pathname === path;
  
  // Helper to build admin paths with language
  const adminPath = (subPath: string) => `/${lang}/admin${subPath}`;
  
  // Build public page path based on selected site
  const publicPagePath = currentSite 
    ? buildUrl({ siteKey: currentSite.slug, lang, path: "" })
    : buildUrl({ siteKey: DEFAULT_SITE_SLUG, lang, path: "" });

  // Navigation links removed - now displayed as cards on the dashboard
  const navLinks: Array<{ path: string; label: string; icon: string; color: string }> = [];

  return (
    <div className="admin-layout" style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", margin: 0, padding: 0, width: "100%", boxSizing: "border-box", overflowX: "hidden", overflowY: "auto" }}>
      <style>{`
        body {
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden !important;
          width: 100% !important;
        }
        html {
          overflow-x: hidden !important;
          width: 100% !important;
        }
        * {
          box-sizing: border-box !important;
        }
        /* Prevent all direct children from overflowing */
        body > * {
          max-width: 100vw !important;
          overflow-x: hidden !important;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      
      {/* Header */}
      <nav
        style={{
          background: "white",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          padding: isMobile ? "12px 16px" : "clamp(12px, 3vw, 16px) clamp(16px, 4vw, 24px)",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          width: "100%",
          boxSizing: "border-box",
          pointerEvents: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", alignSelf: "stretch" }}>
          {/* Left section - Logo and Nav Links (Desktop) */}
          <div style={{ display: "flex", gap: "clamp(16px, 4vw, 32px)", alignItems: "center", flex: 1, alignSelf: "center" }}>
            {(siteName || brandBadgeIcon) ? (
              <Link
                to={adminPath("")}
                style={{
                  textDecoration: "none",
                  color: "#667eea",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "opacity 0.2s ease",
                  pointerEvents: "auto",
                  position: "relative",
                  zIndex: 1002,
                }}
                title={t("admin.dashboard")}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                {brandBadgeIcon && (
                  <img 
                    src={brandBadgeIcon} 
                    alt={siteName || ""}
                    style={{ 
                      width: 24, 
                      height: 24, 
                      objectFit: "contain",
                      borderRadius: 4,
                    }}
                  />
                )}
                {siteName && (
                  <span style={{ fontSize: "clamp(18px, 3vw, 22px)", fontWeight: 700, fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", letterSpacing: "-0.02em" }}>
                    {siteName}
                  </span>
                )}
              </Link>
            ) : (
              <Link
                to={adminPath("")}
                style={{
                  textDecoration: "none",
                  color: "#667eea",
                  fontSize: "clamp(20px, 4vw, 24px)",
                  transition: "opacity 0.2s ease",
                  pointerEvents: "auto",
                  position: "relative",
                  zIndex: 1002,
                  display: "flex",
                  alignItems: "center",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
                title={t("admin.dashboard")}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                <span style={{ fontSize: "clamp(20px, 4vw, 24px)", display: "flex", alignItems: "center" }}>⚙️</span>
              </Link>
            )}
            
            {/* Desktop Navigation - Tile Menu */}
            {!isMobile && (
              <div style={{ 
                display: "flex", 
                gap: 8, 
                flexWrap: "nowrap", 
                alignItems: "center", 
                pointerEvents: "auto", 
                position: "relative", 
                zIndex: 1001,
                alignSelf: "center",
              }}>
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={adminPath(link.path)}
                    style={{
                      textDecoration: "none",
                      color: isActive(adminPath(link.path)) ? (link.color || "#667eea") : "#666",
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontWeight: isActive(adminPath(link.path)) ? 600 : 500,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      padding: "8px 14px",
                      borderRadius: 8,
                      background: isActive(adminPath(link.path)) 
                        ? `${link.color || "#667eea"}15` 
                        : "rgba(0, 0, 0, 0.03)",
                      border: isActive(adminPath(link.path))
                        ? `2px solid ${link.color || "#667eea"}40`
                        : "2px solid transparent",
                      transition: "all 0.2s ease",
                      whiteSpace: "nowrap",
                      pointerEvents: "auto",
                      position: "relative",
                      zIndex: 1002,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: isActive(adminPath(link.path)) 
                        ? `0 2px 8px ${link.color || "#667eea"}20` 
                        : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive(adminPath(link.path))) {
                        e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive(adminPath(link.path))) {
                        e.currentTarget.style.background = "rgba(0, 0, 0, 0.03)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right section - Actions */}
          <div style={{ display: "flex", gap: "clamp(8px, 2vw, 12px)", alignItems: "center", flexWrap: "nowrap" }}>
            {/* Session Warning */}
            {showWarning && !isMobile && (
              <div
                style={{
                  padding: "6px 12px",
                  background: "#fff3cd",
                  color: "#856404",
                  border: "1px solid #ffc107",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  animation: "pulse 1s infinite",
                }}
              >
                <span>⏱️</span>
                <span>{secondsRemaining}s</span>
              </div>
            )}
            
            {/* Language Selector */}
            {!isMobile && <LanguageSelector />}

            {/* Site Selector */}
            {!isMobile && HAS_MULTIPLE_SITES && <SiteSelector />}

            {/* Map view button */}
            {!isMobile && (
              <button
                onClick={() => {
                  const publicPagePath = buildUrl({ lang, siteKey: selectedSiteId ? undefined : DEFAULT_SITE_SLUG, path: "" });
                  window.open(publicPagePath, "_blank");
                }}
                style={{
                  padding: "8px 14px",
                  background: "rgba(102, 126, 234, 0.1)",
                  border: "1px solid rgba(102, 126, 234, 0.3)",
                  borderRadius: 8,
                  color: "#667eea",
                  fontSize: "clamp(13px, 3.2vw, 15px)",
                  fontWeight: 500,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(102, 126, 234, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(102, 126, 234, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.3)";
                }}
                title={t("public.mapView")}
              >
                📍 {t("public.mapView")}
              </button>
            )}

            {/* User Dropdown */}
            {!isMobile && <UserInfoDropdown />}
            
            {/* Logout Button (Desktop) */}
            {!isMobile && (
              <button
                onClick={handleLogout}
                style={{
                  padding: "8px 12px",
                  background: "white",
                  color: "#dc3545",
                  border: "2px solid #dc3545",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#fff5f5";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                title={t("admin.logout")}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
            
            {/* Mobile Menu Button - only show if there are nav links */}
            {isMobile && navLinks.length > 0 && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                style={{
                  padding: 8,
                  background: isMobileMenuOpen ? "#667eea" : "#f0f0ff",
                  color: isMobileMenuOpen ? "white" : "#667eea",
                  border: "1px solid #667eea",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  transition: "all 0.2s ease",
                  lineHeight: 1,
                }}
              >
                {isMobileMenuOpen ? (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ display: "block" }}
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ display: "block" }}
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobile && isMobileMenuOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "white",
              boxShadow: "0 8px 16px rgba(0, 0, 0, 0.15)",
              borderRadius: "0 0 12px 12px",
              padding: 20,
              animation: "slideDown 0.3s ease-out",
              maxHeight: "calc(100vh - 80px)",
              overflowY: "auto",
              zIndex: 999,
            }}
          >
            {/* Session Warning Mobile */}
            {showWarning && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#fff3cd",
                  color: "#856404",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  marginBottom: 16,
                  textAlign: "center",
                  border: "1px solid #ffc107",
                }}
              >
                ⏱️ {t("admin.sessionExpiring")}: {secondsRemaining}s
              </div>
            )}
            
            {/* Mobile Nav Links - Tile Grid */}
            <div style={{ 
              marginBottom: 16,
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
            }}>
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={adminPath(link.path)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px 16px",
                    color: isActive(adminPath(link.path)) ? (link.color || "#667eea") : "#333",
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: isActive(adminPath(link.path)) ? 600 : 500,
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    background: isActive(adminPath(link.path)) 
                      ? `${link.color || "#667eea"}15` 
                      : "rgba(0, 0, 0, 0.03)",
                    border: isActive(adminPath(link.path))
                      ? `2px solid ${link.color || "#667eea"}40`
                      : "2px solid rgba(0, 0, 0, 0.08)",
                    borderRadius: 12,
                    transition: "all 0.2s ease",
                    textAlign: "center",
                    boxShadow: isActive(adminPath(link.path)) 
                      ? `0 4px 12px ${link.color || "#667eea"}20` 
                      : "0 2px 4px rgba(0, 0, 0, 0.05)",
                  }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = "scale(0.98)";
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <span style={{ fontSize: 32, marginBottom: 8, display: "block" }}>
                    {link.icon}
                  </span>
                  <span style={{ lineHeight: 1.3 }}>{link.label}</span>
                </Link>
              ))}
            </div>
            
            <hr style={{ margin: "16px 0", border: "none", borderTop: "2px solid #f0f0f0" }} />
            
            {/* Mobile Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ 
                padding: "10px 14px", 
                background: "#f8f8ff", 
                borderRadius: 8,
                border: "1px solid #e0e0ff",
              }}>
                <div style={{ fontSize: "clamp(13px, 3vw, 15px)", color: "#666", marginBottom: 6, fontWeight: 600, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  {t("admin.language")}
                </div>
                <LanguageSelector />
              </div>
              
              {HAS_MULTIPLE_SITES && (
                <div style={{ 
                  padding: "10px 14px", 
                  background: "#f8f8ff", 
                  borderRadius: 8,
                  border: "1px solid #e0e0ff",
                }}>
                  <div style={{ fontSize: "clamp(13px, 3vw, 15px)", color: "#666", marginBottom: 6, fontWeight: 600, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                    {t("admin.site")}
                  </div>
                  <SiteSelector />
                </div>
              )}
              
              <div style={{ 
                padding: "10px 14px", 
                background: "#f8f8ff", 
                borderRadius: 8,
                border: "1px solid #e0e0ff",
              }}>
                <div style={{ fontSize: "clamp(13px, 3vw, 15px)", color: "#666", marginBottom: 6, fontWeight: 600, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  {t("admin.userInfo")}
                </div>
                <UserInfoDropdown />
              </div>
              
              {/* Map view button (mobile) */}
              <button
                onClick={() => {
                  window.open(publicPagePath, "_blank");
                }}
                style={{
                  padding: "14px 16px",
                  background: "rgba(102, 126, 234, 0.1)",
                  border: "1px solid rgba(102, 126, 234, 0.3)",
                  borderRadius: 8,
                  color: "#667eea",
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  width: "100%",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(102, 126, 234, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer",
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
              
              <Link
                to={publicPagePath}
                style={{
                  padding: "14px 16px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  width: "100%",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(102, 126, 234, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  textDecoration: "none",
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = "scale(0.98)";
                  e.currentTarget.style.boxShadow = "0 1px 4px rgba(102, 126, 234, 0.3)";
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.2)";
                }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
                {t("admin.backToPublicSite")}
              </Link>
              
              <button
                onClick={handleLogout}
                style={{
                  padding: "14px 16px",
                  background: "white",
                  color: "#dc3545",
                  border: "2px solid #dc3545",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  width: "100%",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(220, 53, 69, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = "scale(0.98)";
                  e.currentTarget.style.boxShadow = "0 1px 4px rgba(220, 53, 69, 0.3)";
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(220, 53, 69, 0.2)";
                }}
                title={t("admin.logout")}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </nav>
      
      {/* Error Banner for Schema Errors */}
      {siteError && (
        <div
          style={{
            background: "#fff3cd",
            border: "1px solid #ffc107",
            color: "#856404",
            padding: "12px 20px",
            margin: "0",
            textAlign: "center",
            fontSize: "14px",
            fontWeight: 500,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            position: "sticky",
            top: "60px",
            zIndex: 999,
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          <span style={{ marginRight: "8px" }}>⚠️</span>
          {siteError}
        </div>
      )}
      
      {/* Main Content */}
      <main style={{ 
        padding: isMobile ? "16px" : "clamp(16px, 4vw, 24px)", 
        margin: 0,
        maxWidth: 1400,
        marginLeft: "auto",
        marginRight: "auto",
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
        overflowY: "auto",
      }}>
        {/* Only show skeleton if we're navigating between admin routes */}
        {/* Don't rely on isNavigationPending alone as it can get stuck during lazy loading */}
        {isNavigating ? <AdminPageSkeleton /> : children}
      </main>
      
      <VersionDisplay />
    </div>
  );
}

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
import {
  DEFAULT_LANG,
  HAS_MULTIPLE_SITES,
  type Lang,
  isLang,
} from "../app/config";
import { AdminPageSkeleton } from "./AdminPageSkeleton";
import { isSuperadmin } from "../utils/roleHelpers";
import type { UserRole } from "../types/enums";
import "../styles/sessionWarning.css";
import "../styles/admin-inputs.css";


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
  const lang: Lang = isLang(langParam)
    ? langParam
    : isLang(i18n.language)
      ? i18n.language
      : DEFAULT_LANG;

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
    if (
      location.pathname !== previousLocation &&
      previousLocation.includes("/admin") &&
      location.pathname.includes("/admin")
    ) {
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
  const siteError = siteContext?.error ?? null;

  const { showWarning, secondsRemaining } = useSessionWarning();

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

  // All admin pages should have noindex, nofollow robots meta tag.
  // Title is set per page by usePageTitle.
  useEffect(() => {
    const robotsMeta = document.querySelector('meta[name="robots"]');
    if (robotsMeta) {
      robotsMeta.setAttribute("content", "noindex, nofollow");
    } else {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      meta.setAttribute("content", "noindex, nofollow");
      document.head.appendChild(meta);
    }
  }, []);

  // Now we can check conditions after all hooks are called
  if (!authContext) {
    // If AuthContext is not available, show error or redirect
    return <div>Error: Authentication context not available</div>;
  }
  const { user, logout, isLoading } = authContext;

  // If still loading, show skeleton screen (prevents layout shift)
  // Note: ProtectedRoute already handles authentication, so we don't need to check for user here
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      />
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

  // Helper to build admin paths with language
  const adminPath = (subPath: string) => `/${lang}/admin${subPath}`;

  // Primary header chrome only (language, Régió, user/logout). Destinations live on dashboard cards.
  const userRole = (user?.role ?? null) as UserRole | null;
  const userIsSuperadmin = userRole ? isSuperadmin(userRole) : false;

  return (
    <div
      className="admin-layout"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        margin: 0,
        padding: 0,
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
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

      <a href="#admin-main" className="hl-skip-link">
        {t("common.skipToContent", { defaultValue: "Ugrás a tartalomra" })}
      </a>

      {/* Header */}
      <nav
        aria-label={t("admin.header.title") || "Adminisztrációs felület"}
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            alignSelf: "stretch",
          }}
        >
          {/* Left section - Logo and Nav Links (Desktop) */}
          <div
            style={{
              display: "flex",
              gap: "clamp(16px, 4vw, 32px)",
              alignItems: "center",
              flex: 1,
              alignSelf: "center",
            }}
          >
            <Link
              to={adminPath("")}
              style={{
                textDecoration: "none",
                color: "var(--hl-ink, #1b1730)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "opacity 0.2s ease",
                pointerEvents: "auto",
                position: "relative",
                zIndex: 1002,
              }}
              title={t("admin.dashboard")}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <span
                style={{
                  fontSize: "clamp(18px, 3vw, 22px)",
                  fontWeight: 700,
                  fontFamily:
                    "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  letterSpacing: "-0.02em",
                }}
              >
                {t("admin.header.title") || "Adminisztrációs felület"}
              </span>
            </Link>
            {/* Note: Dynamic logo/siteName removed - always show fixed "Adminisztrációs felület" title in admin */}
            {/* Public pages (FloatingHeader, Header) still use dynamic logo from platformSettings */}
          </div>

          {/* Right section - Actions */}
          <div
            style={{
              display: "flex",
              gap: "clamp(8px, 2vw, 12px)",
              alignItems: "center",
              flexWrap: "nowrap",
            }}
          >
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
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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

            {/* Site / Régió selector — superadmin only; region-bound users keep assigned site via context */}
            {!isMobile && HAS_MULTIPLE_SITES && userIsSuperadmin && <SiteSelector />}

            {/* User Dropdown */}
            {!isMobile && <UserInfoDropdown />}

            {/* Logout Button (Desktop) */}
            {!isMobile && (
              <button
                type="button"
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
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                aria-label={t("admin.logout")}
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
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}

            {/* Mobile Menu Button — language / Régió / user / logout */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-expanded={isMobileMenuOpen}
                aria-controls="admin-mobile-menu"
                aria-label={
                  isMobileMenuOpen
                    ? t("common.close")
                    : t("public.menu", { defaultValue: "Menü" })
                }
                style={{
                  padding: 8,
                  background: isMobileMenuOpen ? "#667eea" : "#f0f0ff",
                  color: isMobileMenuOpen ? "white" : "#667eea",
                  border: "1px solid #667eea",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
            id="admin-mobile-menu"
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
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  marginBottom: 16,
                  textAlign: "center",
                  border: "1px solid #ffc107",
                }}
              >
                ⏱️ {t("admin.sessionExpiring")}: {secondsRemaining}s
              </div>
            )}

            {/* Mobile Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  padding: "10px 14px",
                  background: "#f8f8ff",
                  borderRadius: 8,
                  border: "1px solid #e0e0ff",
                }}
              >
                <div
                  style={{
                    fontSize: "clamp(13px, 3vw, 15px)",
                    color: "#666",
                    marginBottom: 6,
                    fontWeight: 600,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.language")}
                </div>
                <LanguageSelector />
              </div>

              {HAS_MULTIPLE_SITES && userIsSuperadmin && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#f8f8ff",
                    borderRadius: 8,
                    border: "1px solid #e0e0ff",
                  }}
                >
                  <div
                    style={{
                      fontSize: "clamp(13px, 3vw, 15px)",
                      color: "#666",
                      marginBottom: 6,
                      fontWeight: 600,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.site")}
                  </div>
                  <SiteSelector />
                </div>
              )}

              <div
                style={{
                  padding: "10px 14px",
                  background: "#f8f8ff",
                  borderRadius: 8,
                  border: "1px solid #e0e0ff",
                }}
              >
                <div
                  style={{
                    fontSize: "clamp(13px, 3vw, 15px)",
                    color: "#666",
                    marginBottom: 6,
                    fontWeight: 600,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.userInfo")}
                </div>
                <UserInfoDropdown />
              </div>

              <button
                type="button"
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
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                aria-label={t("admin.logout")}
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
                  aria-hidden="true"
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
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
      <main
        id="admin-main"
        tabIndex={-1}
        style={{
          padding: isMobile ? "16px" : "clamp(16px, 4vw, 24px)",
          margin: 0,
          maxWidth: 1400,
          marginLeft: "auto",
          marginRight: "auto",
          width: "100%",
          boxSizing: "border-box",
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
        {/* Only show skeleton if we're navigating between admin routes */}
        {/* Don't rely on isNavigationPending alone as it can get stuck during lazy loading */}
        {isNavigating ? <AdminPageSkeleton /> : children}
      </main>

      <VersionDisplay />
    </div>
  );
}

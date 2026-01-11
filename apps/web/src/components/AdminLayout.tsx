// src/components/AdminLayout.tsx
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { AdminTenantContext } from "../contexts/AdminTenantContext";
import { useSessionWarning } from "../hooks/useSessionWarning";
import { useAdminCache } from "../hooks/useAdminCache";
import { useVersionCheck } from "../hooks/useVersionCheck";
import { TenantSelector } from "./TenantSelector";
import { UserInfoDropdown } from "./UserInfoDropdown";
import { LanguageSelector } from "./LanguageSelector";
import { ToastContainer } from "./Toast";
import { VersionDisplay } from "./VersionDisplay";
import { Link, useLocation, useParams } from "react-router-dom";
import { buildPath } from "../app/routing/buildPath";
import { APP_LANGS, DEFAULT_LANG, HAS_MULTIPLE_TENANTS, DEFAULT_TENANT_SLUG, type Lang } from "../app/config";
import "../styles/sessionWarning.css";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Initialize global cache management for all admin pages
  useAdminCache();
  // Version check - will check for updates and show toast if new version available
  useVersionCheck();
  
  // Use useContext directly to avoid throwing error if AuthContext is not available
  const authContext = useContext(AuthContext);
  if (!authContext) {
    // If AuthContext is not available, show error or redirect
    return <div>Error: Authentication context not available</div>;
  }
  const { user, logout } = authContext;
  
  // Get selected tenant from AdminTenantContext
  const tenantContext = useContext(AdminTenantContext);
  const selectedTenantId = tenantContext?.selectedTenantId;
  const tenants = tenantContext?.tenants ?? [];
  const currentTenant = tenants.find((t) => t.id === selectedTenantId);
  
  const location = useLocation();
  const { showWarning, secondsRemaining } = useSessionWarning();
  const { lang: langParam } = useParams<{ lang?: string }>();

  // Get language from URL or use current i18n language or default
  const lang: Lang = isLang(langParam) ? langParam : (isLang(i18n.language) ? i18n.language : DEFAULT_LANG);

  // Check screen size for responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
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
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
    }
  }, [lang, i18n]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    // Store current language before logout
    const currentLang = lang;
    localStorage.setItem("logoutRedirectLang", currentLang);
    await logout(true); // Manual logout - will be redirected to admin login
  };

  const isActive = (path: string) => location.pathname === path;
  
  // Helper to build admin paths with language
  const adminPath = (subPath: string) => `/${lang}/admin${subPath}`;
  
  // Build public page path based on selected tenant
  const publicPagePath = currentTenant 
    ? buildPath({ tenantSlug: currentTenant.slug, lang, path: "" })
    : buildPath({ tenantSlug: DEFAULT_TENANT_SLUG, lang, path: "" });

  const navLinks = [
    { path: "", label: t("admin.dashboard") },
    { path: "/profile", label: t("admin.profileMenu") },
    ...(user?.role === "superadmin" ? [
      { path: "/app-settings", label: t("admin.appSettings") },
      { path: "/users", label: t("admin.users") },
      ...(HAS_MULTIPLE_TENANTS ? [{ path: "/tenants", label: t("admin.tenants") }] : [])
    ] : [])
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", margin: 0, padding: 0 }}>
      <style>{`
        body {
          margin: 0 !important;
          padding: 0 !important;
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
          padding: "clamp(12px, 3vw, 16px) clamp(16px, 4vw, 24px)",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Left section - Logo and Nav Links (Desktop) */}
          <div style={{ display: "flex", gap: "clamp(16px, 4vw, 32px)", alignItems: "center", flex: 1 }}>
            {isMobile ? (
              <Link 
                to={adminPath("")}
                style={{ 
                  textDecoration: "none", 
                  color: "#667eea",
                  fontSize: "clamp(20px, 4vw, 24px)",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }} 
                title={t("admin.dashboard")}
              >
                <span style={{ fontSize: "clamp(20px, 4vw, 24px)" }}>⚙️</span>
                <span>Admin</span>
              </Link>
            ) : (
              <div
                style={{ 
                  color: "#667eea",
                  fontSize: "clamp(20px, 4vw, 24px)",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }} 
              >
                <span style={{ fontSize: "clamp(20px, 4vw, 24px)" }}>⚙️</span>
                <span>Admin</span>
              </div>
            )}
            
            {/* Desktop Navigation */}
            {!isMobile && (
              <div style={{ display: "flex", gap: 12, flexWrap: "nowrap", alignItems: "center" }}>
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={adminPath(link.path)}
                    style={{
                      textDecoration: "none",
                      color: isActive(adminPath(link.path)) ? "#667eea" : "#666",
                      fontSize: 14,
                      fontWeight: isActive(adminPath(link.path)) ? 600 : 400,
                      padding: "8px 12px",
                      borderRadius: 6,
                      background: isActive(adminPath(link.path)) ? "#f0f0ff" : "transparent",
                      transition: "all 0.2s ease",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive(adminPath(link.path))) {
                        e.currentTarget.style.background = "#f8f8ff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive(adminPath(link.path))) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {link.label}
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
            
            {/* Tenant Selector */}
            {!isMobile && HAS_MULTIPLE_TENANTS && <TenantSelector />}
            
            {/* User Dropdown */}
            {!isMobile && <UserInfoDropdown />}
            
            {/* Logout Button (Desktop) */}
            {!isMobile && (
              <button
                onClick={handleLogout}
                style={{
                  padding: "8px 16px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#c82333";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#dc3545";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {t("admin.logout")}
              </button>
            )}
            
            {/* Mobile Menu Button */}
            {isMobile && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                style={{
                  padding: 8,
                  background: isMobileMenuOpen ? "#667eea" : "#f0f0ff",
                  color: isMobileMenuOpen ? "white" : "#667eea",
                  border: "1px solid #667eea",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 20,
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  transition: "all 0.2s ease",
                }}
              >
                {isMobileMenuOpen ? "✕" : "☰"}
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
                  marginBottom: 16,
                  textAlign: "center",
                  border: "1px solid #ffc107",
                }}
              >
                ⏱️ {t("admin.sessionExpiring")}: {secondsRemaining}s
              </div>
            )}
            
            {/* Mobile Nav Links */}
            <div style={{ marginBottom: 16 }}>
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={adminPath(link.path)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "14px 16px",
                    color: isActive(adminPath(link.path)) ? "#667eea" : "#333",
                    textDecoration: "none",
                    fontSize: 16,
                    fontWeight: isActive(adminPath(link.path)) ? 600 : 400,
                    background: isActive(adminPath(link.path)) ? "#f0f0ff" : "transparent",
                    borderRadius: 8,
                    marginBottom: 6,
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span style={{ marginRight: 8 }}>
                    {isActive(adminPath(link.path)) ? "▶" : ""}
                  </span>
                  {link.label}
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
                <div style={{ fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 600 }}>
                  {t("admin.language")}
                </div>
                <LanguageSelector />
              </div>
              
              {HAS_MULTIPLE_TENANTS && (
                <div style={{ 
                  padding: "10px 14px", 
                  background: "#f8f8ff", 
                  borderRadius: 8,
                  border: "1px solid #e0e0ff",
                }}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 600 }}>
                    {t("admin.tenant")}
                  </div>
                  <TenantSelector />
                </div>
              )}
              
              <div style={{ 
                padding: "10px 14px", 
                background: "#f8f8ff", 
                borderRadius: 8,
                border: "1px solid #e0e0ff",
              }}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 600 }}>
                  {t("admin.userInfo")}
                </div>
                <UserInfoDropdown />
              </div>
              
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
                  width: "100%",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(220, 53, 69, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = "scale(0.98)";
                  e.currentTarget.style.boxShadow = "0 1px 4px rgba(220, 53, 69, 0.3)";
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(220, 53, 69, 0.2)";
                }}
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
                {t("admin.logout")}
              </button>
            </div>
          </div>
        )}
      </nav>
      
      {/* Main Content */}
      <main style={{ 
        padding: "clamp(16px, 4vw, 24px)", 
        margin: 0,
        maxWidth: 1400,
        marginLeft: "auto",
        marginRight: "auto",
      }}>
        {children}
      </main>
      
      <VersionDisplay />
    </div>
  );
}

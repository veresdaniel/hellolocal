// src/components/AdminLayout.tsx
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { useSessionWarning } from "../hooks/useSessionWarning";
import { useAdminCache } from "../hooks/useAdminCache";
import { TenantSelector } from "./TenantSelector";
import { UserInfoDropdown } from "./UserInfoDropdown";
import { LanguageSelector } from "./LanguageSelector";
import { Link, useLocation, useParams } from "react-router-dom";
import { useEffect } from "react";
import { APP_LANGS, DEFAULT_LANG, type Lang } from "../app/config";
import "../styles/sessionWarning.css";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { t, i18n } = useTranslation();
  // Initialize global cache management for all admin pages
  useAdminCache();
  const { user, logout } = useAuth();
  const location = useLocation();
  const { showWarning, secondsRemaining } = useSessionWarning();
  const { lang: langParam } = useParams<{ lang?: string }>();

  // Get language from URL or use current i18n language or default
  const lang: Lang = isLang(langParam) ? langParam : (isLang(i18n.language) ? i18n.language : DEFAULT_LANG);

  // Sync i18n language with URL parameter
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
    }
  }, [lang, i18n]);

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (path: string) => location.pathname === path;
  
  // Helper to build admin paths with language
  const adminPath = (subPath: string) => `/${lang}/admin${subPath}`;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <nav
        style={{
          background: "white",
          borderBottom: "1px solid #ddd",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <Link to={`/${lang}`} style={{ textDecoration: "none", color: "inherit" }}>
            <h2 style={{ margin: 0 }}>Admin</h2>
          </Link>
          <div style={{ display: "flex", gap: 16 }}>
            <Link
              to={adminPath("")}
              style={{
                textDecoration: "none",
                color: isActive(adminPath("")) ? "#007bff" : "#666",
                fontWeight: isActive(adminPath("")) ? "bold" : "normal",
              }}
            >
              {t("admin.dashboard")}
            </Link>
            <Link
              to={adminPath("/profile")}
              style={{
                textDecoration: "none",
                color: isActive(adminPath("/profile")) ? "#007bff" : "#666",
                fontWeight: isActive(adminPath("/profile")) ? "bold" : "normal",
              }}
            >
              {t("admin.profileMenu")}
            </Link>
            {user?.role === "superadmin" && (
              <>
                <Link
                  to={adminPath("/app-settings")}
                  style={{
                    textDecoration: "none",
                    color: isActive(adminPath("/app-settings")) ? "#007bff" : "#666",
                    fontWeight: isActive(adminPath("/app-settings")) ? "bold" : "normal",
                  }}
                >
                  {t("admin.appSettings")}
                </Link>
                <Link
                  to={adminPath("/users")}
                  style={{
                    textDecoration: "none",
                    color: isActive(adminPath("/users")) ? "#007bff" : "#666",
                    fontWeight: isActive(adminPath("/users")) ? "bold" : "normal",
                  }}
                >
                  {t("admin.users")}
                </Link>
                <Link
                  to={adminPath("/tenants")}
                  style={{
                    textDecoration: "none",
                    color: isActive(adminPath("/tenants")) ? "#007bff" : "#666",
                    fontWeight: isActive(adminPath("/tenants")) ? "bold" : "normal",
                  }}
                >
                  {t("admin.tenants")}
                </Link>
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <LanguageSelector />
          <TenantSelector />
          {showWarning && (
            <div
              style={{
                padding: "8px 16px",
                background: "#ffc107",
                color: "#856404",
                borderRadius: 4,
                fontSize: 14,
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: 8,
                animation: "pulse 1s infinite",
              }}
            >
              <span>⏱️</span>
              <span>
                {t("admin.sessionExpiring")}: {secondsRemaining}s
              </span>
            </div>
          )}
          <UserInfoDropdown />
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {t("admin.logout")}
          </button>
        </div>
      </nav>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}

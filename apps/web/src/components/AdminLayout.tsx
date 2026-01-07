// src/components/AdminLayout.tsx
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { useSessionWarning } from "../hooks/useSessionWarning";
import { useAdminCache } from "../hooks/useAdminCache";
import { TenantSelector } from "./TenantSelector";
import { UserInfoDropdown } from "./UserInfoDropdown";
import { LanguageSelector } from "./LanguageSelector";
import { Link, useLocation } from "react-router-dom";
import "../styles/sessionWarning.css";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation();
  // Initialize global cache management for all admin pages
  useAdminCache();
  const { user, logout } = useAuth();
  const location = useLocation();
  const { showWarning, secondsRemaining } = useSessionWarning();

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (path: string) => location.pathname === path;

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
          <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
            <h2 style={{ margin: 0 }}>Admin</h2>
          </Link>
          <div style={{ display: "flex", gap: 16 }}>
            <Link
              to="/admin"
              style={{
                textDecoration: "none",
                color: isActive("/admin") ? "#007bff" : "#666",
                fontWeight: isActive("/admin") ? "bold" : "normal",
              }}
            >
              {t("admin.dashboard")}
            </Link>
            <Link
              to="/admin/profile"
              style={{
                textDecoration: "none",
                color: isActive("/admin/profile") ? "#007bff" : "#666",
                fontWeight: isActive("/admin/profile") ? "bold" : "normal",
              }}
            >
              {t("admin.profileMenu")}
            </Link>
            {user?.role === "superadmin" && (
              <>
                <Link
                  to="/admin/users"
                  style={{
                    textDecoration: "none",
                    color: isActive("/admin/users") ? "#007bff" : "#666",
                    fontWeight: isActive("/admin/users") ? "bold" : "normal",
                  }}
                >
                  {t("admin.users")}
                </Link>
                <Link
                  to="/admin/tenants"
                  style={{
                    textDecoration: "none",
                    color: isActive("/admin/tenants") ? "#007bff" : "#666",
                    fontWeight: isActive("/admin/tenants") ? "bold" : "normal",
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


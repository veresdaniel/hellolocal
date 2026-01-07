// src/components/PublicAuthBadge.tsx
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function PublicAuthBadge() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Don't show on admin pages or auth pages
  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  // Don't show if not logged in
  if (!user) {
    return null;
  }

  const handleDashboard = () => {
    navigate("/admin");
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "flex-end",
      }}
    >
      {/* User info badge */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4), 0 4px 8px rgba(0, 0, 0, 0.1)",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
          color: "white",
          fontWeight: 500,
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#4ade80",
            boxShadow: "0 0 0 3px rgba(74, 222, 128, 0.3), 0 0 8px rgba(74, 222, 128, 0.5)",
          }}
        />
        <span style={{ fontWeight: 600 }}>
          {user.firstName} {user.lastName}
        </span>
        <span
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            background: "rgba(255, 255, 255, 0.25)",
            color: "white",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            backdropFilter: "blur(10px)",
          }}
        >
          {user.role}
        </span>
      </div>

      {/* Button group */}
      <div
        style={{
          display: "flex",
          gap: 0,
          background: "white",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
          border: "1px solid rgba(0, 0, 0, 0.06)",
        }}
      >
        <button
          onClick={handleDashboard}
          style={{
            padding: "11px 18px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: 7,
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <span style={{ fontSize: 16 }}>📊</span>
          <span>{t("admin.dashboard")}</span>
        </button>
        <div
          style={{
            width: 1,
            background: "rgba(0, 0, 0, 0.1)",
          }}
        />
        <button
          onClick={handleLogout}
          style={{
            padding: "11px 18px",
            background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            color: "white",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 87, 108, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <span style={{ fontSize: 16 }}>🚪</span>
          <span>{t("admin.logout")}</span>
        </button>
      </div>
    </div>
  );
}


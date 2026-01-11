// src/components/UserInfoDropdown.tsx
import { useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../contexts/AuthContext";

export function UserInfoDropdown() {
  const { t } = useTranslation();
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const getRoleColor = (role: string) => {
    switch (role) {
      case "superadmin":
        return "#dc3545";
      case "admin":
        return "#007bff";
      case "editor":
        return "#28a745";
      default:
        return "#6c757d";
    }
  };

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span
        style={{
          color: "#666",
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 4,
          display: "inline-block",
        }}
      >
        {user.firstName} {user.lastName} ({user.role})
      </span>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: 16,
            minWidth: 280,
            zIndex: 800,
          }}
        >
          <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: "bold" }}>
            {t("admin.userInformation")}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <strong>{t("admin.username")}:</strong> {user.username}
            </div>
            <div>
              <strong>{t("admin.email")}:</strong> {user.email}
            </div>
            <div>
              <strong>{t("admin.role")}:</strong>{" "}
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  background: getRoleColor(user.role),
                  color: "white",
                  fontSize: 12,
                }}
              >
                {user.role}
              </span>
            </div>
            <div>
              <strong>{t("admin.tenants")}:</strong> {user.tenantIds?.length || 0}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


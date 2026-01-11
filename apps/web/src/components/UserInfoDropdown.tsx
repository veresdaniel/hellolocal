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
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
            borderRadius: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: "20px 24px",
            minWidth: 320,
            zIndex: 800,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          <h3 style={{ 
            margin: "0 0 20px 0", 
            fontSize: 18, 
            fontWeight: 600, 
            fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: "#333",
          }}>
            {t("admin.userInformation")}
          </h3>
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: 16,
          }}>
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: 6,
            }}>
              <div style={{ 
                fontSize: 12, 
                color: "#666", 
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                {t("admin.username")}
              </div>
              <div style={{ 
                fontSize: 14, 
                color: "#333",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}>
                {user.username}
              </div>
            </div>
            
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: 6,
            }}>
              <div style={{ 
                fontSize: 12, 
                color: "#666", 
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                {t("admin.email")}
              </div>
              <div style={{ 
                fontSize: 14, 
                color: "#333",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}>
                {user.email}
              </div>
            </div>
            
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: 6,
            }}>
              <div style={{ 
                fontSize: 12, 
                color: "#666", 
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                {t("admin.role")}
              </div>
              <div>
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: getRoleColor(user.role),
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    display: "inline-block",
                  }}
                >
                  {user.role}
                </span>
              </div>
            </div>
            
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: 6,
            }}>
              <div style={{ 
                fontSize: 12, 
                color: "#666", 
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                {t("admin.tenants")}
              </div>
              <div style={{ 
                fontSize: 14, 
                color: "#333",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}>
                {user.tenantIds?.length || 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


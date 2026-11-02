// src/components/UserInfoDropdown.tsx
import { useState, useContext, useRef, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../contexts/AuthContext";

export function UserInfoDropdown() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  const profilePath = `/${lang || "hu"}/admin/profile`;

  return (
    <div
      ref={rootRef}
      style={{ position: "relative" }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        style={{
          color: "#666",
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 4,
          display: "inline-block",
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "transparent",
          border: "none",
          fontSize: "inherit",
        }}
      >
        {user.firstName} {user.lastName} ({user.role})
      </button>
      {isOpen && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            // paddingTop bridges the visual gap so mouse can move onto the panel
            // without firing mouseleave on the parent (margin would create a hole).
            paddingTop: 8,
            zIndex: 1200,
            minWidth: 320,
          }}
        >
          <div
            style={{
              background: "white",
              border: "1px solid #ddd",
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              padding: "20px 24px",
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: 18,
                fontWeight: 600,
                fontFamily:
                  "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                color: "#333",
              }}
            >
              {t("admin.userInformation")}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    fontSize: "clamp(13px, 3vw, 15px)",
                    color: "#666",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {t("admin.username")}
                </div>
                <div style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "#333" }}>
                  {user.username}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    fontSize: "clamp(13px, 3vw, 15px)",
                    color: "#666",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {t("admin.email")}
                </div>
                <div style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "#333" }}>
                  {user.email}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    fontSize: "clamp(13px, 3vw, 15px)",
                    color: "#666",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {t("admin.role")}
                </div>
                <div>
                  <span className="admin-role-badge" data-role={user.role}>
                    {t(`admin.roles.${user.role}`, { defaultValue: user.role })}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    fontSize: "clamp(13px, 3vw, 15px)",
                    color: "#666",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {t("admin.tenants")}
                </div>
                <div style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "#333" }}>
                  {user.tenantIds?.length || 0}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid #e8e8e8",
              }}
            >
              <Link
                to={profilePath}
                role="menuitem"
                onClick={() => setIsOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: "#1e3a5f",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: 15,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t("admin.profile.menuButton", { defaultValue: "Profil" })}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

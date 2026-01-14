// src/components/AdminPageHeader.tsx
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string | ReactNode;
  newButtonLabel?: string;
  onNewClick?: () => void;
  showNewButton?: boolean;
  isCreatingOrEditing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  showBackButton?: boolean;
  backTo?: string;
}

export function AdminPageHeader({
  title,
  subtitle,
  newButtonLabel,
  onNewClick,
  showNewButton = true,
  isCreatingOrEditing = false,
  onSave,
  onCancel,
  saveLabel,
  cancelLabel,
  showBackButton = true,
  backTo,
}: AdminPageHeaderProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang?: string }>();

  // Determine back navigation path
  const getBackPath = (): string => {
    if (backTo) {
      return backTo;
    }

    const path = location.pathname;
    const langPrefix = lang ? `/${lang}` : "";

    // If creating/editing, go back to list page
    if (isCreatingOrEditing) {
      // Extract entity type from path (e.g., /admin/places -> places, /admin/events -> events)
      const match = path.match(/\/admin\/([^\/]+)/);
      if (match) {
        const entityType = match[1];
        // Handle special cases for sites
        if (entityType === "sites") {
          // If editing a site (SiteEditPage), go back to sites list
          if (path.includes("/edit")) {
            return `${langPrefix}/admin/sites`;
          }
          // If creating a site on SitesPage, go to dashboard (sites list is dashboard level)
          return `${langPrefix}/admin`;
        }
        return `${langPrefix}/admin/${entityType}`;
      }
    }

    // If on list page, go to dashboard
    // Special case: sites list page should go to dashboard
    if (path.match(/\/admin\/sites$/)) {
      return `${langPrefix}/admin`;
    }
    return `${langPrefix}/admin`;
  };

  const handleBack = () => {
    // Always navigate, but call onCancel first if provided (to reset form state)
    if (onCancel) {
      onCancel();
    }
    // Navigate after a short delay to allow form reset
    setTimeout(() => {
      navigate(getBackPath());
    }, 0);
  };

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center", 
      marginBottom: 24,
      flexWrap: "wrap", 
      gap: 16 
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {showBackButton && (
          <button
            onClick={handleBack}
            style={{
              padding: "8px 16px",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: "clamp(14px, 3.5vw, 16px)",
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
              e.currentTarget.style.transform = "translateX(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            <span>←</span>
            <span>{t("common.goBack") || t("common.back") || "Vissza"}</span>
          </button>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: "clamp(20px, 4vw, 28px)",
            fontWeight: 700,
            fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: "white",
            margin: 0,
            marginBottom: subtitle ? 8 : 0,
            textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
            display: typeof title === "string" ? "block" : "flex",
            justifyContent: typeof title === "string" ? "flex-start" : "space-between",
            alignItems: "center",
            width: "100%",
          }}>
            {title}
          </h1>
          {subtitle && (
            <div style={{
              fontSize: "clamp(14px, 3.5vw, 16px)",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontWeight: 400,
              color: "#c0c0d0",
              margin: 0,
              textShadow: "0 1px 4px rgba(0, 0, 0, 0.2)",
            }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {isCreatingOrEditing ? (
          <>
            {onSave && (
              <button
                onClick={onSave}
                style={{
                  padding: "10px 20px",
                  background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontWeight: 600,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(40, 167, 69, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(40, 167, 69, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(40, 167, 69, 0.3)";
                }}
              >
                {saveLabel || t("common.update")}
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                style={{
                  padding: "10px 20px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontWeight: 600,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(108, 117, 125, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#5a6268";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(108, 117, 125, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#6c757d";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(108, 117, 125, 0.3)";
                }}
              >
                {cancelLabel || t("common.cancel")}
              </button>
            )}
          </>
        ) : (
          showNewButton && onNewClick && (
            <button
              onClick={onNewClick}
              style={{
                padding: "10px 20px",
                background: "#4a90e2",
                color: "white",
                border: "2px solid white",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 8px rgba(74, 144, 226, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#357abd";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(74, 144, 226, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#4a90e2";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(74, 144, 226, 0.3)";
              }}
            >
              + {newButtonLabel || t("admin.forms.newItem")}
            </button>
          )
        )}
      </div>
    </div>
  );
}

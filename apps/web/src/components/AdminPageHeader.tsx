// src/components/AdminPageHeader.tsx
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface AdminPageHeaderProps {
  title: string;
  newButtonLabel?: string;
  onNewClick?: () => void;
  showNewButton?: boolean;
  isCreatingOrEditing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
}

export function AdminPageHeader({
  title,
  newButtonLabel,
  onNewClick,
  showNewButton = true,
  isCreatingOrEditing = false,
  onSave,
  onCancel,
  saveLabel,
  cancelLabel,
}: AdminPageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center", 
      marginBottom: 24,
      flexWrap: "wrap", 
      gap: 16 
    }}>
      <h1 style={{
        fontSize: "clamp(20px, 4vw, 28px)",
        fontWeight: 700,
        fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "white",
        margin: 0,
      }}>
        {title}
      </h1>
      
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {isCreatingOrEditing ? (
          <>
            {onSave && (
              <button
                onClick={onSave}
                style={{
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 600,
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
                  padding: "12px 24px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 600,
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
                padding: "12px 24px",
                background: "#4a90e2",
                color: "white",
                border: "2px solid white",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 600,
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

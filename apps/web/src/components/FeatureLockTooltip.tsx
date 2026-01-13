// apps/web/src/components/FeatureLockTooltip.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface FeatureLockTooltipProps {
  featureName: string;
  reason: "locked" | "limitReached";
  currentUsage?: number;
  limit?: number;
  siteId?: string;
  planName?: string;
  alternativeAction?: string;
  onAlternativeAction?: () => void;
}

export function FeatureLockTooltip({
  featureName,
  reason,
  currentUsage,
  limit,
  siteId,
  planName,
  alternativeAction,
  onAlternativeAction,
}: FeatureLockTooltipProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleViewPlan = () => {
    if (siteId) {
      navigate(`/admin/sites/${siteId}/edit?tab=subscription`);
    }
  };

  if (reason === "locked") {
    return (
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 12,
            background: "#fef3c7",
            borderRadius: 8,
            border: "1px solid #fbbf24",
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span style={{ fontSize: 18 }}>🔒</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>
              {(t("admin.featureLocked") || "Ez a funkció az {plan} csomagban nem érhető el.").replace("{plan}", planName || t("admin.currentPlan") || "jelenlegi")}
            </div>
            <div style={{ fontSize: 12, color: "#78350f" }}>
              {t("admin.featureLockedDescription") || "A funkció használatához frissíts egy magasabb csomagra."}
            </div>
          </div>
          <button
            type="button"
            onClick={handleViewPlan}
            style={{
              padding: "6px 12px",
              background: "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("admin.viewPlan") || "Csomag megtekintése"}
          </button>
        </div>
        {showTooltip && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 8,
              padding: 12,
              background: "#1f2937",
              color: "white",
              borderRadius: 8,
              fontSize: 12,
              zIndex: 1000,
              maxWidth: 300,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            {t("admin.featureLockedTooltip") || "Magasabb csomag szükséges."}
          </div>
        )}
      </div>
    );
  }

  if (reason === "limitReached") {
    return (
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 12,
            background: "#fef3c7",
            borderRadius: 8,
            border: "1px solid #f59e0b",
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>
              {(t("admin.limitReachedMessage") || "Elérted a csomagodban engedélyezett {feature} számát ({current} / {limit}).")
                .replace("{feature}", featureName)
                .replace("{current}", String(currentUsage || 0))
                .replace("{limit}", String(limit || 0))}
            </div>
            {alternativeAction && (
              <div style={{ fontSize: 12, color: "#78350f", marginTop: 4 }}>
                {alternativeAction}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleViewPlan}
            style={{
              padding: "6px 12px",
              background: "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("admin.upgradePlan") || "Csomag frissítése"}
          </button>
          {onAlternativeAction && (
            <button
              type="button"
              onClick={onAlternativeAction}
              style={{
                padding: "6px 12px",
                background: "transparent",
                color: "#f59e0b",
                border: "1px solid #f59e0b",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                marginLeft: 8,
              }}
            >
              {t("admin.removeFromOther") || "Eltávolítás másikról"}
            </button>
          )}
        </div>
        {showTooltip && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 8,
              padding: 12,
              background: "#1f2937",
              color: "white",
              borderRadius: 8,
              fontSize: 12,
              zIndex: 1000,
              maxWidth: 300,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            {t("admin.limitReachedTooltip") || "Frissíts csomagot vagy távolíts el elemet."}
          </div>
        )}
      </div>
    );
  }

  return null;
}

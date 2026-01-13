// apps/web/src/components/PlaceBillingSection.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getPlaceUpsellState, type PlaceUpsellState, type FeatureGate } from "../api/admin.api";
import { useToast } from "../contexts/ToastContext";

interface PlaceBillingSectionProps {
  placeId: string;
  currentPlan: "free" | "basic" | "pro";
  currentIsFeatured: boolean;
  currentFeaturedUntil: string | "";
  siteId: string; // Required for navigation to Site Edit
  userRole: "superadmin" | "admin" | "editor" | "viewer";
}

export function PlaceBillingSection({
  placeId,
  currentPlan,
  currentIsFeatured,
  currentFeaturedUntil,
  siteId,
  userRole,
}: PlaceBillingSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [upsellState, setUpsellState] = useState<PlaceUpsellState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isSuperadmin = userRole === "superadmin";

  useEffect(() => {
    loadData();
  }, [placeId, siteId]);

  const loadData = async () => {
    if (!placeId || !siteId) return;
    setIsLoading(true);
    try {
      const state = await getPlaceUpsellState(placeId, siteId);
      setUpsellState(state);
    } catch (error) {
      console.error("Failed to load upsell state:", error);
      showToast(t("admin.errorLoadingBilling") || "Failed to load billing information", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPlans = () => {
    // Navigate to Site Edit page, subscription tab
    if (siteId) {
      navigate(`/admin/sites/${siteId}/edit?tab=subscription`);
    } else {
      showToast(t("admin.siteNotFound") || "Site not found", "error");
    }
  };

  const handleManageFeatured = () => {
    // Navigate to places list with featured filter
    navigate(`/admin/places?siteId=${siteId}&featured=true`);
  };

  const renderFeatureGate = (gate: FeatureGate, label: string, icon: string) => {
    if (gate.state === "enabled") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, background: "#f0fdf4", borderRadius: 8 }}>
          <span style={{ fontSize: 18, color: "#22c55e" }}>✓</span>
          <span style={{ 
            fontSize: "clamp(14px, 3.5vw, 16px)", 
            color: "#333", 
            fontWeight: 500,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>{label}</span>
          <span style={{ 
            fontSize: "clamp(13px, 3vw, 15px)", 
            color: "#10b981", 
            marginLeft: "auto",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            {t("admin.available") || "Available"}
          </span>
        </div>
      );
    }

    if (gate.state === "locked") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, color: "#dc2626" }}>🔒</span>
            <span style={{ 
            fontSize: "clamp(14px, 3.5vw, 16px)", 
            color: "#333", 
            fontWeight: 500,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>{label}</span>
          </div>
          <div style={{ 
            fontSize: "clamp(13px, 3vw, 15px)", 
            color: "#991b1b", 
            marginLeft: 26,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            {gate.reason}
          </div>
          {gate.upgradeCta === "viewPlans" && (
            <button
              type="button"
              onClick={handleViewPlans}
              style={{
                marginLeft: 26,
                marginTop: 4,
                padding: "8px 16px",
                background: "#667eea",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontSize: "clamp(13px, 3vw, 15px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#5568d3";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#667eea";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {t("admin.viewPlans") || "Csomagok összehasonlítása"}
            </button>
          )}
        </div>
      );
    }

    if (gate.state === "limit_reached") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, color: "#f59e0b" }}>⚠️</span>
            <span style={{ 
            fontSize: "clamp(14px, 3.5vw, 16px)", 
            color: "#333", 
            fontWeight: 500,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>{label}</span>
          </div>
          <div style={{ 
            fontSize: "clamp(13px, 3vw, 15px)", 
            color: "#92400e", 
            marginLeft: 26,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            {gate.reason}
          </div>
          <div style={{ display: "flex", gap: 8, marginLeft: 26, marginTop: 4, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleViewPlans}
              style={{
                padding: "8px 16px",
                background: "#667eea",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontSize: "clamp(13px, 3vw, 15px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#5568d3";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#667eea";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {t("admin.upgradePlan") || "Frissítés"}
            </button>
            {gate.alternativeCta === "manageExisting" && (
              <button
                type="button"
                onClick={handleManageFeatured}
                style={{
                  padding: "8px 16px",
                  background: "white",
                  color: "#667eea",
                  border: "1px solid #667eea",
                  borderRadius: 6,
                  fontSize: "clamp(13px, 3vw, 15px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f0f4ff";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {t("admin.manageFeatured") || "Kiemelések kezelése"}
              </button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#666" }}>
        {t("common.loading") || "Loading..."}
      </div>
    );
  }

  const planLabels: Record<"free" | "basic" | "pro", string> = {
    free: t("admin.planFree") || "Free",
    basic: t("admin.planBasic") || "Basic",
    pro: t("admin.planPro") || "Pro",
  };

  const planColors: Record<"free" | "basic" | "pro", string> = {
    free: "#6b7280",
    basic: "#3b82f6",
    pro: "#667eea",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: "clamp(18px, 4vw, 22px)", 
          fontWeight: 600, 
          color: "#333",
          fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>
          {t("admin.billingAndPlan") || "Számlázás és csomag"}
        </h3>
        <h4 style={{ 
          margin: 0, 
          fontSize: "clamp(16px, 3.5vw, 20px)", 
          fontWeight: 600, 
          color: "#667eea",
          fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>
          {t("admin.currentPlan") || "Jelenlegi csomag"}
        </h4>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left: Plan Summary + Usage */}
        <div
          style={{
            padding: 20,
            background: "white",
            borderRadius: 12,
            border: `2px solid ${planColors[currentPlan]}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "inline-block",
                padding: "6px 12px",
                background: planColors[currentPlan],
                color: "white",
                borderRadius: 6,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 600,
              }}
            >
              {planLabels[currentPlan]}
            </div>
          </div>

          <div style={{ 
            fontSize: "clamp(13px, 3vw, 15px)", 
            color: "#666", 
            marginTop: 16,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            {t("admin.planInfo") || "A csomagot a Site beállításokban módosíthatod."}
          </div>
        </div>

        {/* Right: Feature Gates */}
        <div
          style={{
            padding: 20,
            background: "white",
            borderRadius: 12,
            border: "1px solid #e0e7ff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ 
            fontSize: "clamp(14px, 3.5vw, 16px)", 
            color: "#666", 
            marginBottom: 12, 
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            {t("admin.availableFeatures") || "Elérhető funkciók"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {upsellState && (
              <>
                {renderFeatureGate(
                  upsellState.featured,
                  t("admin.featuredPlacement") || "Kiemelt megjelenés",
                  "⭐"
                )}
                {renderFeatureGate(
                  upsellState.gallery,
                  t("admin.extraGalleryImages") || "Extra galéria képek",
                  "🖼️"
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        type="button"
        onClick={handleViewPlans}
        style={{
          padding: "10px 20px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: "clamp(14px, 3.5vw, 16px)",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s",
          boxShadow: "0 2px 4px rgba(102, 126, 234, 0.3)",
          alignSelf: "flex-start",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 4px rgba(102, 126, 234, 0.3)";
        }}
      >
        {t("admin.viewPlans") || "Csomagok összehasonlítása"}
      </button>
    </div>
  );
}

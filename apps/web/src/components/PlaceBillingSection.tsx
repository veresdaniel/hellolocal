// apps/web/src/components/PlaceBillingSection.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getPlaceEntitlements, type PlaceEntitlements } from "../api/admin.api";
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
  const [entitlements, setEntitlements] = useState<PlaceEntitlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previousPlan, setPreviousPlan] = useState<string | null>(null);
  const [animatedValues, setAnimatedValues] = useState<Set<string>>(new Set());
  const isSuperadmin = userRole === "superadmin";

  useEffect(() => {
    loadData();
  }, [placeId]);

  // Track plan changes for animation
  useEffect(() => {
    if (previousPlan && previousPlan !== currentPlan) {
      // Mark values that should animate
      setAnimatedValues(new Set(["plan", "images", "events", "featured"]));
      // Clear animation after animation completes
      setTimeout(() => {
        setAnimatedValues(new Set());
      }, 600);
    }
    setPreviousPlan(currentPlan);
  }, [currentPlan, previousPlan]);

  const loadData = async () => {
    if (!placeId) return;
    setIsLoading(true);
    try {
      const entData = await getPlaceEntitlements(placeId);
      setEntitlements(entData);
    } catch (error) {
      console.error("Failed to load billing data:", error);
      showToast(t("admin.errorLoadingBilling") || "Failed to load billing information", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPlan = () => {
    // Navigate to Site Edit page, subscription tab
    if (siteId) {
      navigate(`/admin/sites/${siteId}/edit?tab=subscription`);
    } else {
      showToast(t("admin.siteNotFound") || "Site not found", "error");
    }
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
      <style>{`
        @keyframes valueUpdate {
          0% {
            transform: scale(1);
            color: inherit;
          }
          50% {
            transform: scale(1.15);
            color: #667eea;
          }
          100% {
            transform: scale(1);
            color: inherit;
          }
        }
      `}</style>
      {/* Current Plan Display - Read-only */}
      <div
        style={{
          padding: 20,
          background: "white",
          borderRadius: 12,
          border: `2px solid ${planColors[currentPlan]}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#333" }}>
              {t("admin.currentPlan") || "Current Plan"}
            </h3>
            <div
              style={{
                marginTop: 8,
                display: "inline-block",
                padding: "6px 12px",
                background: planColors[currentPlan],
                color: "white",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                animation: animatedValues.has("plan") ? "valueUpdate 0.6s ease-out" : "none",
                transform: animatedValues.has("plan") ? "scale(1.1)" : "scale(1)",
                transition: "transform 0.3s ease-out",
              }}
            >
              {planLabels[currentPlan]}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#666", fontStyle: "italic" }}>
            {t("admin.readOnly") || "Read-only"}
          </div>
        </div>

        {/* Plan Features - Read-only display */}
        {entitlements && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>
              {t("admin.planFeatures") || "Plan Features"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ 
                  fontSize: 16, 
                  color: entitlements.limits.images === Infinity || entitlements.currentUsage.images < entitlements.limits.images ? "#22c55e" : "#dc2626" 
                }}>
                  {entitlements.limits.images === Infinity ? "✓" : entitlements.currentUsage.images < entitlements.limits.images ? "✓" : "✗"}
                </span>
                <span 
                  style={{ 
                    fontSize: 14, 
                    color: "#333",
                    animation: animatedValues.has("images") ? "valueUpdate 0.6s ease-out" : "none",
                    transform: animatedValues.has("images") ? "scale(1.1)" : "scale(1)",
                    transition: "transform 0.3s ease-out",
                  }}
                >
                  {entitlements.limits.images === Infinity
                    ? t("admin.unlimitedImages") || "Unlimited images"
                    : `${entitlements.currentUsage.images} / ${entitlements.limits.images} ${t("admin.images") || "images"}`}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ 
                  fontSize: 16, 
                  color: entitlements.limits.events === Infinity || entitlements.currentUsage.events < entitlements.limits.events ? "#22c55e" : "#dc2626" 
                }}>
                  {entitlements.limits.events === Infinity ? "✓" : entitlements.currentUsage.events < entitlements.limits.events ? "✓" : "✗"}
                </span>
                <span 
                  style={{ 
                    fontSize: 14, 
                    color: "#333",
                    animation: animatedValues.has("events") ? "valueUpdate 0.6s ease-out" : "none",
                    transform: animatedValues.has("events") ? "scale(1.1)" : "scale(1)",
                    transition: "transform 0.3s ease-out",
                  }}
                >
                  {entitlements.limits.events === Infinity
                    ? t("admin.unlimitedEvents") || "Unlimited events"
                    : `${entitlements.currentUsage.events} / ${entitlements.limits.events} ${t("admin.events") || "events"}`}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ 
                  fontSize: 16, 
                  color: entitlements.limits.featured ? "#22c55e" : "#dc2626" 
                }}>
                  {entitlements.limits.featured ? "✓" : "✗"}
                </span>
                <span 
                  style={{ 
                    fontSize: 14, 
                    color: "#333",
                    animation: animatedValues.has("featured") ? "valueUpdate 0.6s ease-out" : "none",
                    transform: animatedValues.has("featured") ? "scale(1.1)" : "scale(1)",
                    transition: "transform 0.3s ease-out",
                  }}
                >
                  {t("admin.featuredPlacement") || "Featured placement"}
                  {currentIsFeatured && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: "#10b981", fontWeight: 600 }}>
                      ({t("admin.active") || "Active"})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upsell CTA for non-pro plans */}
      {currentPlan !== "pro" && (
        <div style={{ 
          padding: 16, 
          background: "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)", 
          borderRadius: 12, 
          border: "1px solid #e0e0e0",
        }}>
          <div style={{ fontSize: 14, color: "#666", marginBottom: 8, fontWeight: 600 }}>
            {t("admin.proPlanBenefits") || "Pro Plan Benefits"}
          </div>
          <div style={{ fontSize: 13, color: "#999", marginBottom: 12 }}>
            {t("admin.upgradeToProHint") || "Upgrade to Pro to unlock unlimited images, events, and featured placement."}
          </div>
        </div>
      )}

      {/* View/Update Plan Button */}
      <button
        type="button"
        onClick={handleViewPlan}
        style={{
          padding: "12px 24px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s",
          boxShadow: "0 2px 4px rgba(102, 126, 234, 0.3)",
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
        {t("admin.viewOrUpdatePlan") || "View / Update Plan"}
      </button>
    </div>
  );
}

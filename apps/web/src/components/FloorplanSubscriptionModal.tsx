// FloorplanSubscriptionModal.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  getFloorplanEntitlement,
  createFeatureSubscription,
  updateFeatureSubscription,
  getPlaceFeatureSubscriptions,
  type FloorplanEntitlement,
  type FeatureSubscription,
  type CreateFeatureSubscriptionDto,
} from "../api/admin.api";
import { useToast } from "../contexts/ToastContext";

interface FloorplanSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeId: string;
  siteId: string;
  onSuccess?: () => void;
}

type SubscriptionScope = "place" | "site";
type BillingPeriod = "MONTHLY" | "YEARLY";
type PlanKey = "FP_1"; // Only 1 floorplan per place is allowed

export function FloorplanSubscriptionModal({
  isOpen,
  onClose,
  placeId,
  siteId,
  onSuccess,
}: FloorplanSubscriptionModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [entitlement, setEntitlement] = useState<FloorplanEntitlement | null>(null);
  const [subscriptions, setSubscriptions] = useState<FeatureSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scope, setScope] = useState<SubscriptionScope>("place");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY");
  const planKey: PlanKey = "FP_1"; // Always 1 floorplan per place

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, placeId, siteId, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose, isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ent, subs] = await Promise.all([
        getFloorplanEntitlement(placeId, siteId),
        getPlaceFeatureSubscriptions(placeId),
      ]);
      setEntitlement(ent);
      setSubscriptions(subs);

      // If there's an active subscription, close modal
      const activeSub = subs.find(
        (s) => s.status === "active" && new Date(s.currentPeriodEnd || 0) > new Date()
      );
      if (activeSub) {
        // Close modal if subscription is active - it will be shown in the feature gates section
        onClose();
        return;
      }
    } catch (error) {
      console.error("Failed to load floorplan entitlement:", error);
      showToast(t("admin.errorLoadingData") || "Hiba az adatok betöltésekor", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    // Check if there's already an active subscription before submitting
    const activeSub = subscriptions.find(
      (s) => 
        s.status === "active" && 
        s.featureKey === "FLOORPLANS" &&
        s.planKey === planKey &&
        s.scope === scope &&
        (scope === "place" ? s.placeId === placeId : s.placeId === null) &&
        (!s.currentPeriodEnd || new Date(s.currentPeriodEnd) > new Date())
    );

    if (activeSub) {
      showToast(t("admin.subscription.alreadySubscribed") || "Erre a funkcióra már előfizetett ebben a csomagban.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      // Note: Free account check is handled in PlaceBillingSection - the feature gate
      // is not shown for free accounts, so this modal should never be opened for free accounts.
      // The backend getFloorplanGate also returns "locked" state for free accounts.

      const dto: CreateFeatureSubscriptionDto = {
        siteId,
        scope,
        placeId: scope === "place" ? placeId : undefined,
        featureKey: "FLOORPLANS",
        planKey,
        billingPeriod,
      };

      await createFeatureSubscription(dto);
      showToast(t("admin.subscription.created") || "Előfizetés létrehozva", "success");
      await loadData();
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to create subscription:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "";
      showToast(
        errorMessage || t("admin.errorCreatingSubscription") || "Hiba az előfizetés létrehozásakor",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const activeSubscription = subscriptions.find(
    (s) => s.status === "active" && new Date(s.currentPeriodEnd || 0) > new Date()
  );

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Only 1 floorplan per place is allowed in all plans

  return (
    <>
      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes modalSlideIn {
          from {
            transform: translateY(-20px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: isMobile ? 16 : 24,
          animation: "modalFadeIn 0.2s ease-out",
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: 0,
            maxWidth: isMobile ? "100%" : 700,
            width: "100%",
            maxHeight: "90vh",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
            animation: "modalSlideIn 0.3s ease-out",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              padding: isMobile ? 24 : 32,
              color: "white",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "50%",
                filter: "blur(40px)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 32 }}>📐</span>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: isMobile ? 22 : 28,
                      fontWeight: 700,
                      fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      color: "white",
                    }}
                  >
                    {t("admin.floorplan.subscription.title") || "Alaprajz előfizetés"}
                  </h2>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: isMobile ? 14 : 16,
                    opacity: 0.9,
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.floorplan.subscription.subtitle") || "Válassz egy csomagot és számlázási időszakot"}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  color: "white",
                  padding: 8,
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  transition: "all 0.2s",
                  backdropFilter: "blur(10px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                  e.currentTarget.style.transform = "rotate(90deg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.transform = "rotate(0deg)";
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: isMobile ? 24 : 32, overflowY: "auto", flex: 1 }}>
            {isLoading ? (
              <div style={{ textAlign: "center", padding: 60, color: "#666" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                <div style={{ fontSize: 16, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  {t("common.loading") || "Betöltés..."}
                </div>
              </div>
            ) : activeSubscription ? (
              // If there's an active subscription, show message
              <div style={{ 
                textAlign: "center", 
                padding: 60, 
                color: "#374151",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}>
                <div style={{ fontSize: 64 }}>✅</div>
                <div style={{ 
                  fontSize: 20, 
                  fontWeight: 600,
                  fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  color: "#1a1a1a",
                }}>
                  {t("admin.subscription.alreadySubscribed") || "Erre a funkcióra már előfizetett ebben a csomagban."}
                </div>
                <div style={{ 
                  fontSize: 14,
                  color: "#6b7280",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  marginTop: 8,
                }}>
                  {t("admin.subscription.activeSubscriptionInfo") || "Az aktív előfizetés részletei a fenti szekcióban láthatók."}
                </div>
                <button
                  onClick={onClose}
                  style={{
                    marginTop: 24,
                    padding: "12px 24px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {t("common.close") || "Bezárás"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {/* Scope Selection */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 16,
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#1a1a1a",
                      fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.floorplan.subscription.scope") || "Hatály"}
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <button
                      onClick={() => setScope("place")}
                      style={{
                        padding: 20,
                        background: scope === "place" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "white",
                        color: scope === "place" ? "white" : "#374151",
                        border: `2px solid ${scope === "place" ? "transparent" : "#e5e7eb"}`,
                        borderRadius: 16,
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        transition: "all 0.2s",
                        boxShadow: scope === "place" ? "0 8px 20px rgba(0, 0, 0, 0.15)" : "0 2px 8px rgba(0, 0, 0, 0.05)",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) => {
                        if (scope !== "place") {
                          e.currentTarget.style.borderColor = "#667eea";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (scope !== "place") {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.05)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }
                      }}
                    >
                      <span style={{ fontSize: 32 }}>📍</span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            marginBottom: 4,
                            fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          }}
                        >
                          {t("admin.floorplan.subscription.thisPlace") || "Ez a hely"}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            opacity: scope === "place" ? 0.9 : 0.6,
                            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          }}
                        >
                          {t("admin.floorplan.subscription.thisPlaceDesc") || "Csak erre a helyre vonatkozik"}
                        </div>
                      </div>
                      {scope === "place" && (
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => setScope("site")}
                      style={{
                        padding: 20,
                        background: scope === "site" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "white",
                        color: scope === "site" ? "white" : "#374151",
                        border: `2px solid ${scope === "site" ? "transparent" : "#e5e7eb"}`,
                        borderRadius: 16,
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        transition: "all 0.2s",
                        boxShadow: scope === "site" ? "0 8px 20px rgba(0, 0, 0, 0.15)" : "0 2px 8px rgba(0, 0, 0, 0.05)",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) => {
                        if (scope !== "site") {
                          e.currentTarget.style.borderColor = "#667eea";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (scope !== "site") {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.05)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }
                      }}
                    >
                      <span style={{ fontSize: 32 }}>🌐</span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            marginBottom: 4,
                            fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          }}
                        >
                          {t("admin.floorplan.subscription.allPlaces") || "Összes hely"}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            opacity: scope === "site" ? 0.9 : 0.6,
                            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          }}
                        >
                          {t("admin.floorplan.subscription.allPlacesDesc") || "Az összes helyre vonatkozik, beleértve a később létrehozottakat is"}
                        </div>
                      </div>
                      {scope === "site" && (
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Billing Period */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 16,
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#1a1a1a",
                      fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.floorplan.subscription.billingPeriod") || "Számlázási időszak"}
                  </label>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      onClick={() => setBillingPeriod("MONTHLY")}
                      style={{
                        flex: 1,
                        padding: 20,
                        background: billingPeriod === "MONTHLY" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#f9fafb",
                        color: billingPeriod === "MONTHLY" ? "white" : "#374151",
                        border: `2px solid ${billingPeriod === "MONTHLY" ? "#667eea" : "#e5e7eb"}`,
                        borderRadius: 12,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        transition: "all 0.2s",
                        boxShadow: billingPeriod === "MONTHLY" ? "0 4px 12px rgba(102, 126, 234, 0.3)" : "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                      }}
                      onMouseEnter={(e) => {
                        if (billingPeriod !== "MONTHLY") {
                          e.currentTarget.style.borderColor = "#667eea";
                          e.currentTarget.style.background = "#f3f4f6";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (billingPeriod !== "MONTHLY") {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                          e.currentTarget.style.background = "#f9fafb";
                        }
                      }}
                    >
                      <span style={{ fontSize: 24 }}>📅</span>
                      <span>{t("admin.monthly") || "Havi"}</span>
                    </button>
                    <button
                      onClick={() => setBillingPeriod("YEARLY")}
                      style={{
                        flex: 1,
                        padding: 20,
                        background: billingPeriod === "YEARLY" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#f9fafb",
                        color: billingPeriod === "YEARLY" ? "white" : "#374151",
                        border: `2px solid ${billingPeriod === "YEARLY" ? "#667eea" : "#e5e7eb"}`,
                        borderRadius: 12,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        transition: "all 0.2s",
                        boxShadow: billingPeriod === "YEARLY" ? "0 4px 12px rgba(102, 126, 234, 0.3)" : "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        if (billingPeriod !== "YEARLY") {
                          e.currentTarget.style.borderColor = "#667eea";
                          e.currentTarget.style.background = "#f3f4f6";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (billingPeriod !== "YEARLY") {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                          e.currentTarget.style.background = "#f9fafb";
                        }
                      }}
                    >
                      <span style={{ fontSize: 24 }}>🎯</span>
                      <span>{t("admin.yearly") || "Éves"}</span>
                      <span
                        style={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                          color: "white",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "4px 8px",
                          borderRadius: 12,
                          boxShadow: "0 2px 8px rgba(34, 197, 94, 0.4)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t("admin.save") || "Mentés"} 17%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubscribe}
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "18px 24px",
                    background: isSubmitting
                      ? "#9ca3af"
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 12,
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    transition: "all 0.2s",
                    boxShadow: isSubmitting ? "none" : "0 8px 20px rgba(102, 126, 234, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 12px 24px rgba(102, 126, 234, 0.5)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(102, 126, 234, 0.4)";
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span style={{ animation: "pulse 1s ease-in-out infinite" }}>⏳</span>
                      <span>{t("common.loading") || "Feldolgozás..."}</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>{t("admin.floorplan.subscription.subscribe") || "Előfizetés"}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// apps/web/src/components/PlaceBillingSection.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getPlaceUpsellState, type PlaceUpsellState, type FeatureGate, getPlaceSubscription, updatePlaceSubscription, type PlaceSubscription, cancelSubscription, resumeSubscription, updateSubscription } from "../api/admin.api";
import { useToast } from "../contexts/ToastContext";

interface PlaceBillingSectionProps {
  placeId: string;
  currentPlan: "free" | "basic" | "pro";
  currentIsFeatured: boolean;
  currentFeaturedUntil: string | "";
  siteId: string; // Required for navigation to Site Edit
  userRole: "superadmin" | "admin" | "editor" | "viewer";
  onPlanChange?: (newPlan: "free" | "basic" | "pro") => void; // Callback when plan changes
}

export function PlaceBillingSection({
  placeId,
  currentPlan,
  currentIsFeatured,
  currentFeaturedUntil,
  siteId,
  userRole,
  onPlanChange,
}: PlaceBillingSectionProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [upsellState, setUpsellState] = useState<PlaceUpsellState | null>(null);
  const [subscription, setSubscription] = useState<PlaceSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const isSuperadmin = userRole === "superadmin";

  useEffect(() => {
    loadData();
  }, [placeId, siteId, currentPlan]);

  const loadData = async () => {
    if (!placeId || !siteId) return;
    setIsLoading(true);
    try {
      const lang = (() => {
        const stored = localStorage.getItem("i18nextLng");
        if (stored && ["hu", "en", "de"].includes(stored.split("-")[0])) {
          return stored.split("-")[0];
        }
        return "hu";
      })();
      const [state, sub, subscriptionData] = await Promise.all([
        getPlaceUpsellState(placeId, siteId),
        getPlaceSubscription(placeId).catch(() => null), // Subscription may not exist yet
        // Also fetch from subscription service to get the subscription ID and status
        fetch(`/api/${lang}/sites/places/${placeId}/subscription`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null),
      ]);
      setUpsellState(state);
      // Merge subscription data (id and status from subscription service)
      if (subscriptionData && subscriptionData.id) {
        setSubscription(sub ? { ...sub, id: subscriptionData.id, status: subscriptionData.status } : subscriptionData);
      } else {
        setSubscription(sub);
      }
    } catch (error) {
      console.error("Failed to load billing data:", error);
      showToast(t("admin.errorLoadingBilling") || "Failed to load billing information", "error");
    } finally {
      setIsLoading(false);
    }
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

  // Show billing section to everyone, but only allow modification for admin/superadmin
  const canModifyBilling = isSuperadmin || userRole === "admin";

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
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
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
            {/* Suspend and Cancel buttons - only show if subscription exists and is active */}
            {subscription && subscription.id && subscription.status === "ACTIVE" && canModifyBilling && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={async () => {
                    const confirmMessage = t("admin.subscription.suspendConfirm") || "Biztosan felfüggeszted az előfizetést?";
                    if (window.confirm(confirmMessage)) {
                      setIsUpdating(true);
                      try {
                        await updateSubscription("place", subscription.id, { status: "SUSPENDED" });
                        showToast(t("admin.subscription.suspended") || "Előfizetés felfüggesztve", "success");
                        await loadData();
                      } catch (error) {
                        console.error("Failed to suspend subscription:", error);
                        showToast(t("admin.errors.updateFailed") || "Hiba a felfüggesztés során", "error");
                      } finally {
                        setIsUpdating(false);
                      }
                    }
                  }}
                  disabled={isUpdating}
                  style={{
                    padding: "6px 12px",
                    background: "#f59e0b",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    fontSize: "clamp(12px, 2.5vw, 14px)",
                    fontWeight: 600,
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    cursor: isUpdating ? "not-allowed" : "pointer",
                    opacity: isUpdating ? 0.6 : 1,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isUpdating) {
                      e.currentTarget.style.background = "#d97706";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isUpdating) {
                      e.currentTarget.style.background = "#f59e0b";
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                >
                  {t("admin.subscription.suspend") || "Felfüggesztem"}
                </button>
                <button
                  onClick={async () => {
                    const confirmMessage = t("admin.subscription.cancelConfirm") || "Biztosan le szeretnéd mondani az előfizetést? Az aktuális hó végéig lesz elérésed.";
                    if (window.confirm(confirmMessage)) {
                      setIsUpdating(true);
                      try {
                        await cancelSubscription("place", subscription.id, placeId);
                        showToast(t("admin.subscription.cancelled") || "Előfizetés lemondva", "success");
                        await loadData();
                      } catch (error) {
                        console.error("Failed to cancel subscription:", error);
                        showToast(t("admin.errors.updateFailed") || "Hiba a lemondás során", "error");
                      } finally {
                        setIsUpdating(false);
                      }
                    }
                  }}
                  disabled={isUpdating}
                  style={{
                    padding: "6px 12px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    fontSize: "clamp(12px, 2.5vw, 14px)",
                    fontWeight: 600,
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    cursor: isUpdating ? "not-allowed" : "pointer",
                    opacity: isUpdating ? 0.6 : 1,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isUpdating) {
                      e.currentTarget.style.background = "#dc2626";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isUpdating) {
                      e.currentTarget.style.background = "#ef4444";
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                >
                  {t("admin.subscription.cancel") || "Lemondom"}
                </button>
              </div>
            )}
          </div>

          {/* Show modification info only for admin/superadmin */}
          {canModifyBilling && (
            <div style={{ 
              fontSize: "clamp(13px, 3vw, 15px)", 
              color: "#666", 
              marginTop: 16,
              marginBottom: 16,
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}>
              {t("admin.placePlanInfo") || "A helyszín csomagját itt módosíthatod."}
            </div>
          )}
          
          {/* Show read-only info for editors/viewers */}
          {!canModifyBilling && (
            <div style={{ 
              fontSize: "clamp(13px, 3vw, 15px)", 
              color: "#666", 
              marginTop: 16,
              marginBottom: 16,
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}>
              {t("admin.placePlanInfoReadOnly") || "A helyszín jelenlegi csomagja."}
            </div>
          )}
          
          {/* Subscription details */}
          {subscription && (
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              background: "#f9fafb", 
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ 
                fontSize: "clamp(12px, 2.5vw, 14px)", 
                color: "#6b7280",
                marginBottom: 8,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}>
                {t("admin.subscriptionDetails") || "Előfizetés részletei"}
              </div>
              {subscription.statusChangedAt && (
                <div style={{ 
                  fontSize: "clamp(12px, 2.5vw, 14px)", 
                  color: "#374151",
                  marginBottom: 4,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}>
                  {t("admin.lastChanged") || "Utolsó módosítás"}: {new Date(subscription.statusChangedAt).toLocaleDateString('hu-HU', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
              {subscription.priceCents !== null && subscription.priceCents !== undefined && (
                <div style={{ 
                  fontSize: "clamp(12px, 2.5vw, 14px)", 
                  color: "#374151",
                  marginBottom: 4,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}>
                  {t("admin.price") || "Ár"}: {subscription.priceCents / 100} {subscription.currency || "HUF"}
                </div>
              )}
              {subscription.validUntil && (
                <div style={{ 
                  fontSize: "clamp(12px, 2.5vw, 14px)", 
                  color: "#374151",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}>
                  {t("admin.validUntil") || "Érvényes"}: {new Date(subscription.validUntil).toLocaleDateString('hu-HU', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric'
                  }              )}
              {/* Cancel/Resume subscription button */}
              {subscription && subscription.id && subscription.status && (
                <div style={{ marginTop: 16 }}>
                  {subscription.status === "ACTIVE" ? (
                    <button
                      onClick={async () => {
                        const confirmMessage = t("admin.subscription.cancelConfirm") || "Biztosan le szeretnéd mondani az előfizetést? Az aktuális hó végéig lesz elérésed.";
                        if (window.confirm(confirmMessage)) {
                          try {
                            await cancelSubscription("place", subscription.id, placeId);
                            showToast(t("admin.subscription.cancelled") || "Előfizetés lemondva", "success");
                            await loadData();
                          } catch (error) {
                            console.error("Failed to cancel subscription:", error);
                            showToast(t("admin.errors.updateFailed") || "Hiba a lemondás során", "error");
                          }
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        fontSize: "clamp(13px, 3vw, 15px)",
                        fontWeight: 600,
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#dc2626";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#ef4444";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {t("admin.subscription.cancel") || "Előfizetés lemondása"}
                    </button>
                  ) : subscription.status === "CANCELLED" ? (
                    <button
                      onClick={async () => {
                        try {
                          await resumeSubscription("place", subscription.id, placeId);
                          showToast(t("admin.subscription.resumed") || "Előfizetés folytatva", "success");
                          await loadData();
                        } catch (error) {
                          console.error("Failed to resume subscription:", error);
                          showToast(t("admin.errors.updateFailed") || "Hiba a folytatás során", "error");
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        fontSize: "clamp(13px, 3vw, 15px)",
                        fontWeight: 600,
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#059669";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#10b981";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {t("admin.subscription.resume") || "Előfizetés folytatása"}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
          )}

          {/* Plan selector - visible to everyone, but disabled for editors/viewers */}
          {onPlanChange && (
            <div style={{ marginTop: 16 }}>
              <label style={{ 
                display: "block", 
                fontSize: "clamp(13px, 3vw, 15px)", 
                fontWeight: 600,
                marginBottom: 8,
                color: "#333",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}>
                {t("admin.changePlan") || "Csomag módosítása"}
              </label>
              <select
                value={currentPlan}
                disabled={isUpdating || !canModifyBilling}
                onChange={async (e) => {
                  if (!canModifyBilling) return;
                  const newPlan = e.target.value as "free" | "basic" | "pro";
                  const confirmMessage = t("admin.confirmPlanChange", { plan: planLabels[newPlan] }) || `Biztosan át szeretnéd váltani a ${planLabels[newPlan]} csomagra?`;
                  if (window.confirm(confirmMessage)) {
                    setIsUpdating(true);
                    try {
                      // Update subscription via API (this will update both Place and PlaceSubscription)
                      await updatePlaceSubscription(placeId, { plan: newPlan });
                      // Reload subscription data and upsell state to reflect new limits
                      await loadData();
                      // Call the callback to update parent component
                      if (onPlanChange) {
                        onPlanChange(newPlan);
                      }
                      showToast(t("admin.messages.placePlanUpdated") || "Csomag frissítve", "success");
                    } catch (error) {
                      console.error("Failed to update plan:", error);
                      showToast(t("admin.errors.updatePlaceFailed") || "Hiba a csomag frissítésekor", "error");
                    } finally {
                      setIsUpdating(false);
                    }
                  }
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  background: canModifyBilling ? "white" : "#f3f4f6",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  cursor: (isUpdating || !canModifyBilling) ? "not-allowed" : "pointer",
                  opacity: (isUpdating || !canModifyBilling) ? 0.6 : 1,
                }}
              >
                <option value="free">{planLabels.free}</option>
                <option value="basic">{planLabels.basic}</option>
                <option value="pro">{planLabels.pro}</option>
              </select>
            </div>
          )}
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

    </div>
  );
}

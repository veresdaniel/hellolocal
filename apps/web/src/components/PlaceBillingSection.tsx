// apps/web/src/components/PlaceBillingSection.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  getPlaceUpsellState,
  type PlaceUpsellState,
  type FeatureGate,
  getPlaceSubscription,
  updatePlaceSubscription,
  type PlaceSubscription,
  cancelSubscription,
  resumeSubscription,
  updateSubscription,
  getFloorplanEntitlement,
  getPlaceFeatureSubscriptions,
  type FloorplanEntitlement,
  type FeatureSubscription,
  cancelFeatureSubscription,
} from "../api/admin.api";
import { useToast } from "../contexts/ToastContext";
import { FloorplanSubscriptionModal } from "./FloorplanSubscriptionModal";
import { useConfirm } from "../hooks/useConfirm";

interface PlaceBillingSectionProps {
  placeId: string;
  currentPlan: "free" | "basic" | "pro";
  currentIsFeatured: boolean;
  currentFeaturedUntil: string | "";
  siteId: string; // Required for navigation to Site Edit
  userRole: "superadmin" | "admin" | "editor" | "viewer";
  onPlanChange?: (newPlan: "free" | "basic" | "pro") => void; // Callback when plan changes
  onFloorplanSubscriptionChange?: () => void; // Callback when floorplan subscription changes
  onActiveFloorplanSubscriptionChange?: (hasActive: boolean) => void; // Callback to notify parent about active subscription status
}

export function PlaceBillingSection({
  placeId,
  currentPlan,
  currentIsFeatured,
  currentFeaturedUntil,
  siteId,
  userRole,
  onPlanChange,
  onFloorplanSubscriptionChange,
  onActiveFloorplanSubscriptionChange,
}: PlaceBillingSectionProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const showConfirm = useConfirm();
  const [upsellState, setUpsellState] = useState<PlaceUpsellState | null>(null);
  const [subscription, setSubscription] = useState<PlaceSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFloorplanModal, setShowFloorplanModal] = useState(false);
  const [floorplanSubscription, setFloorplanSubscription] = useState<FeatureSubscription | null>(
    null
  );
  const isSuperadmin = userRole === "superadmin";

  useEffect(() => {
    loadData();
  }, [placeId, siteId, currentPlan]);

  const loadData = async (forceRefresh: boolean = false) => {
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
      // If force refresh, add a small delay to ensure backend has processed the subscription
      if (forceRefresh) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const [state, sub, subscriptionData, floorplanSubs] = await Promise.all([
        getPlaceUpsellState(placeId, siteId),
        getPlaceSubscription(placeId).catch(() => null), // Subscription may not exist yet
        // Also fetch from subscription service to get the subscription ID and status
        fetch(`/api/${lang}/sites/places/${placeId}/subscription`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
        getPlaceFeatureSubscriptions(placeId).catch(() => []), // Get floorplan subscriptions
      ]);
      setUpsellState(state);
      // Merge subscription data (id and status from subscription service)
      if (subscriptionData && subscriptionData.id) {
        setSubscription(
          sub
            ? { ...sub, id: subscriptionData.id, status: subscriptionData.status }
            : subscriptionData
        );
      } else {
        setSubscription(sub);
      }
      // Find active floorplan subscription
      const activeFloorplanSub = floorplanSubs.find(
        (s) =>
          s.status === "active" &&
          s.featureKey === "FLOORPLANS" &&
          (!s.currentPeriodEnd || new Date(s.currentPeriodEnd) > new Date())
      );
      setFloorplanSubscription(activeFloorplanSub || null);
      // Notify parent about active subscription status
      const hasActive = !!activeFloorplanSub;
      onActiveFloorplanSubscriptionChange?.(hasActive);
    } catch (error) {
      console.error("Failed to load billing data:", error);
      showToast(t("admin.errorLoadingBilling") || "Failed to load billing information", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const renderFeatureGate = (
    gate: FeatureGate,
    label: string,
    icon: string,
    onClick?: () => void,
    isFloorplan: boolean = false
  ) => {
    if (gate.state === "enabled") {
      // Special handling for floorplans - show subscription info
      if (isFloorplan && floorplanSubscription) {
        const planLabels: Record<string, string> = {
          FP_1: t("admin.floorplan.subscription.plan1") || "1 alaprajz",
          FP_5: t("admin.floorplan.subscription.plan5") || "5 alaprajz",
          FP_CUSTOM: t("admin.floorplan.subscription.planCustom") || "Egyedi limit",
        };
        const billingLabels: Record<string, string> = {
          MONTHLY: t("admin.monthly") || "Havi",
          YEARLY: t("admin.yearly") || "Éves",
        };
        const planLabel =
          planLabels[floorplanSubscription.planKey] || floorplanSubscription.planKey;
        const billingLabel =
          billingLabels[floorplanSubscription.billingPeriod] || floorplanSubscription.billingPeriod;

        // Calculate days until expiration
        let daysUntilExpiration: number | null = null;
        let isExpiring = false;
        let isExpired = false;

        if (floorplanSubscription.currentPeriodEnd) {
          const endDate = new Date(floorplanSubscription.currentPeriodEnd);
          const now = new Date();
          const diffTime = endDate.getTime() - now.getTime();
          daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Check if expired
          if (daysUntilExpiration < 0) {
            isExpired = true;
          } else {
            // Check if expiring soon
            const warningDays = floorplanSubscription.billingPeriod === "YEARLY" ? 45 : 5;
            isExpiring = daysUntilExpiration <= warningDays;
          }
        }

        const periodEnd = floorplanSubscription.currentPeriodEnd
          ? new Date(floorplanSubscription.currentPeriodEnd).toLocaleDateString("hu-HU", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : null;

        // Expired state - use current red style
        if (isExpired) {
          return (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 16,
                background: "#fef2f2",
                borderRadius: 12,
                border: "2px solid #fecaca",
                cursor: onClick ? "pointer" : "default",
                transition: onClick ? "all 0.2s" : "none",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
              onClick={onClick}
              onMouseEnter={
                onClick
                  ? (e) => {
                      e.currentTarget.style.background = "#fee2e2";
                    }
                  : undefined
              }
              onMouseLeave={
                onClick
                  ? (e) => {
                      e.currentTarget.style.background = "#fef2f2";
                    }
                  : undefined
              }
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20, color: "#dc2626" }}>🔒</span>
                <span
                  style={{
                    fontSize: "clamp(15px, 3.5vw, 17px)",
                    color: "#333",
                    fontWeight: 600,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {label}
                </span>
              </div>
              <div
                style={{
                  fontSize: "clamp(13px, 3vw, 15px)",
                  color: "#991b1b",
                  marginLeft: 28,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.floorplan.subscription.expired") || "Az előfizetés lejárt"}
              </div>
            </div>
          );
        }

        // Expiring soon state - pastel orange
        if (isExpiring && daysUntilExpiration !== null) {
          return (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: 20,
                background: "#fff7ed",
                borderRadius: 12,
                border: "2px solid #fed7aa",
                cursor: onClick ? "pointer" : "default",
                transition: onClick ? "all 0.2s" : "none",
                boxShadow: "0 4px 12px rgba(251, 146, 60, 0.2)",
              }}
              onClick={onClick}
              onMouseEnter={
                onClick
                  ? (e) => {
                      e.currentTarget.style.borderColor = "#fb923c";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(251, 146, 60, 0.3)";
                    }
                  : undefined
              }
              onMouseLeave={
                onClick
                  ? (e) => {
                      e.currentTarget.style.borderColor = "#fed7aa";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(251, 146, 60, 0.2)";
                    }
                  : undefined
              }
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24, color: "#ea580c" }}>⚠️</span>
                <span
                  style={{
                    fontSize: "clamp(16px, 3.5vw, 18px)",
                    color: "#333",
                    fontWeight: 700,
                    fontFamily:
                      "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {label}
                </span>
              </div>
              <div
                style={{
                  fontSize: "clamp(14px, 3vw, 16px)",
                  color: "#c2410c",
                  marginLeft: 34,
                  fontWeight: 600,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {(t("admin.floorplan.subscription.expiresIn") || "Lejár {days} nap múlva").replace(
                  "{days}",
                  daysUntilExpiration.toString()
                )}
              </div>
              <div
                style={{
                  fontSize: "clamp(13px, 2.5vw, 14px)",
                  color: "#9a3412",
                  marginLeft: 34,
                  marginTop: 4,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {planLabel} • {billingLabel}
              </div>
            </div>
          );
        }

        // Active subscription - green background like enabled state with dark green border
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: 12,
              background: "#f0fdf4",
              borderRadius: 8,
              border: "2px solid #22c55e",
              cursor: onClick ? "pointer" : "default",
              transition: onClick ? "all 0.2s" : "none",
              position: "relative",
            }}
            onClick={onClick}
            onMouseEnter={
              onClick
                ? (e) => {
                    e.currentTarget.style.background = "#dcfce7";
                    e.currentTarget.style.borderColor = "#16a34a";
                  }
                : undefined
            }
            onMouseLeave={
              onClick
                ? (e) => {
                    e.currentTarget.style.background = "#f0fdf4";
                    e.currentTarget.style.borderColor = "#22c55e";
                  }
                : undefined
            }
          >
            {/* Cancel button in top right corner for floorplan subscriptions */}
            {isFloorplan && floorplanSubscription && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const confirmed = await showConfirm({
                    title: t("admin.subscription.cancel") || "Előfizetés lemondása",
                    message:
                      t("admin.subscription.cancelConfirm") ||
                      "Biztosan le szeretnéd mondani az előfizetést? Az aktuális hó végéig lesz elérésed.",
                    confirmLabel: t("admin.subscription.cancelButton") || "Lemondom",
                    cancelLabel: t("common.cancel") || "Mégse",
                    confirmVariant: "danger",
                  });
                  if (confirmed) {
                    try {
                      await cancelFeatureSubscription(floorplanSubscription.id);
                      showToast(
                        t("admin.subscription.cancelled") || "Előfizetés lemondva",
                        "success"
                      );
                      await loadData(true);
                      onFloorplanSubscriptionChange?.();
                    } catch (error) {
                      console.error("Failed to cancel subscription:", error);
                      showToast(t("admin.errors.updateFailed") || "Hiba a lemondás során", "error");
                    }
                  }
                }}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  padding: "4px 8px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  zIndex: 10,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#dc2626";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ef4444";
                }}
                title={t("admin.subscription.cancel") || "Előfizetés lemondása"}
              >
                {t("admin.subscription.cancelButton") || "Lemondom"}
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18, color: "#22c55e" }}>✅</span>
              <span
                style={{
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  color: "#333",
                  fontWeight: 500,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {label}
              </span>
            </div>
            <div
              style={{
                fontSize: "clamp(13px, 3vw, 15px)",
                color: "#374151",
                marginLeft: 26,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {planLabel} • {billingLabel}
              </div>
              {periodEnd && (
                <div style={{ color: "#6b7280" }}>
                  {t("admin.validUntil") || "Érvényes"}: {periodEnd}
                </div>
              )}
            </div>
          </div>
        );
      }

      // Default enabled state for other features
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 12,
            background: "#f0fdf4",
            borderRadius: 8,
            border: "2px solid #22c55e",
            cursor: onClick ? "pointer" : "default",
            transition: onClick ? "all 0.2s" : "none",
          }}
          onClick={onClick}
          onMouseEnter={
            onClick
              ? (e) => {
                  e.currentTarget.style.background = "#dcfce7";
                  e.currentTarget.style.borderColor = "#16a34a";
                }
              : undefined
          }
          onMouseLeave={
            onClick
              ? (e) => {
                  e.currentTarget.style.background = "#f0fdf4";
                  e.currentTarget.style.borderColor = "#22c55e";
                }
              : undefined
          }
        >
          <span style={{ fontSize: 18, color: "#22c55e" }}>✅</span>
          <span
            style={{
              fontSize: "clamp(14px, 3.5vw, 16px)",
              color: "#333",
              fontWeight: 500,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: "clamp(13px, 3vw, 15px)",
              color: "#10b981",
              marginLeft: "auto",
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("admin.available") || "Elérhető"}
          </span>
        </div>
      );
    }

    if (gate.state === "locked") {
      // If there's an onClick handler, it means the feature is available but not activated - show orange with positive message
      const isAvailable = !!onClick;

      // Generate message based on availability
      const message = isAvailable
        ? `${label} elérhető. Kattints az aktiváláshoz!`
        : `${label} nem érhető el ebben a csomagban.`;

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 12,
            background: isAvailable ? "#fff7ed" : "#fef2f2",
            borderRadius: 8,
            border: isAvailable ? "1px solid #fed7aa" : "1px solid #fecaca",
            cursor: onClick ? "pointer" : "default",
            transition: onClick ? "all 0.2s" : "none",
          }}
          onClick={onClick}
          onMouseEnter={
            onClick
              ? (e) => {
                  e.currentTarget.style.background = "#fef3c7";
                }
              : undefined
          }
          onMouseLeave={
            onClick
              ? (e) => {
                  e.currentTarget.style.background = "#fff7ed";
                }
              : undefined
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, color: isAvailable ? "#f59e0b" : "#dc2626" }}>
              {isAvailable ? "⚠️" : "🔒"}
            </span>
            <span
              style={{
                fontSize: "clamp(14px, 3.5vw, 16px)",
                color: "#333",
                fontWeight: 500,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {label}
            </span>
          </div>
          <div
            style={{
              fontSize: "clamp(13px, 3vw, 15px)",
              color: isAvailable ? "#c2410c" : "#991b1b",
              marginLeft: 26,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {message}
          </div>
        </div>
      );
    }

    if (gate.state === "limit_reached") {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 12,
            background: "#fffbeb",
            borderRadius: 8,
            border: "1px solid #fde68a",
            cursor: onClick ? "pointer" : "default",
            transition: onClick ? "all 0.2s" : "none",
          }}
          onClick={onClick}
          onMouseEnter={
            onClick
              ? (e) => {
                  e.currentTarget.style.background = "#fef3c7";
                }
              : undefined
          }
          onMouseLeave={
            onClick
              ? (e) => {
                  e.currentTarget.style.background = "#fffbeb";
                }
              : undefined
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, color: "#f59e0b" }}>⚠️</span>
            <span
              style={{
                fontSize: "clamp(14px, 3.5vw, 16px)",
                color: "#333",
                fontWeight: 500,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {label}
            </span>
          </div>
          <div
            style={{
              fontSize: "clamp(13px, 3vw, 15px)",
              color: "#92400e",
              marginLeft: 26,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
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
        <h3
          style={{
            margin: 0,
            fontSize: "clamp(18px, 4vw, 22px)",
            fontWeight: 600,
            color: "#333",
            fontFamily:
              "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.billingAndPlan") || "Számlázás és csomag"}
        </h3>
        <h4
          style={{
            margin: 0,
            fontSize: "clamp(16px, 3.5vw, 20px)",
            fontWeight: 600,
            color: "#667eea",
            fontFamily:
              "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
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
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "6px 12px",
                background: planColors[currentPlan],
                color: "white",
                borderRadius: 6,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 600,
              }}
            >
              {planLabels[currentPlan]}
            </div>
            {/* Suspend and Cancel buttons - only show if subscription exists and is active */}
            {subscription &&
              subscription.id &&
              subscription.status === "ACTIVE" &&
              canModifyBilling && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={async () => {
                      const confirmed = await showConfirm({
                        title: t("admin.subscription.suspend") || "Előfizetés felfüggesztése",
                        message:
                          t("admin.subscription.suspendConfirm") ||
                          "Biztosan felfüggeszted az előfizetést?",
                        confirmLabel: t("admin.subscription.suspendButton") || "Felfüggesztem",
                        cancelLabel: t("common.cancel") || "Mégse",
                        confirmVariant: "warning",
                      });
                      if (confirmed) {
                        setIsUpdating(true);
                        try {
                          await updateSubscription("place", subscription.id, {
                            status: "SUSPENDED",
                          });
                          showToast(
                            t("admin.subscription.suspended") || "Előfizetés felfüggesztve",
                            "success"
                          );
                          await loadData();
                        } catch (error) {
                          console.error("Failed to suspend subscription:", error);
                          showToast(
                            t("admin.errors.updateFailed") || "Hiba a felfüggesztés során",
                            "error"
                          );
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
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                    {t("admin.subscription.suspendButton") || "Felfüggesztem"}
                  </button>
                  <button
                    onClick={async () => {
                      const confirmed = await showConfirm({
                        title: t("admin.subscription.cancel") || "Előfizetés lemondása",
                        message:
                          t("admin.subscription.cancelConfirm") ||
                          "Biztosan le szeretnéd mondani az előfizetést? Az aktuális hó végéig lesz elérésed.",
                        confirmLabel: t("admin.subscription.cancelButton") || "Lemondom",
                        cancelLabel: t("common.cancel") || "Mégse",
                        confirmVariant: "danger",
                      });
                      if (confirmed) {
                        setIsUpdating(true);
                        try {
                          await cancelSubscription("place", subscription.id, placeId);
                          showToast(
                            t("admin.subscription.cancelled") || "Előfizetés lemondva",
                            "success"
                          );
                          await loadData();
                        } catch (error) {
                          console.error("Failed to cancel subscription:", error);
                          showToast(
                            t("admin.errors.updateFailed") || "Hiba a lemondás során",
                            "error"
                          );
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
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                    {t("admin.subscription.cancelButton") || "Lemondom"}
                  </button>
                </div>
              )}
          </div>

          {/* Show modification info only for admin/superadmin */}
          {canModifyBilling && (
            <div
              style={{
                fontSize: "clamp(13px, 3vw, 15px)",
                color: "#666",
                marginTop: 16,
                marginBottom: 16,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {t("admin.placePlanInfo") || "A helyszín csomagját itt módosíthatod."}
            </div>
          )}

          {/* Show read-only info for editors/viewers */}
          {!canModifyBilling && (
            <div
              style={{
                fontSize: "clamp(13px, 3vw, 15px)",
                color: "#666",
                marginTop: 16,
                marginBottom: 16,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {t("admin.placePlanInfoReadOnly") || "A helyszín jelenlegi csomagja."}
            </div>
          )}

          {/* Subscription details */}
          {subscription && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: "#f9fafb",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: "clamp(12px, 2.5vw, 14px)",
                  color: "#6b7280",
                  marginBottom: 8,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.subscriptionDetails") || "Előfizetés részletei"}
              </div>
              {subscription.statusChangedAt && (
                <div
                  style={{
                    fontSize: "clamp(12px, 2.5vw, 14px)",
                    color: "#374151",
                    marginBottom: 4,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.lastChanged") || "Utolsó módosítás"}:{" "}
                  {new Date(subscription.statusChangedAt).toLocaleDateString("hu-HU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
              {subscription.priceCents !== null && subscription.priceCents !== undefined && (
                <div
                  style={{
                    fontSize: "clamp(12px, 2.5vw, 14px)",
                    color: "#374151",
                    marginBottom: 4,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.price") || "Ár"}: {subscription.priceCents / 100}{" "}
                  {subscription.currency || "HUF"}
                </div>
              )}
              {subscription.validUntil && (
                <div
                  style={{
                    fontSize: "clamp(12px, 2.5vw, 14px)",
                    color: "#374151",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.validUntil") || "Érvényes"}:{" "}
                  {new Date(subscription.validUntil).toLocaleDateString("hu-HU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {/* Cancel/Resume subscription button */}
                  {subscription && subscription.id && subscription.status && (
                    <div style={{ marginTop: 16 }}>
                      {subscription.status === "ACTIVE" ? (
                        <button
                          onClick={async () => {
                            const confirmed = await showConfirm({
                              title: t("admin.subscription.cancel") || "Előfizetés lemondása",
                              message:
                                t("admin.subscription.cancelConfirm") ||
                                "Biztosan le szeretnéd mondani az előfizetést? Az aktuális hó végéig lesz elérésed.",
                              confirmLabel: t("admin.subscription.cancelButton") || "Lemondom",
                              cancelLabel: t("common.cancel") || "Mégse",
                              confirmVariant: "danger",
                            });
                            if (confirmed) {
                              try {
                                await cancelSubscription("place", subscription.id, placeId);
                                showToast(
                                  t("admin.subscription.cancelled") || "Előfizetés lemondva",
                                  "success"
                                );
                                await loadData();
                              } catch (error) {
                                console.error("Failed to cancel subscription:", error);
                                showToast(
                                  t("admin.errors.updateFailed") || "Hiba a lemondás során",
                                  "error"
                                );
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
                            fontFamily:
                              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                          {t("admin.subscription.cancelButton") || "Lemondom"}
                        </button>
                      ) : subscription.status === "CANCELLED" ? (
                        <button
                          onClick={async () => {
                            try {
                              await resumeSubscription("place", subscription.id, placeId);
                              showToast(
                                t("admin.subscription.resumed") || "Előfizetés folytatva",
                                "success"
                              );
                              await loadData();
                            } catch (error) {
                              console.error("Failed to resume subscription:", error);
                              showToast(
                                t("admin.errors.updateFailed") || "Hiba a folytatás során",
                                "error"
                              );
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
                            fontFamily:
                              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
              <label
                style={{
                  display: "block",
                  fontSize: "clamp(13px, 3vw, 15px)",
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "#333",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.changePlan") || "Csomag módosítása"}
              </label>
              <select
                value={currentPlan}
                disabled={isUpdating || !canModifyBilling}
                onChange={async (e) => {
                  if (!canModifyBilling) return;
                  const newPlan = e.target.value as "free" | "basic" | "pro";
                  const confirmMessage =
                    t("admin.confirmPlanChange", { plan: planLabels[newPlan] }) ||
                    `Biztosan át szeretnéd váltani a ${planLabels[newPlan]} csomagra?`;
                  const confirmed = await showConfirm({
                    title: t("admin.changePlan") || "Csomag módosítása",
                    message: confirmMessage,
                    confirmLabel: t("common.confirm") || "Megerősítés",
                    cancelLabel: t("common.cancel") || "Mégse",
                    confirmVariant: "primary",
                  });
                  if (confirmed) {
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
                      showToast(
                        t("admin.messages.placePlanUpdated") || "Csomag frissítve",
                        "success"
                      );
                    } catch (error) {
                      console.error("Failed to update plan:", error);
                      showToast(
                        t("admin.errors.updatePlaceFailed") || "Hiba a csomag frissítésekor",
                        "error"
                      );
                    } finally {
                      setIsUpdating(false);
                    }
                  } else {
                    // Reset select to previous value if cancelled
                    e.target.value = currentPlan;
                  }
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  background: canModifyBilling ? "white" : "#f3f4f6",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  cursor: isUpdating || !canModifyBilling ? "not-allowed" : "pointer",
                  opacity: isUpdating || !canModifyBilling ? 0.6 : 1,
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
          <div
            style={{
              fontSize: "clamp(16px, 3.5vw, 18px)",
              color: "#1a1a1a",
              marginBottom: 16,
              fontWeight: 700,
              fontFamily:
                "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
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
                {/* Don't show floorplan feature gate for free accounts */}
                {currentPlan !== "free" &&
                  renderFeatureGate(
                    // If we have an active floorplan subscription, force enabled state
                    floorplanSubscription &&
                      floorplanSubscription.status === "active" &&
                      (!floorplanSubscription.currentPeriodEnd ||
                        new Date(floorplanSubscription.currentPeriodEnd) > new Date())
                      ? { state: "enabled" as const }
                      : upsellState.floorplans,
                    t("admin.floorplans") || "Alaprajzok",
                    "📐",
                    // Only make it clickable if there's no active subscription
                    floorplanSubscription &&
                      floorplanSubscription.status === "active" &&
                      (!floorplanSubscription.currentPeriodEnd ||
                        new Date(floorplanSubscription.currentPeriodEnd) > new Date())
                      ? undefined
                      : () => {
                          setShowFloorplanModal(true);
                        },
                    true // isFloorplan flag
                  )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floorplan Subscription Modal */}
      {showFloorplanModal && (
        <FloorplanSubscriptionModal
          isOpen={showFloorplanModal}
          onClose={() => setShowFloorplanModal(false)}
          placeId={placeId}
          siteId={siteId}
          onSuccess={async () => {
            setShowFloorplanModal(false);
            // Wait for data to load with force refresh to ensure backend has processed the subscription
            await loadData(true);
            // Add a small delay before triggering refresh to ensure backend has fully processed
            await new Promise((resolve) => setTimeout(resolve, 500));
            onFloorplanSubscriptionChange?.();
          }}
        />
      )}
    </div>
  );
}

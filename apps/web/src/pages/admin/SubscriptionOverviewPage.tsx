// apps/web/src/pages/admin/SubscriptionOverviewPage.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getSites, getSiteSubscription, getSiteEntitlements, type Site, type SiteEntitlements } from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useToast } from "../../contexts/ToastContext";

interface SiteSubscriptionSummary extends Site {
  subscription?: {
    plan: "FREE" | "BASIC" | "PRO";
    status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
    validUntil: string | null;
    note: string | null;
  };
  entitlements?: SiteEntitlements;
}

export function SubscriptionOverviewPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  usePageTitle("admin.subscriptionOverview");
  const [sites, setSites] = useState<SiteSubscriptionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sitesData = await getSites();
      
      // Load subscription and entitlements for each site
      const sitesWithData = await Promise.all(
        sitesData.map(async (site) => {
          try {
            const [subscription, entitlements] = await Promise.all([
              getSiteSubscription(site.id).catch(() => null),
              getSiteEntitlements(site.id).catch(() => null),
            ]);

            return {
              ...site,
              subscription: subscription || undefined,
              entitlements: entitlements || undefined,
            };
          } catch (err) {
            console.error(`Failed to load data for site ${site.id}:`, err);
            return site;
          }
        })
      );

      setSites(sitesWithData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadSitesFailed"));
      showToast(t("admin.errors.loadSitesFailed") || "Failed to load sites", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const planLabels: Record<"FREE" | "BASIC" | "PRO", string> = {
    FREE: t("admin.planFree") || "Free",
    BASIC: t("admin.planBasic") || "Basic",
    PRO: t("admin.planPro") || "Pro",
  };

  const planColors: Record<"FREE" | "BASIC" | "PRO", string> = {
    FREE: "#6b7280",
    BASIC: "#3b82f6",
    PRO: "#667eea",
  };

  const statusColors: Record<"ACTIVE" | "SUSPENDED" | "EXPIRED", string> = {
    ACTIVE: "#22c55e",
    SUSPENDED: "#f59e0b",
    EXPIRED: "#dc2626",
  };

  const statusLabels: Record<"ACTIVE" | "SUSPENDED" | "EXPIRED", string> = {
    ACTIVE: t("admin.statusActive") || "Aktív",
    SUSPENDED: t("admin.statusSuspended") || "Felfüggesztve",
    EXPIRED: t("admin.statusExpired") || "Lejárt",
  };

  const handleEditSite = (siteId: string) => {
    navigate(`/admin/sites/${siteId}/edit?tab=subscription`);
  };

  if (isLoading) {
    return (
      <div style={{ padding: "clamp(24px, 5vw, 32px)" }}>
        <LoadingSpinner isLoading={true} delay={0} />
      </div>
    );
  }

  return (
    <div style={{ padding: "clamp(24px, 5vw, 32px)" }}>
      <AdminPageHeader
        title={t("admin.subscriptionOverview") || "Előfizetések áttekintése"}
        subtitle={t("admin.subscriptionOverviewSubtitle") || "Site-ok előfizetései és használati adatai"}
      />

      {error && (
        <div style={{ padding: 16, background: "#fef2f2", color: "#dc2626", borderRadius: 8, marginBottom: 24 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {sites.map((site) => {
          const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
          const translation =
            site.translations.find((t) => t.lang === currentLang) ||
            site.translations.find((t) => t.lang === "hu");

          return (
            <div
              key={site.id}
              style={{
                padding: 20,
                background: "white",
                borderRadius: 12,
                border: "1px solid #e0e7ff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: "clamp(16px, 3.5vw, 18px)", 
                    fontWeight: 600, 
                    color: "#333",
                    fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}>
                    {translation?.name || site.slug}
                  </h3>
                  <div style={{ 
                    fontSize: "clamp(13px, 3vw, 15px)", 
                    color: "#666", 
                    marginTop: 4,
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}>{site.slug}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleEditSite(site.id)}
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
                  }}
                >
                  {t("admin.edit") || "Szerkesztés"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                {/* Plan */}
                {site.subscription && (
                  <div>
                    <div style={{ 
                      fontSize: "clamp(13px, 3vw, 15px)", 
                      color: "#666", 
                      marginBottom: 4,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>
                      {t("admin.plan") || "Csomag"}
                    </div>
                    <div
                      style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        background: planColors[site.subscription.plan],
                        color: "white",
                        borderRadius: 4,
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      {planLabels[site.subscription.plan]}
                    </div>
                  </div>
                )}

                {/* Status */}
                {site.subscription && (
                  <div>
                    <div style={{ 
                      fontSize: "clamp(13px, 3vw, 15px)", 
                      color: "#666", 
                      marginBottom: 4,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>
                      {t("admin.status") || "Státusz"}
                    </div>
                    <div
                      style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        background: statusColors[site.subscription.status],
                        color: "white",
                        borderRadius: 4,
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      {statusLabels[site.subscription.status]}
                    </div>
                  </div>
                )}

                {/* Valid Until */}
                {site.subscription?.validUntil && (
                  <div>
                    <div style={{ 
                      fontSize: "clamp(13px, 3vw, 15px)", 
                      color: "#666", 
                      marginBottom: 4,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>
                      {t("admin.validUntil") || "Érvényes"}
                    </div>
                    <div style={{ 
                      fontSize: "clamp(14px, 3.5vw, 16px)", 
                      color: "#333",
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>
                      {new Date(site.subscription.validUntil).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {/* Usage: Places */}
                {site.entitlements && (
                  <div>
                    <div style={{ 
                      fontSize: "clamp(13px, 3vw, 15px)", 
                      color: "#666", 
                      marginBottom: 4,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>
                      {t("admin.places") || "Helyek"}
                    </div>
                    <div style={{ 
                      fontSize: "clamp(14px, 3.5vw, 16px)", 
                      color: "#333",
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>
                      {site.entitlements.currentUsage.places} / {site.entitlements.limits.places === Infinity ? "∞" : site.entitlements.limits.places}
                    </div>
                  </div>
                )}

                {/* Usage: Featured */}
                {site.entitlements && (
                  <div>
                    <div style={{ 
                      fontSize: "clamp(13px, 3vw, 15px)", 
                      color: "#666", 
                      marginBottom: 4,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>
                      {t("admin.featured") || "Kiemelt"}
                    </div>
                    <div style={{ 
                      fontSize: "clamp(14px, 3.5vw, 16px)", 
                      color: "#333",
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>
                      {site.entitlements.currentUsage.featuredPlaces} / {site.entitlements.limits.featuredSlots === Infinity ? "∞" : site.entitlements.limits.featuredSlots}
                    </div>
                  </div>
                )}

                {/* Usage: Events */}
                {site.entitlements && (
                  <div>
                    <div style={{ 
                      fontSize: "clamp(13px, 3vw, 15px)", 
                      color: "#666", 
                      marginBottom: 4,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>
                      {t("admin.events") || "Események"}
                    </div>
                    <div style={{ 
                      fontSize: "clamp(14px, 3.5vw, 16px)", 
                      color: "#333",
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>
                      {site.entitlements.currentUsage.events} / {site.entitlements.limits.events === Infinity ? "∞" : site.entitlements.limits.events}
                    </div>
                  </div>
                )}
              </div>

              {site.subscription?.note && (
                <div style={{ 
                  marginTop: 12, 
                  padding: 8, 
                  background: "#f8f9fa", 
                  borderRadius: 6, 
                  fontSize: "clamp(13px, 3vw, 15px)", 
                  color: "#666",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}>
                  <strong>{t("admin.note") || "Megjegyzés"}:</strong> {site.subscription.note}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// src/pages/admin/SiteStatusPage.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useToast } from "../../contexts/ToastContext";
import { useQueryClient } from "@tanstack/react-query";
import { getSiteStatus, invalidateCache, type SiteStatusResponse } from "../../api/admin.api";

type TabId = "overview" | "cache";

export function SiteStatusPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  usePageTitle("admin.siteStatus");

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [data, setData] = useState<SiteStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [invalidatingCache, setInvalidatingCache] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const response = await getSiteStatus();
      setData(response);
    } catch (error) {
      console.error("Failed to load site status:", error);
      showToast(t("admin.siteStatus.error.loadFailed") || "Failed to load site status", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvalidateCache = async (cacheType: string) => {
    try {
      setInvalidatingCache(cacheType);
      await invalidateCache(cacheType);
      
      // Get localized cache type name
      const cacheTypeNames: Record<string, string> = {
        places: t("admin.siteStatus.cache.places") || "Places",
        events: t("admin.siteStatus.cache.events") || "Events",
        categories: t("admin.siteStatus.cache.categories") || "Categories",
        tags: t("admin.siteStatus.cache.tags") || "Tags",
        towns: t("admin.siteStatus.cache.towns") || "Towns",
        priceBands: t("admin.siteStatus.cache.priceBands") || "Price Bands",
        platformSettings: t("admin.siteStatus.cache.platformSettings") || "Platform Settings",
        mapSettings: t("admin.siteStatus.cache.mapSettings") || "Map Settings",
        staticPages: t("admin.siteStatus.cache.staticPages") || "Static Pages",
        all: t("admin.siteStatus.cache.all") || "All Caches",
      };
      const cacheTypeName = cacheTypeNames[cacheType] || cacheType;
      
      // Invalidate the corresponding React Query cache
      switch (cacheType) {
        case "places":
          await queryClient.invalidateQueries({ queryKey: ["places"] });
          await queryClient.invalidateQueries({ queryKey: ["place"] });
          break;
        case "events":
          await queryClient.invalidateQueries({ queryKey: ["events"] });
          await queryClient.invalidateQueries({ queryKey: ["event"] });
          break;
        case "categories":
          await queryClient.invalidateQueries({ queryKey: ["categories"] });
          await queryClient.invalidateQueries({ queryKey: ["places"] });
          await queryClient.invalidateQueries({ queryKey: ["events"] });
          break;
        case "tags":
          await queryClient.invalidateQueries({ queryKey: ["tags"] });
          await queryClient.invalidateQueries({ queryKey: ["places"] });
          await queryClient.invalidateQueries({ queryKey: ["events"] });
          break;
        case "towns":
          await queryClient.invalidateQueries({ queryKey: ["towns"] });
          await queryClient.invalidateQueries({ queryKey: ["places"] });
          break;
        case "priceBands":
          await queryClient.invalidateQueries({ queryKey: ["priceBands"] });
          await queryClient.invalidateQueries({ queryKey: ["places"] });
          break;
        case "platformSettings":
          await queryClient.invalidateQueries({ queryKey: ["platformSettings"] });
          break;
        case "mapSettings":
          await queryClient.invalidateQueries({ queryKey: ["mapSettings"] });
          break;
        case "staticPages":
          await queryClient.invalidateQueries({ queryKey: ["staticPages"] });
          break;
        case "collections":
          await queryClient.invalidateQueries({ queryKey: ["collections"] });
          await queryClient.invalidateQueries({ queryKey: ["collection"] });
          break;
        case "all":
          // Invalidate all caches
          await queryClient.invalidateQueries();
          break;
      }

      showToast(
        t("admin.siteStatus.cache.invalidated", { cacheType: cacheTypeName }) || `Cache invalidated: ${cacheTypeName}`,
        "success"
      );
    } catch (error) {
      console.error("Failed to invalidate cache:", error);
      showToast(
        t("admin.siteStatus.cache.error") || "Failed to invalidate cache",
        "error"
      );
    } finally {
      setInvalidatingCache(null);
    }
  };

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "overview", label: t("admin.siteStatus.tabs.overview") || "Áttekintés" },
    { id: "cache", label: t("admin.siteStatus.tabs.cache") || "Cache kezelés" },
  ];

  if (isLoading) {
    return null;
  }

  if (!data) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <p>{t("admin.siteStatus.error.noData") || "No data available"}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <AdminPageHeader
        title={t("admin.siteStatus.title") || "Site Status"}
        subtitle={t("admin.siteStatus.subtitle") || "Overview of site statistics and cache management"}
        showNewButton={false}
      />

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: "8px",
        borderBottom: "2px solid rgba(102, 126, 234, 0.3)",
        marginBottom: "24px",
        padding: "0 24px",
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 24px",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id
                ? "3px solid #667eea"
                : "3px solid transparent",
              color: activeTab === tab.id ? "#a8b3ff" : "rgba(255, 255, 255, 0.6)",
              fontSize: "15px",
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: "0 24px 24px" }}>
        {activeTab === "overview" && <OverviewTab data={data} />}
        {activeTab === "cache" && (
          <CacheManagementTab
            onInvalidate={handleInvalidateCache}
            invalidatingCache={invalidatingCache}
          />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ data }: { data: SiteStatusResponse }) {
  const { t } = useTranslation();

  return (
    <div>
      {/* Statistics Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "20px",
        marginBottom: "32px",
      }}>
        <StatCard
          title={t("admin.siteStatus.stats.sites") || "Sites"}
          icon="🌐"
          value={data.overview.sites.total}
          subtitle={`${data.overview.sites.active} active, ${data.overview.sites.inactive} inactive`}
          color="#667eea"
        />
        <StatCard
          title={t("admin.siteStatus.stats.places") || "Places"}
          icon="📍"
          value={data.overview.places.total}
          subtitle={`${data.overview.places.active} active, ${data.overview.places.inactive} inactive`}
          color="#48bb78"
        />
        <StatCard
          title={t("admin.siteStatus.stats.events") || "Events"}
          icon="📅"
          value={data.overview.events.total}
          subtitle={`${data.overview.events.active} active, ${data.overview.events.upcoming} upcoming`}
          color="#ed8936"
        />
        <StatCard
          title={t("admin.siteStatus.stats.users") || "Users"}
          icon="👥"
          value={data.overview.users.total}
          subtitle={`${data.overview.users.active} active, ${data.overview.users.inactive} inactive`}
          color="#9f7aea"
        />
        <StatCard
          title={t("admin.siteStatus.stats.subscriptions") || "Subscriptions"}
          icon="💳"
          value={data.overview.subscriptions.total}
          subtitle={`${data.overview.subscriptions.active} active, ${data.overview.subscriptions.inactive} inactive`}
          color="#f56565"
        />
      </div>

      {/* Content Statistics */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "32px",
      }}>
        <StatCard
          title={t("admin.siteStatus.stats.categories") || "Categories"}
          icon="📁"
          value={data.overview.content.categories}
          color="#4299e1"
        />
        <StatCard
          title={t("admin.siteStatus.stats.tags") || "Tags"}
          icon="🏷️"
          value={data.overview.content.tags}
          color="#38b2ac"
        />
        <StatCard
          title={t("admin.siteStatus.stats.towns") || "Towns"}
          icon="🏘️"
          value={data.overview.content.towns}
          color="#718096"
        />
        <StatCard
          title={t("admin.siteStatus.stats.galleries") || "Galleries"}
          icon="🖼️"
          value={data.overview.content.galleries}
          color="#e53e3e"
        />
      </div>

      {/* Recent Activity */}
      <div style={{
        background: "linear-gradient(135deg, #4a4564 0%, #3d3a58 100%)",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "32px",
        border: "1px solid rgba(102, 126, 234, 0.3)",
      }}>
        <h3 style={{
          margin: "0 0 16px 0",
          fontSize: "18px",
          fontWeight: 600,
          color: "#a8b3ff",
          fontFamily: "'Poppins', system-ui, sans-serif",
        }}>
          {t("admin.siteStatus.recentActivity.title") || "Recent Activity (Last 7 Days)"}
        </h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "16px",
        }}>
          <ActivityItem
            label={t("admin.siteStatus.recentActivity.places") || "Places"}
            value={data.recentActivity.places}
          />
          <ActivityItem
            label={t("admin.siteStatus.recentActivity.events") || "Events"}
            value={data.recentActivity.events}
          />
          <ActivityItem
            label={t("admin.siteStatus.recentActivity.users") || "Users"}
            value={data.recentActivity.users}
          />
          <ActivityItem
            label={t("admin.siteStatus.recentActivity.eventLogs") || "Event Logs"}
            value={data.recentActivity.eventLogs}
          />
        </div>
      </div>

      {/* Sites by Plan */}
      {data.sitesByPlan.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #4a4564 0%, #3d3a58 100%)",
          borderRadius: "12px",
          padding: "24px",
          border: "1px solid rgba(102, 126, 234, 0.3)",
        }}>
          <h3 style={{
            margin: "0 0 16px 0",
            fontSize: "18px",
            fontWeight: 600,
            color: "#a8b3ff",
            fontFamily: "'Poppins', system-ui, sans-serif",
          }}>
            {t("admin.siteStatus.sitesByPlan.title") || "Sites by Plan"}
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
          }}>
            {data.sitesByPlan.map((item) => (
              <div
                key={item.plan}
                style={{
                  padding: "12px",
                  background: "rgba(102, 126, 234, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(102, 126, 234, 0.2)",
                }}
              >
                <div style={{
                  fontSize: "14px",
                  color: "rgba(255, 255, 255, 0.7)",
                  marginBottom: "4px",
                }}>
                  {item.plan}
                </div>
                <div style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#a8b3ff",
                }}>
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Cache Management Tab Component
function CacheManagementTab({
  onInvalidate,
  invalidatingCache,
}: {
  onInvalidate: (cacheType: string) => Promise<void>;
  invalidatingCache: string | null;
}) {
  const { t } = useTranslation();

  const cacheTypes = [
    { id: "places", label: t("admin.siteStatus.cache.places") || "Places", description: t("admin.siteStatus.cache.placesDesc") || "Invalidate all place-related caches" },
    { id: "events", label: t("admin.siteStatus.cache.events") || "Events", description: t("admin.siteStatus.cache.eventsDesc") || "Invalidate all event-related caches" },
    { id: "categories", label: t("admin.siteStatus.cache.categories") || "Categories", description: t("admin.siteStatus.cache.categoriesDesc") || "Invalidate category caches and related places/events" },
    { id: "tags", label: t("admin.siteStatus.cache.tags") || "Tags", description: t("admin.siteStatus.cache.tagsDesc") || "Invalidate tag caches and related places/events" },
    { id: "towns", label: t("admin.siteStatus.cache.towns") || "Towns", description: t("admin.siteStatus.cache.townsDesc") || "Invalidate town caches and related places" },
    { id: "priceBands", label: t("admin.siteStatus.cache.priceBands") || "Price Bands", description: t("admin.siteStatus.cache.priceBandsDesc") || "Invalidate price band caches and related places" },
    { id: "platformSettings", label: t("admin.siteStatus.cache.platformSettings") || "Platform Settings", description: t("admin.siteStatus.cache.platformSettingsDesc") || "Invalidate platform settings cache" },
    { id: "mapSettings", label: t("admin.siteStatus.cache.mapSettings") || "Map Settings", description: t("admin.siteStatus.cache.mapSettingsDesc") || "Invalidate map settings cache" },
    { id: "staticPages", label: t("admin.siteStatus.cache.staticPages") || "Static Pages", description: t("admin.siteStatus.cache.staticPagesDesc") || "Invalidate static pages cache" },
    { id: "collections", label: t("admin.siteStatus.cache.collections") || "Collections", description: t("admin.siteStatus.cache.collectionsDesc") || "Invalidate collections cache" },
    { id: "all", label: t("admin.siteStatus.cache.all") || "All Caches", description: t("admin.siteStatus.cache.allDesc") || "Invalidate all caches (use with caution)" },
  ];

  return (
    <div>
      <div style={{
        background: "linear-gradient(135deg, #4a4564 0%, #3d3a58 100%)",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
        border: "1px solid rgba(102, 126, 234, 0.3)",
      }}>
        <h3 style={{
          margin: "0 0 12px 0",
          fontSize: "18px",
          fontWeight: 600,
          color: "#a8b3ff",
          fontFamily: "'Poppins', system-ui, sans-serif",
        }}>
          {t("admin.siteStatus.cache.title") || "Cache Management"}
        </h3>
        <p style={{
          margin: 0,
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: "14px",
        }}>
          {t("admin.siteStatus.cache.description") || "Manually invalidate caches for specific content types. This will force the system to refresh data on the next request."}
        </p>
      </div>

      <div style={{
        background: "linear-gradient(135deg, #4a4564 0%, #3d3a58 100%)",
        borderRadius: "12px",
        border: "1px solid rgba(102, 126, 234, 0.3)",
        overflow: "hidden",
      }}>
        {cacheTypes.map((cacheType, index) => (
          <div
            key={cacheType.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 24px",
              borderBottom: index < cacheTypes.length - 1 ? "1px solid rgba(102, 126, 234, 0.2)" : "none",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(102, 126, 234, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#a8b3ff",
                fontFamily: "'Poppins', system-ui, sans-serif",
                marginBottom: "4px",
              }}>
                {cacheType.label}
              </div>
              <div style={{
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.6)",
                lineHeight: 1.4,
              }}>
                {cacheType.description}
              </div>
            </div>
            <button
              onClick={() => onInvalidate(cacheType.id)}
              disabled={invalidatingCache === cacheType.id}
              style={{
                padding: "8px 16px",
                background: cacheType.id === "all"
                  ? "linear-gradient(135deg, #f56565 0%, #e53e3e 100%)"
                  : "linear-gradient(135deg, #667eea 0%, #5568d3 100%)",
                border: "none",
                borderRadius: "6px",
                color: "white",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, sans-serif",
                cursor: invalidatingCache === cacheType.id ? "not-allowed" : "pointer",
                opacity: invalidatingCache === cacheType.id ? 0.6 : 1,
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                marginLeft: "16px",
              }}
              onMouseEnter={(e) => {
                if (invalidatingCache !== cacheType.id) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {invalidatingCache === cacheType.id
                ? (t("admin.siteStatus.cache.invalidating") || "Invalidating...")
                : (t("admin.siteStatus.cache.invalidate") || "Invalidate Cache")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  icon,
  value,
  subtitle,
  color,
}: {
  title: string;
  icon: string;
  value: number;
  subtitle?: string;
  color: string;
}) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #4a4564 0%, #3d3a58 100%)",
      borderRadius: "12px",
      padding: "20px",
      border: "1px solid rgba(102, 126, 234, 0.3)",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "32px" }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: "13px",
            color: "rgba(255, 255, 255, 0.6)",
            marginBottom: "4px",
          }}>
            {title}
          </div>
          <div style={{
            fontSize: "28px",
            fontWeight: 700,
            color: color,
            fontFamily: "'Poppins', system-ui, sans-serif",
          }}>
            {value.toLocaleString()}
          </div>
        </div>
      </div>
      {subtitle && (
        <div style={{
          fontSize: "12px",
          color: "rgba(255, 255, 255, 0.5)",
          marginTop: "4px",
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// Activity Item Component
function ActivityItem({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      padding: "12px",
      background: "rgba(102, 126, 234, 0.1)",
      borderRadius: "8px",
      border: "1px solid rgba(102, 126, 234, 0.2)",
    }}>
      <div style={{
        fontSize: "12px",
        color: "rgba(255, 255, 255, 0.6)",
        marginBottom: "4px",
      }}>
        {label}
      </div>
      <div style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#a8b3ff",
      }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

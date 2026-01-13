// apps/web/src/pages/admin/SubscriptionsDashboardPage.tsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { usePageTitle } from "../../hooks/usePageTitle";
import {
  getSubscriptions,
  getExpiringSubscriptions,
  getSubscriptionSummary,
  getSubscriptionTrends,
  updateSubscription,
  extendSubscription,
  getSubscriptionHistory,
  type SubscriptionListItem,
  type SubscriptionSummary,
  type TrendPoint,
  type UpdateSubscriptionDto,
  type SubscriptionHistoryItem,
} from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useToast } from "../../contexts/ToastContext";

type Scope = "site" | "place" | "all";
type StatusFilter = "all" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "SUSPENDED";

export function SubscriptionsDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang?: string }>();
  const { showToast } = useToast();
  usePageTitle("admin.subscriptionsDashboard");

  const [scope, setScope] = useState<Scope>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [expiresWithinDays, setExpiresWithinDays] = useState<number | undefined>(undefined);

  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [expiring, setExpiring] = useState<SubscriptionListItem[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<UpdateSubscriptionDto>({});
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const hasShownErrorRef = useRef(false);
  const isLoadingRef = useRef(false);
  const [historyModalOpen, setHistoryModalOpen] = useState<string | null>(null);
  const [history, setHistory] = useState<SubscriptionHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [currentHistoryItem, setCurrentHistoryItem] = useState<SubscriptionListItem | null>(null);
  const historyPageSize = 20;

  const pageSize = 20;

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(0); // Reset page when search changes
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load data when filters change
  useEffect(() => {
    loadData();
  }, [scope, statusFilter, debouncedSearchQuery, planFilter, expiresWithinDays, page]);

  const loadData = async () => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const results = await Promise.allSettled([
        getSubscriptionSummary({ scope, rangeDays: 7 }),
        getExpiringSubscriptions({ scope, withinDays: 7 }),
        getSubscriptionTrends({ scope, weeks: 12 }),
        getSubscriptions({
          scope,
          status: statusFilter !== "all" ? (statusFilter as any) : undefined,
          plan: planFilter !== "all" ? (planFilter as any) : undefined,
          q: debouncedSearchQuery || undefined,
          expiresWithinDays,
          take: pageSize,
          skip: page * pageSize,
        }),
      ]);

      const [summaryResult, expiringResult, trendsResult, subscriptionsResult] = results;
      const errors: string[] = [];

      // Process summary
      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value);
      } else {
        errors.push(t("admin.errors.loadSubscriptionSummaryFailed") || "Summary betöltése sikertelen");
        console.error("Failed to load summary:", summaryResult.reason);
      }

      // Process expiring
      if (expiringResult.status === "fulfilled") {
        setExpiring(expiringResult.value);
      } else {
        errors.push(t("admin.errors.loadExpiringSubscriptionsFailed") || "Lejáró előfizetések betöltése sikertelen");
        console.error("Failed to load expiring subscriptions:", expiringResult.reason);
      }

      // Process trends
      if (trendsResult.status === "fulfilled") {
        setTrends(trendsResult.value.points);
      } else {
        errors.push(t("admin.errors.loadSubscriptionTrendsFailed") || "Trend adatok betöltése sikertelen");
        console.error("Failed to load trends:", trendsResult.reason);
      }

      // Process subscriptions
      if (subscriptionsResult.status === "fulfilled") {
        setSubscriptions(subscriptionsResult.value.items);
        setTotal(subscriptionsResult.value.total);
      } else {
        errors.push(t("admin.errors.loadSubscriptionsFailed") || "Előfizetések betöltése sikertelen");
        console.error("Failed to load subscriptions:", subscriptionsResult.reason);
      }

      // Show error toast only if there are errors
      // Only show once per page load to avoid duplicate toasts
      if (errors.length > 0 && !hasShownErrorRef.current) {
        const errorMessage = errors.length === 1 
          ? errors[0]
          : `${errors.length} ${t("admin.errors.loadFailed") || "betöltési hiba"}: ${errors.join(", ")}`;
        showToast(errorMessage, "error");
        hasShownErrorRef.current = true;
      }
      
      // Reset error flag if all data loaded successfully
      if (errors.length === 0) {
        hasShownErrorRef.current = false;
      }
    } catch (err) {
      console.error("Unexpected error loading subscriptions data:", err);
      if (!hasShownErrorRef.current) {
        showToast(t("admin.errors.loadFailed") || "Failed to load data", "error");
        hasShownErrorRef.current = true;
      }
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handleEdit = (item: SubscriptionListItem) => {
    setIsEditing(item.id);
    setEditData({
      plan: item.plan,
      status: item.status,
      validUntil: item.validUntil || null,
    });
  };

  const handleSave = async (item: SubscriptionListItem) => {
    try {
      await updateSubscription(item.scope, item.id, editData);
      showToast(t("admin.subscriptions.updated") || "Subscription updated", "success");
      setIsEditing(null);
      loadData();
    } catch (err) {
      showToast(t("admin.errors.updateFailed") || "Failed to update", "error");
    }
  };

  const handleExtend = async (item: SubscriptionListItem) => {
    try {
      await extendSubscription(item.scope, item.id);
      showToast(t("admin.subscriptions.extended") || "Subscription extended by 30 days", "success");
      loadData();
    } catch (err) {
      showToast(t("admin.errors.updateFailed") || "Failed to extend", "error");
    }
  };

  const handleSuspend = async (item: SubscriptionListItem) => {
    try {
      await updateSubscription(item.scope, item.id, { status: "SUSPENDED" });
      showToast(t("admin.subscriptions.suspended") || "Subscription suspended", "success");
      loadData();
    } catch (err) {
      showToast(t("admin.errors.updateFailed") || "Failed to suspend", "error");
    }
  };

  const handleViewHistory = async (item: SubscriptionListItem, page: number = 0) => {
    setCurrentHistoryItem(item);
    setHistoryModalOpen(item.id);
    setHistoryPage(page);
    setIsLoadingHistory(true);
    try {
      const historyData = await getSubscriptionHistory(item.scope, item.id, page * historyPageSize, historyPageSize);
      setHistory(historyData.items);
      setHistoryTotal(historyData.total);
    } catch (err) {
      showToast(t("admin.errors.loadFailed") || "Failed to load history", "error");
      setHistory([]);
      setHistoryTotal(0);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const formatCurrency = (cents?: number) => {
    if (!cents) return "N/A";
    return new Intl.NumberFormat("hu-HU", {
      style: "currency",
      currency: "HUF",
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return t("admin.noDate") || "Nincs dátum";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t("admin.invalidDate") || "Érvénytelen dátum";
      return date.toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      return t("admin.invalidDate") || "Érvénytelen dátum";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "#22c55e";
      case "SUSPENDED":
        return "#f59e0b";
      case "EXPIRED":
        return "#dc2626";
      default:
        return "#6b7280";
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "PRO":
        return "#667eea";
      case "BASIC":
        return "#3b82f6";
      case "BUSINESS":
        return "#8b5cf6";
      default:
        return "#3b82f6";
    }
  };

  // Trend chart component using recharts
  const TrendChart = ({ data, isMobileChart }: { data: TrendPoint[]; isMobileChart: boolean }) => {
    if (data.length === 0) {
      return (
        <div style={{ 
          height: isMobileChart ? 200 : 300, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          padding: 48,
          textAlign: "center",
          color: "#999",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
        }}>
          {t("admin.noData") || "Nincs adat"}
        </div>
      );
    }

    // Format data for recharts - format weekStart to readable date
    const chartData = data.map((point) => ({
      week: new Date(point.weekStart).toLocaleDateString("hu-HU", { month: "short", day: "numeric" }),
      active: point.active,
      new: point.new,
      churn: point.churn,
    }));

    return (
      <div style={{ width: "100%", height: isMobileChart ? 250 : 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="week"
              stroke="#666"
              style={{ fontSize: 12 }}
              tick={{ fill: "#666" }}
            />
            <YAxis
              stroke="#666"
              style={{ fontSize: 12 }}
              tick={{ fill: "#666" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "8px 12px",
              }}
              labelStyle={{ color: "#333", fontWeight: 600, marginBottom: 4 }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 20 }}
              iconType="line"
              iconSize={16}
            />
            <Line
              type="monotone"
              dataKey="active"
              stroke="#22c55e"
              strokeWidth={3}
              dot={{ fill: "#22c55e", r: 5 }}
              activeDot={{ r: 7 }}
              name={t("admin.subscriptions.activeCount") || "Aktív"}
            />
            <Line
              type="monotone"
              dataKey="new"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: "#3b82f6", r: 5 }}
              activeDot={{ r: 7 }}
              name={t("admin.subscriptions.new7d") || "Új"}
            />
            <Line
              type="monotone"
              dataKey="churn"
              stroke="#dc2626"
              strokeWidth={3}
              dot={{ fill: "#dc2626", r: 5 }}
              activeDot={{ r: 7 }}
              name={t("admin.subscriptions.churn7d") || "Churn"}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Only show full page loading on initial load
  if (isLoading && !summary && subscriptions.length === 0) {
    return (
      <div style={{ padding: "clamp(24px, 5vw, 32px)" }}>
        <LoadingSpinner isLoading={true} delay={0} />
      </div>
    );
  }

  return (
    <div style={{ padding: "clamp(24px, 5vw, 32px)" }}>
      <AdminPageHeader
        title={t("admin.subscriptionsDashboard") || "Előfizetések Dashboard"}
        subtitle={t("admin.subscriptionsDashboardSubtitle") || "Superadmin előfizetés kezelés"}
      />

      {/* Scope and Status Filters */}
      <div
        style={{
          display: "flex",
          gap: isMobile ? 8 : 12,
          marginBottom: 24,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "site", "place"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setScope(s);
                setPage(0);
              }}
              style={{
                padding: isMobile ? "6px 12px" : "8px 16px",
                background: scope === s ? "#667eea" : "white",
                color: scope === s ? "white" : "#333",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: isMobile ? 12 : 14,
                fontWeight: scope === s ? 600 : 400,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {s === "all" ? t("admin.all") || "Mind" : s === "site" ? t("admin.sites") || "Site" : t("admin.places") || "Place"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "ACTIVE", "EXPIRING", "EXPIRED", "SUSPENDED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(0);
              }}
              style={{
                padding: isMobile ? "6px 12px" : "8px 16px",
                background: statusFilter === s ? "#667eea" : "white",
                color: statusFilter === s ? "white" : "#333",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: isMobile ? 12 : 14,
                fontWeight: statusFilter === s ? 600 : 400,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {s === "all"
                ? t("admin.all") || "Mind"
                : s === "ACTIVE"
                ? t("admin.statusActive") || "Aktív"
                : s === "EXPIRING"
                ? t("admin.expiring") || "Lejáró"
                : s === "EXPIRED"
                ? t("admin.statusExpired") || "Lejárt"
                : t("admin.statusSuspended") || "Felfüggesztve"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile 
              ? "repeat(2, 1fr)" 
              : "repeat(auto-fit, minmax(150px, 1fr))",
            gap: isMobile ? 12 : 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              padding: 16,
              background: "white",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              {t("admin.subscriptions.activeCount") || "Aktív"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#333", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{summary.activeCount}</div>
          </div>
          <div
            style={{
              padding: 16,
              background: "white",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              {t("admin.subscriptions.mrr") || "MRR"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#333", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              {formatCurrency(summary.mrrCents)}
            </div>
          </div>
          <div
            style={{
              padding: 16,
              background: "white",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              {t("admin.subscriptions.new7d") || "Új (7 nap)"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#22c55e", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{summary.newCount}</div>
          </div>
          <div
            style={{
              padding: 16,
              background: "white",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              {t("admin.subscriptions.churn7d") || "Churn (7 nap)"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#dc2626", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{summary.churnCount}</div>
          </div>
          <div
            style={{
              padding: 16,
              background: "white",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              {t("admin.subscriptions.netChange") || "Nettó változás"}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: summary.netChange >= 0 ? "#22c55e" : "#dc2626",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {summary.netChange >= 0 ? "+" : ""}
              {summary.netChange}
            </div>
          </div>
          <div
            style={{
              padding: 16,
              background: "white",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              {t("admin.subscriptions.expiring7d") || "Lejár 7 napon belül"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#f59e0b", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{summary.expiringCount}</div>
          </div>
        </div>
      )}

      {/* Two Panel Layout: Expiring List + Trend Chart */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? 16 : 24,
          marginBottom: 24,
        }}
      >
        {/* Expiring List */}
        <div
          style={{
            padding: isMobile ? 16 : 20,
            background: "white",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: isMobile ? 16 : 18, fontWeight: 600, fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
            {t("admin.subscriptions.expiring7d") || "Lejár 7 napon belül"}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {expiring.length === 0 ? (
              <div style={{ 
                padding: 48, 
                textAlign: "center", 
                color: "#999",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
              }}>
                {t("admin.noData") || "Nincs adat"}
              </div>
            ) : (
              expiring.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: 12,
                    background: "#f9fafb",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{item.entityName}</div>
                      <div style={{ fontSize: 12, color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                        {item.scope === "site" ? t("admin.site") || "Site" : t("admin.place") || "Place"} • {item.plan} • {formatDate(item.validUntil)}
                      </div>
                      <div style={{ fontSize: 12, color: "#666", marginTop: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                        {item.owner.email}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <a
                        href={`mailto:${item.owner.email}?subject=${encodeURIComponent(t("admin.subscriptions.expiringEmailSubject") || "Előfizetés lejár")}&body=${encodeURIComponent(t("admin.subscriptions.expiringEmailBody") || `Szia ${item.owner.name}, az előfizetésed ${formatDate(item.validUntil)}-án lejár.`)}`}
                        style={{
                          padding: "4px 8px",
                          background: "#3b82f6",
                          color: "white",
                          borderRadius: 4,
                          fontSize: 12,
                          textDecoration: "none",
                          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        {t("admin.email") || "Email"}
                      </a>
                      <button
                        onClick={() => navigate(`/${lang}${item.adminUrl}`)}
                        style={{
                          padding: "4px 8px",
                          background: "#667eea",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          fontSize: 12,
                          cursor: "pointer",
                          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        {t("admin.open") || "Megnyit"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Trend Chart */}
        <div
          style={{
            padding: isMobile ? 16 : 20,
            background: "white",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            minHeight: isMobile ? 300 : 400,
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: isMobile ? 16 : 18, fontWeight: 600, fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
            {t("admin.subscriptions.trends") || "Tendencia (12 hét)"}
          </h3>
          <TrendChart data={trends} isMobileChart={isMobile} />
        </div>
      </div>

      {/* Search and Filters */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 8 : 12,
          marginBottom: 16,
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        <input
          type="text"
          placeholder={t("admin.search") || "Keresés..."}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            // Page will be reset by debounce effect
          }}
          style={{
            padding: isMobile ? "10px 12px" : "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            fontSize: isMobile ? 16 : 14,
            flex: isMobile ? "none" : 1,
            width: isMobile ? "100%" : "auto",
            minWidth: isMobile ? "auto" : 200,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        />
        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value);
            setPage(0); // Reset page when filter changes
          }}
          style={{
            padding: isMobile ? "10px 12px" : "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            fontSize: isMobile ? 16 : 14,
            width: isMobile ? "100%" : "auto",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          <option value="all">{t("admin.allPlans") || "Minden csomag"}</option>
          <option value="BASIC">{t("admin.planBasic") || "Basic"}</option>
          <option value="PRO">{t("admin.planPro") || "Pro"}</option>
          <option value="BUSINESS">{t("admin.planBusiness") || "Business"}</option>
        </select>
        <select
          value={expiresWithinDays || ""}
          onChange={(e) => {
            setExpiresWithinDays(e.target.value ? parseInt(e.target.value, 10) : undefined);
            setPage(0); // Reset page when filter changes
          }}
          style={{
            padding: isMobile ? "10px 12px" : "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            fontSize: isMobile ? 16 : 14,
            width: isMobile ? "100%" : "auto",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          <option value="">{t("admin.allExpiry") || "Minden lejárat"}</option>
          <option value="7">{t("admin.expires7d") || "Lejár 7 napon belül"}</option>
          <option value="14">{t("admin.expires14d") || "Lejár 14 napon belül"}</option>
          <option value="30">{t("admin.expires30d") || "Lejár 30 napon belül"}</option>
        </select>
      </div>

      {/* Subscriptions Table */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {isLoading && subscriptions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(255, 255, 255, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <LoadingSpinner isLoading={true} delay={0} />
          </div>
        )}
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? 600 : "auto" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: isMobile ? 8 : 12, textAlign: "left", fontSize: isMobile ? 11 : 12, fontWeight: 600, color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  {t("admin.entity") || "Entitás"}
                </th>
                <th style={{ padding: isMobile ? 8 : 12, textAlign: "left", fontSize: isMobile ? 11 : 12, fontWeight: 600, color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  {t("admin.plan") || "Csomag"}
                </th>
                <th style={{ padding: isMobile ? 8 : 12, textAlign: "left", fontSize: isMobile ? 11 : 12, fontWeight: 600, color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  {t("admin.status") || "Státusz"}
                </th>
                <th style={{ padding: isMobile ? 8 : 12, textAlign: "left", fontSize: isMobile ? 11 : 12, fontWeight: 600, color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  {t("admin.validUntil") || "Érvényes"}
                </th>
                <th style={{ padding: isMobile ? 8 : 12, textAlign: "left", fontSize: isMobile ? 11 : 12, fontWeight: 600, color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  {t("admin.owner") || "Tulajdonos"}
                </th>
                <th style={{ padding: isMobile ? 8 : 12, textAlign: "left", fontSize: isMobile ? 11 : 12, fontWeight: 600, color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  {t("admin.actions") || "Akciók"}
                </th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: "center", color: "#999", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                    {t("admin.noData") || "Nincs adat"}
                  </td>
                </tr>
              ) : (
                subscriptions.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: isMobile ? 8 : 12 }}>
                    <div>
                      <div style={{ fontWeight: 500, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{item.entityName}</div>
                      <div style={{ fontSize: 12, color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                        {item.scope === "site" ? t("admin.site") || "Site" : t("admin.place") || "Place"}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: isMobile ? 8 : 12 }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        background: getPlanColor(item.plan),
                        color: "white",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {item.plan}
                    </span>
                  </td>
                  <td style={{ padding: isMobile ? 8 : 12 }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        background: getStatusColor(item.status),
                        color: "white",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: 12, fontSize: 14, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{formatDate(item.validUntil)}</td>
                  <td style={{ padding: isMobile ? 8 : 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{item.owner.name}</div>
                      <div style={{ fontSize: 12, color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{item.owner.email}</div>
                    </div>
                  </td>
                  <td style={{ padding: isMobile ? 8 : 12 }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {isEditing === item.id ? (
                        <>
                          <select
                            value={editData.plan || item.plan}
                            onChange={(e) => setEditData({ ...editData, plan: e.target.value as any })}
                            style={{ padding: "4px 8px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
                          >
                            <option value="BASIC">BASIC</option>
                            <option value="PRO">PRO</option>
                            <option value="BUSINESS">BUSINESS</option>
                          </select>
                          <select
                            value={editData.status || item.status}
                            onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                            style={{ padding: "4px 8px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="SUSPENDED">SUSPENDED</option>
                            <option value="EXPIRED">EXPIRED</option>
                          </select>
                          <input
                            type="date"
                            value={editData.validUntil ? new Date(editData.validUntil).toISOString().split("T")[0] : ""}
                            onChange={(e) =>
                              setEditData({ ...editData, validUntil: e.target.value ? e.target.value : null })
                            }
                            style={{ padding: "4px 8px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
                          />
                          <button
                            onClick={() => handleSave(item)}
                            style={{
                              padding: "4px 8px",
                              background: "#22c55e",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 12,
                              cursor: "pointer",
                              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            }}
                          >
                            {t("admin.save") || "Mentés"}
                          </button>
                          <button
                            onClick={() => setIsEditing(null)}
                            style={{
                              padding: "4px 8px",
                              background: "#6b7280",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 12,
                              cursor: "pointer",
                              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            }}
                          >
                            {t("admin.cancel") || "Mégse"}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(item)}
                            style={{
                              padding: "4px 8px",
                              background: "#667eea",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 12,
                              cursor: "pointer",
                              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            }}
                          >
                            {t("admin.edit") || "Szerkesztés"}
                          </button>
                          <button
                            onClick={() => handleExtend(item)}
                            style={{
                              padding: "4px 8px",
                              background: "#3b82f6",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 12,
                              cursor: "pointer",
                              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            }}
                          >
                            {t("admin.extend30d") || "+30 nap"}
                          </button>
                          {item.status === "ACTIVE" && (
                            <button
                              onClick={() => handleSuspend(item)}
                              style={{
                                padding: "4px 8px",
                                background: "#f59e0b",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                fontSize: 12,
                                cursor: "pointer",
                                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                              }}
                            >
                              {t("admin.suspend") || "Felfüggeszt"}
                            </button>
                          )}
                          <button
                            onClick={() => handleViewHistory(item)}
                            style={{
                              padding: "4px 8px",
                              background: "#8b5cf6",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 12,
                              cursor: "pointer",
                              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            }}
                          >
                            {t("admin.history") || "Előzmények"}
                          </button>
                          <button
                            onClick={() => navigate(`/${lang}${item.adminUrl}`)}
                            style={{
                              padding: "4px 8px",
                              background: "#6b7280",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 12,
                              cursor: "pointer",
                              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            }}
                          >
                            {t("admin.open") || "Megnyit"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
        {total > pageSize && (
          <div style={{ 
            padding: isMobile ? 12 : 16, 
            display: "flex", 
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between", 
            alignItems: isMobile ? "stretch" : "center",
            gap: isMobile ? 12 : 0,
          }}>
            <div style={{ 
              fontSize: isMobile ? 12 : 14, 
              color: "#666", 
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              textAlign: isMobile ? "center" : "left",
            }}>
              {t("admin.showing") || "Megjelenítve"} {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} {t("admin.of") || "összesen"} {total}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: isMobile ? "center" : "flex-end" }}>
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={{
                  padding: isMobile ? "10px 16px" : "8px 16px",
                  background: page === 0 ? "#f3f4f6" : "#667eea",
                  color: page === 0 ? "#9ca3af" : "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: page === 0 ? "not-allowed" : "pointer",
                  fontSize: isMobile ? 14 : 14,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.previous") || "Előző"}
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * pageSize >= total}
                style={{
                  padding: isMobile ? "10px 16px" : "8px 16px",
                  background: (page + 1) * pageSize >= total ? "#f3f4f6" : "#667eea",
                  color: (page + 1) * pageSize >= total ? "#9ca3af" : "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: (page + 1) * pageSize >= total ? "not-allowed" : "pointer",
                  fontSize: isMobile ? 14 : 14,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.next") || "Következő"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History Modal */}
      {historyModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: isMobile ? 16 : 24,
          }}
          onClick={() => {
            setHistoryModalOpen(null);
            setHistoryPage(0);
            setCurrentHistoryItem(null);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: isMobile ? 16 : 24,
              maxWidth: isMobile ? "100%" : 800,
              maxHeight: "90vh",
              overflow: "auto",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 24, fontWeight: 600, fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                {t("admin.subscriptionHistory") || "Előfizetés előzmények"}
              </h2>
              <button
                onClick={() => {
            setHistoryModalOpen(null);
            setHistoryPage(0);
            setCurrentHistoryItem(null);
          }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  color: "#666",
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            {isLoadingHistory ? (
              <div style={{ padding: 48, textAlign: "center" }}>
                <LoadingSpinner isLoading={true} delay={0} />
              </div>
            ) : history.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "#999", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                {t("admin.noHistory") || "Nincs előzmény"}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {history.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: 16,
                      background: "#f9fafb",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4, fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                          {item.changeType === "PLAN_CHANGE" && (t("admin.planChange") || "Csomagváltás")}
                          {item.changeType === "STATUS_CHANGE" && (t("admin.statusChange") || "Státusz változás")}
                          {item.changeType === "PAYMENT" && (t("admin.payment") || "Fizetés")}
                          {item.changeType === "EXTENSION" && (t("admin.extension") || "Hosszabbítás")}
                          {item.changeType === "CREATED" && (t("admin.created") || "Létrehozva")}
                          {item.changeType === "UPDATE" && (t("admin.update") || "Frissítve")}
                        </div>
                        <div style={{ fontSize: 12, color: "#666", fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                          {new Date(item.createdAt).toLocaleString("hu-HU")}
                        </div>
                      </div>
                    </div>

                    {item.changeType === "PLAN_CHANGE" && (
                      <div style={{ marginTop: 8, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                        <div style={{ fontSize: 14, marginBottom: 4 }}>
                          <span style={{ color: "#666" }}>{t("admin.from") || "Ról"}: </span>
                          <span style={{ fontWeight: 600 }}>{item.oldPlan || "N/A"}</span>
                          <span style={{ margin: "0 8px", color: "#999" }}>→</span>
                          <span style={{ color: "#666" }}>{t("admin.to") || "Re"}: </span>
                          <span style={{ fontWeight: 600 }}>{item.newPlan || "N/A"}</span>
                        </div>
                      </div>
                    )}

                    {item.changeType === "STATUS_CHANGE" && (
                      <div style={{ marginTop: 8, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                        <div style={{ fontSize: 14, marginBottom: 4 }}>
                          <span style={{ color: "#666" }}>{t("admin.from") || "Ról"}: </span>
                          <span style={{ fontWeight: 600 }}>{item.oldStatus || "N/A"}</span>
                          <span style={{ margin: "0 8px", color: "#999" }}>→</span>
                          <span style={{ color: "#666" }}>{t("admin.to") || "Re"}: </span>
                          <span style={{ fontWeight: 600 }}>{item.newStatus || "N/A"}</span>
                        </div>
                      </div>
                    )}

                    {item.paymentDueDate && (
                      <div style={{ marginTop: 8, fontSize: 14, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                        <span style={{ color: "#666" }}>{t("admin.paymentDue") || "Fizetési határidő"}: </span>
                        <span style={{ fontWeight: 600, color: "#f59e0b" }}>
                          {new Date(item.paymentDueDate).toLocaleDateString("hu-HU")}
                        </span>
                      </div>
                    )}

                    {item.amountCents && (
                      <div style={{ marginTop: 4, fontSize: 14, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                        <span style={{ color: "#666" }}>{t("admin.amount") || "Összeg"}: </span>
                        <span style={{ fontWeight: 600 }}>
                          {formatCurrency(item.amountCents)} {item.currency || "HUF"}
                        </span>
                      </div>
                    )}

                    {item.note && (
                      <div style={{ marginTop: 8, padding: 8, background: "white", borderRadius: 4, fontSize: 13, color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                        {item.note}
                      </div>
                    )}
                  </div>
                  ))}
                </div>
                
                {/* Pagination for history */}
                {historyTotal > historyPageSize && (
                  <div style={{ 
                    marginTop: 20,
                    paddingTop: 20,
                    borderTop: "1px solid #e5e7eb",
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}>
                    <div style={{ 
                      fontSize: 14, 
                      color: "#666",
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>
                      {t("admin.showing") || "Showing"} {historyPage * historyPageSize + 1}-{Math.min((historyPage + 1) * historyPageSize, historyTotal)} {t("admin.of") || "of"} {historyTotal}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          if (currentHistoryItem && historyPage > 0) {
                            handleViewHistory(currentHistoryItem, historyPage - 1);
                          }
                        }}
                        disabled={historyPage === 0}
                        style={{
                          padding: "8px 16px",
                          background: historyPage === 0 ? "#e5e7eb" : "#667eea",
                          color: historyPage === 0 ? "#999" : "white",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 14,
                          cursor: historyPage === 0 ? "not-allowed" : "pointer",
                          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        {t("admin.previous") || "Előző"}
                      </button>
                      <button
                        onClick={() => {
                          if (currentHistoryItem && (historyPage + 1) * historyPageSize < historyTotal) {
                            handleViewHistory(currentHistoryItem, historyPage + 1);
                          }
                        }}
                        disabled={(historyPage + 1) * historyPageSize >= historyTotal}
                        style={{
                          padding: "8px 16px",
                          background: (historyPage + 1) * historyPageSize >= historyTotal ? "#e5e7eb" : "#667eea",
                          color: (historyPage + 1) * historyPageSize >= historyTotal ? "#999" : "white",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 14,
                          cursor: (historyPage + 1) * historyPageSize >= historyTotal ? "not-allowed" : "pointer",
                          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        {t("admin.next") || "Következő"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

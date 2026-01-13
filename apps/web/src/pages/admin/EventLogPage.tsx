// src/pages/admin/EventLogPage.tsx
import { useState, useEffect, useContext, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../contexts/AuthContext";
import { useAdminSite } from "../../contexts/AdminSiteContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import {
  getEventLogs,
  getEventLogFilterOptions,
  exportEventLogs,
  deleteEventLogs,
  getUsers,
  getSites,
  type EventLog,
  type EventLogFilterDto,
  type User,
  type Site,
} from "../../api/admin.api";

// Import getEventLogs directly for use in useEffect
import { useToast } from "../../contexts/ToastContext";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Pagination } from "../../components/Pagination";
import { HAS_MULTIPLE_SITES } from "../../app/config";

export function EventLogPage() {
  const { t } = useTranslation();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  const { selectedSiteId } = useAdminSite();
  usePageTitle("admin.eventLog");
  const { showToast } = useToast();

  const [logs, setLogs] = useState<EventLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [filterOptions, setFilterOptions] = useState<{ actions: string[]; entityTypes: string[] }>({
    actions: [],
    entityTypes: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState<EventLogFilterDto>({
    siteId: selectedSiteId || undefined,
    userId: undefined,
    action: undefined,
    entityType: undefined,
    startDate: undefined,
    endDate: undefined,
    page: 1,
    limit: 50,
  });

  const prevFiltersRef = useRef<string>("");
  const hasLoadedInitial = useRef(false);
  const errorShownRef = useRef(false);
  const isDeletingRef = useRef(false); // Flag to prevent useEffect from running during delete
  const deleteCompletedRef = useRef(false); // Flag to track when delete just completed

  // Initial load - load data and logs
  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      try {
        await Promise.all([loadData(), loadFilterOptions()]);
        
        if (!isMounted) return;
        
        // Load logs immediately with current filters
        const initialFilters = {
          siteId: selectedSiteId || undefined,
          userId: undefined,
          action: undefined,
          entityType: undefined,
          startDate: undefined,
          endDate: undefined,
          page: 1,
          limit: 50,
        };
        
        prevFiltersRef.current = JSON.stringify(initialFilters);
        
        // Load logs directly
        setIsLoading(true);
        setError(null);
        try {
          const response = await getEventLogs(initialFilters);
          if (isMounted) {
            setLogs(response.logs || []);
            setPagination(response.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
            errorShownRef.current = false;
          }
        } catch (err) {
          if (!isMounted) return;
          if (err instanceof Error && err.message.includes("Session expired")) {
            setIsLoading(false);
            return;
          }
          const errorMessage = err instanceof Error ? err.message : t("admin.errors.loadEventLogsFailed");
          setError(errorMessage);
          if (!errorShownRef.current) {
            showToast(errorMessage, "error");
            errorShownRef.current = true;
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
        
        hasLoadedInitial.current = true;
      } catch (err) {
        console.error("Failed to initialize EventLogPage:", err);
        if (isMounted) {
          hasLoadedInitial.current = true;
          setIsLoading(false);
        }
      }
    };
    
    initialize();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update filters when selectedSiteId changes
  useEffect(() => {
    if (selectedSiteId) {
      setFilters((prev) => ({ ...prev, siteId: selectedSiteId, page: 1 }));
    }
  }, [selectedSiteId]);

  // Load logs when filters change (but skip initial load and delete operations)
  useEffect(() => {
    if (!hasLoadedInitial.current) {
      return;
    }

    // Skip if we're currently deleting (to prevent reload during delete)
    if (isDeletingRef.current) {
      return;
    }
    
    // Skip if delete just completed (one cycle grace period)
    if (deleteCompletedRef.current) {
      deleteCompletedRef.current = false;
      return;
    }

    // Create a stable string representation of filters to compare
    const filtersKey = JSON.stringify(filters);
    
    // Only call loadLogs if filters actually changed
    if (prevFiltersRef.current !== filtersKey) {
      prevFiltersRef.current = filtersKey;
      // Call loadLogs with current filters
      loadLogs();
    }
  }, [filters]); // Depend on filters to reload when they change

  const loadData = async () => {
    try {
      const [usersData, sitesData] = await Promise.all([getUsers(), getSites()]);
      setUsers(usersData);
      setSites(sitesData);
    } catch (err) {
      console.error("Failed to load users/sites:", err);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const options = await getEventLogFilterOptions();
      setFilterOptions(options);
    } catch (err) {
      console.error("Failed to load filter options:", err);
      // Don't show toast for filter options error - it's not critical
      // The filters will just be empty
    }
  };

  const loadLogs = async (customFilters?: EventLogFilterDto, showLoading: boolean = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);
    const filtersToUse = customFilters || filters;
    
    
    try {
      const response = await getEventLogs(filtersToUse);
      
      setLogs(response.logs || []);
      setPagination(response.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      // Reset error shown flag on success
      errorShownRef.current = false;
    } catch (err) {
      // If session expired error, don't show toast (redirect will happen)
      if (err instanceof Error && err.message.includes("Session expired")) {
        if (showLoading) {
          setIsLoading(false);
        }
        return;
      }
      const errorMessage = err instanceof Error ? err.message : t("admin.errors.loadEventLogsFailed");
      setError(errorMessage);
      // Only show toast once per error
      if (!errorShownRef.current) {
        showToast(errorMessage, "error");
        errorShownRef.current = true;
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleFilterChange = (key: keyof EventLogFilterDto, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportEventLogs(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast(t("admin.eventLog.exportSuccess"), "success");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("admin.errors.exportFailed");
      showToast(errorMessage, "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("admin.eventLog.deleteConfirm"))) {
      return;
    }

    
    setIsDeleting(true);
    isDeletingRef.current = true; // Prevent useEffect from triggering reload
    
    try {
      // Remove page and limit from delete filters
      const deleteFilters = {
        siteId: filters.siteId,
        userId: filters.userId,
        action: filters.action,
        entityType: filters.entityType,
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
      
      const result = await deleteEventLogs(deleteFilters);
      
      showToast(
        t("admin.eventLog.deleteSuccess", { count: result.count }),
        "success"
      );
      
      // Update prevFiltersRef FIRST to prevent useEffect from triggering
      const currentFiltersKey = JSON.stringify(filters);
      prevFiltersRef.current = currentFiltersKey;
      
      // Set delete completed flag to skip next useEffect cycle
      deleteCompletedRef.current = true;
      
      // Simple optimistic update: just clear the list
      setLogs([]);
      setPagination({ page: 1, limit: 50, total: 0, totalPages: 0 });
      
      
    } catch (err) {
      console.error("[EventLogPage] Delete error:", err);
      const errorMessage = err instanceof Error ? err.message : t("admin.errors.deleteFailed");
      showToast(errorMessage, "error");
    } finally {
      setIsDeleting(false);
      // Wait for next tick to ensure all state updates are processed
      requestAnimationFrame(() => {
        isDeletingRef.current = false;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return "#10b981"; // green
      case "update":
        return "#3b82f6"; // blue
      case "delete":
        return "#ef4444"; // red
      case "login":
        return "#8b5cf6"; // purple
      case "logout":
        return "#f59e0b"; // amber
      default:
        return "#6b7280"; // gray
    }
  };

  const translateAction = (action: string) => {
    return t(`admin.eventLog.actions.${action.toLowerCase()}`, { defaultValue: action });
  };

  const translateEntityType = (entityType: string | null) => {
    if (!entityType) return "-";
    return t(`admin.eventLog.entityTypes.${entityType.toLowerCase()}`, { defaultValue: entityType });
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "clamp(24px, 5vw, 32px)" }}>
        <h1 style={{
          fontSize: "clamp(20px, 4vw, 28px)",
          fontWeight: 700,
          fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "white",
          margin: 0,
          marginBottom: 8,
          textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        }}>
          {t("admin.eventLog")}
        </h1>
        <p style={{ 
          fontSize: "clamp(14px, 3.5vw, 16px)",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 400,
          color: "#c0c0d0",
          margin: 0,
          textShadow: "0 1px 4px rgba(0, 0, 0, 0.2)",
        }}>
          {t("admin.eventLog.description")}
        </p>
      </div>

      {/* Filters */}
      <div
        style={{
          background: "white",
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 16, fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.eventLog.filters")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {/* Site Filter */}
          {HAS_MULTIPLE_SITES && (currentUser?.role === "superadmin" || sites.length > 1) && (
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                {t("admin.eventLog.filterSite")}
              </label>
              <select
                value={filters.siteId || ""}
                onChange={(e) => handleFilterChange("siteId", e.target.value || undefined)}
                style={{ 
                  width: "100%", 
                  padding: 12, 
                  fontSize: "clamp(15px, 3.5vw, 16px)", 
                  border: "1px solid #ddd", 
                  borderRadius: 4,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                <option value="">{t("admin.eventLog.allSites")}</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.translations?.[0]?.name || site.slug}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User Filter */}
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              {t("admin.eventLog.filterUser")}
            </label>
            <select
              value={filters.userId || ""}
              onChange={(e) => handleFilterChange("userId", e.target.value || undefined)}
              style={{ width: "100%", padding: 8, fontSize: 14, border: "1px solid #ddd", borderRadius: 4 }}
            >
              <option value="">{t("admin.eventLog.allUsers")}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              {t("admin.eventLog.filterAction")}
            </label>
            <select
              value={filters.action || ""}
              onChange={(e) => handleFilterChange("action", e.target.value || undefined)}
              style={{ width: "100%", padding: 8, fontSize: 14, border: "1px solid #ddd", borderRadius: 4 }}
            >
              <option value="">{t("admin.eventLog.allActions")}</option>
              {filterOptions.actions.map((action) => (
                <option key={action} value={action}>
                  {translateAction(action)}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Type Filter */}
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              {t("admin.eventLog.filterEntityType")}
            </label>
            <select
              value={filters.entityType || ""}
              onChange={(e) => handleFilterChange("entityType", e.target.value || undefined)}
              style={{ width: "100%", padding: 8, fontSize: 14, border: "1px solid #ddd", borderRadius: 4 }}
            >
              <option value="">{t("admin.eventLog.allEntityTypes")}</option>
              {filterOptions.entityTypes.map((type) => (
                <option key={type} value={type}>
                  {translateEntityType(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              {t("admin.eventLog.filterStartDate")}
            </label>
            <input
              type="datetime-local"
              value={filters.startDate || ""}
              onChange={(e) => handleFilterChange("startDate", e.target.value || undefined)}
              style={{ width: "100%", padding: 8, fontSize: 14, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              {t("admin.eventLog.filterEndDate")}
            </label>
            <input
              type="datetime-local"
              value={filters.endDate || ""}
              onChange={(e) => handleFilterChange("endDate", e.target.value || undefined)}
              style={{ width: "100%", padding: 8, fontSize: 14, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button
            onClick={handleExport}
            disabled={isExporting}
            style={{
              padding: "8px 16px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: isExporting ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            {isExporting ? t("admin.eventLog.exporting") : t("admin.eventLog.export")}
          </button>
          {currentUser?.role === "superadmin" && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              style={{
                padding: "8px 16px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: isDeleting ? "not-allowed" : "pointer",
                fontWeight: 500,
              }}
            >
              {isDeleting ? t("admin.eventLog.deleting") : t("admin.eventLog.delete")}
            </button>
          )}
          <button
            onClick={() => {
              setFilters({
                siteId: selectedSiteId || undefined,
                page: 1,
                limit: 50,
              });
            }}
            style={{
              padding: "8px 16px",
              background: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {t("admin.eventLog.resetFilters")}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: "#fee",
            color: "#c00",
            borderRadius: 4,
            border: "1px solid #fcc",
          }}
        >
          {error}
        </div>
      )}

      {/* Logs Table */}
      {isLoading ? (
        <LoadingSpinner isLoading={true} delay={0} />
      ) : (
        <>
          <div style={{ background: "white", border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{t("admin.eventLog.timestamp")}</th>
                    {HAS_MULTIPLE_SITES && <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{t("admin.eventLog.site")}</th>}
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{t("admin.eventLog.user")}</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{t("admin.eventLog.action")}</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{t("admin.eventLog.entityType")}</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{t("admin.eventLog.description")}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={HAS_MULTIPLE_SITES ? 6 : 5} style={{ padding: 24, textAlign: "center", color: "#666" }}>
                        {t("admin.eventLog.noLogs")}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: 12 }}>{formatDate(log.createdAt)}</td>
                        {HAS_MULTIPLE_SITES && (
                          <td style={{ padding: 12 }}>
                            <span style={{ 
                              padding: "4px 8px", 
                              background: "#f3f4f6", 
                              borderRadius: 4, 
                              fontSize: "clamp(13px, 3vw, 15px)",
                              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            }}>
                              {log.site?.slug || log.siteId}
                            </span>
                          </td>
                        )}
                        <td style={{ padding: 12 }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {log.user.firstName} {log.user.lastName}
                            </div>
                            <div style={{ 
                              fontSize: "clamp(13px, 3vw, 15px)", 
                              color: "#666",
                              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            }}>{log.user.email}</div>
                          </div>
                        </td>
                        <td style={{ padding: 12 }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              background: getActionColor(log.action) + "20",
                              color: getActionColor(log.action),
                              borderRadius: 4,
                              fontSize: "clamp(13px, 3vw, 15px)",
                              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                              fontWeight: 500,
                            }}
                          >
                            {translateAction(log.action)}
                          </span>
                        </td>
                        <td style={{ padding: 12 }}>{translateEntityType(log.entityType)}</td>
                        <td style={{ padding: 12 }}>{log.description || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div style={{ marginTop: 16 }}>
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
                onLimitChange={(limit) => setFilters((prev) => ({ ...prev, limit, page: 1 }))}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

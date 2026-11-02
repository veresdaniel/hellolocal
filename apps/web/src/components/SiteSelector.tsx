// src/components/SiteSelector.tsx
import { useTranslation } from "react-i18next";
import { useContext, useState, useEffect } from "react";
import { AdminSiteContext } from "../contexts/AdminSiteContext";
import { LoadingSpinner } from "./LoadingSpinner";
import { buildUrl } from "../app/urls";
import { getHuTranslation } from "../utils/langHelpers";
import { useToast } from "../contexts/ToastContext";

export function SiteSelector() {
  const { t } = useTranslation();
  const context = useContext(AdminSiteContext);
  const { showToast } = useToast();

  // Responsive: show only icon on small screens
  // IMPORTANT: All hooks must be called before any conditional returns
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // If context is not available, don't render anything (or render a placeholder)
  if (!context) {
    return null;
  }

  const { selectedSiteId, sites, setSelectedSiteId, isLoading } = context;

  if (isLoading) {
    return (
      <>
        <LoadingSpinner isLoading={isLoading} delay={0} />
        <div
          style={{
            padding: "8px 16px",
            background: "#f5f5f5",
            borderRadius: 4,
            color: "var(--hl-muted, #665d78)",
            visibility: "hidden",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("common.loading")}...
        </div>
      </>
    );
  }

  if (sites.length === 0) {
    return (
      <div
        style={{
          padding: "8px 16px",
          background: "#fee",
          borderRadius: 4,
          color: "#c00",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 400,
        }}
      >
        {t("admin.noSites")}
      </div>
    );
  }

  // Helper function to get site name in Hungarian (or first available)
  const getSiteName = (site: (typeof sites)[0]) => {
    const huTranslation = getHuTranslation(site.translations);
    return huTranslation?.name || site.translations[0]?.name || site.slug;
  };

  // Handle site selection with toast notification
  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSiteId = e.target.value || null;
    setSelectedSiteId(newSiteId);

    if (newSiteId) {
      const selectedSite = sites.find((s) => s.id === newSiteId);
      if (selectedSite) {
        showToast(
          t("admin.siteChangedSuccess", { siteName: getSiteName(selectedSite) }),
          "success"
        );
      }
    }
  };

  // Get current site. A single region is already selected, so the name is enough.
  const onlySite = sites.length === 1 ? sites[0] : null;
  const currentSite = sites.find((s) => s.id === selectedSiteId) ?? onlySite;

  // Function to open public page (same tab, not new tab)
  const openPublicPage = () => {
    if (!currentSite) return;
    const publicPath = buildUrl({
      siteKey: currentSite.slug,
      lang: "hu", // Default to Hungarian
      path: "",
    });
    // Navigate in same tab
    window.location.href = publicPath;
  };

  const canClear = sites.length > 1;
  const nameStyle = {
    fontSize: 16,
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontWeight: 600,
    color: "#1b1730",
  } as const;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {onlySite ? (
        <span style={nameStyle}>{getSiteName(onlySite)}</span>
      ) : (
        <select
          value={selectedSiteId || ""}
          onChange={handleSiteChange}
          aria-label={t("admin.selectSite")}
          style={{
            padding: "8px 16px",
            fontSize: 16,
            borderRadius: 4,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
            fontFamily: nameStyle.fontFamily,
            fontWeight: 400,
          }}
        >
          {canClear ? <option value="">{t("admin.filters.noneSelected")}</option> : null}
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {getSiteName(site)}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={openPublicPage}
        disabled={!currentSite}
        style={{
          padding: "8px 16px",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          borderRadius: 4,
          border: "1px solid #7c3aed",
          background: currentSite ? "#7c3aed" : "#ccc",
          color: "white",
          cursor: currentSite ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          gap: 6,
          minWidth: isSmallScreen ? "auto" : "fit-content",
          fontWeight: 500,
        }}
        title={t("admin.openPublicPage")}
        aria-label={t("admin.openPublicPage")}
      >
        <span style={{ fontSize: 18 }} aria-hidden="true">🌐</span>
        {!isSmallScreen && <span>{t("admin.openPublicPage")}</span>}
      </button>
    </div>
  );
}

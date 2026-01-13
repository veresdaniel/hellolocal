// src/components/SiteSelector.tsx
import { useTranslation } from "react-i18next";
import { useContext, useState, useEffect } from "react";
import { AdminSiteContext } from "../contexts/AdminSiteContext";
import { LoadingSpinner } from "./LoadingSpinner";
import { buildUrl } from "../app/urls";

export function SiteSelector() {
  const { t } = useTranslation();
  const context = useContext(AdminSiteContext);
  
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
        <div style={{ padding: "8px 16px", background: "#f5f5f5", borderRadius: 4, color: "#666", visibility: "hidden", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
          {t("common.loading")}...
        </div>
      </>
    );
  }

  if (sites.length === 0) {
    return (
      <div style={{ 
        padding: "8px 16px", 
        background: "#fee", 
        borderRadius: 4, 
        color: "#c00", 
        fontSize: "clamp(14px, 3.5vw, 16px)",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontWeight: 400,
      }}>
        {t("admin.noSites")}
      </div>
    );
  }

  // Helper function to get site name in Hungarian (or first available)
  const getSiteName = (site: typeof sites[0]) => {
    const huTranslation = site.translations.find((t) => t.lang === "hu");
    return huTranslation?.name || site.translations[0]?.name || site.slug;
  };

  // Get current site
  const currentSite = sites.find((s) => s.id === selectedSiteId);

  // Function to open public page
  const openPublicPage = () => {
    if (!currentSite) return;
    const publicPath = buildUrl({
      siteKey: currentSite.slug,
      lang: "hu", // Default to Hungarian
      path: "" 
    });
    // Open in new tab
    window.open(publicPath, "_blank");
  };

  if (sites.length === 1) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ 
          padding: "8px 16px", 
          background: "#f5f5f5", 
          borderRadius: 4,
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 400,
        }}>
          {getSiteName(sites[0])}
        </div>
        <button
          onClick={openPublicPage}
          style={{
            padding: "8px 16px",
            fontSize: "clamp(14px, 3.5vw, 16px)",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            borderRadius: 4,
            border: "1px solid #7c3aed",
            background: "#7c3aed",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: isSmallScreen ? "auto" : "fit-content",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 500,
          }}
          title={t("admin.openPublicPage")}
        >
          <span style={{ fontSize: 18 }}>🌐</span>
          {!isSmallScreen && <span>{t("admin.openPublicPage")}</span>}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select
        value={selectedSiteId || ""}
        onChange={(e) => setSelectedSiteId(e.target.value || null)}
        style={{
          padding: "8px 16px",
          fontSize: 16,
          borderRadius: 4,
          border: "1px solid #ddd",
          background: "white",
          cursor: "pointer",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 400,
        }}
      >
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {getSiteName(site)}
          </option>
        ))}
      </select>
      <button
        onClick={openPublicPage}
        disabled={!currentSite}
        style={{
          padding: "8px 16px",
          fontSize: "clamp(14px, 3.5vw, 16px)",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          borderRadius: 4,
          border: "1px solid #7c3aed",
          background: currentSite ? "#7c3aed" : "#ccc",
          color: "white",
          cursor: currentSite ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          gap: 6,
          minWidth: isSmallScreen ? "auto" : "fit-content",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 500,
        }}
        title={t("admin.openPublicPage")}
      >
        <span style={{ fontSize: 18 }}>🌐</span>
        {!isSmallScreen && <span>{t("admin.openPublicPage")}</span>}
      </button>
    </div>
  );
}


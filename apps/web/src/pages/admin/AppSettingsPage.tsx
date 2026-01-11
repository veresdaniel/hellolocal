// src/pages/admin/AppSettingsPage.tsx
import { useState, useEffect, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../contexts/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAdminTenant } from "../../contexts/AdminTenantContext";
import { useToast } from "../../contexts/ToastContext";
import { getDefaultLanguage, setDefaultLanguage, getMapSettings, setMapSettings, getTowns, getSiteSettings, setSiteSettings, type MapSettings, type SiteSettings } from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { MapComponent } from "../../components/MapComponent";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { isValidImageUrl } from "../../utils/urlValidation";
import { HAS_MULTIPLE_TENANTS } from "../../app/config";

export function AppSettingsPage() {
  const { t } = useTranslation();
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const { selectedTenantId, isLoading: isTenantLoading } = useAdminTenant();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  usePageTitle("admin.appSettings");
  const [defaultLang, setDefaultLangState] = useState<"hu" | "en" | "de">("hu");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Collapse state for sections
  const [languageOpen, setLanguageOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(true);

  // Map settings state
  const [mapSettings, setMapSettingsState] = useState<MapSettings>({
    townId: null,
    lat: null,
    lng: null,
    zoom: null,
  });
  const [towns, setTowns] = useState<Array<{ id: string; lat: number | null; lng: number | null; translations: Array<{ lang: string; name: string }> }>>([]);
  const [isLoadingMapSettings, setIsLoadingMapSettings] = useState(false); // Start as false, will be set to true when loading
  const [isSavingMapSettings, setIsSavingMapSettings] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 47.4979, lng: 19.0402 }); // Default to Budapest
  const [mapZoom, setMapZoom] = useState<number>(13);

  // Site settings state
  const [siteSettings, setSiteSettingsState] = useState<SiteSettings>({
    siteName: { hu: "HelloLocal", en: "HelloLocal", de: "HelloLocal" },
    siteDescription: { hu: "", en: "", de: "" },
    seoTitle: { hu: "", en: "", de: "" },
    seoDescription: { hu: "", en: "", de: "" },
    isCrawlable: true,
    defaultPlaceholderCardImage: null,
    defaultPlaceholderDetailHeroImage: null,
    brandBadgeIcon: null,
    faviconUrl: null,
  });
  const [isLoadingSiteSettings, setIsLoadingSiteSettings] = useState(false); // Start as false, will be set to true when loading
  const [isSavingSiteSettings, setIsSavingSiteSettings] = useState(false);

  useEffect(() => {
    const loadDefaultLanguage = async () => {
    try {
      setIsLoading(true);
      const data = await getDefaultLanguage();
      setDefaultLangState(data.defaultLanguage);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.loadDefaultLanguageFailed"), "error");
    } finally {
      setIsLoading(false);
    }
    };
    loadDefaultLanguage();
  }, [t]);

  useEffect(() => {
    if (!selectedTenantId) {
      // Reset loading states when tenant is cleared
      setIsLoadingMapSettings(false);
      setIsLoadingSiteSettings(false);
      setTowns([]);
      return;
    }
    const loadTowns = async () => {
      try {
        const response = await getTowns(selectedTenantId);
        // Handle paginated response
        setTowns(Array.isArray(response) ? response : (response?.towns || []));
      } catch (err) {
        console.error("Failed to load towns", err);
        setTowns([]); // Set empty array on error
      }
    };
    loadTowns();
  }, [selectedTenantId]);

  useEffect(() => {
    if (!selectedTenantId) {
      // Reset loading state if no tenant
      setIsLoadingMapSettings(false);
      return;
    }
    
    // Wait for towns to load before loading map settings
    // But don't wait indefinitely - if towns array is empty after a delay, still try to load map settings
    const loadMapSettings = async () => {
      try {
        setIsLoadingMapSettings(true);
        const data = await getMapSettings(selectedTenantId);
        setMapSettingsState(data);
        
        // Set map center and zoom from settings
        if (data.lat && data.lng) {
          setMapCenter({ lat: data.lat, lng: data.lng });
        } else if (data.townId && towns.length > 0) {
          // If town is selected, use town coordinates (only if towns are loaded)
          const town = towns.find((t) => t.id === data.townId);
          if (town && town.lat && town.lng) {
            setMapCenter({ lat: town.lat, lng: town.lng });
          }
        }
        
        if (data.zoom !== null) {
          setMapZoom(data.zoom);
        }
      } catch (err) {
        console.error("Failed to load map settings", err);
      } finally {
        setIsLoadingMapSettings(false);
      }
    };
    
    // Load map settings even if towns array is empty (towns might not be required)
    loadMapSettings();
  }, [selectedTenantId, towns]);

  useEffect(() => {
    if (!selectedTenantId) {
      // Reset loading state when tenant is cleared
      setIsLoadingSiteSettings(false);
      return;
    }
    
    const loadSiteSettings = async () => {
      try {
        setIsLoadingSiteSettings(true);
        const data = await getSiteSettings(selectedTenantId);
        // Ensure all fields are properly initialized
        setSiteSettingsState({
          siteName: {
            hu: data.siteName?.hu || "HelloLocal",
            en: data.siteName?.en || "HelloLocal",
            de: data.siteName?.de || "HelloLocal",
          },
          siteDescription: {
            hu: data.siteDescription?.hu || "",
            en: data.siteDescription?.en || "",
            de: data.siteDescription?.de || "",
          },
          seoTitle: {
            hu: data.seoTitle?.hu || "",
            en: data.seoTitle?.en || "",
            de: data.seoTitle?.de || "",
          },
          seoDescription: {
            hu: data.seoDescription?.hu || "",
            en: data.seoDescription?.en || "",
            de: data.seoDescription?.de || "",
          },
          isCrawlable: data.isCrawlable ?? true,
          defaultPlaceholderCardImage: data.defaultPlaceholderCardImage ?? null,
          defaultPlaceholderDetailHeroImage: data.defaultPlaceholderDetailHeroImage ?? null,
          brandBadgeIcon: data.brandBadgeIcon ?? null,
          faviconUrl: data.faviconUrl ?? null,
        });
      } catch (err) {
        console.error("Failed to load site settings", err);
        // Keep default values on error
      } finally {
        setIsLoadingSiteSettings(false);
      }
    };
    loadSiteSettings();
  }, [selectedTenantId]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await setDefaultLanguage(defaultLang);
      showToast(t("admin.errors.defaultLanguageUpdated"), "success");
      // Reload the page after a short delay to apply the new default language
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updateDefaultLanguageFailed"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMapLocationChange = (lat: number, lng: number) => {
    setMapCenter({ lat, lng });
    setMapSettingsState((prev) => ({ ...prev, lat, lng }));
  };

  const handleMapZoomChange = (zoom: number) => {
    setMapZoom(zoom);
    setMapSettingsState((prev) => ({ ...prev, zoom }));
  };

  const handleTownChange = (townId: string | null) => {
    setMapSettingsState((prev) => ({ ...prev, townId }));
    if (townId) {
      const town = towns.find((t) => t.id === townId);
      if (town && town.lat && town.lng) {
        setMapCenter({ lat: town.lat, lng: town.lng });
        setMapSettingsState((prev) => ({ ...prev, lat: town.lat, lng: town.lng }));
      }
    }
  };

  const handleSaveMapSettings = async () => {
    if (!selectedTenantId) return;
    try {
      setIsSavingMapSettings(true);
      await setMapSettings({
        tenantId: selectedTenantId,
        townId: mapSettings.townId,
        lat: mapSettings.lat,
        lng: mapSettings.lng,
        zoom: mapSettings.zoom,
      });
      
      // Invalidate React Query cache for map settings to refresh on public pages
      await queryClient.invalidateQueries({ queryKey: ["mapSettings"] });
      // Notify global cache manager that map settings have changed
      notifyEntityChanged("mapSettings");
      
      showToast(t("admin.mapSettingsUpdated"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updateMapSettingsFailed"), "error");
    } finally {
      setIsSavingMapSettings(false);
    }
  };

  const handleSaveSiteSettings = async () => {
    try {
      setIsSavingSiteSettings(true);
      
      // Validate image URLs before saving
      if (siteSettings.defaultPlaceholderCardImage && !isValidImageUrl(siteSettings.defaultPlaceholderCardImage)) {
        showToast(t("admin.validation.invalidImageUrl"), "error");
        setIsSavingSiteSettings(false);
        return;
      }
      if (siteSettings.defaultPlaceholderDetailHeroImage && !isValidImageUrl(siteSettings.defaultPlaceholderDetailHeroImage)) {
        showToast(t("admin.validation.invalidImageUrl"), "error");
        setIsSavingSiteSettings(false);
        return;
      }
      if (siteSettings.brandBadgeIcon && !isValidImageUrl(siteSettings.brandBadgeIcon)) {
        showToast(t("admin.validation.invalidImageUrl"), "error");
        setIsSavingSiteSettings(false);
        return;
      }
      if (siteSettings.faviconUrl && !isValidImageUrl(siteSettings.faviconUrl)) {
        showToast(t("admin.validation.invalidImageUrl"), "error");
        setIsSavingSiteSettings(false);
        return;
      }
      
      if (!selectedTenantId) {
        showToast(t("admin.errors.noTenantSelected"), "error");
        return;
      }
      
      const updated = await setSiteSettings({
        tenantId: selectedTenantId,
        siteName: siteSettings.siteName,
        siteDescription: siteSettings.siteDescription,
        seoTitle: siteSettings.seoTitle,
        seoDescription: siteSettings.seoDescription,
        isCrawlable: siteSettings.isCrawlable,
        defaultPlaceholderCardImage: siteSettings.defaultPlaceholderCardImage,
        defaultPlaceholderDetailHeroImage: siteSettings.defaultPlaceholderDetailHeroImage,
        brandBadgeIcon: siteSettings.brandBadgeIcon,
        faviconUrl: siteSettings.faviconUrl,
      });
      
      // Update local state with the response, ensuring all fields are properly initialized
      // Use the exact values from the response, not defaults
      const newState = {
        siteName: {
          hu: updated.siteName?.hu ?? "HelloLocal",
          en: updated.siteName?.en ?? "HelloLocal",
          de: updated.siteName?.de ?? "HelloLocal",
        },
        siteDescription: {
          hu: updated.siteDescription?.hu ?? "",
          en: updated.siteDescription?.en ?? "",
          de: updated.siteDescription?.de ?? "",
        },
        seoTitle: {
          hu: updated.seoTitle?.hu ?? "",
          en: updated.seoTitle?.en ?? "",
          de: updated.seoTitle?.de ?? "",
        },
        seoDescription: {
          hu: updated.seoDescription?.hu ?? "",
          en: updated.seoDescription?.en ?? "",
          de: updated.seoDescription?.de ?? "",
        },
        isCrawlable: updated.isCrawlable ?? true,
        defaultPlaceholderCardImage: updated.defaultPlaceholderCardImage ?? null,
        defaultPlaceholderDetailHeroImage: updated.defaultPlaceholderDetailHeroImage ?? null,
        brandBadgeIcon: updated.brandBadgeIcon ?? null,
        faviconUrl: updated.faviconUrl ?? null,
      };
      setSiteSettingsState(newState);
      
      // Invalidate React Query cache to refresh site settings on public pages
      // Invalidate all siteSettings queries regardless of language/tenant - this will automatically refetch active queries
      await queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
      // Also explicitly refetch all active siteSettings queries to ensure immediate update
      await queryClient.refetchQueries({ queryKey: ["siteSettings"] });
      // Notify global cache manager that site settings have changed (triggers event listeners in Footer, Header, etc.)
      notifyEntityChanged("siteSettings");
      
      // Note: Site settings don't affect places data, so we don't need to invalidate places cache
      // But if you want to force a refresh of the map view, you can uncomment this:
      // await queryClient.invalidateQueries({ queryKey: ["places"] });
      
      showToast(t("admin.siteSettingsUpdated"), "success");
    } catch (err) {
      console.error('[AppSettingsPage] Error saving site settings:', err);
      showToast(err instanceof Error ? err.message : t("admin.errors.updateSiteSettingsFailed"), "error");
    } finally {
      setIsSavingSiteSettings(false);
    }
  };

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isSingleTown = towns.length <= 1;

  // Wait for tenant context to initialize
  if (isTenantLoading && HAS_MULTIPLE_TENANTS) {
    return <LoadingSpinner isLoading={true} />;
  }

  // Show message if no tenant is selected (but allow language settings which don't need tenant)
  if (!selectedTenantId && HAS_MULTIPLE_TENANTS) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1 style={{ marginBottom: 32, fontSize: 32, fontWeight: 700 }}>{t("admin.appSettings")}</h1>
        <div style={{ padding: 24, background: "white", borderRadius: 12, border: "1px solid #e0e0e0" }}>
          <p style={{ color: "#666", fontSize: 16, margin: 0 }}>{t("admin.table.pleaseSelectTenant")}</p>
        </div>
        
        {/* Language Settings Section - available without tenant */}
        <div style={{ marginTop: 24, marginBottom: 24, background: "white", borderRadius: 12, border: "1px solid #e0e0e0", overflow: "hidden" }}>
          <button
            onClick={() => setLanguageOpen(!languageOpen)}
            style={{
              width: "100%",
              padding: 24,
              background: languageOpen ? "#f8f9fa" : "white",
              border: "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>🌍</span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{t("admin.defaultLanguage")}</h2>
            </div>
            <span style={{ fontSize: 20, color: "#666", transition: "transform 0.2s", transform: languageOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
          </button>
          {languageOpen && (
            <div style={{ padding: 24, borderTop: "1px solid #e0e0e0" }}>
              <p style={{ color: "#666", marginBottom: 24, fontSize: 15 }}>
                {t("admin.defaultLanguageDescription")}
              </p>

              <LoadingSpinner isLoading={isLoading} />
              {!isLoading && (
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                  <label style={{ display: "block", minWidth: 150, fontWeight: 500 }}>{t("admin.defaultLanguage")}:</label>
                  <select
                    value={defaultLang}
                    onChange={(e) => setDefaultLangState(e.target.value as "hu" | "en" | "de")}
                    disabled={!isAdmin || isSaving}
                    style={{
                      padding: "10px 16px",
                      fontSize: 15,
                      borderRadius: 6,
                      border: "1px solid #ddd",
                      background: "white",
                      cursor: isAdmin && !isSaving ? "pointer" : "not-allowed",
                      minWidth: 200,
                    }}
                  >
                    <option value="hu">🇭🇺 {t("admin.languageNames.hu")}</option>
                    <option value="en">🇬🇧 {t("admin.languageNames.en")}</option>
                    <option value="de">🇩🇪 {t("admin.languageNames.de")}</option>
                  </select>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      style={{
                        padding: "10px 24px",
                        fontSize: 15,
                        fontWeight: 500,
                        background: isSaving ? "#999" : "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor: isSaving ? "not-allowed" : "pointer",
                      }}
                    >
                      {isSaving ? t("common.loading") : t("common.save")}
                    </button>
                  )}
                </div>
              )}

              {!isAdmin && (
                <div style={{ padding: 12, background: "#fff3cd", color: "#856404", borderRadius: 6, marginTop: 16 }}>
                  {t("admin.onlyAdminCanEdit")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: "clamp(24px, 5vw, 32px)" }}>
        <h1 style={{ 
          fontSize: "clamp(20px, 4vw, 28px)",
          fontWeight: 700,
          color: "#e0e0ff",
          margin: 0,
          marginBottom: 8,
          textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        }}>
          {t("admin.appSettings")}
        </h1>
        <p style={{ 
          fontSize: "clamp(13px, 3vw, 14px)",
          color: "#c0c0d0",
          margin: 0,
          textShadow: "0 1px 4px rgba(0, 0, 0, 0.2)",
        }}>
          {t("admin.appSettingsDesc")}
        </p>
      </div>

      {/* Language Settings Section */}
      <div style={{ marginBottom: 24, background: "white", borderRadius: 12, border: "1px solid #e0e0e0", overflow: "hidden" }}>
        <button
          onClick={() => setLanguageOpen(!languageOpen)}
          style={{
            width: "100%",
            padding: 24,
            background: languageOpen ? "#f8f9fa" : "white",
            border: "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>🌍</span>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{t("admin.defaultLanguage")}</h2>
          </div>
          <span style={{ fontSize: 20, color: "#666", transition: "transform 0.2s", transform: languageOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
        </button>
        {languageOpen && (
          <div style={{ padding: 24, borderTop: "1px solid #e0e0e0" }}>
            <p style={{ color: "#666", marginBottom: 24, fontSize: 15 }}>
              {t("admin.defaultLanguageDescription")}
            </p>

            <LoadingSpinner isLoading={isLoading} />
            {!isLoading && (
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                <label style={{ display: "block", minWidth: 150, fontWeight: 500 }}>{t("admin.defaultLanguage")}:</label>
                <select
                  value={defaultLang}
                  onChange={(e) => setDefaultLangState(e.target.value as "hu" | "en" | "de")}
                  disabled={!isAdmin || isSaving}
                  style={{
                    padding: "12px 16px",
                    fontSize: 15,
                    borderRadius: 8,
                    border: "2px solid #e0e7ff",
                    background: "white",
                    cursor: isAdmin && !isSaving ? "pointer" : "not-allowed",
                    minWidth: 200,
                    boxSizing: "border-box",
                    transition: "all 0.2s ease",
                    outline: "none",
                  }}
                >
                  <option value="hu">🇭🇺 {t("admin.languageNames.hu")}</option>
                  <option value="en">🇬🇧 {t("admin.languageNames.en")}</option>
                  <option value="de">🇩🇪 {t("admin.languageNames.de")}</option>
                </select>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                      padding: "10px 24px",
                      fontSize: 15,
                      fontWeight: 500,
                      background: isSaving ? "#999" : "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: isSaving ? "not-allowed" : "pointer",
                    }}
                  >
                    {isSaving ? t("common.loading") : t("common.save")}
                  </button>
                )}
              </div>
            )}

            {!isAdmin && (
              <div style={{ padding: 12, background: "#fff3cd", color: "#856404", borderRadius: 6, marginTop: 16 }}>
                {t("admin.onlyAdminCanEdit")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map Settings Section */}
      {selectedTenantId && (
        <div style={{ marginBottom: 24, background: "white", borderRadius: 12, border: "1px solid #e0e0e0", overflow: "hidden" }}>
          <button
            onClick={() => setMapOpen(!mapOpen)}
            style={{
              width: "100%",
              padding: 24,
              background: mapOpen ? "#f8f9fa" : "white",
              border: "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>🗺️</span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{t("admin.mapSettings")}</h2>
            </div>
            <span style={{ fontSize: 20, color: "#666", transition: "transform 0.2s", transform: mapOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
          </button>
          {mapOpen && (
            <div style={{ padding: 24, borderTop: "1px solid #e0e0e0" }}>
              <p style={{ color: "#666", marginBottom: 24, fontSize: 15 }}>
                {t("admin.mapSettingsDescription")}
              </p>

              <LoadingSpinner isLoading={isLoadingMapSettings} />
          {!isLoadingMapSettings && (
            <>
              {/* Town selector - only if multiple towns exist */}
              {towns.length > 1 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    {t("admin.defaultTown")}:
                  </label>
                  <select
                    value={mapSettings.townId || ""}
                    onChange={(e) => handleTownChange(e.target.value || null)}
                    disabled={!isAdmin || isSavingMapSettings}
                    style={{
                      padding: "12px 16px",
                      fontSize: 15,
                      borderRadius: 8,
                      border: "2px solid #e0e7ff",
                      background: "white",
                      cursor: isAdmin && !isSavingMapSettings ? "pointer" : "not-allowed",
                      minWidth: 200,
                      width: "100%",
                      boxSizing: "border-box",
                      transition: "all 0.2s ease",
                      outline: "none",
                    }}
                  >
                    <option value="">{t("admin.noTownSelected")}</option>
                    {towns.map((town: { id: string; translations: Array<{ lang: string; name: string }> }) => {
                      const name = town.translations.find((t: { lang: string; name: string }) => t.lang === "hu")?.name || town.translations[0]?.name || town.id;
                      return (
                        <option key={town.id} value={town.id}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Map for visual position and zoom setting */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  {t("admin.mapPositionAndZoom")}:
                </label>
                <div style={{ border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}>
                  <MapComponent
                    latitude={mapCenter.lat}
                    longitude={mapCenter.lng}
                    onLocationChange={handleMapLocationChange}
                    onZoomChange={handleMapZoomChange}
                    height={400}
                    interactive={isAdmin && !isSavingMapSettings}
                    defaultZoom={mapZoom}
                    mapStyle="default"
                  />
                </div>
                <p style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                  {t("admin.mapSettingsHint")}
                </p>
              </div>

              {/* Zoom input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  {t("admin.mapZoom")}:
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="0.5"
                  value={mapZoom}
                  onChange={(e) => {
                    const zoom = parseFloat(e.target.value) || 13;
                    setMapZoom(zoom);
                    setMapSettingsState((prev) => ({ ...prev, zoom }));
                  }}
                  disabled={!isAdmin || isSavingMapSettings}
                  style={{
                    padding: "12px 16px",
                    fontSize: 15,
                    borderRadius: 8,
                    border: "2px solid #e0e7ff",
                    background: "white",
                    width: "100%",
                    maxWidth: 200,
                    boxSizing: "border-box",
                    transition: "all 0.2s ease",
                    outline: "none",
                  }}
                />
                <p style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                  {isSingleTown && towns.length > 0
                    ? t("admin.singleTownHighZoomHint")
                    : t("admin.mapZoomHint")}
                </p>
              </div>

              {/* Coordinates display */}
              <div style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 12, color: "#666" }}>
                    {t("admin.latitude")}:
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={mapSettings.lat ?? ""}
                    onChange={(e) => {
                      const lat = e.target.value ? parseFloat(e.target.value) : null;
                      setMapCenter((prev) => ({ ...prev, lat: lat ?? prev.lat }));
                      setMapSettingsState((prev) => ({ ...prev, lat }));
                    }}
                    disabled={!isAdmin || isSavingMapSettings}
                    style={{
                      padding: "12px 16px",
                      fontSize: 15,
                      borderRadius: 8,
                      border: "2px solid #e0e7ff",
                      background: "white",
                      width: "100%",
                      boxSizing: "border-box",
                      transition: "all 0.2s ease",
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 12, color: "#666" }}>
                    {t("admin.longitude")}:
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={mapSettings.lng ?? ""}
                    onChange={(e) => {
                      const lng = e.target.value ? parseFloat(e.target.value) : null;
                      setMapCenter((prev) => ({ ...prev, lng: lng ?? prev.lng }));
                      setMapSettingsState((prev) => ({ ...prev, lng }));
                    }}
                    disabled={!isAdmin || isSavingMapSettings}
                    style={{
                      padding: "12px 16px",
                      fontSize: 15,
                      borderRadius: 8,
                      border: "2px solid #e0e7ff",
                      background: "white",
                      width: "100%",
                      boxSizing: "border-box",
                      transition: "all 0.2s ease",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleSaveMapSettings}
                  disabled={isSavingMapSettings}
                  style={{
                    padding: "12px 24px",
                    fontSize: 15,
                    fontWeight: 600,
                    background: isSavingMapSettings ? "#ccc" : "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: isSavingMapSettings ? "not-allowed" : "pointer",
                    boxShadow: isSavingMapSettings ? "none" : "0 4px 12px rgba(40, 167, 69, 0.3)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSavingMapSettings) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(40, 167, 69, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSavingMapSettings) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(40, 167, 69, 0.3)";
                    }
                  }}
                >
                  {isSavingMapSettings ? t("common.loading") : t("common.save")}
                </button>
              )}

              {!isAdmin && (
                <div style={{ padding: 12, background: "#fff3cd", color: "#856404", borderRadius: 6, marginTop: 16 }}>
                  {t("admin.onlyAdminCanEdit")}
                </div>
              )}
            </>
          )}
          </div>
        )}
      </div>
      )}

      {/* Site Settings Section */}
      <div style={{ marginBottom: 24, background: "white", borderRadius: 12, border: "1px solid #e0e0e0", overflow: "hidden" }}>
        <button
          onClick={() => setSiteOpen(!siteOpen)}
          style={{
            width: "100%",
            padding: 24,
            background: siteOpen ? "#f8f9fa" : "white",
            border: "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>⚙️</span>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{t("admin.siteSettings")}</h2>
          </div>
          <span style={{ fontSize: 20, color: "#666", transition: "transform 0.2s", transform: siteOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
        </button>
        {siteOpen && (
          <div style={{ padding: 24, borderTop: "1px solid #e0e0e0" }}>
            <p style={{ color: "#666", marginBottom: 24, fontSize: 15 }}>
              {t("admin.siteSettingsDescription")}
            </p>

            <LoadingSpinner isLoading={isLoadingSiteSettings} />
        {!isLoadingSiteSettings && (
          <>
            <LanguageAwareForm>
              {(selectedLang) => (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                      {t("admin.siteName")} ({selectedLang.toUpperCase()}) *:
                    </label>
                    <input
                      type="text"
                      value={
                        selectedLang === "hu"
                          ? siteSettings.siteName.hu
                          : selectedLang === "en"
                          ? siteSettings.siteName.en
                          : siteSettings.siteName.de
                      }
                      onChange={(e) => {
                        if (selectedLang === "hu") {
                          setSiteSettingsState((prev) => ({
                            ...prev,
                            siteName: { ...prev.siteName, hu: e.target.value },
                          }));
                        } else if (selectedLang === "en") {
                          setSiteSettingsState((prev) => ({
                            ...prev,
                            siteName: { ...prev.siteName, en: e.target.value },
                          }));
                        } else {
                          setSiteSettingsState((prev) => ({
                            ...prev,
                            siteName: { ...prev.siteName, de: e.target.value },
                          }));
                        }
                      }}
                      disabled={!isAdmin || isSavingSiteSettings}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: 15,
                        borderRadius: 8,
                        border: "2px solid #e0e7ff",
                        background: "white",
                        cursor: isAdmin && !isSavingSiteSettings ? "text" : "not-allowed",
                        boxSizing: "border-box",
                        transition: "all 0.2s ease",
                        outline: "none",
                      }}
                      placeholder={t("admin.siteNamePlaceholder")}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                      {t("admin.siteDescription")} ({selectedLang.toUpperCase()}):

                    </label>
                    <textarea
                      value={
                        selectedLang === "hu"
                          ? siteSettings.siteDescription?.hu || ""
                          : selectedLang === "en"
                          ? siteSettings.siteDescription?.en || ""
                          : siteSettings.siteDescription?.de || ""
                      }
                      onChange={(e) => {
                        if (selectedLang === "hu") {
                          setSiteSettingsState((prev) => ({
                            ...prev,
                            siteDescription: { ...prev.siteDescription, hu: e.target.value },
                          }));
                        } else if (selectedLang === "en") {
                          setSiteSettingsState((prev) => ({
                            ...prev,
                            siteDescription: { ...prev.siteDescription, en: e.target.value },
                          }));
                        } else {
                          setSiteSettingsState((prev) => ({
                            ...prev,
                            siteDescription: { ...prev.siteDescription, de: e.target.value },
                          }));
                        }
                      }}
                      disabled={!isAdmin || isSavingSiteSettings}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: 15,
                        borderRadius: 8,
                        border: "2px solid #e0e7ff",
                        background: "white",
                        cursor: isAdmin && !isSavingSiteSettings ? "text" : "not-allowed",
                        minHeight: 100,
                        resize: "vertical",
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                        transition: "all 0.2s ease",
                        outline: "none",
                      }}
                      placeholder={t("admin.siteDescriptionPlaceholder")}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                      {t("admin.seoTitle")} ({selectedLang.toUpperCase()}):

                    </label>
                    <input
                      type="text"
                      value={
                        selectedLang === "hu"
                          ? siteSettings.seoTitle?.hu || ""
                          : selectedLang === "en"
                          ? siteSettings.seoTitle?.en || ""
                          : siteSettings.seoTitle?.de || ""
                      }
                      onChange={(e) => {
                        if (selectedLang === "hu") {
                          setSiteSettingsState((prev) => ({
                            ...prev,
                            seoTitle: { ...prev.seoTitle, hu: e.target.value },
                          }));
                        } else if (selectedLang === "en") {
                          setSiteSettingsState((prev) => ({
                            ...prev,
                            seoTitle: { ...prev.seoTitle, en: e.target.value },
                          }));
                        } else {
                          setSiteSettingsState((prev) => ({
                            ...prev,
                            seoTitle: { ...prev.seoTitle, de: e.target.value },
                          }));
                        }
                      }}
                      disabled={!isAdmin || isSavingSiteSettings}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: 15,
                        borderRadius: 8,
                        border: "2px solid #e0e7ff",
                        background: "white",
                        cursor: isAdmin && !isSavingSiteSettings ? "text" : "not-allowed",
                        boxSizing: "border-box",
                        transition: "all 0.2s ease",
                        outline: "none",
                      }}
                      placeholder={t("admin.seoTitlePlaceholder")}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                      {t("admin.seoDescription")} ({selectedLang.toUpperCase()}):

                    </label>
                    <textarea
                      value={
                        selectedLang === "hu"
                          ? siteSettings.seoDescription?.hu || ""
                          : selectedLang === "en"
                          ? siteSettings.seoDescription?.en || ""
                          : siteSettings.seoDescription?.de || ""
                      }
                      onChange={(e) => {
                        if (selectedLang === "hu") {
                          setSiteSettingsState((prev) => ({
                            ...prev,
                            seoDescription: { ...prev.seoDescription, hu: e.target.value },
                          }));
                        } else if (selectedLang === "en") {
                          setSiteSettingsState((prev) => ({
                            ...prev,
                            seoDescription: { ...prev.seoDescription, en: e.target.value },
                          }));
                        } else {
                          setSiteSettingsState((prev) => ({
                            ...prev,
                            seoDescription: { ...prev.seoDescription, de: e.target.value },
                          }));
                        }
                      }}
                      disabled={!isAdmin || isSavingSiteSettings}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: 15,
                        borderRadius: 8,
                        border: "2px solid #e0e7ff",
                        background: "white",
                        cursor: isAdmin && !isSavingSiteSettings ? "text" : "not-allowed",
                        minHeight: 100,
                        resize: "vertical",
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                        transition: "all 0.2s ease",
                        outline: "none",
                      }}
                      placeholder={t("admin.seoDescriptionPlaceholder")}
                    />
                  </div>
                </>
              )}
            </LanguageAwareForm>

            {/* Crawlable setting - not language-specific */}
            <div style={{ marginBottom: 16, marginTop: 24, paddingTop: 24, borderTop: "1px solid #e0e0e0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={siteSettings.isCrawlable}
                  onChange={(e) => {
                    setSiteSettingsState((prev) => ({
                      ...prev,
                      isCrawlable: e.target.checked,
                    }));
                  }}
                  disabled={!isAdmin || isSavingSiteSettings}
                  style={{
                    width: 18,
                    height: 18,
                    cursor: isAdmin && !isSavingSiteSettings ? "pointer" : "not-allowed",
                  }}
                />
                {t("admin.isCrawlable")}
              </label>
              <p style={{ color: "#666", fontSize: 14, marginTop: 8, marginLeft: 26 }}>
                {t("admin.isCrawlableDescription")}
              </p>
            </div>

            {/* Default Placeholder Images */}
            <div style={{ marginBottom: 16, marginTop: 24, paddingTop: 24, borderTop: "1px solid #e0e0e0" }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
                {t("admin.defaultPlaceholderImages") || "Default Placeholder Images"}
              </h3>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  {t("admin.defaultPlaceholderCardImage") || "Default Placeholder Card Image"}
                </label>
                <input
                  type="text"
                  value={siteSettings.defaultPlaceholderCardImage || ""}
                  onChange={(e) => {
                    const value = e.target.value.trim() || null;
                    setSiteSettingsState((prev) => ({
                      ...prev,
                      defaultPlaceholderCardImage: value,
                    }));
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && !isValidImageUrl(value)) {
                      setError(t("admin.validation.invalidImageUrl"));
                    }
                  }}
                  disabled={!isAdmin || isSavingSiteSettings}
                  placeholder={t("admin.imageUrlPlaceholder")}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 15,
                    border: "2px solid #e0e7ff",
                    borderRadius: 8,
                    boxSizing: "border-box",
                    transition: "all 0.2s ease",
                    outline: "none",
                  }}
                />
                <p style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                  {t("admin.defaultPlaceholderCardImageDescription") || "Used for place cards when no image is set"}
                </p>
                {siteSettings.defaultPlaceholderCardImage && !isValidImageUrl(siteSettings.defaultPlaceholderCardImage) && (
                  <p style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>
                    {t("admin.validation.invalidImageUrl")}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  {t("admin.defaultPlaceholderDetailHeroImage") || "Default Placeholder Detail Hero Image"}
                </label>
                <input
                  type="text"
                  value={siteSettings.defaultPlaceholderDetailHeroImage || ""}
                  onChange={(e) => {
                    const value = e.target.value.trim() || null;
                    setSiteSettingsState((prev) => ({
                      ...prev,
                      defaultPlaceholderDetailHeroImage: value,
                    }));
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && !isValidImageUrl(value)) {
                      setError(t("admin.validation.invalidImageUrl"));
                    }
                  }}
                  disabled={!isAdmin || isSavingSiteSettings}
                  placeholder={t("admin.imageUrlPlaceholder")}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 15,
                    border: "2px solid #e0e7ff",
                    borderRadius: 8,
                    boxSizing: "border-box",
                    transition: "all 0.2s ease",
                    outline: "none",
                  }}
                />
                <p style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                  {t("admin.defaultPlaceholderDetailHeroImageDescription") || "Used for place detail pages when no hero image is set"}
                </p>
                {siteSettings.defaultPlaceholderDetailHeroImage && !isValidImageUrl(siteSettings.defaultPlaceholderDetailHeroImage) && (
                  <p style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>
                    {t("admin.validation.invalidImageUrl")}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  {t("admin.brandBadgeIcon") || "Brand Badge Icon"}
                </label>
                <input
                  type="text"
                  value={siteSettings.brandBadgeIcon || ""}
                  onChange={(e) => {
                    const value = e.target.value.trim() || null;
                    setSiteSettingsState((prev) => ({
                      ...prev,
                      brandBadgeIcon: value,
                    }));
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && !isValidImageUrl(value)) {
                      setError(t("admin.validation.invalidImageUrl"));
                    }
                  }}
                  disabled={!isAdmin || isSavingSiteSettings}
                  placeholder={t("admin.imageUrlPlaceholder")}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 15,
                    border: "2px solid #e0e7ff",
                    borderRadius: 8,
                    boxSizing: "border-box",
                    transition: "all 0.2s ease",
                    outline: "none",
                  }}
                />
                <p style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                  {t("admin.brandBadgeIconDescription") || "Icon displayed in the brand badge on public pages"}
                </p>
                {siteSettings.brandBadgeIcon && !isValidImageUrl(siteSettings.brandBadgeIcon) && (
                  <p style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>
                    {t("admin.validation.invalidImageUrl")}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  {t("admin.faviconUrl") || "Favicon URL"}
                </label>
                <input
                  type="text"
                  value={siteSettings.faviconUrl || ""}
                  onChange={(e) => {
                    const value = e.target.value.trim() || null;
                    setSiteSettingsState((prev) => ({
                      ...prev,
                      faviconUrl: value,
                    }));
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && !isValidImageUrl(value)) {
                      setError(t("admin.validation.invalidImageUrl"));
                    }
                  }}
                  disabled={!isAdmin || isSavingSiteSettings}
                  placeholder={t("admin.imageUrlPlaceholder")}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 15,
                    border: "2px solid #e0e7ff",
                    borderRadius: 8,
                    boxSizing: "border-box",
                    transition: "all 0.2s ease",
                    outline: "none",
                  }}
                />
                <p style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                  {t("admin.faviconUrlDescription") || "Favicon displayed in browser tabs (recommended: 32x32px or 16x16px .ico, .png)"}
                </p>
                {siteSettings.faviconUrl && !isValidImageUrl(siteSettings.faviconUrl) && (
                  <p style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>
                    {t("admin.validation.invalidImageUrl")}
                  </p>
                )}
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={handleSaveSiteSettings}
                disabled={isSavingSiteSettings}
                style={{
                  padding: "12px 24px",
                  fontSize: 15,
                  fontWeight: 600,
                  background: isSavingSiteSettings ? "#ccc" : "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: isSavingSiteSettings ? "not-allowed" : "pointer",
                  marginTop: 16,
                  boxShadow: isSavingSiteSettings ? "none" : "0 4px 12px rgba(40, 167, 69, 0.3)",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSavingSiteSettings) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(40, 167, 69, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSavingSiteSettings) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(40, 167, 69, 0.3)";
                  }
                }}
              >
                {isSavingSiteSettings ? t("common.loading") : t("common.save")}
              </button>
            )}

            {!isAdmin && (
              <div style={{ padding: 12, background: "#fff3cd", color: "#856404", borderRadius: 6, marginTop: 16 }}>
                {t("admin.onlyAdminCanEdit")}
              </div>
            )}
          </>
        )}
          </div>
        )}
      </div>
    </div>
  );
}


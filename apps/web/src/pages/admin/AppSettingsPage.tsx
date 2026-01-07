// src/pages/admin/AppSettingsPage.tsx
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAdminTenant } from "../../contexts/AdminTenantContext";
import { getDefaultLanguage, setDefaultLanguage, getMapSettings, setMapSettings, getTowns, getSiteSettings, setSiteSettings, type MapSettings, type SiteSettings } from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { MapComponent } from "../../components/MapComponent";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";

export function AppSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { selectedTenantId, tenants } = useAdminTenant();
  const queryClient = useQueryClient();
  usePageTitle("admin.appSettings");
  const [defaultLang, setDefaultLangState] = useState<"hu" | "en" | "de">("hu");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Map settings state
  const [mapSettings, setMapSettingsState] = useState<MapSettings>({
    townId: null,
    lat: null,
    lng: null,
    zoom: null,
  });
  const [towns, setTowns] = useState<Array<{ id: string; lat: number | null; lng: number | null; translations: Array<{ lang: string; name: string }> }>>([]);
  const [isLoadingMapSettings, setIsLoadingMapSettings] = useState(true);
  const [isSavingMapSettings, setIsSavingMapSettings] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 47.4979, lng: 19.0402 }); // Default to Budapest
  const [mapZoom, setMapZoom] = useState<number>(13);

  // Site settings state
  const [siteSettings, setSiteSettingsState] = useState<SiteSettings>({
    siteName: { hu: "HelloLocal", en: "HelloLocal", de: "HelloLocal" },
    siteDescription: { hu: "", en: "", de: "" },
    seoTitle: { hu: "", en: "", de: "" },
    seoDescription: { hu: "", en: "", de: "" },
  });
  const [isLoadingSiteSettings, setIsLoadingSiteSettings] = useState(true);
  const [isSavingSiteSettings, setIsSavingSiteSettings] = useState(false);

  useEffect(() => {
    const loadDefaultLanguage = async () => {
    try {
      setIsLoading(true);
      const data = await getDefaultLanguage();
      setDefaultLangState(data.defaultLanguage);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadDefaultLanguageFailed"));
    } finally {
      setIsLoading(false);
    }
    };
    loadDefaultLanguage();
  }, [t]);

  useEffect(() => {
    if (!selectedTenantId) return;
    const loadTowns = async () => {
      try {
        const data = await getTowns(selectedTenantId);
        setTowns(data);
      } catch (err) {
        console.error("Failed to load towns", err);
      }
    };
    loadTowns();
  }, [selectedTenantId]);

  useEffect(() => {
    if (!selectedTenantId || towns.length === 0) return;
    const loadMapSettings = async () => {
      try {
        setIsLoadingMapSettings(true);
        const data = await getMapSettings(selectedTenantId);
        setMapSettingsState(data);
        
        // Set map center and zoom from settings
        if (data.lat && data.lng) {
          setMapCenter({ lat: data.lat, lng: data.lng });
        } else if (data.townId) {
          // If town is selected, use town coordinates
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
    loadMapSettings();
  }, [selectedTenantId, towns]);

  useEffect(() => {
    const loadSiteSettings = async () => {
      try {
        setIsLoadingSiteSettings(true);
        const data = await getSiteSettings();
        setSiteSettingsState(data);
      } catch (err) {
        console.error("Failed to load site settings", err);
      } finally {
        setIsLoadingSiteSettings(false);
      }
    };
    loadSiteSettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      await setDefaultLanguage(defaultLang);
      setSuccess(t("admin.errors.defaultLanguageUpdated"));
      // Reload the page after a short delay to apply the new default language
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateDefaultLanguageFailed"));
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
      setError(null);
      setSuccess(null);
      await setMapSettings({
        tenantId: selectedTenantId,
        townId: mapSettings.townId,
        lat: mapSettings.lat,
        lng: mapSettings.lng,
        zoom: mapSettings.zoom,
      });
      
      // Invalidate React Query cache for map settings to refresh on public pages
      await queryClient.invalidateQueries({ queryKey: ["mapSettings"] });
      
      setSuccess(t("admin.mapSettingsUpdated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateMapSettingsFailed"));
    } finally {
      setIsSavingMapSettings(false);
    }
  };

  const handleSaveSiteSettings = async () => {
    try {
      setIsSavingSiteSettings(true);
      setError(null);
      setSuccess(null);
      const updated = await setSiteSettings({
        siteName: siteSettings.siteName,
        siteDescription: siteSettings.siteDescription,
        seoTitle: siteSettings.seoTitle,
        seoDescription: siteSettings.seoDescription,
      });
      
      // Update local state with the response
      setSiteSettingsState(updated);
      
      // Invalidate React Query cache for all languages to refresh site settings on public pages
      await queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
      
      setSuccess(t("admin.siteSettingsUpdated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateSiteSettingsFailed"));
    } finally {
      setIsSavingSiteSettings(false);
    }
  };

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isSingleTown = towns.length <= 1;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>{t("admin.appSettings")}</h1>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: 12, marginBottom: 16, background: "#dfd", color: "#060", borderRadius: 4 }}>
          {success}
        </div>
      )}

      <div style={{ padding: 24, background: "#f5f5f5", borderRadius: 8 }}>
        <h2 style={{ marginBottom: 16 }}>{t("admin.defaultLanguage")}</h2>
        <p style={{ color: "#666", marginBottom: 16 }}>
          {t("admin.defaultLanguageDescription")}
        </p>

        <LoadingSpinner isLoading={isLoading} />
        {!isLoading && (
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <label style={{ display: "block", minWidth: 150 }}>{t("admin.defaultLanguage")}:</label>
            <select
              value={defaultLang}
              onChange={(e) => setDefaultLangState(e.target.value as "hu" | "en" | "de")}
              disabled={!isAdmin || isSaving}
              style={{
                padding: "8px 16px",
                fontSize: 16,
                borderRadius: 4,
                border: "1px solid #ddd",
                background: "white",
                cursor: isAdmin && !isSaving ? "pointer" : "not-allowed",
                minWidth: 200,
              }}
            >
              <option value="hu">🇭🇺 Hungarian (Magyar)</option>
              <option value="en">🇬🇧 English</option>
              <option value="de">🇩🇪 German (Deutsch)</option>
            </select>
            {isAdmin && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  padding: "8px 24px",
                  fontSize: 16,
                  background: isSaving ? "#999" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: isSaving ? "not-allowed" : "pointer",
                }}
              >
                {isSaving ? t("common.loading") : t("common.save")}
              </button>
            )}
          </div>
        )}

        {!isAdmin && (
          <div style={{ padding: 12, background: "#fff3cd", color: "#856404", borderRadius: 4, marginTop: 16 }}>
            {t("admin.onlyAdminCanEdit")}
          </div>
        )}
      </div>

      {/* Map Settings */}
      {selectedTenantId && (
        <div style={{ padding: 24, background: "#f5f5f5", borderRadius: 8, marginTop: 24 }}>
          <h2 style={{ marginBottom: 16 }}>{t("admin.mapSettings")}</h2>
          <p style={{ color: "#666", marginBottom: 16 }}>
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
                      padding: "8px 16px",
                      fontSize: 16,
                      borderRadius: 4,
                      border: "1px solid #ddd",
                      background: "white",
                      cursor: isAdmin && !isSavingMapSettings ? "pointer" : "not-allowed",
                      minWidth: 300,
                      width: "100%",
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
                    padding: "8px 16px",
                    fontSize: 16,
                    borderRadius: 4,
                    border: "1px solid #ddd",
                    background: "white",
                    width: "100%",
                    maxWidth: 200,
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
                      padding: "8px 12px",
                      fontSize: 14,
                      borderRadius: 4,
                      border: "1px solid #ddd",
                      background: "white",
                      width: "100%",
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
                      padding: "8px 12px",
                      fontSize: 14,
                      borderRadius: 4,
                      border: "1px solid #ddd",
                      background: "white",
                      width: "100%",
                    }}
                  />
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={handleSaveMapSettings}
                  disabled={isSavingMapSettings}
                  style={{
                    padding: "12px 24px",
                    fontSize: 16,
                    background: isSavingMapSettings ? "#999" : "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: isSavingMapSettings ? "not-allowed" : "pointer",
                  }}
                >
                  {isSavingMapSettings ? t("common.loading") : t("common.save")}
                </button>
              )}

              {!isAdmin && (
                <div style={{ padding: 12, background: "#fff3cd", color: "#856404", borderRadius: 4, marginTop: 16 }}>
                  {t("admin.onlyAdminCanEdit")}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Site Settings */}
      <div style={{ padding: 24, background: "#f5f5f5", borderRadius: 8, marginTop: 24 }}>
        <h2 style={{ marginBottom: 16 }}>{t("admin.siteSettings")}</h2>
        <p style={{ color: "#666", marginBottom: 16 }}>
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
                        padding: "8px 16px",
                        fontSize: 16,
                        borderRadius: 4,
                        border: "1px solid #ddd",
                        background: "white",
                        cursor: isAdmin && !isSavingSiteSettings ? "text" : "not-allowed",
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
                          ? siteSettings.siteDescription.hu
                          : selectedLang === "en"
                          ? siteSettings.siteDescription.en
                          : siteSettings.siteDescription.de
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
                        padding: "8px 16px",
                        fontSize: 16,
                        borderRadius: 4,
                        border: "1px solid #ddd",
                        background: "white",
                        cursor: isAdmin && !isSavingSiteSettings ? "text" : "not-allowed",
                        minHeight: 100,
                        resize: "vertical",
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
                          ? siteSettings.seoTitle.hu
                          : selectedLang === "en"
                          ? siteSettings.seoTitle.en
                          : siteSettings.seoTitle.de
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
                        padding: "8px 16px",
                        fontSize: 16,
                        borderRadius: 4,
                        border: "1px solid #ddd",
                        background: "white",
                        cursor: isAdmin && !isSavingSiteSettings ? "text" : "not-allowed",
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
                          ? siteSettings.seoDescription.hu
                          : selectedLang === "en"
                          ? siteSettings.seoDescription.en
                          : siteSettings.seoDescription.de
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
                        padding: "8px 16px",
                        fontSize: 16,
                        borderRadius: 4,
                        border: "1px solid #ddd",
                        background: "white",
                        cursor: isAdmin && !isSavingSiteSettings ? "text" : "not-allowed",
                        minHeight: 100,
                        resize: "vertical",
                      }}
                      placeholder={t("admin.seoDescriptionPlaceholder")}
                    />
                  </div>
                </>
              )}
            </LanguageAwareForm>

            {isAdmin && (
              <button
                onClick={handleSaveSiteSettings}
                disabled={isSavingSiteSettings}
                style={{
                  padding: "12px 24px",
                  fontSize: 16,
                  background: isSavingSiteSettings ? "#999" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: isSavingSiteSettings ? "not-allowed" : "pointer",
                  marginTop: 16,
                }}
              >
                {isSavingSiteSettings ? t("common.loading") : t("common.save")}
              </button>
            )}

            {!isAdmin && (
              <div style={{ padding: 12, background: "#fff3cd", color: "#856404", borderRadius: 4, marginTop: 16 }}>
                {t("admin.onlyAdminCanEdit")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


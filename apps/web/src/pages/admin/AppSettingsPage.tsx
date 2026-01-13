// src/pages/admin/AppSettingsPage.tsx
import { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../contexts/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAdminSite } from "../../contexts/AdminSiteContext";
import { useToast } from "../../contexts/ToastContext";
import { getDefaultLanguage, setDefaultLanguage, getFeatureMatrix, setFeatureMatrix, type FeatureMatrix } from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { HAS_MULTIPLE_SITES } from "../../app/config";

export function AppSettingsPage() {
  const { t } = useTranslation();
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const { selectedSiteId, isLoading: isSiteLoading } = useAdminSite();
  const { showToast } = useToast();
  usePageTitle("admin.appSettings");
  const [defaultLang, setDefaultLangState] = useState<"hu" | "en" | "de">("hu");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Collapse state for sections
  const [languageOpen, setLanguageOpen] = useState(false);
  const [featureMatrixOpen, setFeatureMatrixOpen] = useState(false);
  const [placeFeatureMatrixOpen, setPlaceFeatureMatrixOpen] = useState(false);
  
  // Feature matrix state
  const [featureMatrix, setFeatureMatrixState] = useState<FeatureMatrix | null>(null);
  const [isLoadingFeatureMatrix, setIsLoadingFeatureMatrix] = useState(false);
  const [isSavingFeatureMatrix, setIsSavingFeatureMatrix] = useState(false);

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

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isSuperadmin = user?.role === "superadmin";

  // Load feature matrix
  useEffect(() => {
    if (isSuperadmin && (featureMatrixOpen || placeFeatureMatrixOpen)) {
      loadFeatureMatrix();
    }
  }, [isSuperadmin, featureMatrixOpen, placeFeatureMatrixOpen]);

  const loadFeatureMatrix = async () => {
    try {
      setIsLoadingFeatureMatrix(true);
      const data = await getFeatureMatrix();
      setFeatureMatrixState(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.loadFailed"), "error");
    } finally {
      setIsLoadingFeatureMatrix(false);
    }
  };

  const handleSaveFeatureMatrix = async () => {
    try {
      setIsSavingFeatureMatrix(true);
      await setFeatureMatrix({ 
        planOverrides: featureMatrix?.planOverrides || null,
        placePlanOverrides: featureMatrix?.placePlanOverrides || null,
      });
      showToast(t("admin.platformSettingsUpdated") || "Feature matrix updated", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updateFailed"), "error");
    } finally {
      setIsSavingFeatureMatrix(false);
    }
  };

  // Wait for site context to initialize
  if (isSiteLoading && HAS_MULTIPLE_SITES) {
    return <LoadingSpinner isLoading={true} />;
  }

  // Show message if no site is selected (but allow language settings which don't need site)
  if (!selectedSiteId && HAS_MULTIPLE_SITES) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1 style={{ marginBottom: 32, fontSize: 32, fontWeight: 700 }}>{t("admin.appSettings")}</h1>
        <div style={{ padding: 24, background: "white", borderRadius: 12, border: "1px solid #e0e0e0" }}>
          <p style={{ color: "#666", fontSize: 16, margin: 0, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.table.pleaseSelectSite")}</p>
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
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.defaultLanguage")}</h2>
            </div>
            <span style={{ fontSize: 20, color: "#666", transition: "transform 0.2s", transform: languageOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
          </button>
          {languageOpen && (
            <div style={{ padding: 24, borderTop: "1px solid #e0e0e0" }}>
              <p style={{ 
                color: "#666", 
                marginBottom: 24, 
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}>
                {t("admin.defaultLanguageDescription")}
              </p>

              <LoadingSpinner isLoading={isLoading} />
              {!isLoading && (
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                  <label style={{ display: "block", minWidth: 150, fontWeight: 500, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.defaultLanguage")}:</label>
                  <select
                    value={defaultLang}
                    onChange={(e) => setDefaultLangState(e.target.value as "hu" | "en" | "de")}
                    disabled={!isAdmin || isSaving}
                    style={{
                      padding: "10px 16px",
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                <div style={{ padding: 12, background: "#fff3cd", color: "#856404", borderRadius: 6, marginTop: 16, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
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
          fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "white",
          margin: 0,
          marginBottom: 8,
          textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        }}>
          {t("admin.appSettings")}
        </h1>
        <p style={{ 
          fontSize: "clamp(14px, 3.5vw, 16px)",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 400,
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
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.defaultLanguage")}</h2>
          </div>
          <span style={{ fontSize: 20, color: "#666", transition: "transform 0.2s", transform: languageOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
        </button>
        {languageOpen && (
          <div style={{ padding: 24, borderTop: "1px solid #e0e0e0" }}>
            <p style={{ color: "#666", marginBottom: 24, fontSize: 15, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              {t("admin.defaultLanguageDescription")}
            </p>

            <LoadingSpinner isLoading={isLoading} />
            {!isLoading && (
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                <label style={{ display: "block", minWidth: 150, fontWeight: 500, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.defaultLanguage")}:</label>
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
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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

      {/* Feature Matrix Configuration Section - Superadmin only */}
      {isSuperadmin && (
        <div style={{ marginBottom: 24, background: "white", borderRadius: 12, border: "1px solid #e0e0e0", overflow: "hidden" }}>
          <button
            onClick={() => setFeatureMatrixOpen(!featureMatrixOpen)}
            style={{
              width: "100%",
              padding: 24,
              background: featureMatrixOpen ? "#f8f9fa" : "white",
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
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                {t("admin.featureMatrix") || "Feature Matrix Configuration"}
              </h2>
            </div>
            <span style={{ fontSize: 20, color: "#666", transition: "transform 0.2s", transform: featureMatrixOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
          </button>
          {featureMatrixOpen && (
            <div style={{ padding: 24, borderTop: "1px solid #e0e0e0" }}>
              <p style={{ color: "#666", marginBottom: 24, fontSize: 15, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                {t("admin.featureMatrixDescription") || "Configure feature limits and capabilities for each subscription plan. Leave fields empty to use default values."}
              </p>

              <LoadingSpinner isLoading={isLoadingFeatureMatrix} />
              {!isLoadingFeatureMatrix && featureMatrix && (
                <FeatureMatrixEditor
                  featureMatrix={featureMatrix}
                  setFeatureMatrix={setFeatureMatrixState}
                  t={t}
                />
              )}

              <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={handleSaveFeatureMatrix}
                  disabled={isSavingFeatureMatrix}
                  style={{
                    padding: "10px 24px",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 500,
                    background: isSavingFeatureMatrix ? "#999" : "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: isSavingFeatureMatrix ? "not-allowed" : "pointer",
                  }}
                >
                  {isSavingFeatureMatrix ? t("common.loading") : t("common.save")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Reset to defaults
                    setFeatureMatrixState({ 
                      planOverrides: null,
                      placePlanOverrides: null,
                    });
                  }}
                  style={{
                    padding: "10px 24px",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 500,
                    background: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {t("admin.resetToDefaults") || "Reset to Defaults"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Place Feature Matrix Configuration Section - Superadmin only */}
      {isSuperadmin && (
        <div style={{ marginBottom: 24, background: "white", borderRadius: 12, border: "1px solid #e0e0e0", overflow: "hidden" }}>
          <button
            onClick={() => setPlaceFeatureMatrixOpen(!placeFeatureMatrixOpen)}
            style={{
              width: "100%",
              padding: 24,
              background: placeFeatureMatrixOpen ? "#f8f9fa" : "white",
              border: "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>📍</span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                {t("admin.placeFeatureMatrix") || "Place Subscription Matrix Configuration"}
              </h2>
            </div>
            <span style={{ fontSize: 20, color: "#666", transition: "transform 0.2s", transform: placeFeatureMatrixOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
          </button>
          {placeFeatureMatrixOpen && (
            <div style={{ padding: 24, borderTop: "1px solid #e0e0e0" }}>
              <p style={{ color: "#666", marginBottom: 24, fontSize: 15, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                {t("admin.placeFeatureMatrixDescription") || "Configure feature limits and capabilities for each place subscription plan (free, basic, pro). Leave fields empty to use default values."}
              </p>

              <LoadingSpinner isLoading={isLoadingFeatureMatrix} />
              {!isLoadingFeatureMatrix && featureMatrix && (
                <PlaceFeatureMatrixEditor
                  featureMatrix={featureMatrix}
                  setFeatureMatrix={setFeatureMatrixState}
                  t={t}
                />
              )}

              <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleSaveFeatureMatrix}
                  disabled={isSavingFeatureMatrix}
                  style={{
                    padding: "10px 24px",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 500,
                    background: isSavingFeatureMatrix ? "#999" : "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: isSavingFeatureMatrix ? "not-allowed" : "pointer",
                  }}
                >
                  {isSavingFeatureMatrix ? t("common.loading") : t("common.save")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Reset to defaults
                    setFeatureMatrixState({ 
                      planOverrides: featureMatrix?.planOverrides || null,
                      placePlanOverrides: null,
                    });
                  }}
                  style={{
                    padding: "10px 24px",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 500,
                    background: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {t("admin.resetToDefaults") || "Reset to Defaults"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Feature Matrix Editor Component
function FeatureMatrixEditor({
  featureMatrix,
  setFeatureMatrix,
  t,
}: {
  featureMatrix: FeatureMatrix;
  setFeatureMatrix: (matrix: FeatureMatrix) => void;
  t: any;
}) {
  const plans = ["FREE", "BASIC", "PRO"] as const;
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
  // Get default values from PLAN_DEFS (imported from backend config)
  // Since we can't import from backend in frontend, we'll use the same structure
  const defaultDefs = {
    FREE: {
      limits: {
        placesMax: 3,
        featuredPlacesMax: 0,
        galleryImagesPerPlaceMax: 3,
        eventsPerMonthMax: 0,
        siteMembersMax: 2,
        domainAliasesMax: 0,
        languagesMax: 1,
        galleriesMax: 5,
        imagesPerGalleryMax: 10,
        galleriesPerPlaceMax: 1,
        galleriesPerEventMax: 1,
      },
      features: {
        eventsEnabled: false,
        placeSeoEnabled: false,
        extrasEnabled: false,
        customDomainEnabled: false,
        eventLogEnabled: false,
        heroImage: true,
        contacts: true,
        siteSeo: true,
        canonicalSupport: true,
        multipleDomainAliases: false,
        pushSubscription: false,
      },
    },
    BASIC: {
      limits: {
        placesMax: 30,
        featuredPlacesMax: 3,
        galleryImagesPerPlaceMax: 10,
        eventsPerMonthMax: 30,
        siteMembersMax: 5,
        domainAliasesMax: 0,
        languagesMax: 2,
        galleriesMax: 20,
        imagesPerGalleryMax: 30,
        galleriesPerPlaceMax: 3,
        galleriesPerEventMax: 2,
      },
      features: {
        eventsEnabled: true,
        placeSeoEnabled: true,
        extrasEnabled: true,
        customDomainEnabled: false,
        eventLogEnabled: true,
        heroImage: true,
        contacts: true,
        siteSeo: true,
        canonicalSupport: true,
        multipleDomainAliases: false,
        pushSubscription: false,
      },
    },
    PRO: {
      limits: {
        placesMax: 150,
        featuredPlacesMax: 15,
        galleryImagesPerPlaceMax: 30,
        eventsPerMonthMax: 200,
        siteMembersMax: 20,
        domainAliasesMax: 5,
        languagesMax: 3,
        galleriesMax: Infinity,
        imagesPerGalleryMax: 100,
        galleriesPerPlaceMax: Infinity,
        galleriesPerEventMax: Infinity,
      },
      features: {
        eventsEnabled: true,
        placeSeoEnabled: true,
        extrasEnabled: true,
        customDomainEnabled: true,
        eventLogEnabled: true,
        heroImage: true,
        contacts: true,
        siteSeo: true,
        canonicalSupport: true,
        multipleDomainAliases: true,
        pushSubscription: "optional add-on",
      },
    },
  };

  const updatePlanValue = (plan: "FREE" | "BASIC" | "PRO", path: string[], value: any) => {
    const newOverrides = { ...(featureMatrix.planOverrides || {}) };
    if (!newOverrides[plan]) {
      newOverrides[plan] = { limits: {}, features: {} };
    }
    
    let current: any = newOverrides[plan];
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value === "" ? undefined : value;
    
    setFeatureMatrix({ planOverrides: newOverrides });
  };

  const getValue = (plan: "FREE" | "BASIC" | "PRO", path: string[]): any => {
    const override = featureMatrix.planOverrides?.[plan];
    if (!override) return undefined;
    
    let current: any = override;
    for (const key of path) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }
    return current;
  };

  const getDisplayValue = (plan: "FREE" | "BASIC" | "PRO", path: string[]): any => {
    const override = getValue(plan, path);
    if (override !== undefined) return override;
    
    // Get from default
    let current: any = defaultDefs[plan];
    for (const key of path) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }
    return current;
  };

  const features = [
    // Places category
    { category: t("public.pricing.categories.places"), name: t("public.pricing.features.placesCount"), path: ["limits", "placesMax"], type: "number" },
    { category: t("public.pricing.categories.places"), name: t("public.pricing.features.imagesPerPlace"), path: ["limits", "galleryImagesPerPlaceMax"], type: "number" },
    { category: t("public.pricing.categories.places"), name: t("public.pricing.features.heroImage"), path: ["features", "heroImage"], type: "boolean" },
    { category: t("public.pricing.categories.places"), name: t("public.pricing.features.contacts"), path: ["features", "contacts"], type: "boolean" },
    { category: t("public.pricing.categories.places"), name: t("public.pricing.features.extraFields"), path: ["features", "extrasEnabled"], type: "boolean" },
    { category: t("public.pricing.categories.places"), name: t("public.pricing.features.galleriesMax"), path: ["limits", "galleriesMax"], type: "number" },
    { category: t("public.pricing.categories.places"), name: t("public.pricing.features.imagesPerGalleryMax"), path: ["limits", "imagesPerGalleryMax"], type: "number" },
    { category: t("public.pricing.categories.places"), name: t("public.pricing.features.galleriesPerPlaceMax"), path: ["limits", "galleriesPerPlaceMax"], type: "number" },
    { category: t("public.pricing.categories.places"), name: t("public.pricing.features.galleriesPerEventMax"), path: ["limits", "galleriesPerEventMax"], type: "number" },
    // Visibility
    { category: t("public.pricing.categories.visibility"), name: t("public.pricing.features.featuredPlaces"), path: ["limits", "featuredPlacesMax"], type: "number" },
    { category: t("public.pricing.categories.visibility"), name: t("public.pricing.features.featuredBoost"), path: ["features", "featuredBoost"], type: "boolean" },
    // Events
    { category: t("public.pricing.categories.events"), name: t("public.pricing.features.eventsEnabled"), path: ["features", "eventsEnabled"], type: "boolean" },
    { category: t("public.pricing.categories.events"), name: t("public.pricing.features.eventsPerMonth"), path: ["limits", "eventsPerMonthMax"], type: "number" },
    // SEO
    { category: t("public.pricing.categories.seo"), name: t("public.pricing.features.siteSeo"), path: ["features", "siteSeo"], type: "boolean" },
    { category: t("public.pricing.categories.seo"), name: t("public.pricing.features.placeSeo"), path: ["features", "placeSeoEnabled"], type: "boolean" },
    { category: t("public.pricing.categories.seo"), name: t("public.pricing.features.canonicalSupport"), path: ["features", "canonicalSupport"], type: "boolean" },
    // Domain
    { category: t("public.pricing.categories.domain"), name: t("public.pricing.features.customDomain"), path: ["features", "customDomainEnabled"], type: "boolean" },
    { category: t("public.pricing.categories.domain"), name: t("public.pricing.features.multipleDomainAliases"), path: ["features", "multipleDomainAliases"], type: "boolean" },
    // Languages
    { category: t("public.pricing.categories.languages"), name: t("public.pricing.features.additionalLanguages"), path: ["limits", "languagesMax"], type: "number" },
    // Permissions
    { category: t("public.pricing.categories.permissions"), name: t("public.pricing.features.siteMembers"), path: ["limits", "siteMembersMax"], type: "number" },
    // Admin
    { category: t("public.pricing.categories.admin"), name: t("public.pricing.features.eventLog"), path: ["features", "eventLogEnabled"], type: "boolean" },
    // Push
    { category: t("public.pricing.categories.push"), name: t("public.pricing.features.pushSubscription"), path: ["features", "pushSubscription"], type: "string" },
  ];

  return (
    <div style={{ 
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      borderRadius: 8,
      border: "1px solid #e0e0e0",
      background: "white",
    }}>
      <table style={{ 
        width: "100%", 
        borderCollapse: "collapse", 
        minWidth: isMobile ? 600 : 800,
      }}>
        <thead>
          <tr style={{ 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderBottom: "2px solid #dee2e6",
          }}>
            <th style={{ 
              padding: isMobile ? "10px 8px" : "16px 12px", 
              textAlign: "left", 
              fontSize: isMobile ? 12 : 14, 
              fontWeight: 600, 
              color: "white",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              position: "sticky",
              left: 0,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              zIndex: 10,
            }}>
              {t("public.pricing.featureMatrix.feature") || "Feature"}
            </th>
            {plans.map((plan) => {
              const planLabels: Record<"FREE" | "BASIC" | "PRO", string> = {
                FREE: t("admin.planFree") || "Free",
                BASIC: t("admin.planBasic") || "Basic",
                PRO: t("admin.planPro") || "Pro",
              };
              return (
                <th key={plan} style={{ 
                  padding: isMobile ? "10px 8px" : "16px 12px", 
                  textAlign: "center", 
                  fontSize: isMobile ? 12 : 14, 
                  fontWeight: 600,
                  color: "white",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}>
                  {planLabels[plan]}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {features.map((feature, idx) => {
            const prevCategory = idx > 0 ? features[idx - 1].category : null;
            const showCategory = feature.category !== prevCategory;
            
            return (
              <tr 
                key={`${feature.category}-${feature.name}`} 
                style={{ 
                  borderBottom: "1px solid #e9ecef",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8f9fa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <td style={{ 
                  padding: isMobile ? "10px 8px" : "14px 12px", 
                  fontSize: isMobile ? 12 : 14, 
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  position: "sticky",
                  left: 0,
                  background: "white",
                  zIndex: 5,
                  boxShadow: "2px 0 4px rgba(0,0,0,0.05)",
                }}>
                  {showCategory && (
                    <div style={{ 
                      fontWeight: 600, 
                      color: "#495057", 
                      marginBottom: 4,
                      fontSize: isMobile ? 11 : 13,
                    }}>
                      {feature.category}
                    </div>
                  )}
                  <div style={{ 
                    paddingLeft: showCategory ? 0 : (isMobile ? 12 : 20),
                    fontSize: isMobile ? 12 : 14,
                  }}>
                    {feature.name}
                  </div>
                </td>
                {plans.map((plan) => {
                  const value = getDisplayValue(plan, feature.path);
                  const override = getValue(plan, feature.path);
                  const isOverridden = override !== undefined;
                  
                  // Get default value for placeholder
                  const placeholderValue = (() => {
                    if (feature.path[0] === "limits" && feature.path[1] && feature.type === "number") {
                      const key = feature.path[1];
                      const limits = defaultDefs[plan].limits as Record<string, any>;
                      return limits[key]?.toString() || "";
                    }
                    if (feature.path[0] === "features" && feature.path[1] && feature.type === "string") {
                      const key = feature.path[1];
                      const features = defaultDefs[plan].features as Record<string, any>;
                      const defaultValue = features[key];
                      return typeof defaultValue === "string" ? defaultValue : "";
                    }
                    return "";
                  })();
                  
                  return (
                    <td key={plan} style={{ 
                      padding: isMobile ? "10px 6px" : "14px 12px", 
                      textAlign: "center",
                      verticalAlign: "middle",
                    }}>
                      <div style={{ 
                        display: "flex", 
                        flexDirection: "column", 
                        alignItems: "center",
                        gap: 4,
                      }}>
                        {feature.type === "boolean" ? (
                          <input
                            type="checkbox"
                            checked={value === true}
                            onChange={(e) => updatePlanValue(plan, feature.path, e.target.checked)}
                            style={{
                              width: isMobile ? 18 : 20,
                              height: isMobile ? 18 : 20,
                              cursor: "pointer",
                              accentColor: isOverridden ? "#667eea" : "#6c757d",
                            }}
                          />
                        ) : feature.type === "number" ? (
                          <input
                            type="number"
                            value={value === Infinity || value === "∞" ? "∞" : value || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "∞" || val === "") {
                                updatePlanValue(plan, feature.path, val === "∞" ? Infinity : undefined);
                              } else {
                                const num = parseInt(val, 10);
                                if (!isNaN(num)) {
                                  updatePlanValue(plan, feature.path, num);
                                }
                              }
                            }}
                            placeholder={placeholderValue}
                            style={{
                              width: isMobile ? 60 : 80,
                              padding: isMobile ? "4px 6px" : "6px 8px",
                              fontSize: isMobile ? 12 : 14,
                              border: `2px solid ${isOverridden ? "#667eea" : "#ced4da"}`,
                              borderRadius: 6,
                              textAlign: "center",
                              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                              transition: "all 0.2s",
                              outline: "none",
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = "#667eea";
                              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={value || ""}
                            onChange={(e) => updatePlanValue(plan, feature.path, e.target.value)}
                            placeholder={placeholderValue}
                            style={{
                              width: isMobile ? 90 : 120,
                              padding: isMobile ? "4px 6px" : "6px 8px",
                              fontSize: isMobile ? 12 : 14,
                              border: `2px solid ${isOverridden ? "#667eea" : "#ced4da"}`,
                              borderRadius: 6,
                              textAlign: "center",
                              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                              transition: "all 0.2s",
                              outline: "none",
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = "#667eea";
                              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          />
                        )}
                        {isOverridden && (
                          <div style={{ 
                            fontSize: isMobile ? 9 : 10, 
                            color: "#667eea", 
                            marginTop: 2,
                            fontWeight: 500,
                          }}>
                            {t("admin.overridden") || "Overridden"}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Place Feature Matrix Editor Component
function PlaceFeatureMatrixEditor({
  featureMatrix,
  setFeatureMatrix,
  t,
}: {
  featureMatrix: FeatureMatrix;
  setFeatureMatrix: (matrix: FeatureMatrix) => void;
  t: any;
}) {
  const plans = ["free", "basic", "pro"] as const;
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get default values from PLACE_LIMITS
  const defaultDefs = {
    free: {
      images: 3,
      events: 0,
      featured: false,
    },
    basic: {
      images: 15,
      events: 3,
      featured: false,
    },
    pro: {
      images: 30,
      events: Infinity,
      featured: true,
    },
  };

  const updatePlanValue = (plan: "free" | "basic" | "pro", field: string, value: any) => {
    const newOverrides = { ...(featureMatrix.placePlanOverrides || {}) };
    if (!newOverrides[plan]) {
      newOverrides[plan] = {};
    }
    
    newOverrides[plan] = {
      ...newOverrides[plan],
      [field]: value === "" ? undefined : value,
    };
    
    setFeatureMatrix({ 
      ...featureMatrix,
      placePlanOverrides: newOverrides,
    });
  };

  const getValue = (plan: "free" | "basic" | "pro", field: string): any => {
    const override = featureMatrix.placePlanOverrides?.[plan];
    if (!override) return undefined;
    return override[field];
  };

  const getDisplayValue = (plan: "free" | "basic" | "pro", field: string): any => {
    const override = getValue(plan, field);
    if (override !== undefined) return override;
    return defaultDefs[plan][field as keyof typeof defaultDefs[typeof plan]];
  };

  const features = [
    { name: t("public.pricing.features.placeImages") || "Képek száma", field: "images", type: "number" },
    { name: t("public.pricing.features.eventsPerPlace") || "Események száma", field: "events", type: "number" },
    { name: t("public.pricing.features.featuredPlacement") || "Kiemelt megjelenés", field: "featured", type: "boolean" },
  ];

  return (
    <div style={{ 
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      borderRadius: 8,
      border: "1px solid #e0e0e0",
      background: "white",
    }}>
      <table style={{ 
        width: "100%", 
        borderCollapse: "collapse", 
        minWidth: isMobile ? 500 : 600,
      }}>
        <thead>
          <tr style={{ 
            background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            borderBottom: "2px solid #dee2e6",
          }}>
            <th style={{ 
              padding: isMobile ? "10px 8px" : "16px 12px", 
              textAlign: "left", 
              fontSize: isMobile ? 12 : 14, 
              fontWeight: 600, 
              color: "white",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              position: "sticky",
              left: 0,
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              zIndex: 10,
            }}>
              {t("public.pricing.featureMatrix.feature") || "Feature"}
            </th>
            {plans.map((plan) => {
              const planLabels: Record<"free" | "basic" | "pro", string> = {
                free: t("admin.planFree") || "Free",
                basic: t("admin.planBasic") || "Basic",
                pro: t("admin.planPro") || "Pro",
              };
              return (
                <th key={plan} style={{ 
                  padding: isMobile ? "10px 8px" : "16px 12px", 
                  textAlign: "center", 
                  fontSize: isMobile ? 12 : 14, 
                  fontWeight: 600,
                  color: "white",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}>
                  {planLabels[plan]}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => {
            return (
              <tr 
                key={feature.field}
                style={{ 
                  borderBottom: "1px solid #e9ecef",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8f9fa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <td style={{ 
                  padding: isMobile ? "10px 8px" : "14px 12px", 
                  fontSize: isMobile ? 12 : 14, 
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  position: "sticky",
                  left: 0,
                  background: "white",
                  zIndex: 5,
                  boxShadow: "2px 0 4px rgba(0,0,0,0.05)",
                }}>
                  {feature.name}
                </td>
                {plans.map((plan) => {
                  const value = getDisplayValue(plan, feature.field);
                  const override = getValue(plan, feature.field);
                  const isOverridden = override !== undefined;
                  
                  const placeholderValue = defaultDefs[plan][feature.field as keyof typeof defaultDefs[typeof plan]]?.toString() || "";
                  
                  return (
                    <td key={plan} style={{ 
                      padding: isMobile ? "10px 6px" : "14px 12px", 
                      textAlign: "center",
                      verticalAlign: "middle",
                    }}>
                      <div style={{ 
                        display: "flex", 
                        flexDirection: "column", 
                        alignItems: "center",
                        gap: 4,
                      }}>
                        {feature.type === "boolean" ? (
                          <input
                            type="checkbox"
                            checked={value === true}
                            onChange={(e) => updatePlanValue(plan, feature.field, e.target.checked)}
                            style={{
                              width: isMobile ? 18 : 20,
                              height: isMobile ? 18 : 20,
                              cursor: "pointer",
                              accentColor: isOverridden ? "#f5576c" : "#6c757d",
                            }}
                          />
                        ) : (
                          <input
                            type="number"
                            value={value === Infinity || value === "∞" ? "∞" : value || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "∞" || val === "") {
                                updatePlanValue(plan, feature.field, val === "∞" ? Infinity : undefined);
                              } else {
                                const num = parseInt(val, 10);
                                if (!isNaN(num)) {
                                  updatePlanValue(plan, feature.field, num);
                                }
                              }
                            }}
                            placeholder={placeholderValue}
                            style={{
                              width: isMobile ? 60 : 80,
                              padding: isMobile ? "4px 6px" : "6px 8px",
                              fontSize: isMobile ? 12 : 14,
                              border: `2px solid ${isOverridden ? "#f5576c" : "#ced4da"}`,
                              borderRadius: 6,
                              textAlign: "center",
                              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                              transition: "all 0.2s",
                              outline: "none",
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = "#f5576c";
                              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245, 87, 108, 0.1)";
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          />
                        )}
                        {isOverridden && (
                          <div style={{ 
                            fontSize: isMobile ? 9 : 10, 
                            color: "#f5576c", 
                            marginTop: 2,
                            fontWeight: 500,
                          }}>
                            {t("admin.overridden") || "Overridden"}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


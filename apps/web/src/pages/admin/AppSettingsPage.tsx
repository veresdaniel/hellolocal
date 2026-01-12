// src/pages/admin/AppSettingsPage.tsx
import { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../contexts/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAdminSite, useAdminTenant } from "../../contexts/AdminSiteContext";
import { useToast } from "../../contexts/ToastContext";
import { getDefaultLanguage, setDefaultLanguage } from "../../api/admin.api";
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
              <p style={{ color: "#666", marginBottom: 24, fontSize: 15 }}>
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
          fontSize: "clamp(13px, 3vw, 14px)",
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


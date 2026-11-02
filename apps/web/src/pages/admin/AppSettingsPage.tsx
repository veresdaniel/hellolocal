// src/pages/admin/AppSettingsPage.tsx
import { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../contexts/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAdminSite } from "../../contexts/useAdminSite";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../hooks/useConfirm";
import {
  CONTENT_DRAFT_DEFAULT_PROVIDER,
  CONTENT_DRAFT_PROVIDERS,
  isContentDraftProvider,
} from "@hellolocal/shared";
import {
  getDefaultLanguage,
  setDefaultLanguage,
  getFeatureMatrix,
  setFeatureMatrix,
  getAppSetting,
  createAppSetting,
  getContentDraftStatus,
  saveContentDraftSettings,
  getBrands,
  updateBrand,
  type ContentDraftProvider,
  type FeatureMatrix,
} from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { PublicPlansEditor } from "../../components/PublicPlansEditor";
import { LanguageSelectOptions } from "../../components/LanguageSelectOptions";
import { UnderConstructionSettings } from "../../components/UnderConstructionSettings";
import { GlobalCrawlabilityCard } from "../../components/GlobalCrawlabilityCard";
import { VisitorLadderSettings } from "../../components/VisitorLadderSettings";
import type { PublicPlanId, PublicPlanNumbers } from "../../components/publicPlans";
import { DEFAULT_LANG, HAS_MULTIPLE_SITES, isLang } from "../../app/config";
import { isSuperadmin, isAdmin } from "../../utils/roleHelpers";
import type { UserRole, Lang } from "../../types/enums";
import { Link, useParams } from "react-router-dom";
import {
  DEFAULT_BODY_FONT,
  DEFAULT_HEADING_FONT,
  PUBLIC_FONT_IDS,
  readPublicFonts,
  type PublicFontId,
} from "../../styles/publicFonts";
import {
  DEFAULT_PUBLIC_THEME_COLORS,
  isValidHexColor,
  resolvePublicThemeColors,
  type PublicThemeColors,
} from "../../styles/publicThemeColors";
import { PublicThemeColorsEditor } from "../../components/PublicThemeColorsEditor";
import { isValidGaMeasurementIdInput } from "../../lib/gaMeasurementId";
import { GaMeasurementField } from "../../components/GaMeasurementField";

const PLATFORM_GA_SETTING_KEY = "platformGaMeasurementId";
/** Display-only mask; never a real key. Cleared on focus so a new key can be typed. */
const CONTENT_DRAFT_API_KEY_MASK = "••••••••••••••••";

export function AppSettingsPage() {
  const { t } = useTranslation();
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const { selectedSiteId, isLoading: isSiteLoading } = useAdminSite();
  const { showToast } = useToast();
  const confirm = useConfirm();
  usePageTitle("admin.appSettings");
  const [defaultLang, setDefaultLangState] = useState<Lang>("hu");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Collapse state for sections
  const [languageOpen, setLanguageOpen] = useState(false);
  const [featureMatrixOpen, setFeatureMatrixOpen] = useState(false);
  const [placeFeatureMatrixOpen, setPlaceFeatureMatrixOpen] = useState(false);
  const [publicPlansOpen, setPublicPlansOpen] = useState(false);
  const [visitorLadderOpen, setVisitorLadderOpen] = useState(false);
  const { lang: langParam } = useParams<{ lang?: string }>();
  const adminLang = isLang(langParam) ? langParam : DEFAULT_LANG;

  // Feature matrix state
  const [featureMatrix, setFeatureMatrixState] = useState<FeatureMatrix | null>(null);
  const [isLoadingFeatureMatrix, setIsLoadingFeatureMatrix] = useState(false);
  const [isSavingFeatureMatrix, setIsSavingFeatureMatrix] = useState(false);
  const [isSavingPublicPlans, setIsSavingPublicPlans] = useState(false);
  const [quoteRecipient, setQuoteRecipient] = useState("");
  const [isSavingRecipient, setIsSavingRecipient] = useState(false);
  const [platformGaId, setPlatformGaId] = useState("");
  const [platformGaError, setPlatformGaError] = useState("");
  const [isSavingPlatformGa, setIsSavingPlatformGa] = useState(false);
  const [contentDraftKeyConfigured, setContentDraftKeyConfigured] = useState(false);
  const [contentDraftEnabled, setContentDraftEnabled] = useState(false);
  const [contentDraftProvider, setContentDraftProvider] =
    useState<ContentDraftProvider>(CONTENT_DRAFT_DEFAULT_PROVIDER);
  const [contentDraftApiKey, setContentDraftApiKey] = useState("");
  const [contentDraftApiKeyEditing, setContentDraftApiKeyEditing] = useState(false);
  const [isSavingContentDraft, setIsSavingContentDraft] = useState(false);
  const [typographyOpen, setTypographyOpen] = useState(false);
  const [themeColorsOpen, setThemeColorsOpen] = useState(false);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandTheme, setBrandTheme] = useState<Record<string, unknown>>({});
  const [headingFont, setHeadingFont] = useState<PublicFontId>(DEFAULT_HEADING_FONT);
  const [bodyFont, setBodyFont] = useState<PublicFontId>(DEFAULT_BODY_FONT);
  const [isSavingTypography, setIsSavingTypography] = useState(false);
  const [themeColors, setThemeColors] = useState<PublicThemeColors>({
    ...DEFAULT_PUBLIC_THEME_COLORS,
  });
  const [isSavingThemeColors, setIsSavingThemeColors] = useState(false);

  useEffect(() => {
    const loadDefaultLanguage = async () => {
      try {
        setIsLoading(true);
        const data = await getDefaultLanguage();
        setDefaultLangState(data.defaultLanguage);
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : t("admin.errors.loadDefaultLanguageFailed"),
          "error"
        );
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
      showToast(
        err instanceof Error ? err.message : t("admin.errors.updateDefaultLanguageFailed"),
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const userIsAdmin = user ? isAdmin(user.role as UserRole) : false;
  const userIsSuperadmin = user ? isSuperadmin(user.role) : false;

  useEffect(() => {
    if (!userIsSuperadmin) return;
    let cancelled = false;
    getAppSetting("quoteRequestRecipient")
      .then((row) => {
        if (!cancelled) setQuoteRecipient(row?.value ?? "");
      })
      .catch(() => {
        if (!cancelled) setQuoteRecipient("");
      });
    getAppSetting(PLATFORM_GA_SETTING_KEY)
      .then((row) => {
        if (!cancelled) setPlatformGaId(row?.value ?? "");
      })
      .catch(() => {
        if (!cancelled) setPlatformGaId("");
      });
    getContentDraftStatus()
      .then((status) => {
        if (cancelled) return;
        setContentDraftEnabled(Boolean(status.enabled));
        setContentDraftKeyConfigured(Boolean(status.keyConfigured));
        setContentDraftApiKey("");
        setContentDraftApiKeyEditing(false);
        if (isContentDraftProvider(status.provider)) {
          setContentDraftProvider(status.provider);
        } else {
          setContentDraftProvider(CONTENT_DRAFT_DEFAULT_PROVIDER);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setContentDraftEnabled(false);
        setContentDraftKeyConfigured(false);
        setContentDraftApiKey("");
        setContentDraftApiKeyEditing(false);
        setContentDraftProvider(CONTENT_DRAFT_DEFAULT_PROVIDER);
      });
    getBrands()
      .then((brands) => {
        if (cancelled) return;
        const brand = brands[0];
        if (!brand) {
          setBrandId(null);
          return;
        }
        setBrandId(brand.id);
        const theme =
          brand.theme && typeof brand.theme === "object" && !Array.isArray(brand.theme)
            ? { ...(brand.theme as Record<string, unknown>) }
            : {};
        setBrandTheme(theme);
        const fonts = readPublicFonts(theme);
        setHeadingFont(fonts.headingFont);
        setBodyFont(fonts.bodyFont);
        setThemeColors(resolvePublicThemeColors(undefined, theme));
      })
      .catch(() => {
        if (!cancelled) setBrandId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userIsSuperadmin]);

  const handleSaveTypography = async () => {
    if (!brandId) {
      showToast(t("admin.errors.updateFailed"), "error");
      return;
    }
    try {
      setIsSavingTypography(true);
      const nextTheme = { ...brandTheme, headingFont, bodyFont };
      await updateBrand(brandId, { theme: nextTheme });
      setBrandTheme(nextTheme);
      showToast(t("admin.typography.saved"), "success");
      window.dispatchEvent(new Event("admin:platformSettings:changed"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updateFailed"), "error");
    } finally {
      setIsSavingTypography(false);
    }
  };

  const handleSaveThemeColors = async () => {
    if (!brandId) {
      showToast(t("admin.errors.updateFailed"), "error");
      return;
    }
    for (const value of Object.values(themeColors)) {
      if (!isValidHexColor(value)) {
        showToast(t("admin.themeColors.invalidHex"), "error");
        return;
      }
    }
    try {
      setIsSavingThemeColors(true);
      const nextTheme = { ...brandTheme, headingFont, bodyFont, colors: themeColors };
      await updateBrand(brandId, { theme: nextTheme });
      setBrandTheme(nextTheme);
      showToast(t("admin.themeColors.saved"), "success");
      window.dispatchEvent(new Event("admin:platformSettings:changed"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updateFailed"), "error");
    } finally {
      setIsSavingThemeColors(false);
    }
  };

  const handleSaveContentDraft = async (clearKey = false) => {
    if (clearKey) {
      const ok = await confirm({
        title: t("admin.contentDraft.clearKey"),
        message: t("admin.contentDraft.apiKeyClearHelp"),
        confirmLabel: t("admin.contentDraft.clearKey"),
        cancelLabel: t("common.cancel"),
        confirmVariant: "danger",
      });
      if (!ok) return;
    }
    try {
      setIsSavingContentDraft(true);
      const trimmed = contentDraftApiKey.trim();
      const status = await saveContentDraftSettings({
        provider: contentDraftProvider,
        ...(clearKey ? { apiKey: "" } : trimmed ? { apiKey: trimmed } : {}),
      });
      setContentDraftEnabled(Boolean(status.enabled));
      setContentDraftKeyConfigured(Boolean(status.keyConfigured));
      if (isContentDraftProvider(status.provider)) {
        setContentDraftProvider(status.provider);
      }
      setContentDraftApiKey("");
      setContentDraftApiKeyEditing(false);
      const { clearContentDraftStatusCache } = await import("../../hooks/useContentDraftStatus");
      clearContentDraftStatusCache();
      showToast(t("admin.contentDraft.saved"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updateFailed"), "error");
    } finally {
      setIsSavingContentDraft(false);
    }
  };

  const handleSaveQuoteRecipient = async () => {
    try {
      setIsSavingRecipient(true);
      await createAppSetting({
        key: "quoteRequestRecipient",
        value: quoteRecipient.trim(),
        type: "string",
        description: t("admin.quoteRecipientDescription"),
      });
      showToast(t("public.overview.plans.recipient.saved"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("public.overview.plans.quote.failed"), "error");
    } finally {
      setIsSavingRecipient(false);
    }
  };

  const handleSavePlatformGa = async () => {
    if (!isValidGaMeasurementIdInput(platformGaId)) {
      setPlatformGaError(t("admin.googleAnalytics.invalidId"));
      showToast(t("admin.googleAnalytics.invalidId"), "error");
      return;
    }
    setPlatformGaError("");
    try {
      setIsSavingPlatformGa(true);
      const normalized = platformGaId.trim() ? platformGaId.trim().toUpperCase() : "";
      await createAppSetting({
        key: PLATFORM_GA_SETTING_KEY,
        value: normalized,
        type: "string",
        description: t("admin.googleAnalytics.platformDescription"),
      });
      setPlatformGaId(normalized);
      showToast(t("admin.googleAnalytics.saved"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updateFailed"), "error");
    } finally {
      setIsSavingPlatformGa(false);
    }
  };

  // Load feature matrix
  useEffect(() => {
    if (userIsSuperadmin && (featureMatrixOpen || placeFeatureMatrixOpen || publicPlansOpen)) {
      loadFeatureMatrix();
    }
  }, [userIsSuperadmin, featureMatrixOpen, placeFeatureMatrixOpen, publicPlansOpen]);

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
      const { syncPublicPlansFromMatrixLimits } = await import("../../components/publicPlans");
      const planOverrides = featureMatrix?.planOverrides
        ? syncPublicPlansFromMatrixLimits(featureMatrix.planOverrides)
        : null;
      const saved = await setFeatureMatrix({
        planOverrides,
        placePlanOverrides: featureMatrix?.placePlanOverrides || null,
      });
      setFeatureMatrixState(saved);
      try {
        const { invalidateUiCopy } = await import("../../i18n/loadUiCopy");
        invalidateUiCopy();
      } catch {
        /* optional client cache */
      }
      showToast(t("admin.platformSettingsUpdated"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updateFailed"), "error");
    } finally {
      setIsSavingFeatureMatrix(false);
    }
  };

  const handleSavePublicPlans = async (
    plans: Record<PublicPlanId, PublicPlanNumbers & { enabled?: boolean }> & {
      municipal?: { enabled: boolean };
    },
    copyDrafts?: import("../../components/publicPlans").PlanCopyDrafts
  ) => {
    try {
      setIsSavingPublicPlans(true);
      if (copyDrafts) {
        try {
          const { saveUiMessages } = await import("../../api/uiCopy.api");
          const { planCopyEntriesFromDraft } = await import("../../components/publicPlans");
          const { applyUiCopy, invalidateUiCopy } = await import("../../i18n/loadUiCopy");
          for (const [code, fields] of Object.entries(copyDrafts)) {
            const entries = planCopyEntriesFromDraft(fields);
            if (Object.keys(entries).length) await saveUiMessages(code, entries);
            invalidateUiCopy(code);
            void applyUiCopy(code);
          }
        } catch {
          /* Numbers still save below; UiMessage may be unavailable until migration. */
        }
      }
      const { syncMatrixLimitsFromPublicPlans, syncPublicPlansFromMatrixLimits } = await import(
        "../../components/publicPlans"
      );
      const current = featureMatrix?.planOverrides || {};
      const next = syncPublicPlansFromMatrixLimits(
        syncMatrixLimitsFromPublicPlans({ ...current, publicPlans: plans })
      );
      const saved = await setFeatureMatrix({
        planOverrides: next,
        placePlanOverrides: featureMatrix?.placePlanOverrides || null,
      });
      setFeatureMatrixState(saved);
      showToast(t("public.overview.plans.save"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updateFailed"), "error");
    } finally {
      setIsSavingPublicPlans(false);
    }
  };

  // Wait for site context to initialize
  if (isSiteLoading && HAS_MULTIPLE_SITES) {
    return null;
  }

  // Show message if no site is selected (but allow language settings which don't need site)
  if (!selectedSiteId && HAS_MULTIPLE_SITES) {
    return (
      <div className="admin-page-content">
        <h1
          className="admin-page-title"
          style={{ marginBottom: 32, fontSize: 32, fontWeight: 700 }}
        >
          {t("admin.appSettings")}
        </h1>
        <div
          style={{
            padding: 24,
            background: "var(--admin-surface)",
            borderRadius: 12,
            border: "1px solid var(--admin-border-subtle)",
          }}
        >
          <p
            style={{
              color: "var(--admin-muted)",
              fontSize: 16,
              margin: 0,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("admin.table.pleaseSelectSite")}
          </p>
        </div>

        {/* Language Settings Section - available without tenant */}
        <div
          style={{
            marginTop: 24,
            marginBottom: 24,
            background: "var(--admin-surface)",
            borderRadius: 12,
            border: "1px solid var(--admin-border-subtle)",
            overflow: "hidden",
          }}
        >
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
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 600,
                  fontFamily:
                    "var(--admin-font-display)",
                }}
              >
                {t("admin.defaultLanguage")}
              </h2>
            </div>
            <span
              style={{
                fontSize: 20,
                color: "var(--admin-muted)",
                transition: "transform 0.2s",
                transform: languageOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▼
            </span>
          </button>
          {languageOpen && (
            <div style={{ padding: 24, borderTop: "1px solid var(--admin-border-subtle)" }}>
              <p
                style={{
                  color: "var(--admin-muted)",
                  marginBottom: 24,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.defaultLanguageDescription")}
              </p>

              {!isLoading && (
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      minWidth: 150,
                      fontWeight: 500,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.defaultLanguage")}:
                  </label>
                  <select
                    value={defaultLang}
                    onChange={(e) => setDefaultLangState(e.target.value as Lang)}
                    disabled={!userIsAdmin || isSaving}
                    style={{
                      padding: "10px 16px",
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      borderRadius: 6,
                      border: "1px solid #ddd",
                      background: "var(--admin-surface)",
                      cursor: userIsAdmin && !isSaving ? "pointer" : "not-allowed",
                      minWidth: 200,
                    }}
                  >
                    <LanguageSelectOptions variant="translated" />
                  </select>
                  {userIsAdmin && (
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      style={{
                        padding: "10px 24px",
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                <div
                  style={{
                    padding: 12,
                    background: "#fff3cd",
                    color: "#856404",
                    borderRadius: 6,
                    marginTop: 16,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.onlyAdminCanEdit")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const showContentDraftApiKeyMask =
    contentDraftKeyConfigured &&
    !contentDraftApiKeyEditing &&
    !contentDraftApiKey.trim();

  return (
    <div className="admin-page-content">
      <div style={{ marginBottom: "clamp(24px, 5vw, 32px)" }}>
        <h1
          className="admin-page-title"
          style={{
            fontSize: "clamp(20px, 4vw, 28px)",
            fontWeight: 700,
            fontFamily:
              "var(--admin-font-display)",
            margin: 0,
            marginBottom: 8,
          }}
        >
          {t("admin.appSettings")}
        </h1>
        <p
          className="admin-page-muted"
          style={{
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 400,
            margin: 0,
          }}
        >
          {t("admin.appSettingsDesc")}
        </p>
      </div>

      {/* Language Settings Section */}
      <div
        style={{
          marginBottom: 24,
          background: "var(--admin-surface)",
          borderRadius: 12,
          border: "1px solid var(--admin-border-subtle)",
          overflow: "hidden",
        }}
      >
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
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                fontFamily:
                  "var(--admin-font-display)",
              }}
            >
              {t("admin.defaultLanguage")}
            </h2>
          </div>
          <span
            style={{
              fontSize: 20,
              color: "var(--admin-muted)",
              transition: "transform 0.2s",
              transform: languageOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▼
          </span>
        </button>
        {languageOpen && (
          <div style={{ padding: 24, borderTop: "1px solid var(--admin-border-subtle)" }}>
            <p
              style={{
                color: "var(--admin-muted)",
                marginBottom: 24,
                fontSize: 15,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {t("admin.defaultLanguageDescription")}
            </p>

            {!isLoading && (
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    minWidth: 150,
                    fontWeight: 500,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.defaultLanguage")}:
                </label>
                <select
                  value={defaultLang}
                  onChange={(e) => setDefaultLangState(e.target.value as Lang)}
                  disabled={!isAdmin || isSaving}
                  style={{
                    padding: "12px 16px",
                    fontSize: 15,
                    borderRadius: 8,
                    border: "2px solid var(--admin-primary-border)",
                    background: "var(--admin-surface)",
                    cursor: isAdmin && !isSaving ? "pointer" : "not-allowed",
                    minWidth: 200,
                    boxSizing: "border-box",
                    transition: "all 0.2s ease",
                    outline: "none",
                  }}
                >
                  <LanguageSelectOptions variant="translated" />
                </select>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                      padding: "10px 24px",
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
              <div
                style={{
                  padding: 12,
                  background: "#fff3cd",
                  color: "#856404",
                  borderRadius: 6,
                  marginTop: 16,
                }}
              >
                {t("admin.onlyAdminCanEdit")}
              </div>
            )}
          </div>
        )}
      </div>

      {userIsSuperadmin && (
        <div
          style={{
            marginBottom: 24,
            background: "var(--admin-surface)",
            borderRadius: 12,
            border: "1px solid var(--admin-border-subtle)",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setTypographyOpen(!typographyOpen)}
            style={{
              width: "100%",
              padding: 24,
              background: typographyOpen ? "#f8f9fa" : "white",
              border: "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                fontFamily:
                  "var(--admin-font-display)",
              }}
            >
              {t("admin.typography.title")}
            </h2>
            <span>{typographyOpen ? "▾" : "▸"}</span>
          </button>
          {typographyOpen && (
            <div style={{ padding: 24, borderTop: "1px solid var(--admin-border-subtle)" }}>
              <p
                style={{
                  color: "var(--admin-muted)",
                  marginBottom: 24,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.typography.help")}
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  alignItems: "flex-end",
                  marginBottom: 16,
                }}
              >
                <label style={{ display: "grid", gap: 8, minWidth: 220 }}>
                  <span style={{ fontWeight: 500 }}>{t("admin.typography.headingFont")}</span>
                  <select
                    value={headingFont}
                    onChange={(e) => setHeadingFont(e.target.value as PublicFontId)}
                    disabled={isSavingTypography || !brandId}
                    style={{
                      padding: "10px 16px",
                      fontSize: 16,
                      borderRadius: 6,
                      border: "1px solid #ddd",
                      background: "var(--admin-surface)",
                      minWidth: 220,
                    }}
                  >
                    {PUBLIC_FONT_IDS.map((id) => (
                      <option key={id} value={id}>
                        {t(`admin.typography.fonts.${id}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 8, minWidth: 220 }}>
                  <span style={{ fontWeight: 500 }}>{t("admin.typography.bodyFont")}</span>
                  <select
                    value={bodyFont}
                    onChange={(e) => setBodyFont(e.target.value as PublicFontId)}
                    disabled={isSavingTypography || !brandId}
                    style={{
                      padding: "10px 16px",
                      fontSize: 16,
                      borderRadius: 6,
                      border: "1px solid #ddd",
                      background: "var(--admin-surface)",
                      minWidth: 220,
                    }}
                  >
                    {PUBLIC_FONT_IDS.map((id) => (
                      <option key={id} value={id}>
                        {t(`admin.typography.fonts.${id}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleSaveTypography}
                  disabled={isSavingTypography || !brandId}
                  style={{
                    padding: "10px 24px",
                    fontSize: 16,
                    fontWeight: 500,
                    background: isSavingTypography || !brandId ? "#999" : "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: isSavingTypography || !brandId ? "not-allowed" : "pointer",
                  }}
                >
                  {isSavingTypography ? t("common.loading") : t("admin.typography.save")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {userIsSuperadmin && (
        <div
          style={{
            marginBottom: 24,
            background: "var(--admin-surface)",
            borderRadius: 12,
            border: "1px solid var(--admin-border-subtle)",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setThemeColorsOpen(!themeColorsOpen)}
            style={{
              width: "100%",
              padding: 24,
              background: themeColorsOpen ? "#f8f9fa" : "white",
              border: "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                fontFamily:
                  "var(--admin-font-display)",
              }}
            >
              {t("admin.themeColors.title")}
            </h2>
            <span>{themeColorsOpen ? "▾" : "▸"}</span>
          </button>
          {themeColorsOpen && (
            <div style={{ padding: 24, borderTop: "1px solid var(--admin-border-subtle)" }}>
              <p
                style={{
                  color: "var(--admin-muted)",
                  marginBottom: 24,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.themeColors.helpGlobal")}
              </p>
              <PublicThemeColorsEditor
                value={themeColors}
                onChange={setThemeColors}
                disabled={isSavingThemeColors || !brandId}
              />
              <button
                type="button"
                onClick={handleSaveThemeColors}
                disabled={isSavingThemeColors || !brandId}
                style={{
                  marginTop: 20,
                  padding: "10px 24px",
                  fontSize: 16,
                  fontWeight: 500,
                  background: isSavingThemeColors || !brandId ? "#999" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: isSavingThemeColors || !brandId ? "not-allowed" : "pointer",
                }}
              >
                {isSavingThemeColors ? t("common.loading") : t("admin.themeColors.save")}
              </button>
            </div>
          )}
        </div>
      )}

      {userIsSuperadmin && <GlobalCrawlabilityCard />}

      {userIsSuperadmin && <UnderConstructionSettings adminLang={adminLang} />}

      {userIsSuperadmin && (
        <div
          style={{
            marginBottom: 24,
            background: "var(--admin-surface)",
            borderRadius: 12,
            border: "1px solid var(--admin-border-subtle)",
            padding: 24,
          }}
        >
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: 20,
              fontWeight: 600,
              fontFamily:
                "var(--admin-font-display)",
            }}
          >
            {t("admin.i18n.landingMovedTitle")}
          </h2>
          <p style={{ margin: "0 0 12px", color: "var(--admin-muted)", lineHeight: 1.5 }}>
            {t("admin.i18n.landingMovedHint")}
          </p>
          <Link
            to={`/${adminLang}/admin/i18n?section=overview`}
            style={{ color: "#0f766e", fontWeight: 600 }}
          >
            {t("admin.i18n.openOverview")}
          </Link>
        </div>
      )}

      {userIsSuperadmin && (
        <div
          id="content-draft"
          style={{
            marginBottom: 24,
            background: "var(--admin-surface)",
            borderRadius: 12,
            border: "1px solid var(--admin-border-subtle)",
            padding: 24,
            scrollMarginTop: 96,
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 600 }}>
            {t("admin.contentDraft.settingsTitle")}
          </h2>
          <p style={{ margin: "0 0 8px", color: "var(--admin-muted)" }}>{t("admin.contentDraft.settingsHelp")}</p>
          <p style={{ margin: "0 0 16px", color: contentDraftEnabled ? "#166534" : "#6b7280", fontWeight: 600 }}>
            {contentDraftEnabled
              ? t("admin.contentDraft.statusOn")
              : t("admin.contentDraft.statusOff")}
          </p>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
            {t("admin.contentDraft.provider")}
          </label>
          <select
            value={contentDraftProvider}
            onChange={(event) =>
              setContentDraftProvider(event.target.value as ContentDraftProvider)
            }
            style={{
              width: "100%",
              maxWidth: 420,
              minHeight: 42,
              marginBottom: 16,
              padding: "0 12px",
              border: "1px solid #d9d3e4",
              borderRadius: 8,
              font: "inherit",
              background: "var(--admin-surface)",
            }}
          >
            {CONTENT_DRAFT_PROVIDERS.map((providerId) => (
              <option key={providerId} value={providerId}>
                {t(
                  providerId === "gemini"
                    ? "admin.contentDraft.providerGemini"
                    : providerId === "groq"
                      ? "admin.contentDraft.providerGroq"
                      : "admin.contentDraft.providerOpenRouter"
                )}
              </option>
            ))}
          </select>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
            {t("admin.contentDraft.apiKey")}
          </label>
          {contentDraftKeyConfigured ? (
            <p style={{ margin: "0 0 8px", color: "#166534", fontSize: 14, fontWeight: 600 }}>
              {t("admin.contentDraft.apiKeyConfigured")}
            </p>
          ) : null}
          <input
            type={showContentDraftApiKeyMask ? "text" : "password"}
            autoComplete="new-password"
            value={showContentDraftApiKeyMask ? CONTENT_DRAFT_API_KEY_MASK : contentDraftApiKey}
            readOnly={showContentDraftApiKeyMask}
            onFocus={() => {
              if (contentDraftKeyConfigured) setContentDraftApiKeyEditing(true);
            }}
            onBlur={() => {
              if (!contentDraftApiKey.trim()) setContentDraftApiKeyEditing(false);
            }}
            onChange={(event) => setContentDraftApiKey(event.target.value)}
            placeholder={t("admin.contentDraft.apiKeyPlaceholder")}
            aria-label={
              showContentDraftApiKeyMask
                ? t("admin.contentDraft.apiKeyConfigured")
                : t("admin.contentDraft.apiKey")
            }
            style={{
              width: "100%",
              maxWidth: 420,
              minHeight: 42,
              padding: "0 12px",
              border: "1px solid #d9d3e4",
              borderRadius: 8,
              font: "inherit",
              color: showContentDraftApiKeyMask ? "#6b7280" : undefined,
              letterSpacing: showContentDraftApiKeyMask ? "0.14em" : undefined,
              cursor: showContentDraftApiKeyMask ? "text" : undefined,
            }}
          />
          <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 13 }}>
            {t("admin.contentDraft.apiKeyClearHelp")}
          </p>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void handleSaveContentDraft(false)}
              disabled={isSavingContentDraft}
              style={{
                minHeight: 42,
                padding: "0 16px",
                border: 0,
                borderRadius: 999,
                background: "var(--admin-primary)",
                color: "var(--admin-on-primary)",
                fontWeight: 600,
                cursor: isSavingContentDraft ? "wait" : "pointer",
              }}
            >
              {t("admin.contentDraft.save")}
            </button>
            {contentDraftKeyConfigured ? (
              <button
                type="button"
                onClick={() => void handleSaveContentDraft(true)}
                disabled={isSavingContentDraft}
                style={{
                  minHeight: 42,
                  padding: "0 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: 999,
                  background: "var(--admin-surface)",
                  color: "#374151",
                  fontWeight: 600,
                  cursor: isSavingContentDraft ? "wait" : "pointer",
                }}
              >
                {t("admin.contentDraft.clearKey")}
              </button>
            ) : null}
          </div>
        </div>
      )}

      {userIsSuperadmin && (
        <div
          style={{
            marginBottom: 24,
            background: "var(--admin-surface)",
            borderRadius: 12,
            border: "1px solid var(--admin-border-subtle)",
            padding: 24,
          }}
        >
          <GaMeasurementField
            label={t("admin.googleAnalytics.platformTitle")}
            help={t("admin.googleAnalytics.platformHelp")}
            value={platformGaId}
            onChange={(value) => {
              setPlatformGaId(value);
              if (platformGaError) setPlatformGaError("");
            }}
            error={platformGaError}
            hint={t("admin.googleAnalytics.clearHint")}
          />
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => void handleSavePlatformGa()}
              disabled={isSavingPlatformGa}
              style={{
                minHeight: 42,
                padding: "0 16px",
                border: 0,
                borderRadius: 999,
                background: "var(--admin-primary)",
                color: "var(--admin-on-primary)",
                fontWeight: 600,
                cursor: isSavingPlatformGa ? "wait" : "pointer",
              }}
            >
              {isSavingPlatformGa ? t("common.loading") : t("admin.googleAnalytics.save")}
            </button>
          </div>
        </div>
      )}

      {userIsSuperadmin && (
        <div
          style={{
            marginBottom: 24,
            background: "var(--admin-surface)",
            borderRadius: 12,
            border: "1px solid var(--admin-border-subtle)",
            padding: 24,
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 600 }}>
            {t("public.overview.plans.recipient.label")}
          </h2>
          <p style={{ margin: "0 0 16px", color: "var(--admin-muted)" }}>
            {t("public.overview.plans.recipient.help")}
          </p>
          <input
            type="email"
            value={quoteRecipient}
            onChange={(event) => setQuoteRecipient(event.target.value)}
            style={{
              width: "100%",
              maxWidth: 420,
              minHeight: 42,
              padding: "0 12px",
              border: "1px solid #d9d3e4",
              borderRadius: 8,
              font: "inherit",
            }}
          />
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={handleSaveQuoteRecipient}
              disabled={isSavingRecipient}
              style={{
                minHeight: 42,
                padding: "0 16px",
                border: 0,
                borderRadius: 999,
                background: "var(--admin-primary)",
                color: "var(--admin-on-primary)",
                fontWeight: 600,
                cursor: isSavingRecipient ? "wait" : "pointer",
              }}
            >
              {isSavingRecipient
                ? t("public.overview.plans.saving")
                : t("public.overview.plans.recipient.save")}
            </button>
          </div>
        </div>
      )}

      {userIsSuperadmin && (
        <div
          style={{
            marginBottom: 24,
            background: "var(--admin-surface)",
            borderRadius: 12,
            border: "1px solid var(--admin-border-subtle)",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setPublicPlansOpen(!publicPlansOpen)}
            style={{
              width: "100%",
              padding: 24,
              background: publicPlansOpen ? "#f8f9fa" : "white",
              border: "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                fontFamily:
                  "var(--admin-font-display)",
              }}
            >
              {t("public.overview.plansTitle")}
            </h2>
            <span>{publicPlansOpen ? "▾" : "▸"}</span>
          </button>
          {publicPlansOpen && (
            <div style={{ padding: 24, borderTop: "1px solid var(--admin-border-subtle)" }}>
              {isLoadingFeatureMatrix && !featureMatrix ? (
                <LoadingSpinner />
              ) : (
                <PublicPlansEditor
                  planOverrides={featureMatrix?.planOverrides}
                  saving={isSavingPublicPlans}
                  onSave={handleSavePublicPlans}
                />
              )}
            </div>
          )}
        </div>
      )}

      {userIsSuperadmin && (
        <div
          style={{
            marginBottom: 24,
            background: "var(--admin-surface)",
            borderRadius: 12,
            border: "1px solid var(--admin-border-subtle)",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setVisitorLadderOpen(!visitorLadderOpen)}
            style={{
              width: "100%",
              padding: 24,
              background: visitorLadderOpen ? "#f8f9fa" : "white",
              border: "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                fontFamily:
                  "var(--admin-font-display)",
              }}
            >
              {t("admin.visitorLadder.title")}
            </h2>
            <span>{visitorLadderOpen ? "▾" : "▸"}</span>
          </button>
          {visitorLadderOpen && (
            <div style={{ padding: 24, borderTop: "1px solid var(--admin-border-subtle)" }}>
              <VisitorLadderSettings />
            </div>
          )}
        </div>
      )}

      {/* Feature Matrix Configuration Section - Superadmin only */}
      {userIsSuperadmin && (
        <div
          style={{
            marginBottom: 24,
            background: "var(--admin-surface)",
            borderRadius: 12,
            border: "1px solid var(--admin-border-subtle)",
            overflow: "hidden",
          }}
        >
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
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 600,
                  fontFamily:
                    "var(--admin-font-display)",
                }}
              >
                {t("admin.featureMatrix")}
              </h2>
            </div>
            <span
              style={{
                fontSize: 20,
                color: "var(--admin-muted)",
                transition: "transform 0.2s",
                transform: featureMatrixOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▼
            </span>
          </button>
          {featureMatrixOpen && (
            <div style={{ padding: 24, borderTop: "1px solid var(--admin-border-subtle)" }}>
              <p
                style={{
                  color: "var(--admin-muted)",
                  marginBottom: 24,
                  fontSize: 15,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.featureMatrixDescription")}
              </p>

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
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 500,
                    background: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {t("admin.resetToDefaults")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Place Feature Matrix Configuration Section - Superadmin only */}
      {userIsSuperadmin && (
        <div
          style={{
            marginBottom: 24,
            background: "var(--admin-surface)",
            borderRadius: 12,
            border: "1px solid var(--admin-border-subtle)",
            overflow: "hidden",
          }}
        >
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
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 600,
                  fontFamily:
                    "var(--admin-font-display)",
                }}
              >
                {t("admin.placeFeatureMatrix")}
              </h2>
            </div>
            <span
              style={{
                fontSize: 20,
                color: "var(--admin-muted)",
                transition: "transform 0.2s",
                transform: placeFeatureMatrixOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▼
            </span>
          </button>
          {placeFeatureMatrixOpen && (
            <div style={{ padding: 24, borderTop: "1px solid var(--admin-border-subtle)" }}>
              <p
                style={{
                  color: "var(--admin-muted)",
                  marginBottom: 24,
                  fontSize: 15,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.placeFeatureMatrixDescription")}
              </p>

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
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 500,
                    background: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {t("admin.resetToDefaults")}
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
  const plans = ["BASIC", "PRO", "BUSINESS"] as const;
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
    BASIC: {
      limits: {
        placesMax: 5,
        featuredPlacesMax: 0, // Nincs kiemelt helyek
        galleryImagesPerPlaceMax: Infinity, // Korlátlan kép
        eventsPerMonthMax: 15,
        siteMembersMax: Infinity, // Korlátlan tag
        domainAliasesMax: 0, // Nincs egyedi domain
        languagesMax: 1,
        galleriesMax: Infinity,
        imagesPerGalleryMax: Infinity,
        galleriesPerPlaceMax: Infinity,
        galleriesPerEventMax: Infinity,
      },
      features: {
        eventsEnabled: true,
        placeSeoEnabled: false, // Nincs SEO
        extrasEnabled: false,
        customDomainEnabled: false, // Nincs egyedi domain
        eventLogEnabled: false,
        heroImage: true,
        contacts: true,
        siteSeo: false, // Nincs SEO
        canonicalSupport: true,
        multipleDomainAliases: false,
        pushSubscription: false, // Nincs push
      },
    },
    PRO: {
      limits: {
        placesMax: 30,
        featuredPlacesMax: 15,
        galleryImagesPerPlaceMax: 30,
        eventsPerMonthMax: 30,
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
    BUSINESS: {
      limits: {
        placesMax: 30,
        featuredPlacesMax: Infinity,
        galleryImagesPerPlaceMax: Infinity,
        eventsPerMonthMax: 30,
        siteMembersMax: Infinity,
        domainAliasesMax: Infinity,
        languagesMax: Infinity,
        galleriesMax: Infinity,
        imagesPerGalleryMax: Infinity,
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

  const updatePlanValue = (plan: "BASIC" | "PRO" | "BUSINESS", path: string[], value: any) => {
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

  const getValue = (plan: "BASIC" | "PRO" | "BUSINESS", path: string[]): any => {
    const override = featureMatrix.planOverrides?.[plan];
    if (!override) return undefined;

    let current: any = override;
    for (const key of path) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }
    return current;
  };

  const getDisplayValue = (plan: "BASIC" | "PRO" | "BUSINESS", path: string[]): any => {
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
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.placesCount"),
      path: ["limits", "placesMax"],
      type: "number",
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.imagesPerPlace"),
      path: ["limits", "galleryImagesPerPlaceMax"],
      type: "number",
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.heroImage"),
      path: ["features", "heroImage"],
      type: "boolean",
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.contacts"),
      path: ["features", "contacts"],
      type: "boolean",
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.extraFields"),
      path: ["features", "extrasEnabled"],
      type: "boolean",
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.galleriesMax"),
      path: ["limits", "galleriesMax"],
      type: "number",
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.imagesPerGalleryMax"),
      path: ["limits", "imagesPerGalleryMax"],
      type: "number",
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.galleriesPerPlaceMax"),
      path: ["limits", "galleriesPerPlaceMax"],
      type: "number",
    },
    {
      category: t("public.pricing.categories.places"),
      name: t("public.pricing.features.galleriesPerEventMax"),
      path: ["limits", "galleriesPerEventMax"],
      type: "number",
    },
    // Visibility
    {
      category: t("public.pricing.categories.visibility"),
      name: t("public.pricing.features.featuredPlaces"),
      path: ["limits", "featuredPlacesMax"],
      type: "number",
    },
    {
      category: t("public.pricing.categories.visibility"),
      name: t("public.pricing.features.featuredBoost"),
      path: ["features", "featuredBoost"],
      type: "boolean",
    },
    // Events
    {
      category: t("public.pricing.categories.events"),
      name: t("public.pricing.features.eventsEnabled"),
      path: ["features", "eventsEnabled"],
      type: "boolean",
    },
    {
      category: t("public.pricing.categories.events"),
      name: t("public.pricing.features.eventsPerMonth"),
      path: ["limits", "eventsPerMonthMax"],
      type: "number",
    },
    // SEO
    {
      category: t("public.pricing.categories.seo"),
      name: t("public.pricing.features.siteSeo"),
      path: ["features", "siteSeo"],
      type: "boolean",
    },
    {
      category: t("public.pricing.categories.seo"),
      name: t("public.pricing.features.placeSeo"),
      path: ["features", "placeSeoEnabled"],
      type: "boolean",
    },
    {
      category: t("public.pricing.categories.seo"),
      name: t("public.pricing.features.canonicalSupport"),
      path: ["features", "canonicalSupport"],
      type: "boolean",
    },
    // Domain
    {
      category: t("public.pricing.categories.domain"),
      name: t("public.pricing.features.customDomain"),
      path: ["features", "customDomainEnabled"],
      type: "boolean",
    },
    {
      category: t("public.pricing.categories.domain"),
      name: t("public.pricing.features.multipleDomainAliases"),
      path: ["features", "multipleDomainAliases"],
      type: "boolean",
    },
    // Languages
    {
      category: t("public.pricing.categories.languages"),
      name: t("public.pricing.features.additionalLanguages"),
      path: ["limits", "languagesMax"],
      type: "number",
    },
    // Permissions
    {
      category: t("public.pricing.categories.permissions"),
      name: t("public.pricing.features.siteMembers"),
      path: ["limits", "siteMembersMax"],
      type: "number",
    },
    // Admin
    {
      category: t("public.pricing.categories.admin"),
      name: t("public.pricing.features.eventLog"),
      path: ["features", "eventLogEnabled"],
      type: "boolean",
    },
    // Push
    {
      category: t("public.pricing.categories.push"),
      name: t("public.pricing.features.pushSubscription"),
      path: ["features", "pushSubscription"],
      type: "string",
    },
  ];

  return (
    <div
      style={{
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        borderRadius: 8,
        border: "1px solid var(--admin-border-subtle)",
        background: "var(--admin-surface)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: isMobile ? 600 : 800,
        }}
      >
        <thead>
          <tr
            style={{
              background: "var(--admin-primary)",
              borderBottom: "2px solid #dee2e6",
            }}
          >
            <th
              style={{
                padding: isMobile ? "10px 8px" : "16px 12px",
                textAlign: "left",
                fontSize: isMobile ? 12 : 14,
                fontWeight: 600,
                color: "white",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                position: "sticky",
                left: 0,
                background: "var(--admin-primary)",
                zIndex: 10,
              }}
            >
              {t("public.pricing.featureMatrix.feature")}
            </th>
            {plans.map((plan) => {
              const planLabels: Record<"BASIC" | "PRO" | "BUSINESS", string> = {
                BASIC: t("admin.planBasic"),
                PRO: t("admin.planPro"),
                BUSINESS: t("admin.planBusiness"),
              };
              return (
                <th
                  key={plan}
                  style={{
                    padding: isMobile ? "10px 8px" : "16px 12px",
                    textAlign: "center",
                    fontSize: isMobile ? 12 : 14,
                    fontWeight: 600,
                    color: "white",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
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
                <td
                  style={{
                    padding: isMobile ? "10px 8px" : "14px 12px",
                    fontSize: isMobile ? 12 : 14,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    position: "sticky",
                    left: 0,
                    background: "var(--admin-surface)",
                    zIndex: 5,
                    boxShadow: "2px 0 4px rgba(0,0,0,0.05)",
                  }}
                >
                  {showCategory && (
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#495057",
                        marginBottom: 4,
                        fontSize: isMobile ? 11 : 13,
                      }}
                    >
                      {feature.category}
                    </div>
                  )}
                  <div
                    style={{
                      paddingLeft: showCategory ? 0 : isMobile ? 12 : 20,
                      fontSize: isMobile ? 12 : 14,
                    }}
                  >
                    {feature.name}
                  </div>
                </td>
                {plans.map((plan) => {
                  const value = getDisplayValue(plan, feature.path);
                  const override = getValue(plan, feature.path);
                  const isOverridden = override !== undefined;

                  // Get default value for placeholder
                  const placeholderValue = (() => {
                    if (
                      feature.path[0] === "limits" &&
                      feature.path[1] &&
                      feature.type === "number"
                    ) {
                      const key = feature.path[1];
                      const limits = defaultDefs[plan].limits as Record<string, any>;
                      return limits[key]?.toString() || "";
                    }
                    if (
                      feature.path[0] === "features" &&
                      feature.path[1] &&
                      feature.type === "string"
                    ) {
                      const key = feature.path[1];
                      const features = defaultDefs[plan].features as Record<string, any>;
                      const defaultValue = features[key];
                      return typeof defaultValue === "string" ? defaultValue : "";
                    }
                    return "";
                  })();

                  return (
                    <td
                      key={plan}
                      style={{
                        padding: isMobile ? "10px 6px" : "14px 12px",
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {feature.type === "boolean" ? (
                          <input
                            type="checkbox"
                            checked={value === true}
                            onChange={(e) => updatePlanValue(plan, feature.path, e.target.checked)}
                            style={{
                              width: isMobile ? 18 : 20,
                              height: isMobile ? 18 : 20,
                              cursor: "pointer",
                              accentColor: isOverridden ? "var(--admin-primary)" : "#6c757d",
                            }}
                          />
                        ) : feature.type === "number" ? (
                          <input
                            type="number"
                            value={value === Infinity || value === "∞" ? "∞" : value || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "∞" || val === "") {
                                updatePlanValue(
                                  plan,
                                  feature.path,
                                  val === "∞" ? Infinity : undefined
                                );
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
                              border: `2px solid ${isOverridden ? "var(--admin-primary)" : "#ced4da"}`,
                              borderRadius: 6,
                              textAlign: "center",
                              fontFamily:
                                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                              transition: "all 0.2s",
                              outline: "none",
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = "var(--admin-primary)";
                              e.currentTarget.style.boxShadow =
                                "0 0 0 3px rgba(37, 99, 235, 0.1)";
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
                              border: `2px solid ${isOverridden ? "var(--admin-primary)" : "#ced4da"}`,
                              borderRadius: 6,
                              textAlign: "center",
                              fontFamily:
                                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                              transition: "all 0.2s",
                              outline: "none",
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = "var(--admin-primary)";
                              e.currentTarget.style.boxShadow =
                                "0 0 0 3px rgba(37, 99, 235, 0.1)";
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          />
                        )}
                        {isOverridden && (
                          <div
                            style={{
                              fontSize: isMobile ? 9 : 10,
                              color: "var(--admin-primary)",
                              marginTop: 2,
                              fontWeight: 500,
                            }}
                          >
                            {t("admin.overridden")}
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
    return defaultDefs[plan][field as keyof (typeof defaultDefs)[typeof plan]];
  };

  const features = [
    {
      name: t("public.pricing.features.placeImages"),
      field: "images",
      type: "number",
    },
    {
      name: t("public.pricing.features.eventsPerPlace"),
      field: "events",
      type: "number",
    },
    {
      name: t("public.pricing.features.featuredPlacement"),
      field: "featured",
      type: "boolean",
    },
  ];

  return (
    <div
      style={{
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        borderRadius: 8,
        border: "1px solid var(--admin-border-subtle)",
        background: "var(--admin-surface)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: isMobile ? 500 : 600,
        }}
      >
        <thead>
          <tr
            style={{
              background: "var(--admin-danger, #b91c1c)",
              borderBottom: "2px solid #dee2e6",
            }}
          >
            <th
              style={{
                padding: isMobile ? "10px 8px" : "16px 12px",
                textAlign: "left",
                fontSize: isMobile ? 12 : 14,
                fontWeight: 600,
                color: "white",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                position: "sticky",
                left: 0,
                background: "var(--admin-danger, #b91c1c)",
                zIndex: 10,
              }}
            >
              {t("public.pricing.featureMatrix.feature")}
            </th>
            {plans.map((plan) => {
              const planLabels: Record<"free" | "basic" | "pro", string> = {
                free: t("admin.planFree"),
                basic: t("admin.planBasic"),
                pro: t("admin.planPro"),
              };
              return (
                <th
                  key={plan}
                  style={{
                    padding: isMobile ? "10px 8px" : "16px 12px",
                    textAlign: "center",
                    fontSize: isMobile ? 12 : 14,
                    fontWeight: 600,
                    color: "white",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
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
                <td
                  style={{
                    padding: isMobile ? "10px 8px" : "14px 12px",
                    fontSize: isMobile ? 12 : 14,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    position: "sticky",
                    left: 0,
                    background: "var(--admin-surface)",
                    zIndex: 5,
                    boxShadow: "2px 0 4px rgba(0,0,0,0.05)",
                  }}
                >
                  {feature.name}
                </td>
                {plans.map((plan) => {
                  const value = getDisplayValue(plan, feature.field);
                  const override = getValue(plan, feature.field);
                  const isOverridden = override !== undefined;

                  const placeholderValue =
                    defaultDefs[plan][
                      feature.field as keyof (typeof defaultDefs)[typeof plan]
                    ]?.toString() || "";

                  return (
                    <td
                      key={plan}
                      style={{
                        padding: isMobile ? "10px 6px" : "14px 12px",
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
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
                                updatePlanValue(
                                  plan,
                                  feature.field,
                                  val === "∞" ? Infinity : undefined
                                );
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
                              fontFamily:
                                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                          <div
                            style={{
                              fontSize: isMobile ? 9 : 10,
                              color: "#f5576c",
                              marginTop: 2,
                              fontWeight: 500,
                            }}
                          >
                            {t("admin.overridden")}
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

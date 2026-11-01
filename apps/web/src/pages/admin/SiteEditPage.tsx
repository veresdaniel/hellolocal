// src/pages/admin/SiteEditPage.tsx
import { useState, useEffect, useContext, useRef } from "react";
import { appendExtraLanguages, mergeTranslations, patchLang, readLang } from "../../utils/langFields";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../contexts/ToastContext";
import { AuthContext } from "../../contexts/AuthContext";
import { useConfirm } from "../../hooks/useConfirm";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { SiteLanguagesEditor } from "../../components/SiteLanguagesEditor";
import { LanguageSelectOptions } from "../../components/LanguageSelectOptions";
import { AiPostfixField } from "../../components/AiGeneratePostfixButton";
import { LANG_VALUES, type Lang } from "../../types/enums";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { uploadService } from "../../services/upload/uploadService";
import { MapComponent } from "../../components/MapComponent";
import {
  getSite,
  updateSite,
  getBrands,
  getSiteInstances,
  createSiteInstance,
  updateSiteInstance,
  deleteSiteInstance,
  getTowns,
  type Site,
  type Brand,
  type SiteInstance,
} from "../../api/admin.api";
import {
  getSiteSubscription,
  getSiteEntitlements,
  updateSiteSubscription,
  cancelSubscription,
  resumeSubscription,
  type SiteSubscription,
  type SiteEntitlements,
} from "../../api/admin.api";
import { SiteAnalyticsPage } from "./SiteAnalyticsPage";
import { regionAddress } from "../../app/urls";
import { isValidGaMeasurementIdInput } from "../../lib/gaMeasurementId";
import {
  DEFAULT_PUBLIC_THEME_COLORS,
  isValidHexColor,
  resolvePublicThemeColors,
  type PublicThemeColors,
} from "../../styles/publicThemeColors";
import { PublicThemeColorsEditor } from "../../components/PublicThemeColorsEditor";

type TabId =
  | "overview"
  | "domain"
  | "instances"
  | "appearance"
  | "map"
  | "features"
  | "subscription"
  | "analytics";

const SITE_EDIT_TABS: TabId[] = [
  "overview",
  "domain",
  "instances",
  "appearance",
  "map",
  "features",
  "subscription",
  "analytics",
];

function isSiteEditTab(value: string | null): value is TabId {
  return !!value && (SITE_EDIT_TABS as string[]).includes(value);
}

export function SiteEditPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  usePageTitle("admin.sites");

  const [site, setSite] = useState<Site | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [siteInstances, setSiteInstances] = useState<SiteInstance[]>([]);
  const [towns, setTowns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize activeTab from URL query param or default to "overview"
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabId>(
    isSiteEditTab(tabFromUrl) ? tabFromUrl : "overview"
  );

  const selectTab = (tab: TabId) => {
    setActiveTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true }
    );
  };

  // Update tab when URL changes
  useEffect(() => {
    const nextTab = searchParams.get("tab");
    if (isSiteEditTab(nextTab)) {
      setActiveTab(nextTab);
    }
  }, [searchParams]);
  const [formData, setFormData] = useState({
    // Overview tab
    nameHu: "",
    nameEn: "",
    nameDe: "",
    shortDescriptionHu: "",
    shortDescriptionEn: "",
    shortDescriptionDe: "",
    descriptionHu: "",
    descriptionEn: "",
    descriptionDe: "",
    heroImageHu: "",
    heroImageEn: "",
    heroImageDe: "",
    landingHtmlHu: "",
    landingHtmlEn: "",
    landingHtmlDe: "",
    listIntroHtmlHu: "",
    listIntroHtmlEn: "",
    listIntroHtmlDe: "",
    listIntroImageHu: "",
    listIntroImageEn: "",
    listIntroImageDe: "",
    isActive: true,
    brandId: "",
    // Subscription tab
    plan: "basic" as "basic" | "pro" | "business" | "municipal",
    planStatus: "active",
    planValidUntil: "",
    allowPublicRegistration: true,
    showAdvanced: false,
    gaMeasurementId: "",
    themeColors: { ...DEFAULT_PUBLIC_THEME_COLORS } as PublicThemeColors,
    // Domain tab - will be handled separately
    // Appearance tab - will be handled via SiteInstance
    // Map tab - will be handled via SiteInstance
    // Features tab - will be handled via SiteInstance
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      loadSite();
      loadBrands();
      loadSiteInstances();
      loadTowns();
    }
  }, [id]);

  const loadSite = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await getSite(id);
      setSite(data);

      // Use SiteInstances from getSite API if available (fallback)
      if (data.siteInstances && data.siteInstances.length > 0) {
        setSiteInstances(data.siteInstances);
      } else if (data.translations && data.translations.length > 0) {
        // If no SiteInstances but translations exist, try to create them automatically
        console.warn(
          `[SiteEditPage] No SiteInstances found, but ${data.translations.length} translations exist. Attempting to create SiteInstances...`
        );
        const createdInstances: SiteInstance[] = [];
        let isFirst = true;

        for (const translation of data.translations) {
          try {
            const newInstance = await createSiteInstance({
              siteId: data.id,
              lang: translation.lang as Lang,
              isDefault: isFirst,
              features: {
                isCrawlable: true,
                enableEvents: true,
                enableBlog: false,
                enableStaticPages: true,
              },
            });
            createdInstances.push(newInstance);
            isFirst = false;
          } catch (err: any) {
            console.error(
              `[SiteEditPage] Failed to create SiteInstance for lang ${translation.lang}:`,
              err
            );
            // Continue with other languages even if one fails
          }
        }

        if (createdInstances.length > 0) {
          setSiteInstances(createdInstances);
          showToast(
            t("admin.siteEdit.siteInstancesCreated", { n: createdInstances.length }),
            "success"
          );
        }
      }

      // Populate form data
      const translationHu = data.translations.find((t) => t.lang === "hu");
      const translationEn = data.translations.find((t) => t.lang === "en");
      const translationDe = data.translations.find((t) => t.lang === "de");

      setFormData(mergeTranslations({
        nameHu: translationHu?.name || "",
        nameEn: translationEn?.name || "",
        nameDe: translationDe?.name || "",
        shortDescriptionHu: translationHu?.shortDescription || "",
        shortDescriptionEn: translationEn?.shortDescription || "",
        shortDescriptionDe: translationDe?.shortDescription || "",
        descriptionHu: translationHu?.description || "",
        descriptionEn: translationEn?.description || "",
        descriptionDe: translationDe?.description || "",
        heroImageHu: translationHu?.heroImage || "",
        heroImageEn: translationEn?.heroImage || "",
        heroImageDe: translationDe?.heroImage || "",
        landingHtmlHu: translationHu?.landingHtml || "",
        landingHtmlEn: translationEn?.landingHtml || "",
        landingHtmlDe: translationDe?.landingHtml || "",
        listIntroHtmlHu: translationHu?.listIntroHtml || "",
        listIntroHtmlEn: translationEn?.listIntroHtml || "",
        listIntroHtmlDe: translationDe?.listIntroHtml || "",
        listIntroImageHu: translationHu?.listIntroImage || "",
        listIntroImageEn: translationEn?.listIntroImage || "",
        listIntroImageDe: translationDe?.listIntroImage || "",
        isActive: data.isActive,
        brandId: data.brandId,
        plan: data.plan || "basic",
        planStatus: data.planStatus || "active",
        planValidUntil: data.planValidUntil
          ? new Date(data.planValidUntil).toISOString().split("T")[0]
          : "",
        allowPublicRegistration: data.allowPublicRegistration ?? true,
        showAdvanced: false,
        gaMeasurementId: data.gaMeasurementId ?? "",
        themeColors: resolvePublicThemeColors(data.theme, data.brand?.theme),
      }, data.translations, [
        "name",
        "shortDescription",
        "description",
        "heroImage",
        "landingHtml",
        "listIntroHtml",
        "listIntroImage",
      ]));
    } catch (err) {
      showToast(t("admin.errors.loadSiteFailed"), "error");
      console.error("Failed to load site", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      const data = await getBrands();
      setBrands(data);
    } catch (err) {
      console.error("Failed to load brands", err);
    }
  };

  const loadSiteInstances = async () => {
    if (!id) return;
    try {
      const data = await getSiteInstances(id);
      if (data && data.length > 0) {
        setSiteInstances(data);
      } else {
        console.warn(`[SiteEditPage] No SiteInstances returned from API for site ${id}`);
        // Keep existing SiteInstances from getSite API if available
      }
    } catch (err) {
      console.error("Failed to load site instances", err);
      // Don't clear existing SiteInstances if load fails - keep what we got from getSite
    }
  };

  const loadTowns = async () => {
    if (!id) return;
    try {
      const data = await getTowns(id);
      setTowns(Array.isArray(data) ? data : (data as { towns: any[] }).towns || []);
    } catch (err) {
      console.error("Failed to load towns", err);
    }
  };

  const handleSave = async () => {
    if (!id || !site) return;

    setIsSaving(true);
    setFormErrors({});

    try {
      if (!isValidGaMeasurementIdInput(formData.gaMeasurementId)) {
        setFormErrors({ gaMeasurementId: t("admin.googleAnalytics.invalidId") });
        showToast(t("admin.googleAnalytics.invalidId"), "error");
        setIsSaving(false);
        return;
      }

      const colors = formData.themeColors as PublicThemeColors;
      for (const value of Object.values(colors || {})) {
        if (!isValidHexColor(value)) {
          setFormErrors({ themeColors: t("admin.themeColors.invalidHex") });
          showToast(t("admin.themeColors.invalidHex"), "error");
          setIsSaving(false);
          return;
        }
      }

      const translations = [];
      if (formData.nameHu) {
        translations.push({
          lang: "hu" as const,
          name: formData.nameHu,
          shortDescription: formData.shortDescriptionHu || null,
          description: formData.descriptionHu || null,
          heroImage: formData.heroImageHu || null,
          landingHtml: formData.landingHtmlHu || null,
          listIntroHtml: formData.listIntroHtmlHu || null,
          listIntroImage: formData.listIntroImageHu || null,
        });
      }
      if (formData.nameEn) {
        translations.push({
          lang: "en" as const,
          name: formData.nameEn,
          shortDescription: formData.shortDescriptionEn || null,
          description: formData.descriptionEn || null,
          heroImage: formData.heroImageEn || null,
          landingHtml: formData.landingHtmlEn || null,
          listIntroHtml: formData.listIntroHtmlEn || null,
          listIntroImage: formData.listIntroImageEn || null,
        });
      }
      if (formData.nameDe) {
        translations.push({
          lang: "de" as const,
          name: formData.nameDe,
          shortDescription: formData.shortDescriptionDe || null,
          description: formData.descriptionDe || null,
          heroImage: formData.heroImageDe || null,
          landingHtml: formData.landingHtmlDe || null,
          listIntroHtml: formData.listIntroHtmlDe || null,
          listIntroImage: formData.listIntroImageDe || null,
        });
      }
      appendExtraLanguages(translations, formData, "name", [
        "shortDescription",
        "description",
        "heroImage",
        "landingHtml",
        "listIntroHtml",
        "listIntroImage",
      ]);

      const updateData = {
        brandId: formData.brandId,
        isActive: formData.isActive,
        translations,
        plan: formData.plan,
        planStatus: formData.planStatus,
        planValidUntil: formData.planValidUntil
          ? new Date(formData.planValidUntil).toISOString()
          : null,
        gaMeasurementId: formData.gaMeasurementId.trim()
          ? formData.gaMeasurementId.trim().toUpperCase()
          : null,
        theme: { colors },
      };

      await updateSite(id, updateData);
      showToast(t("admin.siteUpdated"), "success");
      await loadSite();
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message || err?.message || t("admin.errors.updateSiteFailed");
      showToast(errorMessage, "error");
      if (err?.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (!site) {
    return <div>{t("admin.siteNotFound")}</div>;
  }

  const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
  const currentTranslation =
    site.translations.find((t) => t.lang === currentLang) || site.translations[0];

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "overview", label: t("admin.siteEdit.tabs.overview") },
    { id: "domain", label: t("admin.siteEdit.tabs.domain") },
    { id: "instances", label: t("admin.siteEdit.tabs.instances") },
    { id: "appearance", label: t("admin.siteEdit.tabs.appearance") },
    { id: "map", label: t("admin.siteEdit.tabs.map") },
    { id: "features", label: t("admin.siteEdit.tabs.features") },
    { id: "subscription", label: t("admin.siteEdit.tabs.subscription") },
    { id: "analytics", label: t("admin.siteEdit.tabs.analytics") },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <AdminPageHeader
        title={currentTranslation?.name || site.slug}
        isCreatingOrEditing={true}
        onSave={handleSave}
        onCancel={() => {
          // Back button will handle navigation to sites list
        }}
        saveLabel={t("common.save")}
        cancelLabel={t("common.cancel")}
      />

      {/* Status chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <span
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            background: site.isActive ? "#10b981" : "#6b7280",
            color: "white",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 600,
          }}
        >
          {site.isActive ? t("common.active") : t("common.inactive")}
        </span>
        <span
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            background: "#3b82f6",
            color: "white",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 600,
          }}
        >
          {t("admin.plan")}: {formData.plan}
        </span>
        {(site.primaryDomain ||
          site.siteDomains?.find((item) => item.isPrimary)?.domain ||
          site.siteDomains?.[0]?.domain) && (
          <span
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              background: "#8b5cf6",
              color: "white",
              fontSize: "clamp(14px, 3.5vw, 16px)",
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontWeight: 600,
            }}
          >
            {site.primaryDomain ||
              site.siteDomains?.find((item) => item.isPrimary)?.domain ||
              site.siteDomains?.[0]?.domain}
          </span>
        )}
      </div>

      <SiteLanguagesEditor
        siteId={site.id}
        languages={site.languages ?? []}
        onChanged={loadSite}
      />

      {/* Tabs */}
      <div
        style={{
          background: "white",
          borderRadius: 16,
          marginBottom: 24,
          boxShadow: "0 8px 24px rgba(102, 126, 234, 0.15)",
          border: "1px solid rgba(102, 126, 234, 0.1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 0,
            overflowX: "auto",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              style={{
                padding: "16px 24px",
                border: "none",
                borderBottom: activeTab === tab.id ? "3px solid #667eea" : "3px solid transparent",
                background: "transparent",
                color: activeTab === tab.id ? "#667eea" : "#6b7280",
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = "#667eea";
                  e.currentTarget.style.background = "#f9fafb";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = "#6b7280";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div
          style={{
            padding: "clamp(24px, 5vw, 32px)",
            minHeight: 400,
          }}
        >
          {activeTab === "overview" && (
            <OverviewTab
              site={site}
              formData={formData}
              setFormData={setFormData}
              brands={brands}
              formErrors={formErrors}
            />
          )}
          {activeTab === "domain" && (
            <DomainTab site={site} onUpdate={loadSite} showToast={showToast} t={t} />
          )}
          {activeTab === "instances" && (
            <InstancesTab
              site={site}
              siteInstances={siteInstances}
              onUpdate={loadSiteInstances}
              showToast={showToast}
              t={t}
            />
          )}
          {activeTab === "appearance" && (
            <AppearanceTab
              site={site}
              siteInstances={siteInstances}
              brands={brands}
              onUpdate={loadSiteInstances}
              onGoToInstances={() => selectTab("instances")}
              showToast={showToast}
              t={t}
            />
          )}
          {activeTab === "map" && (
            <MapTab
              site={site}
              siteInstances={siteInstances}
              towns={towns}
              onUpdate={loadSiteInstances}
              onGoToInstances={() => selectTab("instances")}
              showToast={showToast}
              t={t}
            />
          )}
          {activeTab === "features" && (
            <FeaturesTab
              site={site}
              siteInstances={siteInstances}
              onUpdate={loadSiteInstances}
              onGoToInstances={() => selectTab("instances")}
              showToast={showToast}
              t={t}
            />
          )}
          {activeTab === "subscription" && (
            <SubscriptionTab
              site={site}
              formData={formData}
              setFormData={setFormData}
              formErrors={formErrors}
              currentUser={currentUser}
              onUpdate={loadSite}
              showToast={showToast}
              t={t}
            />
          )}
          {activeTab === "analytics" && (
            <div>
              <SiteAnalyticsPage />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  site,
  formData,
  setFormData,
  brands,
  formErrors,
}: {
  site: Site;
  formData: any;
  setFormData: (data: any) => void;
  brands: Brand[];
  formErrors: Record<string, string>;
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const heroFileRef = useRef<HTMLInputElement>(null);
  const listIntroFileRef = useRef<HTMLInputElement>(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [listIntroUploading, setListIntroUploading] = useState(false);

  return (
    <div>
      <h3
        style={{
          marginBottom: 24,
          fontSize: "clamp(20px, 5vw, 24px)",
          fontWeight: 700,
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#667eea",
        }}
      >
        {t("admin.siteEdit.overview.title")}
      </h3>

      <div style={{ marginBottom: 24 }}>
        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontWeight: 500,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.domain")}
        </label>
        <select
          value={formData.brandId}
          onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          <option value="">{t("admin.selectDomain")}</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      <LanguageAwareForm>
        {(selectedLang) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 500,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("common.name")} ({selectedLang.toUpperCase()}) *
              </label>
              <AiPostfixField
                draft={{
                  kind: "site",
                  field: "name",
                  lang: selectedLang,
                  siteId: id,
                  name: readLang(formData, "name", selectedLang),
                }}
                value={readLang(formData, "name", selectedLang)}
                onApply={(text) => setFormData(patchLang(formData, "name", selectedLang, text))}
              >
              <input
                type="text"
                value={
                  readLang(formData, "name", selectedLang)
                }
                onChange={(e) => {
                  setFormData(patchLang(formData, "name", selectedLang, e.target.value));
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              />
              </AiPostfixField>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 500,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.shortDescription")} ({selectedLang.toUpperCase()})
              </label>
              <TipTapEditorWithUpload
                value={
                  readLang(formData, "shortDescription", selectedLang)
                }
                onChange={(value) => {
                  setFormData(patchLang(formData, "shortDescription", selectedLang, value));
                }}
                aiDraft={{
                  kind: "site",
                  field: "shortDescription",
                  lang: selectedLang,
                  siteId: id,
                  name: readLang(formData, "name", selectedLang),
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 500,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.description")} ({selectedLang.toUpperCase()})
              </label>
              <TipTapEditorWithUpload
                value={
                  readLang(formData, "description", selectedLang)
                }
                onChange={(value) => {
                  setFormData(patchLang(formData, "description", selectedLang, value));
                }}
                aiDraft={{
                  kind: "site",
                  field: "description",
                  lang: selectedLang,
                  siteId: id,
                  name: readLang(formData, "name", selectedLang),
                }}
              />
            </div>

            <div
              style={{
                marginTop: 8,
                padding: 16,
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                background: "#f9fafb",
              }}
            >
              <h4
                style={{
                  margin: "0 0 8px",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#374151",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.siteEdit.overview.landingTitle")} ({selectedLang.toUpperCase()})
              </h4>
              <p
                style={{
                  margin: "0 0 16px",
                  color: "#6b7280",
                  fontSize: 14,
                  lineHeight: 1.5,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.siteEdit.overview.landingHint")}
              </p>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 500,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.heroImage")} ({selectedLang.toUpperCase()})
              </label>
              <input
                type="text"
                value={readLang(formData, "heroImage", selectedLang)}
                onChange={(e) => {
                  setFormData(patchLang(formData, "heroImage", selectedLang, e.target.value));
                }}
                placeholder="https://..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  boxSizing: "border-box",
                }}
              />
              <input
                ref={heroFileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setHeroUploading(true);
                  try {
                    const url = await uploadService.uploadImage(file, { folder: "sites/hero" });
                    setFormData((current: typeof formData) =>
                      patchLang(current, "heroImage", selectedLang, url)
                    );
                  } catch (error) {
                    showToast(
                      error instanceof Error ? error.message : t("admin.errors.updateSiteFailed"),
                      "error"
                    );
                  } finally {
                    setHeroUploading(false);
                  }
                }}
              />
              <button
                type="button"
                disabled={heroUploading}
                onClick={() => heroFileRef.current?.click()}
                style={{
                  marginTop: 8,
                  padding: "8px 16px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: heroUploading ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {heroUploading ? t("admin.common.uploading") : t("admin.siteEdit.overview.uploadHero")}
              </button>
              {readLang(formData, "heroImage", selectedLang) ? (
                <img
                  src={readLang(formData, "heroImage", selectedLang)}
                  alt=""
                  style={{ marginTop: 8, maxWidth: "100%", maxHeight: 200, borderRadius: 6, display: "block" }}
                />
              ) : null}
              <label
                style={{
                  display: "block",
                  margin: "16px 0 8px",
                  fontWeight: 500,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.siteEdit.overview.landingBody")} ({selectedLang.toUpperCase()})
              </label>
              <TipTapEditorWithUpload
                value={readLang(formData, "landingHtml", selectedLang)}
                onChange={(value) => {
                  setFormData(patchLang(formData, "landingHtml", selectedLang, value));
                }}
                uploadFolder="sites/landing"
                aiDraft={{
                  kind: "site",
                  field: "content",
                  lang: selectedLang,
                  siteId: id,
                  name: readLang(formData, "name", selectedLang),
                  contextHints: "Landing page body",
                }}
              />
            </div>

            <div
              style={{
                marginTop: 8,
                padding: 16,
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                background: "#f9fafb",
              }}
            >
              <h4
                style={{
                  margin: "0 0 8px",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#374151",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.siteEdit.overview.listIntroTitle")} ({selectedLang.toUpperCase()})
              </h4>
              <p
                style={{
                  margin: "0 0 16px",
                  color: "#6b7280",
                  fontSize: 14,
                  lineHeight: 1.5,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.siteEdit.overview.listIntroHint")}
              </p>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 500,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.siteEdit.overview.listIntroImage")} ({selectedLang.toUpperCase()})
              </label>
              <input
                type="text"
                value={readLang(formData, "listIntroImage", selectedLang)}
                onChange={(e) => {
                  setFormData(patchLang(formData, "listIntroImage", selectedLang, e.target.value));
                }}
                placeholder="https://..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  boxSizing: "border-box",
                }}
              />
              <input
                ref={listIntroFileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setListIntroUploading(true);
                  try {
                    const url = await uploadService.uploadImage(file, { folder: "sites/list-intro" });
                    setFormData((current: typeof formData) =>
                      patchLang(current, "listIntroImage", selectedLang, url)
                    );
                  } catch (error) {
                    showToast(
                      error instanceof Error ? error.message : t("admin.errors.updateSiteFailed"),
                      "error"
                    );
                  } finally {
                    setListIntroUploading(false);
                  }
                }}
              />
              <button
                type="button"
                disabled={listIntroUploading}
                onClick={() => listIntroFileRef.current?.click()}
                style={{
                  marginTop: 8,
                  padding: "8px 16px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: listIntroUploading ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {listIntroUploading
                  ? t("admin.common.uploading")
                  : t("admin.siteEdit.overview.uploadListIntroImage")}
              </button>
              {readLang(formData, "listIntroImage", selectedLang) ? (
                <img
                  src={readLang(formData, "listIntroImage", selectedLang)}
                  alt=""
                  style={{ marginTop: 8, maxWidth: "100%", maxHeight: 200, borderRadius: 6, display: "block" }}
                />
              ) : null}
              <label
                style={{
                  display: "block",
                  margin: "16px 0 8px",
                  fontWeight: 500,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.siteEdit.overview.listIntroBody")} ({selectedLang.toUpperCase()})
              </label>
              <TipTapEditorWithUpload
                value={readLang(formData, "listIntroHtml", selectedLang)}
                onChange={(value) => {
                  setFormData(patchLang(formData, "listIntroHtml", selectedLang, value));
                }}
                uploadFolder="sites/list-intro"
                aiDraft={{
                  kind: "site",
                  field: "intro",
                  lang: selectedLang,
                  siteId: id,
                  name: readLang(formData, "name", selectedLang),
                  contextHints: "Places list intro",
                }}
              />
            </div>
          </div>
        )}
      </LanguageAwareForm>

      <div style={{ marginTop: 24 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
          />
          <span
            style={{
              fontSize: "clamp(14px, 3.5vw, 16px)",
              fontWeight: 500,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("common.active")}
          </span>
        </label>
      </div>

      <div style={{ marginTop: 24, maxWidth: 420 }}>
        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontWeight: 500,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.googleAnalytics.siteLabel")}
        </label>
        <p
          style={{
            margin: "0 0 8px",
            color: "#6b7280",
            fontSize: 13,
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.googleAnalytics.siteHelp")}
        </p>
        <input
          type="text"
          value={formData.gaMeasurementId}
          onChange={(e) => setFormData({ ...formData, gaMeasurementId: e.target.value })}
          placeholder="G-XXXXXXXX"
          autoComplete="off"
          spellCheck={false}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: formErrors.gaMeasurementId ? "1px solid #dc2626" : "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        />
        {formErrors.gaMeasurementId ? (
          <p style={{ margin: "6px 0 0", color: "#dc2626", fontSize: 13 }}>
            {formErrors.gaMeasurementId}
          </p>
        ) : (
          <p style={{ margin: "6px 0 0", color: "#9ca3af", fontSize: 12 }}>
            {t("admin.googleAnalytics.clearHint")}
          </p>
        )}
      </div>

      <div style={{ marginTop: 32 }}>
        <h3
          style={{
            margin: "0 0 8px",
            fontSize: 18,
            fontWeight: 600,
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.themeColors.title")}
        </h3>
        <p
          style={{
            margin: "0 0 16px",
            color: "#6b7280",
            fontSize: 13,
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.themeColors.helpSite")}
        </p>
        <PublicThemeColorsEditor
          value={(formData.themeColors as PublicThemeColors) || DEFAULT_PUBLIC_THEME_COLORS}
          onChange={(next) => setFormData({ ...formData, themeColors: next })}
        />
        {formErrors.themeColors ? (
          <p style={{ margin: "8px 0 0", color: "#dc2626", fontSize: 13 }}>
            {formErrors.themeColors}
          </p>
        ) : null}
      </div>

      {/* Quick actions */}
      <div
        style={{
          marginTop: 32,
          padding: 20,
          background: "#f9fafb",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
        }}
      >
        <h4
          style={{
            marginBottom: 16,
            fontSize: 18,
            fontWeight: 600,
            color: "#374151",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.siteEdit.quickActions")}
        </h4>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() =>
              window.open(
                regionAddress({
                  lang: site.languages?.[0] || "hu",
                  slug: site.slug,
                  primaryDomain: site.primaryDomain || site.siteDomains?.find((item) => item.isPrimary)?.domain,
                }),
                "_blank"
              )
            }
            style={{
              padding: "10px 20px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              background: "white",
              color: "#374151",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
              e.currentTarget.style.borderColor = "#9ca3af";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "white";
              e.currentTarget.style.borderColor = "#d1d5db";
            }}
          >
            {t("admin.siteEdit.openPublicPage")}
          </button>
        </div>
      </div>
    </div>
  );
}

type DomainRow = { key: string; domain: string; defaultLang: string; isPrimary: boolean };

function domainRowsFromSite(site: Site, siteDefault: string): DomainRow[] {
  const stored = [...(site.siteDomains ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  if (!stored.length && site.primaryDomain) {
    return [
      { key: "primary", domain: site.primaryDomain, defaultLang: "", isPrimary: true },
      blankDomainRow(false),
    ];
  }
  if (!stored.length) return [blankDomainRow(true), blankDomainRow(false)];
  const rows = stored.map((item) => ({
    key: item.id,
    domain: item.domain,
    defaultLang: item.defaultLang && item.defaultLang !== siteDefault ? item.defaultLang : "",
    isPrimary: item.isPrimary,
  }));
  // Always offer an empty subdomain slot so primary vs additional hosts stay obvious.
  if (!rows.some((row) => !row.domain.trim())) {
    rows.push(blankDomainRow(false));
  }
  return rows;
}

function blankDomainRow(isPrimary: boolean): DomainRow {
  return { key: Math.random().toString(36).slice(2), domain: "", defaultLang: "", isPrimary };
}

// Domain Tab Component
function DomainTab({
  site,
  onUpdate,
  showToast,
  t,
}: {
  site: Site;
  onUpdate: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const contentLanguages = (
    site.languages?.length ? site.languages : site.translations?.map((item) => item.lang) || ["hu"]
  ).filter((code, index, list) => list.indexOf(code) === index);
  const siteDefault = contentLanguages[0] || "hu";
  const [rows, setRows] = useState(() => domainRowsFromSite(site, siteDefault));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRows(domainRowsFromSite(site, siteDefault));
  }, [site.id, site.primaryDomain, site.siteDomains, siteDefault]);

  const filled = rows.filter((row) => row.domain.trim());
  const addresses = filled.map((row) =>
    regionAddress({
      lang: row.defaultLang || siteDefault,
      slug: site.slug,
      primaryDomain: row.domain,
    })
  );
  const slugAddress = regionAddress({ lang: siteDefault, slug: site.slug, primaryDomain: null });

  const updateRow = (key: string, patch: Partial<DomainRow>) => {
    setRows((current) => {
      if (patch.isPrimary) {
        return current.map((row) => ({
          ...row,
          isPrimary: row.key === key,
        }));
      }
      return current.map((row) => (row.key === key ? { ...row, ...patch } : row));
    });
  };

  const handleSaveDomains = async () => {
    const hosts = filled.map((row) =>
      row.domain.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0]
    );
    const duplicate = hosts.find((host, index) => hosts.indexOf(host) !== index);
    if (duplicate) {
      showToast(t("admin.siteEdit.domain.duplicateDomain", { domain: duplicate }), "error");
      return;
    }
    const withPrimary = filled.some((row) => row.isPrimary)
      ? filled
      : filled.map((row, index) => ({ ...row, isPrimary: index === 0 }));
    setIsSaving(true);
    try {
      await updateSite(site.id, {
        domains: withPrimary.map((row) => ({
          domain: row.domain.trim(),
          defaultLang: row.defaultLang || null,
          isPrimary: row.isPrimary,
        })),
      });
      showToast(t("admin.siteEdit.domain.domainAdded"), "success");
      onUpdate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("admin.siteEdit.domain.saveDomainsFailed");
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h3
        style={{
          marginBottom: 24,
          fontSize: "clamp(20px, 5vw, 24px)",
          fontWeight: 700,
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#667eea",
        }}
      >
        {t("admin.siteEdit.domain.title")}
      </h3>
      <p
        style={{
          marginTop: -12,
          marginBottom: 24,
          color: "#6b7280",
          fontSize: 14,
          lineHeight: 1.5,
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {t("admin.siteEdit.domain.primarySubdomainHint")}{" "}
        {addresses.length
          ? t("admin.siteEdit.domain.publicAddresses", {
              addresses: addresses.join(", "),
              lang: siteDefault,
            })
          : t("admin.siteEdit.domain.slugAddress", { address: slugAddress })}{" "}
        {t("admin.siteEdit.domain.dnsHint")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {rows.map((row) => (
          <div
            key={row.key}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "end",
              padding: 16,
              background: row.isPrimary ? "#eef2ff" : "#f9fafb",
              borderRadius: 12,
              border: row.isPrimary ? "1px solid #c7d2fe" : "1px solid #e5e7eb",
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 220px" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                {row.isPrimary
                  ? t("admin.siteEdit.domain.primaryDomainLabel")
                  : t("admin.siteEdit.domain.subdomainLabel")}
              </span>
              <input
                type="text"
                value={row.domain}
                onChange={(e) => updateRow(row.key, { domain: e.target.value })}
                placeholder={row.isPrimary ? "pelda.hu" : "hu.pelda.hu"}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 15,
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 180px" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                {t("admin.siteEdit.domain.defaultLang")}
              </span>
              <select
                value={row.defaultLang}
                onChange={(e) => updateRow(row.key, { defaultLang: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 15,
                }}
              >
                <option value="">{t("admin.siteEdit.domain.regionDefaultLang")}</option>
                <LanguageSelectOptions variant="endonym" codes={contentLanguages} />
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8, cursor: "pointer" }}>
              <input
                type="radio"
                name={`primary-domain-${site.id}`}
                checked={row.isPrimary}
                onChange={() => updateRow(row.key, { isPrimary: true })}
              />
              <span style={{ fontSize: 13, color: "#374151" }}>
                {t("admin.siteEdit.domain.setAsPrimary")}
              </span>
            </label>
            <button
              type="button"
              onClick={() =>
                setRows((current) => {
                  const next = current.filter((item) => item.key !== row.key);
                  if (!next.length) return [blankDomainRow(true), blankDomainRow(false)];
                  if (!next.some((item) => item.isPrimary)) next[0] = { ...next[0], isPrimary: true };
                  if (!next.some((item) => !item.isPrimary)) next.push(blankDomainRow(false));
                  return next;
                })
              }
              style={{
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                background: "white",
                cursor: "pointer",
                marginBottom: 1,
              }}
            >
              {t("common.delete")}
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setRows((current) => [...current, blankDomainRow(current.length === 0)])}
          style={{
            padding: "10px 16px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            background: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {t("admin.siteEdit.domain.addSubdomain")}
        </button>
        <button
          type="button"
          onClick={handleSaveDomains}
          disabled={isSaving}
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: 8,
            background: "#667eea",
            color: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {isSaving ? t("admin.saving") : t("admin.siteEdit.domain.saveDomains")}
        </button>
      </div>

      {/* SiteKeys */}
      <div style={{ marginTop: 32 }}>
        <h4
          style={{
            marginBottom: 16,
            fontSize: "clamp(16px, 3.5vw, 18px)",
            fontWeight: 600,
            color: "#374151",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.siteEdit.domain.siteKeys")}
        </h4>
        {site.siteKeys && site.siteKeys.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {LANG_VALUES.map((lang) => {
              const keysForLang = site.siteKeys?.filter((k) => k.lang === lang) || [];
              const primaryKey = keysForLang.find((k) => k.isPrimary);
              const aliases = keysForLang.filter((k) => !k.isPrimary);

              if (keysForLang.length === 0) return null;

              return (
                <div
                  key={lang}
                  style={{
                    padding: 16,
                    background: "#f9fafb",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      marginBottom: 12,
                      textTransform: "uppercase",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {lang}
                  </div>
                  {primaryKey && (
                    <div style={{ marginBottom: 8 }}>
                      <span
                        style={{
                          fontSize: "clamp(13px, 3vw, 15px)",
                          color: "#6b7280",
                          marginRight: 8,
                          fontFamily:
                            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        {t("admin.siteEdit.domain.primary")}:
                      </span>
                      <span style={{ fontWeight: 600 }}>{primaryKey.slug}</span>
                    </div>
                  )}
                  {aliases.length > 0 && (
                    <div>
                      <span
                        style={{
                          fontSize: "clamp(13px, 3vw, 15px)",
                          color: "#6b7280",
                          marginRight: 8,
                          fontFamily:
                            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        {t("admin.siteEdit.domain.aliases")}:
                      </span>
                      {aliases.map((alias) => (
                        <span key={alias.id} style={{ marginRight: 8 }}>
                          {alias.slug} →
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p
            style={{
              color: "#6b7280",
              fontSize: 14,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("admin.siteEdit.domain.noSiteKeys")}
          </p>
        )}
      </div>
    </div>
  );
}

// Language instances for this region (formerly global Site Instances CRUD)
function InstancesTab({
  site,
  siteInstances,
  onUpdate,
  showToast,
  t,
}: {
  site: Site;
  siteInstances: SiteInstance[];
  onUpdate: () => void | Promise<void>;
  showToast: (message: string, type: "success" | "error") => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newLang, setNewLang] = useState<Lang>("hu");
  const [newIsDefault, setNewIsDefault] = useState(false);

  const usedLangs = new Set(siteInstances.map((si) => si.lang));
  const availableLangs = (site.languages?.length ? site.languages : LANG_VALUES).filter(
    (lang) => !usedLangs.has(lang)
  );

  const handleCreate = async () => {
    if (!newLang) return;
    setBusyId("create");
    try {
      await createSiteInstance({
        siteId: site.id,
        lang: newLang,
        isDefault: newIsDefault || siteInstances.length === 0,
        features: {
          isCrawlable: true,
          enableEvents: true,
          enableBlog: false,
          enableStaticPages: true,
        },
      });
      showToast(t("admin.siteEdit.instances.created"), "success");
      setIsCreating(false);
      setNewIsDefault(false);
      await onUpdate();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("admin.errors.createSiteInstanceFailed"),
        "error"
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleSetDefault = async (instance: SiteInstance) => {
    if (instance.isDefault) return;
    setBusyId(instance.id);
    try {
      await updateSiteInstance(instance.id, { isDefault: true });
      showToast(t("admin.siteEdit.instances.defaultSaved"), "success");
      await onUpdate();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("admin.errors.updateSiteInstanceFailed"),
        "error"
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (instance: SiteInstance) => {
    if (!confirm(t("admin.confirmations.deleteSiteInstance"))) return;
    setBusyId(instance.id);
    try {
      await deleteSiteInstance(instance.id);
      showToast(t("admin.siteEdit.instances.deleted"), "success");
      await onUpdate();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("admin.errors.deleteSiteInstanceFailed"),
        "error"
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h3
        style={{
          marginBottom: 8,
          fontSize: "clamp(20px, 5vw, 24px)",
          fontWeight: 700,
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#667eea",
        }}
      >
        {t("admin.siteEdit.instances.title")}
      </h3>
      <p
        style={{
          marginBottom: 24,
          color: "#64748b",
          fontSize: "clamp(14px, 3.5vw, 15px)",
          lineHeight: 1.5,
          maxWidth: 640,
        }}
      >
        {t("admin.siteEdit.instances.hint")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {siteInstances.length === 0 && (
          <div
            style={{
              padding: 16,
              background: "#f8fafc",
              borderRadius: 8,
              color: "#64748b",
              border: "1px dashed #cbd5e1",
            }}
          >
            {t("admin.siteEdit.instances.empty")}
          </div>
        )}
        {siteInstances.map((instance) => (
          <div
            key={instance.id}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "14px 16px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 15 }}>{instance.lang.toUpperCase()}</strong>
              {instance.isDefault && (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#eef2ff",
                    color: "#4338ca",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {t("admin.isDefault")}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!instance.isDefault && (
                <button
                  type="button"
                  disabled={busyId === instance.id}
                  onClick={() => handleSetDefault(instance)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #c7d2fe",
                    background: "#eef2ff",
                    color: "#4338ca",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {t("admin.siteEdit.instances.setDefault")}
                </button>
              )}
              <button
                type="button"
                disabled={busyId === instance.id}
                onClick={() => handleDelete(instance)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        ))}
      </div>

      {isCreating ? (
        <div
          style={{
            padding: 20,
            background: "#f8fafc",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxWidth: 480,
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
              {t("common.language")} *
            </label>
            <select
              value={newLang}
              onChange={(e) => setNewLang(e.target.value as Lang)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            >
              <LanguageSelectOptions variant="translated" />
            </select>
            {usedLangs.has(newLang) && (
              <p style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>
                {t("admin.siteEdit.instances.langExists")}
              </p>
            )}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={newIsDefault}
              onChange={(e) => setNewIsDefault(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span>{t("admin.isDefault")}</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              disabled={busyId === "create" || usedLangs.has(newLang)}
              onClick={handleCreate}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: "#667eea",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("common.create")}
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "white",
                cursor: "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={availableLangs.length === 0}
          onClick={() => {
            setNewLang((availableLangs[0] as Lang) || "hu");
            setNewIsDefault(siteInstances.length === 0);
            setIsCreating(true);
          }}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: availableLangs.length === 0 ? "#cbd5e1" : "#667eea",
            color: "white",
            fontWeight: 600,
            cursor: availableLangs.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {t("admin.forms.newSiteInstance")}
        </button>
      )}
      {availableLangs.length === 0 && !isCreating && siteInstances.length > 0 && (
        <p style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>
          {t("admin.siteEdit.instances.allLanguagesCovered")}
        </p>
      )}
    </div>
  );
}

function MissingInstanceBanner({
  message,
  onGoToInstances,
  t,
}: {
  message: string;
  onGoToInstances?: () => void;
  t: (key: string) => string;
}) {
  return (
    <div
      style={{
        padding: 16,
        background: "#fef3c7",
        borderRadius: 8,
        marginBottom: 24,
        color: "#92400e",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        justifyContent: "space-between",
      }}
    >
      <span>{message}</span>
      {onGoToInstances && (
        <button
          type="button"
          onClick={onGoToInstances}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            background: "#f59e0b",
            color: "#111827",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {t("admin.siteEdit.tabs.instances")}
        </button>
      )}
    </div>
  );
}

// Appearance Tab Component
function AppearanceTab({
  site,
  siteInstances,
  brands,
  onUpdate,
  onGoToInstances,
  showToast,
  t,
}: {
  site: Site;
  siteInstances: SiteInstance[];
  brands: Brand[];
  onUpdate: () => void;
  onGoToInstances?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  t: (key: string) => string;
}) {
  const brand = brands.find((b) => b.id === site.brandId);
  const [selectedLang, setSelectedLang] = useState<Lang>("hu");
  const instance = siteInstances.find((si) => si.lang === selectedLang);
  const [formData, setFormData] = useState({
    logoUrl: instance?.logoUrl || "",
    faviconUrl: instance?.faviconUrl || "",
    placeholderCard: instance?.sitePlaceholders?.card || "",
    placeholderHero: instance?.sitePlaceholders?.hero || "",
    placeholderEventCard: instance?.sitePlaceholders?.eventCard || "",
  });

  useEffect(() => {
    const inst = siteInstances.find((si) => si.lang === selectedLang);
    setFormData({
      logoUrl: inst?.logoUrl || "",
      faviconUrl: inst?.faviconUrl || "",
      placeholderCard: inst?.sitePlaceholders?.card || "",
      placeholderHero: inst?.sitePlaceholders?.hero || "",
      placeholderEventCard: inst?.sitePlaceholders?.eventCard || "",
    });
  }, [selectedLang, siteInstances]);

  const handleSave = async () => {
    if (!instance) {
      showToast(
        t("admin.siteEdit.appearance.instanceNotFound"),
        "error"
      );
      return;
    }

    try {
      await updateSiteInstance(instance.id, {
        logoUrl: formData.logoUrl || null,
        faviconUrl: formData.faviconUrl || null,
        sitePlaceholders: {
          card: formData.placeholderCard || null,
          hero: formData.placeholderHero || null,
          eventCard: formData.placeholderEventCard || null,
        },
      });
      showToast(t("admin.siteEdit.appearance.saved"), "success");
      onUpdate();
    } catch (err) {
      showToast(t("admin.errors.updateSiteInstanceFailed"), "error");
    }
  };

  return (
    <div>
      <h3
        style={{
          marginBottom: 24,
          fontSize: "clamp(20px, 5vw, 24px)",
          fontWeight: 700,
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#667eea",
        }}
      >
        {t("admin.siteEdit.appearance.title")}
      </h3>

      <div style={{ marginBottom: 24 }}>
        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontWeight: 500,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.language")}
        </label>
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value as Lang)}
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          <LanguageSelectOptions variant="endonym" />
        </select>
      </div>

      {!instance && (
        <MissingInstanceBanner
          message={t("admin.siteEdit.appearance.createInstanceFirst")}
          onGoToInstances={onGoToInstances}
          t={t}
        />
      )}

      {instance && (
        <>
          {/* Domain defaults */}
          {brand && (
            <div style={{ marginBottom: 24, padding: 16, background: "#f9fafb", borderRadius: 8 }}>
              <h4
                style={{
                  marginBottom: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.siteEdit.appearance.domainDefaults")}
              </h4>
              <div
                style={{
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  color: "#6b7280",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                <div>
                  Logo:{" "}
                  {brand.logoUrl || t("admin.siteEdit.appearance.notSet")}
                </div>
                <div>
                  Favicon:{" "}
                  {brand.faviconUrl || t("admin.siteEdit.appearance.notSet")}
                </div>
              </div>
            </div>
          )}

          {/* Logo override */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 500,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {t("admin.siteEdit.appearance.logoUrl")} (
              {t("admin.siteEdit.appearance.override")})
            </label>
            <input
              type="text"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder={brand?.logoUrl || "https://..."}
              style={{
                width: "100%",
                maxWidth: 600,
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            />
            {formData.logoUrl && (
              <img
                src={formData.logoUrl}
                alt="Logo preview"
                style={{ marginTop: 8, maxHeight: 60, borderRadius: 6 }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>

          {/* Favicon override */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 500,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {t("admin.siteEdit.appearance.faviconUrl")} (
              {t("admin.siteEdit.appearance.override")})
            </label>
            <input
              type="text"
              value={formData.faviconUrl}
              onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
              placeholder={brand?.faviconUrl || "https://..."}
              style={{
                width: "100%",
                maxWidth: 600,
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            />
          </div>

          {/* Placeholder images */}
          <div style={{ marginTop: 32 }}>
            <h4
              style={{
                marginBottom: 16,
                fontSize: 18,
                fontWeight: 600,
                color: "#374151",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {t("admin.siteEdit.appearance.placeholders")}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 500,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.siteEdit.appearance.placeholderCard")}
                </label>
                <input
                  type="text"
                  value={formData.placeholderCard}
                  onChange={(e) => setFormData({ ...formData, placeholderCard: e.target.value })}
                  placeholder="https://..."
                  style={{
                    width: "100%",
                    maxWidth: 600,
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 500,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.siteEdit.appearance.placeholderHero")}
                </label>
                <input
                  type="text"
                  value={formData.placeholderHero}
                  onChange={(e) => setFormData({ ...formData, placeholderHero: e.target.value })}
                  placeholder="https://..."
                  style={{
                    width: "100%",
                    maxWidth: 600,
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 500,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.siteEdit.appearance.placeholderEventCard")}
                </label>
                <input
                  type="text"
                  value={formData.placeholderEventCard}
                  onChange={(e) =>
                    setFormData({ ...formData, placeholderEventCard: e.target.value })
                  }
                  placeholder="https://..."
                  style={{
                    width: "100%",
                    maxWidth: 600,
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            style={{
              marginTop: 24,
              padding: "10px 20px",
              border: "none",
              borderRadius: 8,
              background: "#667eea",
              color: "white",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {t("common.save")}
          </button>
        </>
      )}
    </div>
  );
}

// Map Tab Component
function MapTab({
  site,
  siteInstances,
  towns,
  onUpdate,
  onGoToInstances,
  showToast,
  t,
}: {
  site: Site;
  siteInstances: SiteInstance[];
  towns: any[];
  onUpdate: () => void;
  onGoToInstances?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  t: (key: string) => string;
}) {
  const [selectedLang, setSelectedLang] = useState<Lang>("hu");
  const instance = siteInstances.find((si) => si.lang === selectedLang);
  const [formData, setFormData] = useState({
    lat: instance?.mapConfig?.lat?.toString() || "",
    lng: instance?.mapConfig?.lng?.toString() || "",
    zoom: instance?.mapConfig?.zoom?.toString() || "",
    townId: instance?.mapConfig?.townId || "",
  });

  useEffect(() => {
    const inst = siteInstances.find((si) => si.lang === selectedLang);
    setFormData({
      lat: inst?.mapConfig?.lat?.toString() || "",
      lng: inst?.mapConfig?.lng?.toString() || "",
      zoom: inst?.mapConfig?.zoom?.toString() || "",
      townId: inst?.mapConfig?.townId || "",
    });
  }, [selectedLang, siteInstances]);

  const handleSave = async () => {
    if (!instance) {
      showToast(t("admin.siteEdit.map.instanceNotFound"), "error");
      return;
    }

    try {
      await updateSiteInstance(instance.id, {
        mapConfig: {
          townId: formData.townId || null,
          lat: formData.lat ? parseFloat(formData.lat) : null,
          lng: formData.lng ? parseFloat(formData.lng) : null,
          zoom: formData.zoom ? parseFloat(formData.zoom) : null,
        },
      });
      showToast(t("admin.siteEdit.map.saved"), "success");
      onUpdate();
    } catch (err) {
      showToast(t("admin.errors.updateSiteInstanceFailed"), "error");
    }
  };

  return (
    <div>
      <h3
        style={{
          marginBottom: 24,
          fontSize: "clamp(20px, 5vw, 24px)",
          fontWeight: 700,
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#667eea",
        }}
      >
        {t("admin.siteEdit.map.title")}
      </h3>

      <div style={{ marginBottom: 24 }}>
        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontWeight: 500,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.language")}
        </label>
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value as Lang)}
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          <LanguageSelectOptions variant="endonym" />
        </select>
      </div>

      {!instance && (
        <MissingInstanceBanner
          message={t("admin.siteEdit.map.createInstanceFirst")}
          onGoToInstances={onGoToInstances}
          t={t}
        />
      )}

      {instance && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 24,
              marginBottom: 24,
            }}
          >
            {/* Map */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 500,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.siteEdit.map.map")}
              </label>
              <div
                style={{
                  height: 400,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                }}
              >
                <MapComponent
                  latitude={formData.lat ? parseFloat(formData.lat) : null}
                  longitude={formData.lng ? parseFloat(formData.lng) : null}
                  onLocationChange={(lat, lng) => {
                    setFormData({ ...formData, lat: lat.toString(), lng: lng.toString() });
                  }}
                  onZoomChange={(zoom) => {
                    setFormData({ ...formData, zoom: zoom.toString() });
                  }}
                  hideLocationButton={true}
                  height={400}
                  interactive={true}
                  defaultZoom={formData.zoom ? parseFloat(formData.zoom) : undefined}
                />
              </div>
            </div>

            {/* Form fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 500,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.siteEdit.map.defaultTown")}
                </label>
                <select
                  value={formData.townId}
                  onChange={(e) => setFormData({ ...formData, townId: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  <option value="">{t("admin.siteEdit.map.noTown")}</option>
                  {towns.map((town) => {
                    const translation =
                      town.translations?.find((t: any) => t.lang === selectedLang) ||
                      town.translations?.[0];
                    return (
                      <option key={town.id} value={town.id}>
                        {translation?.name || town.id}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 500,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.latitude")}
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 500,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.longitude")}
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 500,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.mapZoom")}
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="0.5"
                  value={formData.zoom}
                  onChange={(e) => setFormData({ ...formData, zoom: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                />
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginTop: 4,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.mapZoomHint")}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: 8,
              background: "#667eea",
              color: "white",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {t("common.save")}
          </button>
        </>
      )}
    </div>
  );
}

// Features Tab Component
function FeaturesTab({
  site,
  siteInstances,
  onUpdate,
  onGoToInstances,
  showToast,
  t,
}: {
  site: Site;
  siteInstances: SiteInstance[];
  onUpdate: () => void;
  onGoToInstances?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  t: (key: string) => string;
}) {
  const [selectedLang, setSelectedLang] = useState<Lang>("hu");
  const instance = siteInstances.find((si) => si.lang === selectedLang);
  const [formData, setFormData] = useState({
    enableEvents: instance?.features?.enableEvents ?? true,
    enableBlog: instance?.features?.enableBlog ?? false,
    enableStaticPages: instance?.features?.enableStaticPages ?? true,
    isCrawlable: instance?.features?.isCrawlable ?? true,
  });

  useEffect(() => {
    const inst = siteInstances.find((si) => si.lang === selectedLang);
    setFormData({
      enableEvents: inst?.features?.enableEvents ?? true,
      enableBlog: inst?.features?.enableBlog ?? false,
      enableStaticPages: inst?.features?.enableStaticPages ?? true,
      isCrawlable: inst?.features?.isCrawlable ?? true,
    });
  }, [selectedLang, siteInstances]);

  const handleSave = async () => {
    if (!instance) {
      showToast(
        t("admin.siteEdit.features.instanceNotFound"),
        "error"
      );
      return;
    }

    try {
      await updateSiteInstance(instance.id, {
        features: {
          enableEvents: formData.enableEvents,
          enableBlog: formData.enableBlog,
          enableStaticPages: formData.enableStaticPages,
          isCrawlable: formData.isCrawlable,
        },
      });
      showToast(t("admin.siteEdit.features.saved"), "success");
      onUpdate();
    } catch (err) {
      showToast(t("admin.errors.updateSiteInstanceFailed"), "error");
    }
  };

  return (
    <div>
      <h3
        style={{
          marginBottom: 24,
          fontSize: "clamp(20px, 5vw, 24px)",
          fontWeight: 700,
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#667eea",
        }}
      >
        {t("admin.siteEdit.features.title")}
      </h3>

      <div style={{ marginBottom: 24 }}>
        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontWeight: 500,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.language")}
        </label>
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value as Lang)}
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          <option value="hu">Magyar</option>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
        </select>
      </div>

      {!instance && (
        <MissingInstanceBanner
          message={t("admin.siteEdit.features.createInstanceFirst")}
          onGoToInstances={onGoToInstances}
          t={t}
        />
      )}

      {instance && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.enableEvents}
                onChange={(e) => setFormData({ ...formData, enableEvents: e.target.checked })}
                style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
              />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.siteEdit.features.enableEvents")}
              </span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.enableBlog}
                onChange={(e) => setFormData({ ...formData, enableBlog: e.target.checked })}
                style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
              />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.siteEdit.features.enableBlog")}
              </span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.enableStaticPages}
                onChange={(e) => setFormData({ ...formData, enableStaticPages: e.target.checked })}
                style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
              />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.siteEdit.features.enableStaticPages")}
              </span>
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formData.isCrawlable}
                  onChange={(e) => setFormData({ ...formData, isCrawlable: e.target.checked })}
                  style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.siteEdit.features.isCrawlable")}
                </span>
              </label>
              <div
                style={{
                  fontSize: 12,
                  color: "#666",
                  marginLeft: 28,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.isCrawlableDescription")}
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            style={{
              marginTop: 24,
              padding: "10px 20px",
              border: "none",
              borderRadius: 8,
              background: "#667eea",
              color: "white",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {t("common.save")}
          </button>
        </>
      )}
    </div>
  );
}

// Subscription Tab Component
function SubscriptionTab({
  site,
  formData,
  setFormData,
  formErrors,
  currentUser,
  onUpdate,
  showToast,
  t,
}: {
  site: Site;
  formData: any;
  setFormData: (data: any) => void;
  formErrors: Record<string, string>;
  currentUser: any;
  onUpdate: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  t: (key: string) => string;
}) {
  const { i18n } = useTranslation();
  const confirm = useConfirm();
  const [subscription, setSubscription] = useState<SiteSubscription | null>(null);
  const [entitlements, setEntitlements] = useState<SiteEntitlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPlanSwitcher, setShowPlanSwitcher] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previousPlan, setPreviousPlan] = useState<string | null>(null);
  const [animatedValues, setAnimatedValues] = useState<Set<string>>(new Set());

  const isSuperAdmin = currentUser?.role === "superadmin";
  const isAdmin = currentUser?.role === "admin";
  const canEditPlan = isSuperAdmin;
  // Siteadmin (UserRole.admin) and superadmin may set this site's GA ID.
  const canEditGa = isSuperAdmin || isAdmin;
  const [gaError, setGaError] = useState<string | null>(null);
  const [isSavingGa, setIsSavingGa] = useState(false);

  // Load subscription and entitlements data
  useEffect(() => {
    loadSubscriptionData();
  }, [site.id]);

  const loadSubscriptionData = async () => {
    if (!site.id) return;
    setIsLoading(true);
    try {
      const [subData, entData, subscriptionData] = await Promise.all([
        getSiteSubscription(site.id),
        getSiteEntitlements(site.id),
        // Also fetch from subscription service to get the subscription ID
        fetch(`/api/${i18n.language.split("-")[0] || "hu"}/sites/${site.id}/subscription`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      ]);
      // Merge subscription data (id and status from subscription service)
      if (subscriptionData && subscriptionData.id) {
        setSubscription({ ...subData, id: subscriptionData.id, status: subscriptionData.status });
      } else {
        setSubscription(subData);
      }
      setEntitlements(entData);
      // Update formData with subscription data
      setFormData((prev: any) => ({
        ...prev,
        plan: subData.plan,
        planStatus: subData.planStatus || "active",
        planValidUntil: subData.planValidUntil
          ? new Date(subData.planValidUntil).toISOString().split("T")[0]
          : "",
        allowPublicRegistration:
          subData.allowPublicRegistration ?? site.allowPublicRegistration ?? true,
      }));
    } catch (error) {
      console.error("Failed to load subscription data:", error);
      showToast(
        t("admin.errorLoadingBilling"),
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Track plan changes for animation
  useEffect(() => {
    if (entitlements && previousPlan && previousPlan !== entitlements.plan) {
      // Mark values that should animate
      setAnimatedValues(new Set(["plan", "places", "featuredSlots", "events"]));
      // Clear animation after animation completes
      setTimeout(() => {
        setAnimatedValues(new Set());
      }, 600);
    }
    if (entitlements) {
      setPreviousPlan(entitlements.plan);
    }
  }, [entitlements?.plan, previousPlan]);

  // Status badge colors
  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { color: string; bg: string; label: string }> = {
      active: {
        color: "#10b981",
        bg: "#d1fae5",
        label: t("admin.siteEdit.subscription.statusActive"),
      },
      trial: {
        color: "#f59e0b",
        bg: "#fef3c7",
        label: t("admin.siteEdit.subscription.statusTrial"),
      },
      past_due: {
        color: "#ef4444",
        bg: "#fee2e2",
        label: t("admin.siteEdit.subscription.statusPastDue"),
      },
      canceled: {
        color: "#6b7280",
        bg: "#f3f4f6",
        label: t("admin.siteEdit.subscription.statusCanceled"),
      },
      suspended: {
        color: "#ef4444",
        bg: "#fee2e2",
        label: t("admin.siteEdit.subscription.statusSuspended"),
      },
      expired: {
        color: "#6b7280",
        bg: "#f3f4f6",
        label: t("admin.siteEdit.subscription.statusExpired"),
      },
    };
    const statusInfo = statusMap[status || "active"] || statusMap.active;
    return (
      <span
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          background: statusInfo.bg,
          color: statusInfo.color,
          fontSize: "clamp(14px, 3.5vw, 16px)",
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 600,
        }}
      >
        {statusInfo.label}
      </span>
    );
  };

  // Calculate progress percentage
  const getProgress = (used: number, limit: number): number => {
    if (limit === Infinity) return 0;
    return Math.min(100, (used / limit) * 100);
  };

  // Plan labels and colors
  const planLabels: Record<string, string> = {
    basic: t("admin.planBasic"),
    pro: t("admin.planPro"),
    business: t("admin.planBusiness"),
    municipal: t("public.overview.plans.municipal.name"),
  };

  // Plan descriptions
  const planDescriptions: Record<string, string> = {
    basic:
      t("admin.planBasicDescription"),
    pro: t("admin.planProDescription"),
    business: t("admin.planBusinessDescription"),
    municipal: t("public.overview.plans.municipal.pitch"),
  };

  const planColors: Record<string, string> = {
    basic: "#3b82f6",
    pro: "#667eea",
    business: "#8b5cf6",
    municipal: "#1b1730",
  };

  const handlePlanChange = async (newPlan: "basic" | "pro" | "business" | "municipal") => {
    if (!canEditPlan) {
      showToast(
        t("admin.siteEdit.subscription.contactToUpgrade"),
        "error"
      );
      return;
    }

    setIsSaving(true);
    try {
      await updateSite(site.id, { plan: newPlan });
      // Reload subscription data to get updated entitlements
      await loadSubscriptionData();
      showToast(t("admin.siteEdit.subscription.planUpdated"), "success");
      setShowPlanSwitcher(false);
    } catch (err) {
      showToast(t("admin.errors.updateSiteFailed"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAdvanced = async () => {
    if (!isSuperAdmin) return;
    setIsSaving(true);
    try {
      await updateSite(site.id, {
        planStatus: formData.planStatus,
        planValidUntil: formData.planValidUntil
          ? new Date(formData.planValidUntil).toISOString()
          : null,
        allowPublicRegistration: formData.allowPublicRegistration,
      });
      await loadSubscriptionData();
      showToast(t("admin.siteEdit.subscription.saved"), "success");
    } catch (err) {
      showToast(t("admin.errors.updateSiteFailed"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisitorOverride = async (manual: boolean) => {
    if (!isSuperAdmin) return;
    setIsSaving(true);
    try {
      await updateSiteSubscription(site.id, { visitorLadderManual: manual });
      await loadSubscriptionData();
      showToast(t("admin.siteEdit.subscription.saved"), "success");
    } catch (err) {
      showToast(t("admin.errors.updateSiteFailed"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGa = async () => {
    if (!canEditGa) return;
    setGaError(null);
    if (!isValidGaMeasurementIdInput(formData.gaMeasurementId)) {
      setGaError(t("admin.googleAnalytics.invalidId"));
      showToast(t("admin.googleAnalytics.invalidId"), "error");
      return;
    }
    setIsSavingGa(true);
    try {
      const nextId = formData.gaMeasurementId.trim()
        ? formData.gaMeasurementId.trim().toUpperCase()
        : null;
      await updateSite(site.id, { gaMeasurementId: nextId });
      setFormData((prev: any) => ({ ...prev, gaMeasurementId: nextId ?? "" }));
      await onUpdate();
      showToast(t("admin.googleAnalytics.saved"), "success");
    } catch (err) {
      showToast(t("admin.errors.updateSiteFailed"), "error");
    } finally {
      setIsSavingGa(false);
    }
  };

  if (isLoading || !subscription || !entitlements) {
    return null;
  }

  const currentPlan = subscription.plan;
  const limits = entitlements.limits;
  const usage = entitlements.currentUsage;
  const ladder = subscription.visitorLadder;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`
        @keyframes valueUpdate {
          0% {
            transform: scale(1);
            color: inherit;
          }
          50% {
            transform: scale(1.15);
            color: #667eea;
          }
          100% {
            transform: scale(1);
            color: inherit;
          }
        }
      `}</style>

      {/* Per-subscriber Google Analytics (Site.gaMeasurementId) */}
      <div
        style={{
          padding: "16px 24px",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          maxWidth: 520,
        }}
      >
        <h4
          style={{
            margin: "0 0 8px",
            fontSize: "clamp(16px, 3.5vw, 18px)",
            fontWeight: 600,
            color: "#334155",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.googleAnalytics.subscriberTitle")}
        </h4>
        <p
          style={{
            margin: "0 0 12px",
            color: "#6b7280",
            fontSize: 13,
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.googleAnalytics.subscriberHelp")}
        </p>
        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontWeight: 500,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.googleAnalytics.subscriberLabel")}
        </label>
        <input
          type="text"
          value={formData.gaMeasurementId}
          onChange={(e) => {
            setGaError(null);
            setFormData({ ...formData, gaMeasurementId: e.target.value });
          }}
          placeholder="G-XXXXXXXX"
          autoComplete="off"
          spellCheck={false}
          disabled={!canEditGa || isSavingGa}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: gaError ? "1px solid #dc2626" : "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            background: canEditGa ? "white" : "#f9fafb",
          }}
        />
        {gaError ? (
          <p style={{ margin: "6px 0 0", color: "#dc2626", fontSize: 13 }}>{gaError}</p>
        ) : (
          <p style={{ margin: "6px 0 0", color: "#9ca3af", fontSize: 12 }}>
            {t("admin.googleAnalytics.clearHint")}
          </p>
        )}
        {canEditGa && (
          <button
            type="button"
            onClick={handleSaveGa}
            disabled={isSavingGa}
            style={{
              marginTop: 12,
              padding: "8px 16px",
              border: "none",
              borderRadius: 6,
              background: "#667eea",
              color: "white",
              cursor: isSavingGa ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              opacity: isSavingGa ? 0.6 : 1,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {isSavingGa ? t("common.loading") : t("admin.googleAnalytics.save")}
          </button>
        )}
      </div>

      {/* A. Hero Blokk - Aktuális csomag (kompakt) */}
      <div
        style={{
          padding: "16px 24px",
          background: `linear-gradient(135deg, ${planColors[currentPlan]}15 0%, ${planColors[currentPlan]}05 100%)`,
          borderRadius: 12,
          border: `2px solid ${planColors[currentPlan]}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: "clamp(16px, 3.5vw, 20px)",
              fontWeight: 600,
              color: "#667eea",
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("admin.siteEdit.subscription.currentPlan")}
          </h4>
          {getStatusBadge(subscription.planStatus)}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "8px 18px",
                    background: planColors[currentPlan],
                    color: "white",
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 700,
                    height: 40,
                    animation: animatedValues.has("plan") ? "valueUpdate 0.6s ease-out" : "none",
                    transform: animatedValues.has("plan") ? "scale(1.05)" : "scale(1)",
                    transition: "transform 0.3s ease-out",
                  }}
                >
                  {planLabels[currentPlan] || currentPlan.toUpperCase()}
                </div>
                {canEditPlan && (
                  <button
                    onClick={() => setShowPlanSwitcher(!showPlanSwitcher)}
                    disabled={isSaving}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 18px",
                      background: "white",
                      border: `2px solid ${planColors[currentPlan]}`,
                      borderRadius: 8,
                      color: planColors[currentPlan],
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontWeight: 600,
                      cursor: isSaving ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      opacity: isSaving ? 0.6 : 1,
                      height: 40,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSaving) {
                        e.currentTarget.style.background = planColors[currentPlan];
                        e.currentTarget.style.color = "white";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSaving) {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.color = planColors[currentPlan];
                      }
                    }}
                  >
                    <span style={{ fontSize: 16 }}>⚙️</span>
                    {t("admin.siteEdit.subscription.changePlan")}
                  </button>
                )}
              </div>
            </div>
            {subscription.planValidUntil && (
              <div
                style={{
                  fontSize: "clamp(13px, 3vw, 15px)",
                  color: "#666",
                  marginBottom: 6,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.siteEdit.subscription.validUntil")}:{" "}
                {new Date(subscription.planValidUntil).toLocaleDateString(i18n.language, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            )}
          </div>
          {/* Cancel/Resume subscription button */}
          {subscription && subscription.id && (
            <div style={{ marginTop: 12 }}>
              {subscription.status === "ACTIVE" || subscription.planStatus === "active" ? (
                <button
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: t("admin.subscription.cancel"),
                      message:
                        t("admin.subscription.cancelConfirm"),
                      confirmLabel: t("admin.subscription.cancelButton"),
                      cancelLabel: t("common.cancel"),
                      confirmVariant: "danger",
                    });
                    if (confirmed) {
                      try {
                        await cancelSubscription("site", subscription.id, site.id);
                        showToast(
                          t("admin.subscription.cancelled"),
                          "success"
                        );
                        await loadSubscriptionData();
                        onUpdate();
                      } catch (error) {
                        console.error("Failed to cancel subscription:", error);
                        showToast(
                          t("admin.errors.updateFailed"),
                          "error"
                        );
                      }
                    }
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontSize: "clamp(13px, 3vw, 15px)",
                    fontWeight: 600,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#dc2626";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ef4444";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {t("admin.subscription.cancelButton")}
                </button>
              ) : subscription.status === "CANCELLED" || subscription.planStatus === "canceled" ? (
                <button
                  onClick={async () => {
                    try {
                      await resumeSubscription("site", subscription.id, site.id);
                      showToast(
                        t("admin.subscription.resumed"),
                        "success"
                      );
                      await loadSubscriptionData();
                      onUpdate();
                    } catch (error) {
                      console.error("Failed to resume subscription:", error);
                      showToast(
                        t("admin.errors.updateFailed"),
                        "error"
                      );
                    }
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontSize: "clamp(13px, 3vw, 15px)",
                    fontWeight: 600,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#059669";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#10b981";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {t("admin.subscription.resume")}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {ladder && (
        <div
          style={{
            padding: 20,
            background: "#f8fafc",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            {t("admin.visitorLadder.meterTitle")}
          </div>
          <div style={{ fontSize: 14, color: "#444" }}>
            {ladder.meter.toLocaleString()}{" "}
            {ladder.meterSource === "pageViews"
              ? t("admin.visitorLadder.pageViews")
              : t("admin.visitorLadder.uniqueVisitors")}
            {" · "}
            X={ladder.freeUntil.toLocaleString()} / Y={ladder.stepTwoFrom.toLocaleString()} / Z=
            {ladder.stepThreeFrom.toLocaleString()}
            {" · "}
            {t("admin.visitorLadder.stepLabel")}: {ladder.appliedStep + 1}
            {ladder.wouldStep !== ladder.appliedStep
              ? ` → ${ladder.wouldStep + 1}`
              : ""}
            {ladder.ladderSuspended ? ` · ${t("admin.visitorLadder.held")}` : ""}
          </div>
          {isSuperAdmin && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={subscription.visitorLadderManual ?? ladder.manualOverride}
                disabled={isSaving}
                onChange={(e) => handleToggleVisitorOverride(e.target.checked)}
              />
              {t("admin.visitorLadder.overrideHelp")}
            </label>
          )}
        </div>
      )}

      {/* D. Plan Switcher - Only for superadmin, közvetlenül a hero blokk alatt */}
      {canEditPlan && showPlanSwitcher && (
        <div
          style={{
            padding: 32,
            background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative background element */}
          <div
            style={{
              position: "absolute",
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              background: `radial-gradient(circle, ${planColors[currentPlan]}10 0%, transparent 70%)`,
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <h4
              style={{
                marginBottom: 24,
                fontSize: 20,
                fontWeight: 700,
                color: "#1e293b",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              <span style={{ fontSize: 24 }}>✨</span>
              {t("admin.siteEdit.subscription.availablePlans")}
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
                marginBottom: 24,
              }}
            >
              {(["basic", "pro", "business", "municipal"] as const).map((plan) => (
                <div
                  key={plan}
                  onClick={() => !isSaving && handlePlanChange(plan)}
                  style={{
                    padding: 24,
                    background:
                      currentPlan === plan
                        ? `linear-gradient(135deg, ${planColors[plan]}15 0%, ${planColors[plan]}08 100%)`
                        : "white",
                    border: `2px solid ${currentPlan === plan ? planColors[plan] : "#e2e8f0"}`,
                    borderRadius: 16,
                    cursor: isSaving ? "not-allowed" : "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    opacity: isSaving ? 0.6 : 1,
                    boxShadow:
                      currentPlan === plan
                        ? `0 8px 20px ${planColors[plan]}25`
                        : "0 2px 8px rgba(0,0,0,0.04)",
                    transform: currentPlan === plan ? "translateY(-2px)" : "translateY(0)",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "100%",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSaving && currentPlan !== plan) {
                      e.currentTarget.style.borderColor = planColors[plan];
                      e.currentTarget.style.background = `linear-gradient(135deg, ${planColors[plan]}08 0%, ${planColors[plan]}03 100%)`;
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = `0 12px 24px ${planColors[plan]}20`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSaving && currentPlan !== plan) {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.background = "white";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                    }
                  }}
                >
                  {/* Current badge */}
                  {currentPlan === plan && (
                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        padding: "4px 10px",
                        background: planColors[plan],
                        color: "white",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        boxShadow: `0 2px 8px ${planColors[plan]}40`,
                      }}
                    >
                      {t("admin.current")}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: planColors[plan],
                      marginBottom: 12,
                      letterSpacing: "-0.5px",
                    }}
                  >
                    {planLabels[plan] || plan.toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      color: "#64748b",
                      lineHeight: 1.6,
                      minHeight: 40,
                      marginBottom: 16,
                      flex: 1,
                    }}
                  >
                    {planDescriptions[plan] || ""}
                  </div>

                  {/* Select button - always visible */}
                  {currentPlan !== plan && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isSaving) handlePlanChange(plan);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        background: planColors[plan],
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        fontWeight: 600,
                        cursor: isSaving ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        opacity: isSaving ? 0.6 : 1,
                        boxShadow: `0 2px 8px ${planColors[plan]}30`,
                        marginTop: "auto",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSaving) {
                          e.currentTarget.style.background = planColors[plan];
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = `0 4px 12px ${planColors[plan]}40`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSaving) {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = `0 2px 8px ${planColors[plan]}30`;
                        }
                      }}
                    >
                      {t("admin.selectPlan")}
                    </button>
                  )}

                  {currentPlan === plan && (
                    <div
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        background: `${planColors[plan]}15`,
                        color: planColors[plan],
                        border: `1px solid ${planColors[plan]}40`,
                        borderRadius: 8,
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        fontWeight: 600,
                        textAlign: "center",
                        marginTop: "auto",
                      }}
                    >
                      {t("admin.current")}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                paddingTop: 16,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <button
                onClick={() => setShowPlanSwitcher(false)}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  background: "white",
                  color: "#475569",
                  cursor: "pointer",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontWeight: 500,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#94a3b8";
                  e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.background = "white";
                }}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. Feature Matrix + C. Usage - Két oszlop desktopon, egy mobilon */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: 24,
          width: "100%",
          maxWidth: "100%",
        }}
      >
        {/* B. Feature Matrix - Read-only */}
        <div
          style={{
            padding: 32,
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            borderRadius: 16,
            border: "2px solid #e2e8f0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            minHeight: 400,
          }}
        >
          <h4
            style={{
              marginBottom: 24,
              fontSize: 20,
              fontWeight: 700,
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            <span style={{ fontSize: 24 }}>📦</span>
            {t("admin.siteEdit.subscription.planContents")}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontWeight: 500,
                  color: "#334155",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.placesCount")}
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: limits.places === Infinity ? "#10b981" : "#1e293b",
                  padding: "4px 12px",
                  background: limits.places === Infinity ? "#d1fae5" : "#f1f5f9",
                  borderRadius: 8,
                }}
              >
                {limits.places === Infinity ? "∞" : limits.places}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontWeight: 500,
                  color: "#334155",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.featuredPlacesCount")}
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: limits.featuredSlots > 0 ? "#10b981" : "#dc2626",
                  padding: "4px 12px",
                  background: limits.featuredSlots > 0 ? "#d1fae5" : "#fee2e2",
                  borderRadius: 8,
                }}
              >
                {limits.featuredSlots === Infinity ? "∞" : limits.featuredSlots}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontWeight: 500,
                  color: "#334155",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.events")}
              </span>
              <span
                style={{
                  fontSize: 24,
                  color: limits.events === Infinity || limits.events > 0 ? "#10b981" : "#dc2626",
                  fontWeight: 700,
                }}
              >
                {limits.events === Infinity ? "✓" : limits.events > 0 ? "✓" : "✗"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontWeight: 500,
                  color: "#334155",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.multiLanguage")}
              </span>
              <span style={{ fontSize: 24, color: "#10b981", fontWeight: 700 }}>✓</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontWeight: 500,
                  color: "#334155",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.customDomain")}
              </span>
              <span
                style={{
                  fontSize: 24,
                  color: limits.customDomain ? "#10b981" : "#dc2626",
                  fontWeight: 700,
                }}
              >
                {limits.customDomain ? "✓" : "✗"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontWeight: 500,
                  color: "#334155",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.seoSettings")}
              </span>
              <span style={{ fontSize: 24, color: "#10b981", fontWeight: 700 }}>✓</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontWeight: 500,
                  color: "#334155",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.pushNotifications")}
              </span>
              <span style={{ fontSize: 24, color: "#dc2626", fontWeight: 700 }}>✗</span>
            </div>
          </div>
        </div>

        {/* C. Usage / Quota */}
        <div
          style={{
            padding: 32,
            background: "linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)",
            borderRadius: 16,
            border: "2px solid #e2e8f0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            minHeight: 400,
          }}
        >
          <h4
            style={{
              marginBottom: 24,
              fontSize: 20,
              fontWeight: 700,
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            <span style={{ fontSize: 24 }}>📊</span>
            {t("admin.siteEdit.subscription.usage")}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
            {/* Places */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(15px, 3.5vw, 16px)",
                    fontWeight: 600,
                    color: "#334155",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.places")}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    animation: animatedValues.has("places") ? "valueUpdate 0.6s ease-out" : "none",
                    transform: animatedValues.has("places") ? "scale(1.1)" : "scale(1)",
                    transition: "transform 0.3s ease-out",
                    color:
                      usage.places >= (limits.places === Infinity ? 0 : limits.places)
                        ? "#ef4444"
                        : "#1e293b",
                    padding: "6px 14px",
                    background:
                      usage.places >= (limits.places === Infinity ? 0 : limits.places)
                        ? "#fee2e2"
                        : "#f1f5f9",
                    borderRadius: 10,
                  }}
                >
                  {usage.places} / {limits.places === Infinity ? "∞" : limits.places}
                  {limits.places !== Infinity && usage.places >= limits.places && (
                    <span style={{ marginLeft: 8, color: "#f59e0b", fontSize: 16 }}>⚠️</span>
                  )}
                </span>
              </div>
              {limits.places !== Infinity && (
                <div
                  style={{
                    width: "100%",
                    height: 12,
                    background: "#e5e7eb",
                    borderRadius: 6,
                    overflow: "hidden",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      width: `${getProgress(usage.places, limits.places)}%`,
                      height: "100%",
                      background:
                        usage.places >= limits.places
                          ? "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)"
                          : "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                      transition: "width 0.3s ease",
                      boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Featured slots */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(15px, 3.5vw, 16px)",
                    fontWeight: 600,
                    color: "#334155",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.featuredPlaces")}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    animation: animatedValues.has("featuredSlots")
                      ? "valueUpdate 0.6s ease-out"
                      : "none",
                    transform: animatedValues.has("featuredSlots") ? "scale(1.1)" : "scale(1)",
                    transition: "transform 0.3s ease-out",
                    color:
                      limits.featuredSlots !== Infinity &&
                      usage.featuredPlaces >= limits.featuredSlots
                        ? "#ef4444"
                        : "#1e293b",
                    padding: "6px 14px",
                    background:
                      limits.featuredSlots !== Infinity &&
                      usage.featuredPlaces >= limits.featuredSlots
                        ? "#fee2e2"
                        : "#f1f5f9",
                    borderRadius: 10,
                  }}
                >
                  {usage.featuredPlaces} /{" "}
                  {limits.featuredSlots === Infinity ? "∞" : limits.featuredSlots}
                  {limits.featuredSlots !== Infinity &&
                    usage.featuredPlaces >= limits.featuredSlots && (
                      <span style={{ marginLeft: 8, color: "#f59e0b", fontSize: 16 }}>⚠️</span>
                    )}
                </span>
              </div>
              {limits.featuredSlots === 0 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#6b7280",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    padding: 12,
                    background: "#f3f4f6",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  <span style={{ fontSize: 20 }}>🔒</span>
                  <span>
                    {t("admin.siteEdit.subscription.lockedInPro")}
                  </span>
                </div>
              ) : limits.featuredSlots !== Infinity ? (
                <div
                  style={{
                    width: "100%",
                    height: 12,
                    background: "#e5e7eb",
                    borderRadius: 6,
                    overflow: "hidden",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      width: `${getProgress(usage.featuredPlaces, limits.featuredSlots)}%`,
                      height: "100%",
                      background:
                        usage.featuredPlaces >= limits.featuredSlots
                          ? "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)"
                          : "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                      transition: "width 0.3s ease",
                      boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                    }}
                  />
                </div>
              ) : (
                <div style={{ fontSize: 16, color: "#6b7280", fontWeight: 600, padding: "8px 0" }}>
                  ∞
                </div>
              )}
            </div>

            {/* Events */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(15px, 3.5vw, 16px)",
                    fontWeight: 600,
                    color: "#334155",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.events")}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    animation: animatedValues.has("events") ? "valueUpdate 0.6s ease-out" : "none",
                    transform: animatedValues.has("events") ? "scale(1.1)" : "scale(1)",
                    transition: "transform 0.3s ease-out",
                    color:
                      limits.events !== Infinity && usage.events >= limits.events
                        ? "#ef4444"
                        : "#1e293b",
                    padding: "6px 14px",
                    background:
                      limits.events !== Infinity && usage.events >= limits.events
                        ? "#fee2e2"
                        : "#f1f5f9",
                    borderRadius: 10,
                  }}
                >
                  {usage.events} / {limits.events === Infinity ? "∞" : limits.events}
                </span>
              </div>
              {limits.events === 0 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#6b7280",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    padding: 12,
                    background: "#f3f4f6",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  <span style={{ fontSize: 20 }}>🔒</span>
                  <span>
                    {t("admin.siteEdit.subscription.lockedInPro")}
                  </span>
                </div>
              ) : limits.events !== Infinity ? (
                <div
                  style={{
                    width: "100%",
                    height: 12,
                    background: "#e5e7eb",
                    borderRadius: 6,
                    overflow: "hidden",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      width: `${getProgress(usage.events, limits.events)}%`,
                      height: "100%",
                      background:
                        usage.events >= limits.events
                          ? "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)"
                          : "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                      transition: "width 0.3s ease",
                      boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                    }}
                  />
                </div>
              ) : (
                <div style={{ fontSize: 16, color: "#6b7280", fontWeight: 600, padding: "8px 0" }}>
                  ∞
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Non-superadmin message */}
      {!canEditPlan && (
        <div
          style={{
            padding: 16,
            background: "#fef3c7",
            borderRadius: 8,
            border: "1px solid #fbbf24",
          }}
        >
          <div
            style={{
              fontSize: "clamp(14px, 3.5vw, 16px)",
              color: "#92400e",
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("admin.siteEdit.subscription.contactToUpgrade")}
          </div>
        </div>
      )}

      {/* Advanced settings (superadmin only) */}
      {isSuperAdmin && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              padding: "8px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "white",
              color: "#374151",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {showAdvanced ? "▼" : "▶"}{" "}
            {t("admin.siteEdit.subscription.advancedSettings")}
          </button>

          {showAdvanced && (
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
                gap: 24,
                width: "100%",
                maxWidth: "100%",
              }}
            >
              {/* Dropdown mezők bal oldalon */}
              <div
                style={{
                  padding: 20,
                  background: "#f9fafb",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 500,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.planStatus")}
                  </label>
                  <select
                    value={formData.planStatus}
                    onChange={(e) => setFormData({ ...formData, planStatus: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #d1d5db",
                      borderRadius: 8,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      background: "white",
                    }}
                  >
                    <option value="trial">
                      {t("admin.siteEdit.subscription.statusTrial")}
                    </option>
                    <option value="active">
                      {t("admin.siteEdit.subscription.statusActive")}
                    </option>
                    <option value="past_due">
                      {t("admin.siteEdit.subscription.statusPastDue")}
                    </option>
                    <option value="canceled">
                      {t("admin.siteEdit.subscription.statusCanceled")}
                    </option>
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 500,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.planValidUntil")}
                  </label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="date"
                      value={formData.planValidUntil}
                      onChange={(e) => setFormData({ ...formData, planValidUntil: e.target.value })}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        background: "white",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const currentDate = formData.planValidUntil
                          ? new Date(formData.planValidUntil)
                          : new Date();
                        const newDate = new Date(currentDate);
                        newDate.setDate(newDate.getDate() + 30);
                        setFormData({
                          ...formData,
                          planValidUntil: newDate.toISOString().split("T")[0],
                        });
                      }}
                      style={{
                        padding: "10px 16px",
                        border: "1px solid #10b981",
                        borderRadius: 8,
                        background: "#10b981",
                        color: "white",
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#059669";
                        e.currentTarget.style.borderColor = "#059669";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#10b981";
                        e.currentTarget.style.borderColor = "#10b981";
                      }}
                    >
                      +30 {t("admin.days")}
                    </button>
                  </div>
                </div>

                {/* Public Registration Toggle - Only for pro/business plans */}
                {(formData.plan === "pro" || formData.plan === "business") && (
                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                        padding: "12px 16px",
                        background: "white",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#667eea";
                        e.currentTarget.style.background = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#d1d5db";
                        e.currentTarget.style.background = "white";
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allowPublicRegistration}
                        onChange={(e) =>
                          setFormData({ ...formData, allowPublicRegistration: e.target.checked })
                        }
                        style={{
                          width: 20,
                          height: 20,
                          cursor: "pointer",
                          accentColor: "#667eea",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 500,
                            fontSize: "clamp(14px, 3.5vw, 16px)",
                            fontFamily:
                              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            color: "#334155",
                            marginBottom: 4,
                          }}
                        >
                          {t("admin.siteEdit.subscription.allowPublicRegistration")}
                        </div>
                        <div
                          style={{
                            fontSize: "clamp(12px, 2.5vw, 13px)",
                            fontFamily:
                              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            color: "#6b7280",
                          }}
                        >
                          {t("admin.siteEdit.subscription.allowPublicRegistrationDescription")}
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                <button
                  onClick={handleSaveAdvanced}
                  disabled={isSaving}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: 8,
                    background: "#667eea",
                    color: "white",
                    cursor: isSaving ? "not-allowed" : "pointer",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 600,
                    opacity: isSaving ? 0.6 : 1,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSaving) {
                      e.currentTarget.style.background = "#5568d3";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSaving) {
                      e.currentTarget.style.background = "#667eea";
                    }
                  }}
                >
                  {isSaving ? t("common.saving") : t("common.save")}
                </button>
              </div>

              {/* Korlátok jobb oldalon desktopon */}
              <div
                style={{
                  padding: 24,
                  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                  borderRadius: 16,
                  border: "2px solid #e2e8f0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                }}
              >
                <h4
                  style={{
                    marginBottom: 24,
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#1e293b",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 24 }}>📊</span>
                  {t("admin.limits")}
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "18px 22px",
                      background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
                      borderRadius: 12,
                      border: "2px solid #e2e8f0",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 600, color: "#334155" }}>
                      {t("admin.places")}
                    </span>
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: 900,
                        color: limits.places === Infinity ? "#10b981" : "#1e293b",
                        padding: "12px 20px",
                        background:
                          limits.places === Infinity
                            ? "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)"
                            : "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                        borderRadius: 12,
                        minWidth: 100,
                        textAlign: "center",
                        boxShadow:
                          limits.places === Infinity
                            ? "0 4px 12px rgba(16, 185, 129, 0.2)"
                            : "0 2px 8px rgba(0,0,0,0.1)",
                        letterSpacing: "-1px",
                      }}
                    >
                      {limits.places === Infinity ? "∞" : limits.places}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "18px 22px",
                      background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
                      borderRadius: 12,
                      border: "2px solid #e2e8f0",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 600, color: "#334155" }}>
                      {t("admin.featuredPlaces")}
                    </span>
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: 900,
                        color: limits.featuredSlots > 0 ? "#10b981" : "#dc2626",
                        padding: "12px 20px",
                        background:
                          limits.featuredSlots > 0
                            ? "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)"
                            : "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
                        borderRadius: 12,
                        minWidth: 100,
                        textAlign: "center",
                        boxShadow:
                          limits.featuredSlots > 0
                            ? "0 4px 12px rgba(16, 185, 129, 0.2)"
                            : "0 4px 12px rgba(220, 38, 38, 0.2)",
                        letterSpacing: "-1px",
                      }}
                    >
                      {limits.featuredSlots === Infinity ? "∞" : limits.featuredSlots}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "18px 22px",
                      background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
                      borderRadius: 12,
                      border: "2px solid #e2e8f0",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 600, color: "#334155" }}>
                      {t("admin.events")}
                    </span>
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: 900,
                        color:
                          limits.events === Infinity || limits.events > 0 ? "#10b981" : "#dc2626",
                        padding: "12px 20px",
                        background:
                          limits.events === Infinity || limits.events > 0
                            ? "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)"
                            : "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
                        borderRadius: 12,
                        minWidth: 100,
                        textAlign: "center",
                        boxShadow:
                          limits.events === Infinity || limits.events > 0
                            ? "0 4px 12px rgba(16, 185, 129, 0.2)"
                            : "0 4px 12px rgba(220, 38, 38, 0.2)",
                        letterSpacing: "-1px",
                      }}
                    >
                      {limits.events === Infinity ? "∞" : limits.events}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

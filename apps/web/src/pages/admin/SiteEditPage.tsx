// src/pages/admin/SiteEditPage.tsx
import { useState, useEffect, useContext, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../contexts/ToastContext";
import { AuthContext } from "../../contexts/AuthContext";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { MapComponent } from "../../components/MapComponent";
import { getSite, updateSite, getBrands, getSiteInstances, updateSiteInstance, getTowns, type Site, type Brand, type SiteInstance } from "../../api/admin.api";
import { getSiteSubscription, getSiteEntitlements, type SiteSubscription, type SiteEntitlements } from "../../api/admin.api";

type TabId = "overview" | "domain" | "appearance" | "map" | "features" | "subscription";

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
  const tabFromUrl = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    tabFromUrl && ["overview", "domain", "appearance", "map", "features", "subscription"].includes(tabFromUrl)
      ? tabFromUrl
      : "overview"
  );

  // Update tab when URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as TabId | null;
    if (tabFromUrl && ["overview", "domain", "appearance", "map", "features", "subscription"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
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
    isActive: true,
    brandId: "",
    // Subscription tab
    plan: "free" as "free" | "official" | "pro" | "business",
    planStatus: "active",
    planValidUntil: "",
    showAdvanced: false,
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
      
      // Populate form data
      const translationHu = data.translations.find((t) => t.lang === "hu");
      const translationEn = data.translations.find((t) => t.lang === "en");
      const translationDe = data.translations.find((t) => t.lang === "de");

      setFormData({
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
        isActive: data.isActive,
        brandId: data.brandId,
        plan: data.plan || "free",
        planStatus: data.planStatus || "active",
        planValidUntil: data.planValidUntil ? new Date(data.planValidUntil).toISOString().split("T")[0] : "",
      });
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
      setSiteInstances(data);
    } catch (err) {
      console.error("Failed to load site instances", err);
    }
  };

  const loadTowns = async () => {
    if (!id) return;
    try {
      const data = await getTowns(id);
      setTowns(data.towns || []);
    } catch (err) {
      console.error("Failed to load towns", err);
    }
  };

  const handleSave = async () => {
    if (!id || !site) return;

    setIsSaving(true);
    setFormErrors({});

    try {
      const translations = [];
      if (formData.nameHu) {
        translations.push({
          lang: "hu" as const,
          name: formData.nameHu,
          shortDescription: formData.shortDescriptionHu || null,
          description: formData.descriptionHu || null,
          heroImage: formData.heroImageHu || null,
        });
      }
      if (formData.nameEn) {
        translations.push({
          lang: "en" as const,
          name: formData.nameEn,
          shortDescription: formData.shortDescriptionEn || null,
          description: formData.descriptionEn || null,
          heroImage: formData.heroImageEn || null,
        });
      }
      if (formData.nameDe) {
        translations.push({
          lang: "de" as const,
          name: formData.nameDe,
          shortDescription: formData.shortDescriptionDe || null,
          description: formData.descriptionDe || null,
          heroImage: formData.heroImageDe || null,
        });
      }

      const updateData = {
        brandId: formData.brandId,
        isActive: formData.isActive,
        translations,
        plan: formData.plan,
        planStatus: formData.planStatus,
        planValidUntil: formData.planValidUntil ? new Date(formData.planValidUntil).toISOString() : null,
      };

      await updateSite(id, updateData);
      showToast(t("admin.siteUpdated"), "success");
      await loadSite();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || t("admin.errors.updateSiteFailed");
      showToast(errorMessage, "error");
      if (err?.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!site) {
    return <div>{t("admin.siteNotFound")}</div>;
  }

  const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
  const currentTranslation = site.translations.find((t) => t.lang === currentLang) || site.translations[0];

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "overview", label: t("admin.siteEdit.tabs.overview") || "Áttekintés" },
    { id: "domain", label: t("admin.siteEdit.tabs.domain") || "Domain & URL" },
    { id: "appearance", label: t("admin.siteEdit.tabs.appearance") || "Megjelenés" },
    { id: "map", label: t("admin.siteEdit.tabs.map") || "Térkép" },
    { id: "features", label: t("admin.siteEdit.tabs.features") || "Funkciók" },
    { id: "subscription", label: t("admin.siteEdit.tabs.subscription") || "Előfizetés" },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <AdminPageHeader
        title={currentTranslation?.name || site.slug}
        isCreatingOrEditing={true}
        onSave={handleSave}
        onCancel={() => navigate("/admin")}
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
            fontSize: 13,
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
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {t("admin.plan")}: {formData.plan}
        </span>
        {site.siteDomains && site.siteDomains.length > 0 && (
          <span
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              background: "#8b5cf6",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {site.siteDomains[0].domain}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ 
        background: "white", 
        borderRadius: 16, 
        marginBottom: 24,
        boxShadow: "0 8px 24px rgba(102, 126, 234, 0.15)",
        border: "1px solid rgba(102, 126, 234, 0.1)",
        overflow: "hidden"
      }}>
        <div style={{ 
          display: "flex", 
          gap: 0, 
          overflowX: "auto",
          borderBottom: "1px solid #e5e7eb"
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "16px 24px",
                border: "none",
                borderBottom: activeTab === tab.id ? "3px solid #667eea" : "3px solid transparent",
                background: "transparent",
                color: activeTab === tab.id ? "#667eea" : "#6b7280",
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: 14,
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
        <div style={{ 
          padding: "clamp(24px, 5vw, 32px)",
          minHeight: 400 
        }}>
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
          <DomainTab 
            site={site} 
            onUpdate={loadSite}
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
            showToast={showToast}
            t={t}
          />
        )}
        {activeTab === "features" && (
          <FeaturesTab 
            site={site}
            siteInstances={siteInstances}
            onUpdate={loadSiteInstances}
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

  return (
    <div>
      <h3 style={{ 
        marginBottom: 24, 
        fontSize: "clamp(20px, 5vw, 24px)",
        fontWeight: 700,
        fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#667eea"
      }}>
        {t("admin.siteEdit.overview.title") || "Alap adatok"}
      </h3>
      
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
          {t("admin.brand")}
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
          }}
        >
          <option value="">{t("admin.selectBrand")}</option>
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
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                {t("common.name")} ({selectedLang.toUpperCase()}) *
              </label>
              <input
                type="text"
                value={
                  selectedLang === "hu"
                    ? formData.nameHu
                    : selectedLang === "en"
                    ? formData.nameEn
                    : formData.nameDe
                }
                onChange={(e) => {
                  if (selectedLang === "hu") setFormData({ ...formData, nameHu: e.target.value });
                  else if (selectedLang === "en") setFormData({ ...formData, nameEn: e.target.value });
                  else setFormData({ ...formData, nameDe: e.target.value });
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                {t("admin.shortDescription")} ({selectedLang.toUpperCase()})
              </label>
              <TipTapEditorWithUpload
                value={
                  selectedLang === "hu"
                    ? formData.shortDescriptionHu
                    : selectedLang === "en"
                    ? formData.shortDescriptionEn
                    : formData.shortDescriptionDe
                }
                onChange={(value) => {
                  if (selectedLang === "hu") setFormData({ ...formData, shortDescriptionHu: value });
                  else if (selectedLang === "en") setFormData({ ...formData, shortDescriptionEn: value });
                  else setFormData({ ...formData, shortDescriptionDe: value });
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                {t("admin.description")} ({selectedLang.toUpperCase()})
              </label>
              <TipTapEditorWithUpload
                value={
                  selectedLang === "hu"
                    ? formData.descriptionHu
                    : selectedLang === "en"
                    ? formData.descriptionEn
                    : formData.descriptionDe
                }
                onChange={(value) => {
                  if (selectedLang === "hu") setFormData({ ...formData, descriptionHu: value });
                  else if (selectedLang === "en") setFormData({ ...formData, descriptionEn: value });
                  else setFormData({ ...formData, descriptionDe: value });
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                {t("admin.heroImage")} ({selectedLang.toUpperCase()})
              </label>
              <input
                type="text"
                value={
                  selectedLang === "hu"
                    ? formData.heroImageHu
                    : selectedLang === "en"
                    ? formData.heroImageEn
                    : formData.heroImageDe
                }
                onChange={(e) => {
                  if (selectedLang === "hu") setFormData({ ...formData, heroImageHu: e.target.value });
                  else if (selectedLang === "en") setFormData({ ...formData, heroImageEn: e.target.value });
                  else setFormData({ ...formData, heroImageDe: e.target.value });
                }}
                placeholder="https://..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              />
              {(selectedLang === "hu" ? formData.heroImageHu : selectedLang === "en" ? formData.heroImageEn : formData.heroImageDe) && (
                <img
                  src={selectedLang === "hu" ? formData.heroImageHu : selectedLang === "en" ? formData.heroImageEn : formData.heroImageDe}
                  alt="Hero"
                  style={{ marginTop: 8, maxWidth: "100%", maxHeight: 200, borderRadius: 6 }}
                />
              )}
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
            style={{ width: 18, height: 18, cursor: "pointer" }}
          />
          <span style={{ fontSize: 14, fontWeight: 500 }}>{t("common.active")}</span>
        </label>
      </div>

      {/* Quick actions */}
      <div style={{ 
        marginTop: 32, 
        padding: 20, 
        background: "#f9fafb", 
        borderRadius: 12,
        border: "1px solid #e5e7eb"
      }}>
        <h4 style={{ 
          marginBottom: 16, 
          fontSize: 18, 
          fontWeight: 600,
          color: "#374151"
        }}>
          {t("admin.siteEdit.quickActions") || "Gyors műveletek"}
        </h4>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => window.open(`/${site.slug}`, "_blank")}
            style={{
              padding: "10px 20px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              background: "white",
              color: "#374151",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
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
            {t("admin.siteEdit.openPublicPage") || "Publikus oldal megnyitása"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Domain Tab Component
function DomainTab({ 
  site, 
  onUpdate, 
  showToast, 
  t 
}: { 
  site: Site; 
  onUpdate: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  t: (key: string) => string;
}) {
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState({ domain: "", defaultLang: "hu" as "hu" | "en" | "de", isPrimary: false });

  const handleAddDomain = async () => {
    if (!newDomain.domain.trim()) {
      showToast(t("admin.siteEdit.domain.domainRequired") || "Domain megadása kötelező", "error");
      return;
    }
    // TODO: Implement domain creation API
    showToast(t("admin.siteEdit.domain.domainAdded") || "Domain hozzáadva", "success");
    setNewDomain({ domain: "", defaultLang: "hu", isPrimary: false });
    onUpdate();
  };

  return (
    <div>
      <h3 style={{ 
        marginBottom: 24, 
        fontSize: "clamp(20px, 5vw, 24px)",
        fontWeight: 700,
        fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#667eea"
      }}>
        {t("admin.siteEdit.domain.title") || "Domain & URL"}
      </h3>

      {/* Domains list */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600, color: "#374151" }}>
          {t("admin.siteEdit.domain.domains") || "Domain-ek"}
        </h4>
        {site.siteDomains && site.siteDomains.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {site.siteDomains.map((domain) => (
              <div
                key={domain.id}
                style={{
                  padding: 16,
                  background: "#f9fafb",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    {domain.domain}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {t("admin.siteEdit.domain.defaultLang") || "Alapértelmezett nyelv"}: {domain.defaultLang.toUpperCase()}
                    {domain.isPrimary && (
                      <span style={{ marginLeft: 8, color: "#667eea", fontWeight: 600 }}>
                        ({t("admin.siteEdit.domain.primary") || "Primary"})
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {!domain.isPrimary && (
                    <button
                      onClick={() => {
                        // TODO: Set as primary
                        showToast(t("admin.siteEdit.domain.setAsPrimary") || "Primary domain beállítva", "success");
                        onUpdate();
                      }}
                      style={{
                        padding: "6px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        background: "white",
                        color: "#374151",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      {t("admin.siteEdit.domain.setPrimary") || "Set Primary"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#6b7280", fontSize: 14 }}>
            {t("admin.siteEdit.domain.noDomains") || "Nincs domain hozzáadva"}
          </p>
        )}
      </div>

      {/* Add new domain */}
      <div style={{ padding: 20, background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
        <h4 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600, color: "#374151" }}>
          {t("admin.siteEdit.domain.addDomain") || "Új domain hozzáadása"}
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
              {t("admin.siteEdit.domain.domain") || "Domain"}
            </label>
            <input
              type="text"
              value={newDomain.domain}
              onChange={(e) => setNewDomain({ ...newDomain, domain: e.target.value })}
              placeholder="example.com"
              style={{
                width: "100%",
                maxWidth: 400,
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
              {t("admin.siteEdit.domain.defaultLang") || "Alapértelmezett nyelv"}
            </label>
            <select
              value={newDomain.defaultLang}
              onChange={(e) => setNewDomain({ ...newDomain, defaultLang: e.target.value as "hu" | "en" | "de" })}
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
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={newDomain.isPrimary}
                onChange={(e) => setNewDomain({ ...newDomain, isPrimary: e.target.checked })}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span style={{ fontSize: 14 }}>{t("admin.siteEdit.domain.setAsPrimary") || "Beállítás primary domain-ként"}</span>
            </label>
          </div>
          <button
            onClick={handleAddDomain}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: 8,
              background: "#667eea",
              color: "white",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              maxWidth: 200,
            }}
          >
            {t("admin.siteEdit.domain.add") || "Hozzáadás"}
          </button>
        </div>
      </div>

      {/* SiteKeys */}
      <div style={{ marginTop: 32 }}>
        <h4 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600, color: "#374151" }}>
          {t("admin.siteEdit.domain.siteKeys") || "SiteKey-ek"}
        </h4>
        {site.siteKeys && site.siteKeys.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {["hu", "en", "de"].map((lang) => {
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
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, textTransform: "uppercase" }}>
                    {lang}
                  </div>
                  {primaryKey && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "#6b7280", marginRight: 8 }}>
                        {t("admin.siteEdit.domain.primary") || "Primary"}:
                      </span>
                      <span style={{ fontWeight: 600 }}>{primaryKey.slug}</span>
                    </div>
                  )}
                  {aliases.length > 0 && (
                    <div>
                      <span style={{ fontSize: 12, color: "#6b7280", marginRight: 8 }}>
                        {t("admin.siteEdit.domain.aliases") || "Aliasok"}:
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
          <p style={{ color: "#6b7280", fontSize: 14 }}>
            {t("admin.siteEdit.domain.noSiteKeys") || "Nincs SiteKey"}
          </p>
        )}
      </div>
    </div>
  );
}

// Appearance Tab Component
function AppearanceTab({
  site,
  siteInstances,
  brands,
  onUpdate,
  showToast,
  t,
}: {
  site: Site;
  siteInstances: SiteInstance[];
  brands: Brand[];
  onUpdate: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  t: (key: string) => string;
}) {
  const brand = brands.find((b) => b.id === site.brandId);
  const [selectedLang, setSelectedLang] = useState<"hu" | "en" | "de">("hu");
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
      showToast(t("admin.siteEdit.appearance.instanceNotFound") || "SiteInstance nem található", "error");
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
      showToast(t("admin.siteEdit.appearance.saved") || "Megjelenés mentve", "success");
      onUpdate();
    } catch (err) {
      showToast(t("admin.errors.updateSiteInstanceFailed") || "Mentés sikertelen", "error");
    }
  };

  return (
    <div>
      <h3 style={{ 
        marginBottom: 24, 
        fontSize: "clamp(20px, 5vw, 24px)",
        fontWeight: 700,
        fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#667eea"
      }}>
        {t("admin.siteEdit.appearance.title") || "Megjelenés"}
      </h3>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
          {t("admin.language")}
        </label>
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value as "hu" | "en" | "de")}
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
        <div style={{ padding: 16, background: "#fef3c7", borderRadius: 8, marginBottom: 24, color: "#92400e" }}>
          {t("admin.siteEdit.appearance.createInstanceFirst") || "Először hozz létre egy SiteInstance-t ezen a nyelven"}
        </div>
      )}

      {instance && (
        <>
          {/* Brand info */}
          {brand && (
            <div style={{ marginBottom: 24, padding: 16, background: "#f9fafb", borderRadius: 8 }}>
              <h4 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>
                {t("admin.siteEdit.appearance.brandDefaults") || "Brand alapértelmezések"}
              </h4>
              <div style={{ fontSize: 14, color: "#6b7280" }}>
                <div>Logo: {brand.logoUrl || t("admin.siteEdit.appearance.notSet") || "Nincs beállítva"}</div>
                <div>Favicon: {brand.faviconUrl || t("admin.siteEdit.appearance.notSet") || "Nincs beállítva"}</div>
              </div>
            </div>
          )}

          {/* Logo override */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
              {t("admin.siteEdit.appearance.logoUrl") || "Logo URL"} ({t("admin.siteEdit.appearance.override") || "override"})
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
                fontSize: 14,
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
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
              {t("admin.siteEdit.appearance.faviconUrl") || "Favicon URL"} ({t("admin.siteEdit.appearance.override") || "override"})
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
                fontSize: 14,
              }}
            />
          </div>

          {/* Placeholder images */}
          <div style={{ marginTop: 32 }}>
            <h4 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600, color: "#374151" }}>
              {t("admin.siteEdit.appearance.placeholders") || "Placeholder képek"}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                  {t("admin.siteEdit.appearance.placeholderCard") || "Card placeholder"}
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
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                  {t("admin.siteEdit.appearance.placeholderHero") || "Hero placeholder"}
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
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                  {t("admin.siteEdit.appearance.placeholderEventCard") || "Event card placeholder"}
                </label>
                <input
                  type="text"
                  value={formData.placeholderEventCard}
                  onChange={(e) => setFormData({ ...formData, placeholderEventCard: e.target.value })}
                  placeholder="https://..."
                  style={{
                    width: "100%",
                    maxWidth: 600,
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
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
  showToast,
  t,
}: {
  site: Site;
  siteInstances: SiteInstance[];
  towns: any[];
  onUpdate: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  t: (key: string) => string;
}) {
  const [selectedLang, setSelectedLang] = useState<"hu" | "en" | "de">("hu");
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
      showToast(t("admin.siteEdit.map.instanceNotFound") || "SiteInstance nem található", "error");
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
      showToast(t("admin.siteEdit.map.saved") || "Térkép beállítások mentve", "success");
      onUpdate();
    } catch (err) {
      showToast(t("admin.errors.updateSiteInstanceFailed") || "Mentés sikertelen", "error");
    }
  };

  return (
    <div>
      <h3 style={{ 
        marginBottom: 24, 
        fontSize: "clamp(20px, 5vw, 24px)",
        fontWeight: 700,
        fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#667eea"
      }}>
        {t("admin.siteEdit.map.title") || "Térkép"}
      </h3>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
          {t("admin.language")}
        </label>
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value as "hu" | "en" | "de")}
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
        <div style={{ padding: 16, background: "#fef3c7", borderRadius: 8, marginBottom: 24, color: "#92400e" }}>
          {t("admin.siteEdit.map.createInstanceFirst") || "Először hozz létre egy SiteInstance-t ezen a nyelven"}
        </div>
      )}

      {instance && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            {/* Map */}
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                {t("admin.siteEdit.map.map") || "Térkép"}
              </label>
              <div style={{ height: 400, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <MapComponent
                  latitude={formData.lat ? parseFloat(formData.lat) : null}
                  longitude={formData.lng ? parseFloat(formData.lng) : null}
                  onLocationChange={(lat, lng) => {
                    setFormData({ ...formData, lat: lat.toString(), lng: lng.toString() });
                  }}
                  onZoomChange={(zoom) => {
                    setFormData({ ...formData, zoom: zoom.toString() });
                  }}
                  height={400}
                  interactive={true}
                  defaultZoom={formData.zoom ? parseFloat(formData.zoom) : undefined}
                />
              </div>
            </div>

            {/* Form fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                  {t("admin.siteEdit.map.defaultTown") || "Alapértelmezett település"}
                </label>
                <select
                  value={formData.townId}
                  onChange={(e) => setFormData({ ...formData, townId: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                >
                  <option value="">{t("admin.siteEdit.map.noTown") || "Nincs település"}</option>
                  {towns.map((town) => {
                    const translation = town.translations?.find((t: any) => t.lang === selectedLang) || town.translations?.[0];
                    return (
                      <option key={town.id} value={town.id}>
                        {translation?.name || town.id}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
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
                    fontSize: 14,
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
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
                    fontSize: 14,
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                  {t("admin.mapZoom") || "Nagyítás"}
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
                    fontSize: 14,
                  }}
                />
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  {t("admin.mapZoomHint") || "1 = legkisebb, 20 = legnagyobb. Ajánlott: 10-15."}
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
  showToast,
  t,
}: {
  site: Site;
  siteInstances: SiteInstance[];
  onUpdate: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  t: (key: string) => string;
}) {
  const [selectedLang, setSelectedLang] = useState<"hu" | "en" | "de">("hu");
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
      showToast(t("admin.siteEdit.features.instanceNotFound") || "SiteInstance nem található", "error");
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
      showToast(t("admin.siteEdit.features.saved") || "Funkciók mentve", "success");
      onUpdate();
    } catch (err) {
      showToast(t("admin.errors.updateSiteInstanceFailed") || "Mentés sikertelen", "error");
    }
  };

  return (
    <div>
      <h3 style={{ 
        marginBottom: 24, 
        fontSize: "clamp(20px, 5vw, 24px)",
        fontWeight: 700,
        fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#667eea"
      }}>
        {t("admin.siteEdit.features.title") || "Funkciók"}
      </h3>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
          {t("admin.language")}
        </label>
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value as "hu" | "en" | "de")}
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
        <div style={{ padding: 16, background: "#fef3c7", borderRadius: 8, marginBottom: 24, color: "#92400e" }}>
          {t("admin.siteEdit.features.createInstanceFirst") || "Először hozz létre egy SiteInstance-t ezen a nyelven"}
        </div>
      )}

      {instance && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.enableEvents}
                onChange={(e) => setFormData({ ...formData, enableEvents: e.target.checked })}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {t("admin.siteEdit.features.enableEvents") || "Események engedélyezése"}
              </span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.enableBlog}
                onChange={(e) => setFormData({ ...formData, enableBlog: e.target.checked })}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {t("admin.siteEdit.features.enableBlog") || "Blog / Statikus oldalak engedélyezése"}
              </span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.enableStaticPages}
                onChange={(e) => setFormData({ ...formData, enableStaticPages: e.target.checked })}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {t("admin.siteEdit.features.enableStaticPages") || "Statikus oldalak engedélyezése"}
              </span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.isCrawlable}
                onChange={(e) => setFormData({ ...formData, isCrawlable: e.target.checked })}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {t("admin.siteEdit.features.isCrawlable") || "Indexelhető (SEO)"}
              </span>
            </label>
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

  // Load subscription and entitlements data
  useEffect(() => {
    loadSubscriptionData();
  }, [site.id]);

  const loadSubscriptionData = async () => {
    if (!site.id) return;
    setIsLoading(true);
    try {
      const [subData, entData] = await Promise.all([
        getSiteSubscription(site.id),
        getSiteEntitlements(site.id),
      ]);
      setSubscription(subData);
      setEntitlements(entData);
      // Update formData with subscription data
      setFormData((prev: any) => ({
        ...prev,
        plan: subData.plan,
        planStatus: subData.planStatus || "active",
        planValidUntil: subData.planValidUntil ? new Date(subData.planValidUntil).toISOString().split("T")[0] : "",
      }));
    } catch (error) {
      console.error("Failed to load subscription data:", error);
      showToast(t("admin.errorLoadingBilling") || "Failed to load subscription information", "error");
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
      active: { color: "#10b981", bg: "#d1fae5", label: t("admin.siteEdit.subscription.statusActive") || "Aktív" },
      trial: { color: "#f59e0b", bg: "#fef3c7", label: t("admin.siteEdit.subscription.statusTrial") || "Próbaidőszak" },
      past_due: { color: "#ef4444", bg: "#fee2e2", label: t("admin.siteEdit.subscription.statusPastDue") || "Lejárt" },
      canceled: { color: "#6b7280", bg: "#f3f4f6", label: t("admin.siteEdit.subscription.statusCanceled") || "Megszakítva" },
      suspended: { color: "#ef4444", bg: "#fee2e2", label: t("admin.siteEdit.subscription.statusSuspended") || "Felfüggesztve" },
      expired: { color: "#6b7280", bg: "#f3f4f6", label: t("admin.siteEdit.subscription.statusExpired") || "Lejárt" },
    };
    const statusInfo = statusMap[status || "active"] || statusMap.active;
    return (
      <span
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          background: statusInfo.bg,
          color: statusInfo.color,
          fontSize: 13,
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
    free: t("admin.planFree") || "Free",
    official: t("admin.planOfficial") || "Official",
    pro: t("admin.planPro") || "Pro",
    business: t("admin.planBusiness") || "Business",
  };

  // Plan descriptions
  const planDescriptions: Record<string, string> = {
    free: t("admin.planFreeDescription") || "1 hely, nincs esemény",
    official: t("admin.planOfficialDescription") || "Korlátlan hely, események",
    pro: t("admin.planProDescription") || "Korlátlan hely, kiemelések, egyedi domain",
    business: t("admin.planBusinessDescription") || "Minden funkció, prioritás",
  };

  const planColors: Record<string, string> = {
    free: "#6b7280",
    official: "#3b82f6",
    pro: "#667eea",
    business: "#8b5cf6",
  };

  const handlePlanChange = async (newPlan: "free" | "official" | "pro" | "business") => {
    if (!canEditPlan) {
      showToast(t("admin.siteEdit.subscription.contactToUpgrade") || "A csomag módosításához vedd fel a kapcsolatot az üzemeltetővel.", "info");
      return;
    }

    setIsSaving(true);
    try {
      await updateSite(site.id, { plan: newPlan });
      // Reload subscription data to get updated entitlements
      await loadSubscriptionData();
      showToast(t("admin.siteEdit.subscription.planUpdated") || "Csomag frissítve", "success");
      setShowPlanSwitcher(false);
    } catch (err) {
      showToast(t("admin.errors.updateSiteFailed") || "Frissítés sikertelen", "error");
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
        planValidUntil: formData.planValidUntil ? new Date(formData.planValidUntil).toISOString() : null,
      });
      await loadSubscriptionData();
      showToast(t("admin.siteEdit.subscription.saved") || "Mentve", "success");
    } catch (err) {
      showToast(t("admin.errors.updateSiteFailed") || "Mentés sikertelen", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !subscription || !entitlements) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <LoadingSpinner />
      </div>
    );
  }

  const currentPlan = subscription.plan;
  const limits = entitlements.limits;
  const usage = entitlements.currentUsage;

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 500 }}>
                {t("admin.siteEdit.subscription.currentPlan") || "Jelenlegi csomag"}
              </div>
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
                      fontSize: 14,
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
                    {t("admin.siteEdit.subscription.changePlan") || "Csomag módosítása"}
                  </button>
                )}
              </div>
            </div>
            {subscription.planValidUntil && (
              <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                {t("admin.siteEdit.subscription.validUntil") || "Érvényes"}:{" "}
                {new Date(subscription.planValidUntil).toLocaleDateString("hu-HU", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            )}
          </div>
          <div>
            {getStatusBadge(subscription.planStatus)}
          </div>
        </div>
      </div>

      {/* D. Plan Switcher - Only for superadmin, közvetlenül a hero blokk alatt */}
      {canEditPlan && showPlanSwitcher && (
        <div style={{ 
          padding: 32, 
          background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
          borderRadius: 16, 
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Decorative background element */}
          <div style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            background: `radial-gradient(circle, ${planColors[currentPlan]}10 0%, transparent 70%)`,
            borderRadius: "50%",
            pointerEvents: "none",
          }} />
          
          <div style={{ position: "relative", zIndex: 1 }}>
            <h4 style={{ 
              marginBottom: 24, 
              fontSize: 20, 
              fontWeight: 700, 
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{ fontSize: 24 }}>✨</span>
              {t("admin.siteEdit.subscription.availablePlans") || "Elérhető csomagok"}
            </h4>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", 
              gap: 20, 
              marginBottom: 24 
            }}>
              {(["free", "official", "pro", "business"] as const).map((plan) => (
                <div
                  key={plan}
                  onClick={() => !isSaving && handlePlanChange(plan)}
                  style={{
                    padding: 24,
                    background: currentPlan === plan 
                      ? `linear-gradient(135deg, ${planColors[plan]}15 0%, ${planColors[plan]}08 100%)` 
                      : "white",
                    border: `2px solid ${currentPlan === plan ? planColors[plan] : "#e2e8f0"}`,
                    borderRadius: 16,
                    cursor: isSaving ? "not-allowed" : "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    opacity: isSaving ? 0.6 : 1,
                    boxShadow: currentPlan === plan 
                      ? `0 8px 20px ${planColors[plan]}25` 
                      : "0 2px 8px rgba(0,0,0,0.04)",
                    transform: currentPlan === plan ? "translateY(-2px)" : "translateY(0)",
                    position: "relative",
                    overflow: "hidden",
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
                    <div style={{
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
                    }}>
                      {t("admin.current") || "Jelenlegi"}
                    </div>
                  )}
                  
                  <div style={{ 
                    fontSize: 28, 
                    fontWeight: 800, 
                    color: planColors[plan], 
                    marginBottom: 12,
                    letterSpacing: "-0.5px",
                  }}>
                    {planLabels[plan] || plan.toUpperCase()}
                  </div>
                  <div style={{ 
                    fontSize: 13, 
                    color: "#64748b", 
                    lineHeight: 1.6,
                    minHeight: 40,
                    marginBottom: 16,
                  }}>
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
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: isSaving ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        opacity: isSaving ? 0.6 : 1,
                        boxShadow: `0 2px 8px ${planColors[plan]}30`,
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
                      {t("admin.selectPlan") || "Kiválasztás"}
                    </button>
                  )}
                  
                  {currentPlan === plan && (
                    <div style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: `${planColors[plan]}15`,
                      color: planColors[plan],
                      border: `1px solid ${planColors[plan]}40`,
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      textAlign: "center",
                    }}>
                      {t("admin.current") || "Jelenlegi"}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ 
              display: "flex", 
              justifyContent: "flex-end",
              paddingTop: 16,
              borderTop: "1px solid #e2e8f0",
            }}>
              <button
                onClick={() => setShowPlanSwitcher(false)}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  background: "white",
                  color: "#475569",
                  cursor: "pointer",
                  fontSize: 14,
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
                {t("common.cancel") || "Mégse"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. Feature Matrix + C. Usage - Két oszlop desktopon, egy mobilon */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", 
        gap: 24,
      }}>
        {/* B. Feature Matrix - Read-only */}
        <div style={{ 
          padding: 32, 
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          borderRadius: 16, 
          border: "2px solid #e2e8f0",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          minHeight: 400,
        }}>
          <h4 style={{ 
            marginBottom: 24, 
            fontSize: 20, 
            fontWeight: 700, 
            color: "#1e293b",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ fontSize: 24 }}>📦</span>
            {t("admin.siteEdit.subscription.planContents") || "Csomag tartalma"}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: "12px 16px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
            }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: "#334155" }}>{t("admin.placesCount") || "Helyek száma"}</span>
              <span style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                color: limits.places === Infinity ? "#10b981" : "#1e293b",
                padding: "4px 12px",
                background: limits.places === Infinity ? "#d1fae5" : "#f1f5f9",
                borderRadius: 8,
              }}>
                {limits.places === Infinity ? "∞" : limits.places}
              </span>
            </div>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: "12px 16px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
            }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: "#334155" }}>{t("admin.featuredPlacesCount") || "Kiemelt helyek"}</span>
              <span style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                color: limits.featuredSlots > 0 ? "#10b981" : "#dc2626",
                padding: "4px 12px",
                background: limits.featuredSlots > 0 ? "#d1fae5" : "#fee2e2",
                borderRadius: 8,
              }}>
                {limits.featuredSlots === Infinity ? "∞" : limits.featuredSlots}
              </span>
            </div>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: "12px 16px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
            }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: "#334155" }}>{t("admin.events")}</span>
              <span style={{ 
                fontSize: 24, 
                color: limits.events === Infinity || limits.events > 0 ? "#10b981" : "#dc2626",
                fontWeight: 700,
              }}>
                {limits.events === Infinity ? "✓" : limits.events > 0 ? "✓" : "✗"}
              </span>
            </div>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: "12px 16px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
            }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: "#334155" }}>{t("admin.multiLanguage") || "Több nyelv"}</span>
              <span style={{ fontSize: 24, color: "#10b981", fontWeight: 700 }}>✓</span>
            </div>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: "12px 16px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
            }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: "#334155" }}>{t("admin.customDomain") || "Egyedi domain"}</span>
              <span style={{ fontSize: 24, color: limits.customDomain ? "#10b981" : "#dc2626", fontWeight: 700 }}>
                {limits.customDomain ? "✓" : "✗"}
              </span>
            </div>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: "12px 16px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
            }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: "#334155" }}>{t("admin.seoSettings") || "SEO beállítások"}</span>
              <span style={{ fontSize: 24, color: "#10b981", fontWeight: 700 }}>✓</span>
            </div>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: "12px 16px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
            }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: "#334155" }}>{t("admin.pushNotifications") || "Push értesítés"}</span>
              <span style={{ fontSize: 24, color: "#dc2626", fontWeight: 700 }}>✗</span>
            </div>
          </div>
        </div>

        {/* C. Usage / Quota */}
        <div style={{ 
          padding: 32, 
          background: "linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)",
          borderRadius: 16, 
          border: "2px solid #e2e8f0",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          minHeight: 400,
        }}>
          <h4 style={{ 
            marginBottom: 24, 
            fontSize: 20, 
            fontWeight: 700, 
            color: "#1e293b",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ fontSize: 24 }}>📊</span>
            {t("admin.siteEdit.subscription.usage") || "Használat"}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
            {/* Places */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#334155" }}>{t("admin.places")}</span>
                <span 
                  style={{ 
                    fontSize: 18, 
                    fontWeight: 700,
                    animation: animatedValues.has("places") ? "valueUpdate 0.6s ease-out" : "none",
                    transform: animatedValues.has("places") ? "scale(1.1)" : "scale(1)",
                    transition: "transform 0.3s ease-out",
                    color: usage.places >= (limits.places === Infinity ? 0 : limits.places) ? "#ef4444" : "#1e293b",
                    padding: "6px 14px",
                    background: usage.places >= (limits.places === Infinity ? 0 : limits.places) ? "#fee2e2" : "#f1f5f9",
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
                <div style={{ width: "100%", height: 12, background: "#e5e7eb", borderRadius: 6, overflow: "hidden", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)" }}>
                  <div
                    style={{
                      width: `${getProgress(usage.places, limits.places)}%`,
                      height: "100%",
                      background: usage.places >= limits.places 
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#334155" }}>{t("admin.featuredPlaces") || "Kiemelések"}</span>
                <span 
                  style={{ 
                    fontSize: 18, 
                    fontWeight: 700,
                    animation: animatedValues.has("featuredSlots") ? "valueUpdate 0.6s ease-out" : "none",
                    transform: animatedValues.has("featuredSlots") ? "scale(1.1)" : "scale(1)",
                    transition: "transform 0.3s ease-out",
                    color: limits.featuredSlots !== Infinity && usage.featuredPlaces >= limits.featuredSlots ? "#ef4444" : "#1e293b",
                    padding: "6px 14px",
                    background: limits.featuredSlots !== Infinity && usage.featuredPlaces >= limits.featuredSlots ? "#fee2e2" : "#f1f5f9",
                    borderRadius: 10,
                  }}
                >
                  {usage.featuredPlaces} / {limits.featuredSlots === Infinity ? "∞" : limits.featuredSlots}
                  {limits.featuredSlots !== Infinity && usage.featuredPlaces >= limits.featuredSlots && (
                    <span style={{ marginLeft: 8, color: "#f59e0b", fontSize: 16 }}>⚠️</span>
                  )}
                </span>
              </div>
              {limits.featuredSlots === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7280", fontSize: 14, padding: 12, background: "#f3f4f6", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                  <span style={{ fontSize: 20 }}>🔒</span>
                  <span>{t("admin.siteEdit.subscription.lockedInPro") || "Pro csomagban elérhető"}</span>
                </div>
              ) : limits.featuredSlots !== Infinity ? (
                <div style={{ width: "100%", height: 12, background: "#e5e7eb", borderRadius: 6, overflow: "hidden", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)" }}>
                  <div
                    style={{
                      width: `${getProgress(usage.featuredPlaces, limits.featuredSlots)}%`,
                      height: "100%",
                      background: usage.featuredPlaces >= limits.featuredSlots 
                        ? "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)" 
                        : "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                      transition: "width 0.3s ease",
                      boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                    }}
                  />
                </div>
              ) : (
                <div style={{ fontSize: 16, color: "#6b7280", fontWeight: 600, padding: "8px 0" }}>∞</div>
              )}
            </div>

            {/* Events */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#334155" }}>{t("admin.events")}</span>
                <span 
                  style={{ 
                    fontSize: 18, 
                    fontWeight: 700,
                    animation: animatedValues.has("events") ? "valueUpdate 0.6s ease-out" : "none",
                    transform: animatedValues.has("events") ? "scale(1.1)" : "scale(1)",
                    transition: "transform 0.3s ease-out",
                    color: limits.events !== Infinity && usage.events >= limits.events ? "#ef4444" : "#1e293b",
                    padding: "6px 14px",
                    background: limits.events !== Infinity && usage.events >= limits.events ? "#fee2e2" : "#f1f5f9",
                    borderRadius: 10,
                  }}
                >
                  {usage.events} / {limits.events === Infinity ? "∞" : limits.events}
                </span>
              </div>
              {limits.events === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7280", fontSize: 14, padding: 12, background: "#f3f4f6", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                  <span style={{ fontSize: 20 }}>🔒</span>
                  <span>{t("admin.siteEdit.subscription.lockedInPro") || "Pro csomagban elérhető"}</span>
                </div>
              ) : limits.events !== Infinity ? (
                <div style={{ width: "100%", height: 12, background: "#e5e7eb", borderRadius: 6, overflow: "hidden", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)" }}>
                  <div
                    style={{
                      width: `${getProgress(usage.events, limits.events)}%`,
                      height: "100%",
                      background: usage.events >= limits.events 
                        ? "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)" 
                        : "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                      transition: "width 0.3s ease",
                      boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                    }}
                  />
                </div>
              ) : (
                <div style={{ fontSize: 16, color: "#6b7280", fontWeight: 600, padding: "8px 0" }}>∞</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Non-superadmin message */}
      {!canEditPlan && (
        <div style={{ padding: 16, background: "#fef3c7", borderRadius: 8, border: "1px solid #fbbf24" }}>
          <div style={{ fontSize: 14, color: "#92400e" }}>
            {t("admin.siteEdit.subscription.contactToUpgrade") || "A csomag módosításához vedd fel a kapcsolatot az üzemeltetővel."}
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
            {showAdvanced ? "▼" : "▶"} {t("admin.siteEdit.subscription.advancedSettings") || "Haladó beállítások"}
          </button>

          {showAdvanced && (
            <div style={{ 
              marginTop: 16, 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
              gap: 24,
            }}>
              {/* Dropdown mezők bal oldalon */}
              <div style={{ padding: 20, background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
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
                      fontSize: 14,
                      background: "white",
                    }}
                  >
                    <option value="trial">{t("admin.siteEdit.subscription.statusTrial") || "Próbaidőszak"}</option>
                    <option value="active">{t("admin.siteEdit.subscription.statusActive") || "Aktív"}</option>
                    <option value="past_due">{t("admin.siteEdit.subscription.statusPastDue") || "Lejárt"}</option>
                    <option value="canceled">{t("admin.siteEdit.subscription.statusCanceled") || "Megszakítva"}</option>
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
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
                        fontSize: 14,
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
                          planValidUntil: newDate.toISOString().split('T')[0] 
                        });
                      }}
                      style={{
                        padding: "10px 16px",
                        border: "1px solid #10b981",
                        borderRadius: 8,
                        background: "#10b981",
                        color: "white",
                        fontSize: 13,
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
                      +30 {t("admin.days") || "nap"}
                    </button>
                  </div>
                </div>

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
                    fontSize: 14,
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
              <div style={{ 
                padding: 24, 
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                borderRadius: 16, 
                border: "2px solid #e2e8f0",
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              }}>
                <h4 style={{ 
                  marginBottom: 24, 
                  fontSize: 20, 
                  fontWeight: 700, 
                  color: "#1e293b",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}>
                  <span style={{ fontSize: 24 }}>📊</span>
                  {t("admin.limits") || "Korlátok"}
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    padding: "18px 22px",
                    background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
                    borderRadius: 12,
                    border: "2px solid #e2e8f0",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: "#334155" }}>
                      {t("admin.places") || "Helyek"}
                    </span>
                    <span style={{ 
                      fontSize: 36, 
                      fontWeight: 900, 
                      color: limits.places === Infinity ? "#10b981" : "#1e293b",
                      padding: "12px 20px",
                      background: limits.places === Infinity 
                        ? "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)" 
                        : "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                      borderRadius: 12,
                      minWidth: 100,
                      textAlign: "center",
                      boxShadow: limits.places === Infinity 
                        ? "0 4px 12px rgba(16, 185, 129, 0.2)" 
                        : "0 2px 8px rgba(0,0,0,0.1)",
                      letterSpacing: "-1px",
                    }}>
                      {limits.places === Infinity ? "∞" : limits.places}
                    </span>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    padding: "18px 22px",
                    background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
                    borderRadius: 12,
                    border: "2px solid #e2e8f0",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: "#334155" }}>
                      {t("admin.featuredPlaces") || "Kiemelt helyek"}
                    </span>
                    <span style={{ 
                      fontSize: 36, 
                      fontWeight: 900, 
                      color: limits.featuredSlots > 0 ? "#10b981" : "#dc2626",
                      padding: "12px 20px",
                      background: limits.featuredSlots > 0 
                        ? "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)" 
                        : "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
                      borderRadius: 12,
                      minWidth: 100,
                      textAlign: "center",
                      boxShadow: limits.featuredSlots > 0 
                        ? "0 4px 12px rgba(16, 185, 129, 0.2)" 
                        : "0 4px 12px rgba(220, 38, 38, 0.2)",
                      letterSpacing: "-1px",
                    }}>
                      {limits.featuredSlots === Infinity ? "∞" : limits.featuredSlots}
                    </span>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    padding: "18px 22px",
                    background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
                    borderRadius: 12,
                    border: "2px solid #e2e8f0",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: "#334155" }}>
                      {t("admin.events") || "Események"}
                    </span>
                    <span style={{ 
                      fontSize: 36, 
                      fontWeight: 900, 
                      color: limits.events === Infinity || limits.events > 0 ? "#10b981" : "#dc2626",
                      padding: "12px 20px",
                      background: limits.events === Infinity || limits.events > 0 
                        ? "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)" 
                        : "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
                      borderRadius: 12,
                      minWidth: 100,
                      textAlign: "center",
                      boxShadow: limits.events === Infinity || limits.events > 0 
                        ? "0 4px 12px rgba(16, 185, 129, 0.2)" 
                        : "0 4px 12px rgba(220, 38, 38, 0.2)",
                      letterSpacing: "-1px",
                    }}>
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

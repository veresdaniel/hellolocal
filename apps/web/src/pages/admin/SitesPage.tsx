// src/pages/admin/TenantsPage.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { useAdminSite } from "../../contexts/AdminSiteContext";
import {
  getSites,
  createSite,
  updateSite,
  deleteSite,
  getBrands,
  type Site,
  type Brand,
} from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import {
  AdminResponsiveTable,
  type TableColumn,
  type CardField,
} from "../../components/AdminResponsiveTable";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { SlugInput } from "../../components/SlugInput";
import { DomainInput } from "../../components/DomainInput";
import { findTranslation } from "../../utils/langHelpers";
import type { Lang } from "../../types/enums";

export function SitesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  const { reloadSites, setSelectedSiteId, selectedSiteId } = useAdminSite();
  usePageTitle("admin.sites");
  const [sites, setSites] = useState<Site[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    slug: "",
    brandId: "",
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
    primaryDomain: "",
    primaryDomainEnabled: false,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSites();
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      const data = await getBrands();
      setBrands(data);
    } catch (err) {
      console.error("Failed to load brands", err);
    }
  };

  const loadSites = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSites();
      setSites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadSitesFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.slug.trim()) errors.slug = t("admin.validation.slugRequired");
    if (!formData.brandId.trim()) errors.brandId = t("admin.validation.brandRequired");
    if (!formData.nameHu.trim()) errors.nameHu = t("admin.validation.hungarianNameRequired");
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      const translations: Array<{
        lang: "hu" | "en" | "de";
        name: string;
        shortDescription: string | null;
        description: string | null;
        heroImage: string | null;
      }> = [
        {
          lang: "hu",
          name: formData.nameHu,
          shortDescription: formData.shortDescriptionHu || null,
          description: formData.descriptionHu || null,
          heroImage: formData.heroImageHu || null,
        },
      ];
      if (formData.nameEn.trim()) {
        translations.push({
          lang: "en",
          name: formData.nameEn,
          shortDescription: formData.shortDescriptionEn || null,
          description: formData.descriptionEn || null,
          heroImage: formData.heroImageEn || null,
        });
      }
      if (formData.nameDe.trim()) {
        translations.push({
          lang: "de",
          name: formData.nameDe,
          shortDescription: formData.shortDescriptionDe || null,
          description: formData.descriptionDe || null,
          heroImage: formData.heroImageDe || null,
        });
      }
      await createSite({
        slug: formData.slug,
        brandId: formData.brandId,
        translations,
        isActive: formData.isActive,
        primaryDomain: formData.primaryDomainEnabled ? formData.primaryDomain || null : null,
      });
      setIsCreating(false);
      resetForm();
      await loadSites();
      reloadSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.createSiteFailed"));
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validateForm()) return;

    try {
      const translations: Array<{
        lang: "hu" | "en" | "de";
        name: string;
        shortDescription: string | null;
        description: string | null;
        heroImage: string | null;
      }> = [
        {
          lang: "hu",
          name: formData.nameHu,
          shortDescription: formData.shortDescriptionHu || null,
          description: formData.descriptionHu || null,
          heroImage: formData.heroImageHu || null,
        },
      ];
      if (formData.nameEn.trim()) {
        translations.push({
          lang: "en",
          name: formData.nameEn,
          shortDescription: formData.shortDescriptionEn || null,
          description: formData.descriptionEn || null,
          heroImage: formData.heroImageEn || null,
        });
      }
      if (formData.nameDe.trim()) {
        translations.push({
          lang: "de",
          name: formData.nameDe,
          shortDescription: formData.shortDescriptionDe || null,
          description: formData.descriptionDe || null,
          heroImage: formData.heroImageDe || null,
        });
      }
      await updateSite(id, {
        slug: formData.slug,
        brandId: formData.brandId,
        translations,
        isActive: formData.isActive,
        primaryDomain: formData.primaryDomainEnabled ? formData.primaryDomain || null : null,
      });
      setEditingId(null);
      resetForm();
      await loadSites();
      reloadSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateSiteFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmations.deleteSite"))) return;

    try {
      await deleteSite(id);
      if (selectedSiteId === id) {
        setSelectedSiteId(null);
      }
      await loadSites();
      reloadSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteSiteFailed"));
    }
  };

  const startEdit = (site: Site) => {
    // Navigate to Site Edit page instead of inline editing
    navigate(`/admin/sites/${site.id}/edit`);
  };

  const startEditInline = (site: Site) => {
    setEditingId(site.id);
    const hu = findTranslation(site.translations, "hu" as Lang);
    const en = findTranslation(site.translations, "en" as Lang);
    const de = findTranslation(site.translations, "de" as Lang);
    setFormData({
      slug: site.slug,
      brandId: site.brandId || "",
      nameHu: hu?.name || "",
      nameEn: en?.name || "",
      nameDe: de?.name || "",
      shortDescriptionHu: hu?.shortDescription || "",
      shortDescriptionEn: en?.shortDescription || "",
      shortDescriptionDe: de?.shortDescription || "",
      descriptionHu: hu?.description || "",
      descriptionEn: en?.description || "",
      descriptionDe: de?.description || "",
      heroImageHu: hu?.heroImage || "",
      heroImageEn: en?.heroImage || "",
      heroImageDe: de?.heroImage || "",
      primaryDomain: site.primaryDomain || "",
      primaryDomainEnabled: !!site.primaryDomain,
      isActive: site.isActive,
    });
  };

  const resetForm = () => {
    setFormData({
      slug: "",
      brandId: "",
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
      primaryDomain: "",
      primaryDomainEnabled: false,
      isActive: true,
    });
    setFormErrors({});
  };

  const isSuperadmin = currentUser?.role === "superadmin";

  if (!isSuperadmin) {
    return <div style={{ padding: 24 }}>{t("admin.accessDenied")}</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <AdminPageHeader
        title={t("admin.sites")}
        newButtonLabel={t("admin.forms.newSite")}
        onNewClick={() => {
          setEditingId(null);
          setIsCreating(true);
          resetForm();
        }}
        showNewButton={!isCreating && !editingId}
        isCreatingOrEditing={isCreating || !!editingId}
        onSave={() => (editingId ? handleUpdate(editingId) : handleCreate())}
        onCancel={() => {
          setIsCreating(false);
          setEditingId(null);
          resetForm();
          // Back button will handle navigation
        }}
        saveLabel={editingId ? t("common.update") : t("common.create")}
      />

      {error && (
        <div
          style={{
            padding: "clamp(12px, 3vw, 16px)",
            marginBottom: 24,
            background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
            color: "#991b1b",
            borderRadius: 12,
            border: "1px solid #fca5a5",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div
          style={{
            padding: "clamp(24px, 5vw, 32px)",
            background: "white",
            borderRadius: 16,
            marginBottom: 32,
            boxShadow: "0 8px 24px rgba(102, 126, 234, 0.15)",
            border: "1px solid rgba(102, 126, 234, 0.1)",
          }}
        >
          <h2
            style={{
              marginBottom: 24,
              color: "#667eea",
              fontSize: "clamp(18px, 4vw, 22px)",
              fontWeight: 700,
              fontFamily:
                "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {editingId ? t("admin.forms.editSite") : t("admin.forms.newSite")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Name and Slug first - Language-aware */}
            <LanguageAwareForm>
              {(selectedLang) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Name - FIRST */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        color:
                          (selectedLang === "hu" && formErrors.nameHu) ||
                          (selectedLang === "en" && formErrors.nameEn) ||
                          (selectedLang === "de" && formErrors.nameDe)
                            ? "#dc2626"
                            : "#667eea",
                        fontWeight: 600,
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
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
                        if (selectedLang === "hu")
                          setFormData({ ...formData, nameHu: e.target.value });
                        else if (selectedLang === "en")
                          setFormData({ ...formData, nameEn: e.target.value });
                        else setFormData({ ...formData, nameDe: e.target.value });
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: "clamp(15px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        border:
                          (selectedLang === "hu" && formErrors.nameHu) ||
                          (selectedLang === "en" && formErrors.nameEn) ||
                          (selectedLang === "de" && formErrors.nameDe)
                            ? "2px solid #fca5a5"
                            : "2px solid #e0e7ff",
                        borderRadius: 8,
                        outline: "none",
                        transition: "all 0.3s ease",
                        background:
                          (selectedLang === "hu" && formErrors.nameHu) ||
                          (selectedLang === "en" && formErrors.nameEn) ||
                          (selectedLang === "de" && formErrors.nameDe)
                            ? "#fef2f2"
                            : "white",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        const hasError =
                          (selectedLang === "hu" && formErrors.nameHu) ||
                          (selectedLang === "en" && formErrors.nameEn) ||
                          (selectedLang === "de" && formErrors.nameDe);
                        if (!hasError) {
                          e.target.style.borderColor = "#667eea";
                          e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                        }
                      }}
                      onBlur={(e) => {
                        const hasError =
                          (selectedLang === "hu" && formErrors.nameHu) ||
                          (selectedLang === "en" && formErrors.nameEn) ||
                          (selectedLang === "de" && formErrors.nameDe);
                        e.target.style.borderColor = hasError ? "#fca5a5" : "#e0e7ff";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    {((selectedLang === "hu" && formErrors.nameHu) ||
                      (selectedLang === "en" && formErrors.nameEn) ||
                      (selectedLang === "de" && formErrors.nameDe)) && (
                      <div
                        style={{ color: "#dc2626", fontSize: 13, marginTop: 6, fontWeight: 500 }}
                      >
                        {selectedLang === "hu"
                          ? formErrors.nameHu
                          : selectedLang === "en"
                            ? formErrors.nameEn
                            : formErrors.nameDe}
                      </div>
                    )}
                  </div>

                  {/* Short Description */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        color: "#667eea",
                        fontWeight: 600,
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {t("admin.shortDescription")} ({selectedLang.toUpperCase()})
                    </label>
                    <input
                      type="text"
                      value={
                        selectedLang === "hu"
                          ? formData.shortDescriptionHu
                          : selectedLang === "en"
                            ? formData.shortDescriptionEn
                            : formData.shortDescriptionDe
                      }
                      onChange={(e) => {
                        if (selectedLang === "hu")
                          setFormData({ ...formData, shortDescriptionHu: e.target.value });
                        else if (selectedLang === "en")
                          setFormData({ ...formData, shortDescriptionEn: e.target.value });
                        else setFormData({ ...formData, shortDescriptionDe: e.target.value });
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: "clamp(15px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        border: "2px solid #e0e7ff",
                        borderRadius: 8,
                        outline: "none",
                        transition: "all 0.3s ease",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#667eea";
                        e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e0e7ff";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  {/* Description (TipTap Editor) */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        color: "#667eea",
                        fontWeight: 600,
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {t("common.description")} ({selectedLang.toUpperCase()})
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
                        if (selectedLang === "hu")
                          setFormData({ ...formData, descriptionHu: value });
                        else if (selectedLang === "en")
                          setFormData({ ...formData, descriptionEn: value });
                        else setFormData({ ...formData, descriptionDe: value });
                      }}
                      placeholder={t("common.description")}
                      height={200}
                      uploadFolder="editor/sites"
                    />
                  </div>

                  {/* Hero Image */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        color: "#667eea",
                        fontWeight: 600,
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
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
                        if (selectedLang === "hu")
                          setFormData({ ...formData, heroImageHu: e.target.value });
                        else if (selectedLang === "en")
                          setFormData({ ...formData, heroImageEn: e.target.value });
                        else setFormData({ ...formData, heroImageDe: e.target.value });
                      }}
                      placeholder="https://example.com/image.jpg"
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: "clamp(15px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        border: "2px solid #e0e7ff",
                        borderRadius: 8,
                        outline: "none",
                        transition: "all 0.3s ease",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#667eea";
                        e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e0e7ff";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    <div
                      style={{
                        fontSize: "clamp(13px, 3vw, 15px)",
                        color: "#666",
                        marginTop: 6,
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {t("admin.heroImageDescription")}
                    </div>
                  </div>
                </div>
              )}
            </LanguageAwareForm>

            {/* Other fields - Brand, Domain, Active - after Name, Slug, Description */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: formErrors.brandId ? "#dc2626" : "#667eea",
                    fontWeight: 600,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.brand")} *
                </label>
                <select
                  value={formData.brandId}
                  onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "clamp(15px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    border: `2px solid ${formErrors.brandId ? "#fca5a5" : "#e0e7ff"}`,
                    borderRadius: 8,
                    outline: "none",
                    transition: "all 0.3s ease",
                    background: formErrors.brandId ? "#fef2f2" : "white",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    if (!formErrors.brandId) {
                      e.target.style.borderColor = "#667eea";
                      e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = formErrors.brandId ? "#fca5a5" : "#e0e7ff";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="">{t("admin.selectBrand")}</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                {formErrors.brandId && (
                  <div
                    style={{
                      color: "#dc2626",
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      marginTop: 6,
                      fontWeight: 500,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {formErrors.brandId}
                  </div>
                )}
              </div>
              <div>
                <DomainInput
                  value={formData.primaryDomain}
                  onChange={(value) => setFormData({ ...formData, primaryDomain: value })}
                  checked={formData.primaryDomainEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, primaryDomainEnabled: checked })
                  }
                  label={t("admin.primaryDomain")}
                />
              </div>
            </div>

            {/* Active Checkbox */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: "16px 20px",
                background: "#f8f8ff",
                borderRadius: 12,
                border: "2px solid #e0e7ff",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
                />
                <span style={{ color: "#333", fontWeight: 500 }}>{t("common.active")}</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {!isCreating && !editingId && (
        <AdminResponsiveTable<Site>
          data={sites}
          getItemId={(site) => site.id}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.sites")}
          isLoading={isLoading}
          filterFn={(site, query) => {
            const lowerQuery = query.toLowerCase();
            return (
              site.translations.some((t) => t.name.toLowerCase().includes(lowerQuery)) ||
              site.slug.toLowerCase().includes(lowerQuery)
            );
          }}
          columns={[
            {
              key: "slug",
              label: t("admin.slug"),
              render: (site) => site.slug,
            },
            {
              key: "name",
              label: t("common.name"),
              render: (site) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation =
                  site.translations.find((t) => t.lang === currentLang) ||
                  findTranslation(site.translations, "hu" as Lang);
                return translation?.name || "-";
              },
            },
            {
              key: "status",
              label: t("admin.table.status"),
              render: (site) => (
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: site.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: "clamp(13px, 3vw, 15px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {site.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          cardTitle={(site) => {
            const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
            const translation =
              findTranslation(site.translations, currentLang) ||
              findTranslation(site.translations, "hu" as Lang);
            return translation?.name || "-";
          }}
          cardSubtitle={(site) => site.slug}
          cardFields={[
            {
              key: "status",
              render: (site) => (
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: site.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {site.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          onEdit={startEdit}
          onDelete={(site) => handleDelete(site.id)}
          error={error}
        />
      )}
    </div>
  );
}

// src/pages/admin/TenantsPage.tsx
import { useTranslation } from "react-i18next";
import { appendExtraLanguages, patchLang, readLang } from "../../utils/langFields";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { useAdminSite } from "../../contexts/useAdminSite";
import { useAdminSiteStore } from "../../stores/adminSiteStore";
import {
  createSite,
  updateSite,
  deleteSite,
  getBrands,
  type Site,
  type Brand,
} from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { AiPostfixField } from "../../components/AiGeneratePostfixButton";
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
import type { Lang} from "../../types/enums";

export function SitesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  const { reloadSites, setSelectedSiteId, selectedSiteId } = useAdminSite();
  
  // Use Zustand store for sites data - no need for local state
  const storeState = useAdminSiteStore();
  const sites = storeState.sites;
  const isLoadingSites = storeState.isLoading;
  const storeError = storeState.error;
  
  usePageTitle("admin.sites");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.slug.trim()) errors.slug = t("admin.validation.slugRequired");
    if (!formData.brandId.trim()) errors.brandId = t("admin.validation.domainRequired");
    if (!formData.nameHu.trim()) errors.nameHu = t("admin.validation.hungarianNameRequired");
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      const translations: Array<{
        lang: Lang;
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
      appendExtraLanguages(translations, formData, "name", [
        "shortDescription",
        "description",
        "heroImage",
      ]);
      await createSite({
        slug: formData.slug,
        brandId: formData.brandId,
        translations,
        isActive: formData.isActive,
        primaryDomain: formData.primaryDomainEnabled ? formData.primaryDomain || null : null,
      });
      setIsCreating(false);
      resetForm();
      await reloadSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.createSiteFailed"));
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validateForm()) return;

    try {
      const translations: Array<{
        lang: Lang;
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
      appendExtraLanguages(translations, formData, "name", [
        "shortDescription",
        "description",
        "heroImage",
      ]);
      await updateSite(id, {
        slug: formData.slug,
        brandId: formData.brandId,
        translations,
        isActive: formData.isActive,
        primaryDomain: formData.primaryDomainEnabled ? formData.primaryDomain || null : null,
      });
      setEditingId(null);
      resetForm();
      await reloadSites();
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
      await reloadSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteSiteFailed"));
    }
  };

  const startEdit = (site: Site) => {
    // Navigate to Site Edit page instead of inline editing
    const lang = i18n.language?.split("-")[0] || "hu";
    navigate(`/${lang}/admin/sites/${site.id}/edit`);
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
    <div className="admin-page-content">
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
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
            border: "1px solid rgba(37, 99, 235, 0.1)",
          }}
        >
          <h2
            style={{
              marginBottom: 24,
              color: "var(--admin-primary)",
              fontSize: "clamp(18px, 4vw, 22px)",
              fontWeight: 700,
              fontFamily:
                "var(--admin-font-display)",
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
                          readLang(formErrors, "name", selectedLang)
                            ? "#dc2626"
                            : "var(--admin-primary)",
                        fontWeight: 600,
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
                        siteId: editingId || undefined,
                        name: readLang(formData, "name", selectedLang),
                      }}
                      value={readLang(formData, "name", selectedLang)}
                      onApply={(text) =>
                        setFormData(patchLang(formData, "name", selectedLang, text))
                      }
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
                        padding: "12px 16px",
                        fontSize: "clamp(15px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        border:
                          readLang(formErrors, "name", selectedLang)
                            ? "2px solid #fca5a5"
                            : "2px solid var(--admin-primary-border)",
                        borderRadius: 8,
                        outline: "none",
                        transition: "all 0.3s ease",
                        background:
                          readLang(formErrors, "name", selectedLang)
                            ? "#fef2f2"
                            : "white",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        const hasError =
                          readLang(formErrors, "name", selectedLang);
                        if (!hasError) {
                          e.target.style.borderColor = "var(--admin-primary)";
                          e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                        }
                      }}
                      onBlur={(e) => {
                        const hasError =
                          readLang(formErrors, "name", selectedLang);
                        e.target.style.borderColor = hasError ? "#fca5a5" : "var(--admin-primary-border)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    </AiPostfixField>
                    {(readLang(formErrors, "name", selectedLang)) && (
                      <div
                        style={{ color: "#dc2626", fontSize: 13, marginTop: 6, fontWeight: 500 }}
                      >
                        {readLang(formErrors, "name", selectedLang)}
                      </div>
                    )}
                  </div>

                  {/* Short Description */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        color: "var(--admin-primary)",
                        fontWeight: 600,
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {t("admin.shortDescription")} ({selectedLang.toUpperCase()})
                    </label>
                    <AiPostfixField
                      draft={{
                        kind: "site",
                        field: "shortDescription",
                        lang: selectedLang,
                        siteId: editingId || undefined,
                        name: readLang(formData, "name", selectedLang),
                      }}
                      value={readLang(formData, "shortDescription", selectedLang)}
                      onApply={(text) => {
                        const plain = text
                          .replace(/<[^>]*>/g, " ")
                          .replace(/\s+/g, " ")
                          .trim();
                        setFormData(patchLang(formData, "shortDescription", selectedLang, plain));
                      }}
                    >
                    <input
                      type="text"
                      value={
                        readLang(formData, "shortDescription", selectedLang)
                      }
                      onChange={(e) => {
                        setFormData(patchLang(formData, "shortDescription", selectedLang, e.target.value));
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: "clamp(15px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        border: "2px solid var(--admin-primary-border)",
                        borderRadius: 8,
                        outline: "none",
                        transition: "all 0.3s ease",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "var(--admin-primary)";
                        e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "var(--admin-primary-border)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    </AiPostfixField>
                  </div>

                  {/* Description (TipTap Editor) */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        color: "var(--admin-primary)",
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
                        readLang(formData, "description", selectedLang)
                      }
                      onChange={(value) => {
                        setFormData(patchLang(formData, "description", selectedLang, value));
                      }}
                      placeholder={t("common.description")}
                      height={200}
                      uploadFolder="editor/sites"
                      aiDraft={{
                        kind: "site",
                        field: "description",
                        lang: selectedLang,
                        siteId: editingId || undefined,
                        name: readLang(formData, "name", selectedLang),
                      }}
                    />
                  </div>

                  {/* Hero Image */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        color: "var(--admin-primary)",
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
                        readLang(formData, "heroImage", selectedLang)
                      }
                      onChange={(e) => {
                        setFormData(patchLang(formData, "heroImage", selectedLang, e.target.value));
                      }}
                      placeholder="https://example.com/image.jpg"
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: "clamp(15px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        border: "2px solid var(--admin-primary-border)",
                        borderRadius: 8,
                        outline: "none",
                        transition: "all 0.3s ease",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "var(--admin-primary)";
                        e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "var(--admin-primary-border)";
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

            {/* Other fields - Domain, DNS Domain, Active - after Name, Slug, Description */}
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
                    color: formErrors.brandId ? "#dc2626" : "var(--admin-primary)",
                    fontWeight: 600,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.domain")} *
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
                    border: `2px solid ${formErrors.brandId ? "#fca5a5" : "var(--admin-primary-border)"}`,
                    borderRadius: 8,
                    outline: "none",
                    transition: "all 0.3s ease",
                    background: formErrors.brandId ? "#fef2f2" : "white",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    if (!formErrors.brandId) {
                      e.target.style.borderColor = "var(--admin-primary)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = formErrors.brandId ? "#fca5a5" : "var(--admin-primary-border)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="">{t("admin.selectDomain")}</option>
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
                <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 13, lineHeight: 1.45 }}>
                  {t("admin.siteEdit.domain.severalDomains")}
                </p>
              </div>
            </div>

            {/* Active Checkbox */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: "16px 20px",
                background: "var(--admin-surface-subtle, #f8fafc)",
                borderRadius: 12,
                border: "2px solid var(--admin-primary-border)",
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
                  style={{ width: 20, height: 20, cursor: "pointer", accentColor: "var(--admin-primary)" }}
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
          isLoading={isLoadingSites}
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
                const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
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

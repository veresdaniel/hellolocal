// src/pages/admin/TenantsPage.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useAdminTenant } from "../../contexts/AdminTenantContext";
import { getTenants, createTenant, updateTenant, deleteTenant, type Tenant } from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditor } from "../../components/TipTapEditor";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { AdminResponsiveTable, type TableColumn, type CardField } from "../../components/AdminResponsiveTable";

export function TenantsPage() {
  const { t, i18n } = useTranslation();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  const { reloadTenants, setSelectedTenantId, selectedTenantId } = useAdminTenant();
  usePageTitle("admin.tenants");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    slug: "",
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
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTenants();
      setTenants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadTenantsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.slug.trim()) errors.slug = t("admin.validation.slugRequired");
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
      await createTenant({
        slug: formData.slug,
        translations,
        isActive: formData.isActive,
        primaryDomain: formData.primaryDomain || null,
      });
      setIsCreating(false);
      resetForm();
      await loadTenants();
      reloadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.createTenantFailed"));
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
      await updateTenant(id, {
        slug: formData.slug,
        translations,
        isActive: formData.isActive,
        primaryDomain: formData.primaryDomain || null,
      });
      setEditingId(null);
      resetForm();
      await loadTenants();
      reloadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateTenantFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmations.deleteTenant"))) return;

    try {
      await deleteTenant(id);
      if (selectedTenantId === id) {
        setSelectedTenantId(null);
      }
      await loadTenants();
      reloadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteTenantFailed"));
    }
  };

  const startEdit = (tenant: Tenant) => {
    setEditingId(tenant.id);
    const hu = tenant.translations.find((t) => t.lang === "hu");
    const en = tenant.translations.find((t) => t.lang === "en");
    const de = tenant.translations.find((t) => t.lang === "de");
    setFormData({
      slug: tenant.slug,
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
      primaryDomain: tenant.primaryDomain || "",
      isActive: tenant.isActive,
    });
  };

  const resetForm = () => {
    setFormData({
      slug: "",
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(24px, 5vw, 32px)", flexWrap: "wrap", gap: 16 }}>
        <h1 style={{
          fontSize: "clamp(20px, 4vw, 28px)",
          fontWeight: 700,
          color: "#e0e0ff",
          margin: 0,
          textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        }}>
          {t("admin.tenants")}
        </h1>
        
        {/* Action buttons */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {(isCreating || editingId) ? (
            <>
              <button
                onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                style={{
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(40, 167, 69, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(40, 167, 69, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(40, 167, 69, 0.3)";
                }}
              >
                {editingId ? t("common.update") : t("common.create")}
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingId(null);
                  resetForm();
                }}
                style={{
                  padding: "12px 24px",
                  background: "white",
                  color: "#6c757d",
                  border: "2px solid #6c757d",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8f9fa";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
                }}
              >
                {t("common.cancel")}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setEditingId(null);
                setIsCreating(true);
                resetForm();
              }}
              style={{
                padding: "12px 24px",
                background: "white",
                color: "#667eea",
                border: "2px solid #667eea",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 700,
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.2)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.3)";
                e.currentTarget.style.background = "#f8f8ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.2)";
                e.currentTarget.style.background = "white";
              }}
            >
              + {t("admin.forms.newTenant")}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: "clamp(12px, 3vw, 16px)",
          marginBottom: 24,
          background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
          color: "#991b1b",
          borderRadius: 12,
          border: "1px solid #fca5a5",
          fontSize: "clamp(13px, 3vw, 14px)",
          fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ 
          padding: "clamp(24px, 5vw, 32px)", 
          background: "white", 
          borderRadius: 16, 
          marginBottom: 32, 
          boxShadow: "0 8px 24px rgba(102, 126, 234, 0.15)",
          border: "1px solid rgba(102, 126, 234, 0.1)",
        }}>
          <h2 style={{ 
            marginBottom: 24, 
            color: "#667eea",
            fontSize: "clamp(20px, 5vw, 24px)",
            fontWeight: 700,
          }}>
            {editingId ? t("admin.forms.editTenant") : t("admin.forms.newTenant")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Slug and Primary Domain Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ 
                  display: "block", 
                  marginBottom: 8,
                  color: formErrors.slug ? "#dc2626" : "#667eea",
                  fontWeight: 600,
                  fontSize: "clamp(13px, 3vw, 14px)",
                }}>
                  {t("admin.fields.tenantSlug")} *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 15,
                    border: `2px solid ${formErrors.slug ? "#fca5a5" : "#e0e7ff"}`,
                    borderRadius: 8,
                    outline: "none",
                    transition: "all 0.3s ease",
                    fontFamily: "inherit",
                    background: formErrors.slug ? "#fef2f2" : "white",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    if (!formErrors.slug) {
                      e.target.style.borderColor = "#667eea";
                      e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = formErrors.slug ? "#fca5a5" : "#e0e7ff";
                    e.target.style.boxShadow = "none";
                  }}
                />
                {formErrors.slug && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 6, fontWeight: 500 }}>{formErrors.slug}</div>}
              </div>
              <div>
                <label style={{ 
                  display: "block", 
                  marginBottom: 8,
                  color: "#667eea",
                  fontWeight: 600,
                  fontSize: "clamp(13px, 3vw, 14px)",
                }}>
                  {t("admin.primaryDomain")}
                </label>
                <input
                  type="text"
                  value={formData.primaryDomain}
                  onChange={(e) => setFormData({ ...formData, primaryDomain: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 15,
                    border: "2px solid #e0e7ff",
                    borderRadius: 8,
                    outline: "none",
                    transition: "all 0.3s ease",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                  placeholder="example.com"
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
            </div>

            <LanguageAwareForm>
              {(selectedLang) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Name */}
                  <div>
                    <label style={{ 
                      display: "block", 
                      marginBottom: 8,
                      color: ((selectedLang === "hu" && formErrors.nameHu) ||
                              (selectedLang === "en" && formErrors.nameEn) ||
                              (selectedLang === "de" && formErrors.nameDe)) ? "#dc2626" : "#667eea",
                      fontWeight: 600,
                      fontSize: "clamp(13px, 3vw, 14px)",
                    }}>
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
                        padding: "12px 16px",
                        fontSize: 15,
                        border:
                          ((selectedLang === "hu" && formErrors.nameHu) ||
                          (selectedLang === "en" && formErrors.nameEn) ||
                          (selectedLang === "de" && formErrors.nameDe))
                            ? "2px solid #fca5a5"
                            : "2px solid #e0e7ff",
                        borderRadius: 8,
                        outline: "none",
                        transition: "all 0.3s ease",
                        fontFamily: "inherit",
                        background: ((selectedLang === "hu" && formErrors.nameHu) ||
                                     (selectedLang === "en" && formErrors.nameEn) ||
                                     (selectedLang === "de" && formErrors.nameDe)) ? "#fef2f2" : "white",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        const hasError = (selectedLang === "hu" && formErrors.nameHu) ||
                                         (selectedLang === "en" && formErrors.nameEn) ||
                                         (selectedLang === "de" && formErrors.nameDe);
                        if (!hasError) {
                          e.target.style.borderColor = "#667eea";
                          e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                        }
                      }}
                      onBlur={(e) => {
                        const hasError = (selectedLang === "hu" && formErrors.nameHu) ||
                                         (selectedLang === "en" && formErrors.nameEn) ||
                                         (selectedLang === "de" && formErrors.nameDe);
                        e.target.style.borderColor = hasError ? "#fca5a5" : "#e0e7ff";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    {((selectedLang === "hu" && formErrors.nameHu) ||
                      (selectedLang === "en" && formErrors.nameEn) ||
                      (selectedLang === "de" && formErrors.nameDe)) && (
                      <div style={{ color: "#dc2626", fontSize: 13, marginTop: 6, fontWeight: 500 }}>
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
                    <label style={{ 
                      display: "block", 
                      marginBottom: 8,
                      color: "#667eea",
                      fontWeight: 600,
                      fontSize: "clamp(13px, 3vw, 14px)",
                    }}>
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
                        if (selectedLang === "hu") setFormData({ ...formData, shortDescriptionHu: e.target.value });
                        else if (selectedLang === "en") setFormData({ ...formData, shortDescriptionEn: e.target.value });
                        else setFormData({ ...formData, shortDescriptionDe: e.target.value });
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: 15,
                        border: "2px solid #e0e7ff",
                        borderRadius: 8,
                        outline: "none",
                        transition: "all 0.3s ease",
                        fontFamily: "inherit",
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
                    <label style={{ 
                      display: "block", 
                      marginBottom: 8,
                      color: "#667eea",
                      fontWeight: 600,
                      fontSize: "clamp(13px, 3vw, 14px)",
                    }}>
                      {t("common.description")} ({selectedLang.toUpperCase()})
                    </label>
                    <TipTapEditor
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
                      placeholder={t("common.description")}
                      height={200}
                    />
                  </div>

                  {/* Hero Image */}
                  <div>
                    <label style={{ 
                      display: "block", 
                      marginBottom: 8,
                      color: "#667eea",
                      fontWeight: 600,
                      fontSize: "clamp(13px, 3vw, 14px)",
                    }}>
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
                      placeholder="https://example.com/image.jpg"
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: 15,
                        border: "2px solid #e0e7ff",
                        borderRadius: 8,
                        outline: "none",
                        transition: "all 0.3s ease",
                        fontFamily: "inherit",
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
                    <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                      {t("admin.heroImageDescription") || "URL a kártyán megjelenő képhez"}
                    </div>
                  </div>
                </div>
              )}
            </LanguageAwareForm>

            {/* Active Checkbox */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 20px", background: "#f8f8ff", borderRadius: 12, border: "2px solid #e0e7ff" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 15 }}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <span style={{ color: "#333", fontWeight: 500 }}>{t("common.active")}</span>
              </label>
            </div>
          </div>
        </div>
      )}

      <LoadingSpinner isLoading={isLoading} />
      {!isLoading && !isCreating && !editingId && (
        <AdminResponsiveTable<Tenant>
          data={tenants}
          getItemId={(tenant) => tenant.id}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.tenants")}
          filterFn={(tenant, query) => {
            const lowerQuery = query.toLowerCase();
            return (
              tenant.translations.some((t) => t.name.toLowerCase().includes(lowerQuery)) ||
              tenant.slug.toLowerCase().includes(lowerQuery)
            );
          }}
          columns={[
            {
              key: "slug",
              label: "Slug",
              render: (tenant) => tenant.slug,
            },
            {
              key: "name",
              label: t("common.name"),
              render: (tenant) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation =
                  tenant.translations.find((t) => t.lang === currentLang) ||
                  tenant.translations.find((t) => t.lang === "hu");
                return translation?.name || "-";
              },
            },
            {
              key: "status",
              label: t("admin.table.status"),
              render: (tenant) => (
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: tenant.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {tenant.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          cardTitle={(tenant) => {
            const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
            const translation =
              tenant.translations.find((t) => t.lang === currentLang) ||
              tenant.translations.find((t) => t.lang === "hu");
            return translation?.name || "-";
          }}
          cardSubtitle={(tenant) => tenant.slug}
          cardFields={[
            {
              key: "status",
              render: (tenant) => (
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: tenant.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {tenant.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          onEdit={startEdit}
          onDelete={(tenant) => handleDelete(tenant.id)}
          isLoading={isLoading}
          error={error}
        />
      )}
    </div>
  );
}

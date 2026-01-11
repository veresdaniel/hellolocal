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

export function TenantsPage() {
  const { t, i18n } = useTranslation();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  const { reloadTenants, setSelectedTenantId, selectedTenantId } = useAdminTenant();
  usePageTitle("admin.tenants");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    // English and German are optional
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
      // Reload tenants in the context to update the tenant selector
      reloadTenants();
      // Reload tenants in the context to update the tenant selector
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
      // Reload tenants in the context to update the tenant selector
      reloadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateTenantFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmations.deleteTenant"))) return;

    try {
      await deleteTenant(id);
      // If deleted tenant was selected, clear selection
      if (selectedTenantId === id) {
        setSelectedTenantId(null);
      }
      await loadTenants();
      // Reload tenants in the context to update the tenant selector
      reloadTenants();
      // Reload tenant selector
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>Tenants</h1>
        <button
          onClick={() => {
            setEditingId(null);
            setIsCreating(true);
            resetForm();
          }}
          disabled={!!editingId || isCreating}
          style={{
            padding: "12px 24px",
            background: editingId || isCreating ? "#999" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: editingId || isCreating ? "not-allowed" : "pointer",
            opacity: editingId || isCreating ? 0.6 : 1,
          }}
        >
          + {t("admin.forms.newTenant")}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4 }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ padding: 24, background: "white", borderRadius: 8, marginBottom: 24, border: "1px solid #ddd" }}>
          <h2 style={{ marginBottom: 16 }}>{editingId ? t("admin.forms.editTenant") : t("admin.forms.newTenant")}</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.fields.tenantSlug")} *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                style={{
                  width: "100%",
                  padding: 8,
                  fontSize: 16,
                  border: formErrors.slug ? "1px solid #dc3545" : "1px solid #ddd",
                  borderRadius: 4,
                }}
              />
              {formErrors.slug && <div style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>{formErrors.slug}</div>}
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.primaryDomain")}</label>
              <input
                type="text"
                value={formData.primaryDomain}
                onChange={(e) => setFormData({ ...formData, primaryDomain: e.target.value })}
                style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                placeholder="example.com"
              />
            </div>
          </div>

          <LanguageAwareForm>
            {(selectedLang) => (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>
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
                      padding: 8,
                      fontSize: 16,
                      border:
                        (selectedLang === "hu" && formErrors.nameHu) ||
                        (selectedLang === "en" && formErrors.nameEn) ||
                        (selectedLang === "de" && formErrors.nameDe)
                          ? "1px solid #dc3545"
                          : "1px solid #ddd",
                      borderRadius: 4,
                    }}
                  />
                  {(selectedLang === "hu" && formErrors.nameHu) ||
                    (selectedLang === "en" && formErrors.nameEn) ||
                    (selectedLang === "de" && formErrors.nameDe) ? (
                    <div style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>
                      {selectedLang === "hu"
                        ? formErrors.nameHu
                        : selectedLang === "en"
                        ? formErrors.nameEn
                        : formErrors.nameDe}
                    </div>
                  ) : null}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>{t("admin.shortDescription")}</label>
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
                    style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>{t("common.description")}</label>
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
              </>
            )}
          </LanguageAwareForm>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              {t("common.active")}
            </label>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
              style={{
                padding: "12px 24px",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
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
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      <LoadingSpinner isLoading={isLoading} />
      {!isLoading && !isCreating && !editingId ? (
        <div style={{ background: "white", borderRadius: 8, overflow: "hidden", border: "1px solid #ddd" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>Slug</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("common.name")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.table.status")}</th>
                <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #ddd", width: "1%", whiteSpace: "nowrap" }}>{t("admin.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => {
                // Get current language or fallback to Hungarian
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation = tenant.translations.find((t) => t.lang === currentLang) || 
                                   tenant.translations.find((t) => t.lang === "hu");
                return (
                  <tr key={tenant.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>{tenant.slug}</td>
                    <td style={{ padding: 12 }}>{translation?.name || "-"}</td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          background: tenant.isActive ? "#28a745" : "#dc3545",
                          color: "white",
                          fontSize: 12,
                        }}
                      >
                        {tenant.isActive ? t("common.active") : t("common.inactive")}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => startEdit(tenant)}
                          style={{
                            padding: "4px 8px",
                            background: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          onClick={() => handleDelete(tenant.id)}
                          style={{
                            padding: "4px 8px",
                            background: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          {t("common.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {tenants.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", color: "#999" }}>{t("admin.table.noData")}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}


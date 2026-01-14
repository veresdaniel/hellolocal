// src/pages/admin/PriceBandsPage.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import { useConfirm } from "../../hooks/useConfirm";
import { useAdminSite } from "../../contexts/AdminSiteContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../contexts/ToastContext";
import { getPriceBands, createPriceBand, updatePriceBand, deletePriceBand } from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Pagination } from "../../components/Pagination";
import { AdminResponsiveTable, type TableColumn, type CardField } from "../../components/AdminResponsiveTable";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { findTranslation } from "../../utils/langHelpers";
import type { Lang } from "../../types/enums";

interface PriceBand {
  id: string;
  tenantId: string;
  isActive: boolean;
  translations: Array<{
    id: string;
    lang: string;
    name: string;
    description: string | null;
  }>;
}

export function PriceBandsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { selectedSiteId, isLoading: isSiteLoading } = useAdminSite();
  const selectedTenantId = selectedSiteId; // Alias for backward compatibility
  const isTenantLoading = isSiteLoading;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  usePageTitle("admin.priceBands");
  const [priceBands, setPriceBands] = useState<PriceBand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    nameHu: "",
    nameEn: "",
    nameDe: "",
    descriptionHu: "",
    descriptionEn: "",
    descriptionDe: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      // Reset to first page when site changes
      setPagination(prev => ({ ...prev, page: 1 }));
    } else {
      // Reset loading state if no site
      setIsLoading(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    if (selectedTenantId) {
      loadPriceBands();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, pagination.page, pagination.limit]);

  const loadPriceBands = async () => {
    if (!selectedTenantId) return;
    setIsLoading(true);
    try {
      const response = await getPriceBands(selectedTenantId, pagination.page, pagination.limit);
      // Backend always returns paginated response now
      if (Array.isArray(response)) {
        // Fallback for backward compatibility (should not happen)
        setPriceBands(response);
        setPagination(prev => ({ ...prev, total: response.length, totalPages: 1 }));
      } else {
        setPriceBands(response.priceBands || []);
        setPagination(response.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.loadPriceBandsFailed"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.nameHu.trim()) errors.nameHu = t("admin.validation.hungarianNameRequired");
    // English and German are optional
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!selectedTenantId) return;
    if (!validateForm()) return;

    try {
      const translations: Array<{ lang: "hu" | "en" | "de"; name: string; description: string | null }> = [
        { lang: "hu", name: formData.nameHu, description: formData.descriptionHu || null },
      ];
      if (formData.nameEn.trim()) {
        translations.push({ lang: "en", name: formData.nameEn, description: formData.descriptionEn || null });
      }
      if (formData.nameDe.trim()) {
        translations.push({ lang: "de", name: formData.nameDe, description: formData.descriptionDe || null });
      }
      await createPriceBand({
        tenantId: selectedTenantId,
        translations,
        isActive: formData.isActive,
      });
      setIsCreating(false);
      resetForm();
      await loadPriceBands();
      // Notify global cache manager that price bands have changed
      notifyEntityChanged("priceBands");
      showToast(t("admin.messages.priceBandCreated"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.createPriceBandFailed"), "error");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validateForm()) return;

    try {
      const translations: Array<{ lang: "hu" | "en" | "de"; name: string; description: string | null }> = [
        { lang: "hu", name: formData.nameHu, description: formData.descriptionHu || null },
      ];
      if (formData.nameEn.trim()) {
        translations.push({ lang: "en", name: formData.nameEn, description: formData.descriptionEn || null });
      }
      if (formData.nameDe.trim()) {
        translations.push({ lang: "de", name: formData.nameDe, description: formData.descriptionDe || null });
      }
      await updatePriceBand(
        id,
        {
          translations,
          isActive: formData.isActive,
        },
        selectedTenantId || undefined
      );
      setEditingId(null);
      resetForm();
      await loadPriceBands();
      // Notify global cache manager that price bands have changed
      notifyEntityChanged("priceBands");
      showToast(t("admin.messages.priceBandUpdated"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updatePriceBandFailed"), "error");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t("admin.confirmations.deletePriceBand") || "Delete Price Band",
      message: t("admin.confirmations.deletePriceBand") || "Are you sure you want to delete this price band? This action cannot be undone.",
      confirmLabel: t("common.delete") || "Delete",
      cancelLabel: t("common.cancel") || "Cancel",
      confirmVariant: "danger",
      size: "medium",
    });

    if (!confirmed) return;

    try {
      await deletePriceBand(id, selectedTenantId || undefined);
      await loadPriceBands();
      // Notify global cache manager that price bands have changed
      notifyEntityChanged("priceBands");
      showToast(t("admin.messages.priceBandDeleted"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.deletePriceBandFailed"), "error");
    }
  };

  const startEdit = (priceBand: PriceBand) => {
    setEditingId(priceBand.id);
    const hu = findTranslation(priceBand.translations, "hu" as Lang);
    const en = findTranslation(priceBand.translations, "en" as Lang);
    const de = findTranslation(priceBand.translations, "de" as Lang);
    setFormData({
      nameHu: hu?.name || "",
      nameEn: en?.name || "",
      nameDe: de?.name || "",
      descriptionHu: hu?.description || "",
      descriptionEn: en?.description || "",
      descriptionDe: de?.description || "",
      isActive: priceBand.isActive,
    });
  };

  const resetForm = () => {
    setFormData({
      nameHu: "",
      nameEn: "",
      nameDe: "",
      descriptionHu: "",
      descriptionEn: "",
      descriptionDe: "",
      isActive: true,
    });
    setFormErrors({});
  };

  // Wait for site context to initialize
  if (isSiteLoading) {
    return null;
  }

  if (!selectedSiteId) {
    return <div style={{ padding: 24 }}>{t("admin.table.pleaseSelectSite")}</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <AdminPageHeader
        title={t("admin.priceBands")}
        newButtonLabel={t("admin.forms.newPriceBand")}
        onNewClick={() => {
          setEditingId(null);
          setIsCreating(true);
          resetForm();
        }}
        showNewButton={!isCreating && !editingId}
        isCreatingOrEditing={isCreating || !!editingId}
        onSave={() => editingId ? handleUpdate(editingId) : handleCreate()}
        onCancel={() => {
          setIsCreating(false);
          setEditingId(null);
          resetForm();
          // Back button will handle navigation
        }}
        saveLabel={editingId ? t("common.update") : t("common.create")}
      />

      {(isCreating || editingId) && (
        <div style={{ padding: "clamp(24px, 5vw, 32px)", background: "white", borderRadius: 16, marginBottom: 32, boxShadow: "0 8px 24px rgba(102, 126, 234, 0.15)", border: "1px solid rgba(102, 126, 234, 0.1)" }}>
          <h2 style={{ 
            marginBottom: 24, 
            color: "#667eea", 
            fontSize: "clamp(18px, 4vw, 22px)", 
            fontWeight: 700, 
            fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            {editingId ? t("admin.forms.editPriceBand") : t("admin.forms.newPriceBand")}
          </h2>

          {/* Active Checkbox - moved to top */}
          <div style={{ marginBottom: 16, padding: "16px 20px", background: "#f8f8ff", borderRadius: 12, border: "2px solid #e0e7ff" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 15 }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
              />
              <span style={{ color: "#333", fontWeight: 500 }}>{t("common.active")}</span>
            </label>
          </div>

          <LanguageAwareForm>
            {(selectedLang) => (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
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
                  <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("common.description")}</label>
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
                    placeholder={t("common.description")}
                    height={200}
                    uploadFolder="editor/price-bands"
                  />
                </div>
              </>
            )}
          </LanguageAwareForm>
        </div>
      )}

      {!isCreating && !editingId && (
        <AdminResponsiveTable<PriceBand>
          data={priceBands}
          getItemId={(priceBand) => priceBand.id}
          searchQuery={searchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.priceBands")}
          onSearchChange={(query) => {
            setSearchQuery(query);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          isLoading={isLoading}
          filterFn={(priceBand, query) => {
            const lowerQuery = query.toLowerCase();
            const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
            const translation = findTranslation(priceBand.translations, currentLang) || 
                               findTranslation(priceBand.translations, "hu" as Lang);
            return translation?.name.toLowerCase().includes(lowerQuery);
          }}
          columns={[
            {
              key: "name",
              label: t("common.name"),
              render: (priceBand) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation = priceBand.translations.find((t) => t.lang === currentLang) || 
                                   findTranslation(priceBand.translations, "hu" as Lang);
                return translation?.name || "-";
              },
            },
            {
              key: "status",
              label: t("admin.table.status"),
              render: (priceBand) => (
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: priceBand.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {priceBand.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          cardTitle={(priceBand) => {
            const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
            const translation = findTranslation(priceBand.translations, currentLang) || 
                               findTranslation(priceBand.translations, "hu" as Lang);
            return translation?.name || "-";
          }}
          cardSubtitle={(priceBand) => `💰 ${priceBand.id.slice(0, 8)}`}
          cardFields={[
            {
              key: "status",
              render: (priceBand) => (
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: priceBand.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {priceBand.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          onEdit={startEdit}
          onDelete={(priceBand) => handleDelete(priceBand.id)}
          error={null}
        />
      )}
      {!isMobile && !isLoading && !isCreating && !editingId && pagination.total > 0 && (
        <div style={{ marginTop: 16 }}>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
            onLimitChange={(limit) => setPagination(prev => ({ ...prev, limit, page: 1 }))}
          />
        </div>
      )}
    </div>
  );
}


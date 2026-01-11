// src/pages/admin/TagsPage.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import { useAdminTenant } from "../../contexts/AdminTenantContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../contexts/ToastContext";
import { getTags, createTag, updateTag, deleteTag } from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Pagination } from "../../components/Pagination";
import { AdminResponsiveTable, type TableColumn, type CardField } from "../../components/AdminResponsiveTable";

interface Tag {
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

export function TagsPage() {
  const { t, i18n } = useTranslation();
  const { selectedTenantId, isLoading: isTenantLoading } = useAdminTenant();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  usePageTitle("admin.tags");
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
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
      // Reset to first page when tenant changes
      setPagination(prev => ({ ...prev, page: 1 }));
    } else {
      // Reset loading state if no tenant
      setIsLoading(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    if (selectedTenantId) {
      loadTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, pagination.page, pagination.limit]);

  const loadTags = async () => {
    if (!selectedTenantId) return;
    setIsLoading(true);
    try {
      const response = await getTags(selectedTenantId, pagination.page, pagination.limit);
      // Backend always returns paginated response now
      if (Array.isArray(response)) {
        // Fallback for backward compatibility (should not happen)
        setTags(response);
        setPagination(prev => ({ ...prev, total: response.length, totalPages: 1 }));
      } else {
        setTags(response.tags || []);
        setPagination(response.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.loadTagsFailed"), "error");
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
      await createTag({
        tenantId: selectedTenantId,
        translations,
        isActive: formData.isActive,
      });
      setIsCreating(false);
      resetForm();
      await loadTags();
      // Notify global cache manager that tags have changed
      notifyEntityChanged("tags");
      showToast(t("admin.messages.tagCreated"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.createTagFailed"), "error");
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
      await updateTag(
        id,
        {
          translations,
          isActive: formData.isActive,
        },
        selectedTenantId || undefined
      );
      setEditingId(null);
      resetForm();
      await loadTags();
      // Notify global cache manager that tags have changed
      notifyEntityChanged("tags");
      showToast(t("admin.messages.tagUpdated"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updateTagFailed"), "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmations.deleteTag"))) return;

    try {
      await deleteTag(id, selectedTenantId || undefined);
      await loadTags();
      // Notify global cache manager that tags have changed
      notifyEntityChanged("tags");
      showToast(t("admin.messages.tagDeleted"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.deleteTagFailed"), "error");
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    const hu = tag.translations.find((t) => t.lang === "hu");
    const en = tag.translations.find((t) => t.lang === "en");
    const de = tag.translations.find((t) => t.lang === "de");
    setFormData({
      nameHu: hu?.name || "",
      nameEn: en?.name || "",
      nameDe: de?.name || "",
      descriptionHu: hu?.description || "",
      descriptionEn: en?.description || "",
      descriptionDe: de?.description || "",
      isActive: tag.isActive,
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

  // Wait for tenant context to initialize
  if (isTenantLoading) {
    return <LoadingSpinner isLoading={true} />;
  }

  if (!selectedTenantId) {
    return <div style={{ padding: 24 }}>{t("admin.table.pleaseSelectTenant")}</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(24px, 5vw, 32px)", flexWrap: "wrap", gap: 16 }}>
        <h1 style={{
          fontSize: "clamp(20px, 4vw, 28px)",
          fontWeight: 700,
          fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#e0e0ff",
          margin: 0,
          textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        }}>
          {t("admin.tags")}
        </h1>
        
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {(isCreating || editingId) ? (
            <>
              <button onClick={() => editingId ? handleUpdate(editingId) : handleCreate()} style={{ padding: "12px 24px", background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600, transition: "all 0.3s ease", boxShadow: "0 4px 12px rgba(40, 167, 69, 0.3)" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(40, 167, 69, 0.4)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(40, 167, 69, 0.3)"; }}>
                {editingId ? t("common.update") : t("common.create")}
              </button>
              <button onClick={() => { setIsCreating(false); setEditingId(null); resetForm(); }} style={{ padding: "12px 24px", background: "#6c757d", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600, transition: "all 0.3s ease", boxShadow: "0 4px 12px rgba(108, 117, 125, 0.3)" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#5a6268"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(108, 117, 125, 0.4)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#6c757d"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(108, 117, 125, 0.3)"; }}>
                {t("common.cancel")}
              </button>
            </>
          ) : (
            <button onClick={() => { setEditingId(null); setIsCreating(true); resetForm(); }} style={{ padding: "12px 24px", background: "white", color: "#667eea", border: "2px solid #667eea", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 700, boxShadow: "0 6px 20px rgba(0, 0, 0, 0.2)", transition: "all 0.3s ease" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.3)"; e.currentTarget.style.background = "#f8f8ff"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.2)"; e.currentTarget.style.background = "white"; }}>
              + {t("admin.forms.newTag")}
            </button>
          )}
        </div>
      </div>

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
            fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            {editingId ? t("admin.forms.editTag") : t("admin.forms.newTag")}
          </h2>

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
                    uploadFolder="editor/tags"
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
        </div>
      )}

      <LoadingSpinner isLoading={isLoading} />
      {!isLoading && !isCreating && !editingId && (
        <AdminResponsiveTable<Tag>
          data={tags}
          getItemId={(tag) => tag.id}
          searchQuery={searchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.tags")}
          onSearchChange={(query) => {
            setSearchQuery(query);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          filterFn={(tag, query) => {
            const lowerQuery = query.toLowerCase();
            const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
            const translation = tag.translations.find((t) => t.lang === currentLang) || 
                               tag.translations.find((t) => t.lang === "hu");
            return translation?.name.toLowerCase().includes(lowerQuery);
          }}
          columns={[
            {
              key: "name",
              label: t("common.name"),
              render: (tag) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation = tag.translations.find((t) => t.lang === currentLang) || 
                                   tag.translations.find((t) => t.lang === "hu");
                return translation?.name || "-";
              },
            },
            {
              key: "status",
              label: t("admin.table.status"),
              render: (tag) => (
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: tag.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {tag.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          cardTitle={(tag) => {
            const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
            const translation = tag.translations.find((t) => t.lang === currentLang) || 
                               tag.translations.find((t) => t.lang === "hu");
            return translation?.name || "-";
          }}
          cardSubtitle={(tag) => `#${tag.id.slice(0, 8)}`}
          cardFields={[
            {
              key: "status",
              render: (tag) => (
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: tag.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {tag.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          onEdit={startEdit}
          onDelete={(tag) => handleDelete(tag.id)}
          isLoading={isLoading}
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


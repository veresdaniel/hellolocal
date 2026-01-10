// src/pages/admin/StaticPagesPage.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminTenant } from "../../contexts/AdminTenantContext";
import { getStaticPages, createStaticPage, updateStaticPage, deleteStaticPage } from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditor } from "../../components/TipTapEditor";
import { StaticPageCategoryAutocomplete } from "../../components/StaticPageCategoryAutocomplete";
import { LoadingSpinner as LoadingSpinnerComponent } from "../../components/LoadingSpinner";
import { notifyEntityChanged } from "../../hooks/useAdminCache";

interface StaticPage {
  id: string;
  tenantId: string;
  category: "blog" | "tudastar" | "infok";
  isActive: boolean;
  translations: Array<{
    id: string;
    lang: string;
    title: string;
    content: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoImage: string | null;
    seoKeywords: string[];
  }>;
}

export function StaticPagesPage() {
  const { t, i18n } = useTranslation();
  const { selectedTenantId } = useAdminTenant();
  const queryClient = useQueryClient();
  usePageTitle("admin.staticPages");
  const [staticPages, setStaticPages] = useState<StaticPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    category: "blog" as "blog" | "tudastar" | "infok",
    titleHu: "",
    titleEn: "",
    titleDe: "",
    contentHu: "",
    contentEn: "",
    contentDe: "",
    seoTitleHu: "",
    seoTitleEn: "",
    seoTitleDe: "",
    seoDescriptionHu: "",
    seoDescriptionEn: "",
    seoDescriptionDe: "",
    seoImageHu: "",
    seoImageEn: "",
    seoImageDe: "",
    seoKeywordsHu: "",
    seoKeywordsEn: "",
    seoKeywordsDe: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedTenantId) {
      loadStaticPages();
    } else {
      // Reset loading state if no tenant
      setIsLoading(false);
    }
  }, [selectedTenantId]);

  const loadStaticPages = async () => {
    if (!selectedTenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getStaticPages(selectedTenantId);
      setStaticPages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadStaticPagesFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.titleHu.trim()) errors.titleHu = t("admin.validation.hungarianTitleRequired");
    // English and German are optional
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!selectedTenantId) return;
    if (!validateForm()) return;

    try {
      await createStaticPage({
        tenantId: selectedTenantId!,
        category: formData.category,
        translations: (() => {
          const translations: Array<{
            lang: string;
            title: string;
            content: string | null;
            seoTitle: string | null;
            seoDescription: string | null;
            seoImage: string | null;
            seoKeywords: string[];
          }> = [
            {
              lang: "hu",
              title: formData.titleHu,
              content: formData.contentHu || null,
              seoTitle: formData.seoTitleHu || null,
              seoDescription: formData.seoDescriptionHu || null,
              seoImage: formData.seoImageHu || null,
              seoKeywords: formData.seoKeywordsHu ? formData.seoKeywordsHu.split(",").map((k) => k.trim()) : [],
            },
          ];
          if (formData.titleEn.trim()) {
            translations.push({
              lang: "en",
              title: formData.titleEn,
              content: formData.contentEn || null,
              seoTitle: formData.seoTitleEn || null,
              seoDescription: formData.seoDescriptionEn || null,
              seoImage: formData.seoImageEn || null,
              seoKeywords: formData.seoKeywordsEn ? formData.seoKeywordsEn.split(",").map((k) => k.trim()) : [],
            });
          }
          if (formData.titleDe.trim()) {
            translations.push({
              lang: "de",
              title: formData.titleDe,
              content: formData.contentDe || null,
              seoTitle: formData.seoTitleDe || null,
              seoDescription: formData.seoDescriptionDe || null,
              seoImage: formData.seoImageDe || null,
              seoKeywords: formData.seoKeywordsDe ? formData.seoKeywordsDe.split(",").map((k) => k.trim()) : [],
            });
          }
          return translations;
        })(),
        isActive: formData.isActive,
      });
      setIsCreating(false);
      resetForm();
      await loadStaticPages();
      notifyEntityChanged("staticPages");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.createStaticPageFailed"));
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validateForm()) return;

    try {
      await updateStaticPage(
        id,
        {
          category: formData.category,
          translations: (() => {
            const translations: Array<{
              lang: string;
              title: string;
              content: string | null;
              seoTitle: string | null;
              seoDescription: string | null;
              seoImage: string | null;
              seoKeywords: string[];
            }> = [
              {
                lang: "hu",
                title: formData.titleHu,
                content: formData.contentHu || null,
                seoTitle: formData.seoTitleHu || null,
                seoDescription: formData.seoDescriptionHu || null,
                seoImage: formData.seoImageHu || null,
                seoKeywords: formData.seoKeywordsHu ? formData.seoKeywordsHu.split(",").map((k) => k.trim()) : [],
              },
            ];
            if (formData.titleEn.trim()) {
              translations.push({
                lang: "en",
                title: formData.titleEn,
                content: formData.contentEn || null,
                seoTitle: formData.seoTitleEn || null,
                seoDescription: formData.seoDescriptionEn || null,
                seoImage: formData.seoImageEn || null,
                seoKeywords: formData.seoKeywordsEn ? formData.seoKeywordsEn.split(",").map((k) => k.trim()) : [],
              });
            }
            if (formData.titleDe.trim()) {
              translations.push({
                lang: "de",
                title: formData.titleDe,
                content: formData.contentDe || null,
                seoTitle: formData.seoTitleDe || null,
                seoDescription: formData.seoDescriptionDe || null,
                seoImage: formData.seoImageDe || null,
                seoKeywords: formData.seoKeywordsDe ? formData.seoKeywordsDe.split(",").map((k) => k.trim()) : [],
              });
            }
            return translations;
          })(),
          isActive: formData.isActive,
        },
        selectedTenantId || undefined
      );
      setEditingId(null);
      resetForm();
      await loadStaticPages();
      notifyEntityChanged("staticPages");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateStaticPageFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmations.deleteStaticPage"))) return;

    try {
      await deleteStaticPage(id, selectedTenantId || undefined);
      await loadStaticPages();
      notifyEntityChanged("staticPages");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteStaticPageFailed"));
    }
  };

  const startEdit = (staticPage: StaticPage) => {
    setEditingId(staticPage.id);
    const hu = staticPage.translations.find((t) => t.lang === "hu");
    const en = staticPage.translations.find((t) => t.lang === "en");
    const de = staticPage.translations.find((t) => t.lang === "de");
    setFormData({
      category: staticPage.category,
      titleHu: hu?.title || "",
      titleEn: en?.title || "",
      titleDe: de?.title || "",
      contentHu: hu?.content || "",
      contentEn: en?.content || "",
      contentDe: de?.content || "",
      seoTitleHu: hu?.seoTitle || "",
      seoTitleEn: en?.seoTitle || "",
      seoTitleDe: de?.seoTitle || "",
      seoDescriptionHu: hu?.seoDescription || "",
      seoDescriptionEn: en?.seoDescription || "",
      seoDescriptionDe: de?.seoDescription || "",
      seoImageHu: hu?.seoImage || "",
      seoImageEn: en?.seoImage || "",
      seoImageDe: de?.seoImage || "",
      seoKeywordsHu: hu?.seoKeywords?.join(", ") || "",
      seoKeywordsEn: en?.seoKeywords?.join(", ") || "",
      seoKeywordsDe: de?.seoKeywords?.join(", ") || "",
      isActive: staticPage.isActive,
    });
  };

  const resetForm = () => {
    setFormData({
      category: "blog",
      titleHu: "",
      titleEn: "",
      titleDe: "",
      contentHu: "",
      contentEn: "",
      contentDe: "",
      seoTitleHu: "",
      seoTitleEn: "",
      seoTitleDe: "",
      seoDescriptionHu: "",
      seoDescriptionEn: "",
      seoDescriptionDe: "",
      seoImageHu: "",
      seoImageEn: "",
      seoImageDe: "",
      seoKeywordsHu: "",
      seoKeywordsEn: "",
      seoKeywordsDe: "",
      isActive: true,
    });
    setFormErrors({});
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "blog":
        return t("admin.categoryBlog");
      case "tudastar":
        return t("admin.categoryTudastar");
      case "infok":
        return t("admin.categoryInfok");
      default:
        return category;
    }
  };

  if (!selectedTenantId) {
    return <div style={{ padding: 24 }}>{t("admin.selectTenantFirst")}</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>{t("admin.staticPages")}</h1>
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
          + {t("admin.forms.newStaticPage")}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4 }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ padding: 24, background: "white", borderRadius: 8, marginBottom: 24, border: "1px solid #ddd" }}>
          <h2 style={{ marginBottom: 16 }}>{editingId ? t("admin.forms.editStaticPage") : t("admin.forms.newStaticPage")}</h2>

          <div style={{ marginBottom: 16 }}>
            <StaticPageCategoryAutocomplete
              value={formData.category}
              onChange={(category) => setFormData({ ...formData, category })}
              placeholder={t("admin.category")}
            />
          </div>

          <LanguageAwareForm>
            {(selectedLang) => (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>
                    {t("common.title")} ({selectedLang.toUpperCase()}) *
                  </label>
                  <input
                    type="text"
                    value={
                      selectedLang === "hu"
                        ? formData.titleHu
                        : selectedLang === "en"
                        ? formData.titleEn
                        : formData.titleDe
                    }
                    onChange={(e) => {
                      if (selectedLang === "hu") setFormData({ ...formData, titleHu: e.target.value });
                      else if (selectedLang === "en") setFormData({ ...formData, titleEn: e.target.value });
                      else setFormData({ ...formData, titleDe: e.target.value });
                    }}
                    style={{
                      width: "100%",
                      padding: 8,
                      fontSize: 16,
                      border:
                        (selectedLang === "hu" && formErrors.titleHu) ||
                        (selectedLang === "en" && formErrors.titleEn) ||
                        (selectedLang === "de" && formErrors.titleDe)
                          ? "1px solid #dc3545"
                          : "1px solid #ddd",
                      borderRadius: 4,
                    }}
                  />
                  {(selectedLang === "hu" && formErrors.titleHu) ||
                    (selectedLang === "en" && formErrors.titleEn) ||
                    (selectedLang === "de" && formErrors.titleDe) ? (
                    <div style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>
                      {selectedLang === "hu"
                        ? formErrors.titleHu
                        : selectedLang === "en"
                        ? formErrors.titleEn
                        : formErrors.titleDe}
                    </div>
                  ) : null}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>{t("admin.content")}</label>
                  <TipTapEditor
                    value={
                      selectedLang === "hu"
                        ? formData.contentHu
                        : selectedLang === "en"
                        ? formData.contentEn
                        : formData.contentDe
                    }
                    onChange={(value) => {
                      if (selectedLang === "hu") setFormData({ ...formData, contentHu: value });
                      else if (selectedLang === "en") setFormData({ ...formData, contentEn: value });
                      else setFormData({ ...formData, contentDe: value });
                    }}
                    placeholder={t("admin.content")}
                    height={300}
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

      <LoadingSpinnerComponent isLoading={isLoading} />
      {!isLoading && !isCreating && !editingId ? (
        <div style={{ background: "white", borderRadius: 8, overflow: "hidden", border: "1px solid #ddd" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.category")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("common.title")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.table.status")}</th>
                <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #ddd", width: "1%", whiteSpace: "nowrap" }}>{t("admin.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {staticPages.map((staticPage) => {
                // Get current language or fallback to Hungarian
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation = staticPage.translations.find((t) => t.lang === currentLang) || 
                                   staticPage.translations.find((t) => t.lang === "hu");
                return (
                  <tr key={staticPage.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>{getCategoryLabel(staticPage.category)}</td>
                    <td style={{ padding: 12 }}>{translation?.title || "-"}</td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          background: staticPage.isActive ? "#28a745" : "#dc3545",
                          color: "white",
                          fontSize: 12,
                        }}
                      >
                        {staticPage.isActive ? t("common.active") : t("common.inactive")}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => startEdit(staticPage)}
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
                          onClick={() => handleDelete(staticPage.id)}
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
          {staticPages.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", color: "#999" }}>{t("admin.table.noData")}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}


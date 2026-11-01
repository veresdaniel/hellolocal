// src/pages/admin/StaticPagesPage.tsx
import { useTranslation } from "react-i18next";
import { appendExtraLanguages, patchLang, readLang } from "../../utils/langFields";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect } from "react";
import { useAdminSite } from "../../contexts/useAdminSite";
import {
  getStaticPages,
  createStaticPage,
  updateStaticPage,
  deleteStaticPage,
} from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { AiPostfixField } from "../../components/AiGeneratePostfixButton";
import { StaticPageCategoryAutocomplete } from "../../components/StaticPageCategoryAutocomplete";
import { LoadingSpinner as LoadingSpinnerComponent } from "../../components/LoadingSpinner";
import { Pagination } from "../../components/Pagination";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import {
  AdminResponsiveTable,
  type TableColumn,
  type CardField,
} from "../../components/AdminResponsiveTable";
import { findTranslation } from "../../utils/langHelpers";
import type { Lang} from "../../types/enums";
import { buildUrl } from "../../app/urls";

interface StaticPage {
  id: string;
  siteId: string;
  category: "blog" | "tudastar" | "infok";
  isActive: boolean;
  translations: Array<{
    id: string;
    lang: string;
    title: string;
    shortDescription: string | null;
    content: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoImage: string | null;
    seoKeywords: string[];
  }>;
}

export function StaticPagesPage() {
  const { t, i18n } = useTranslation();
  const { selectedSiteId, isLoading: isSiteLoading, sites } = useAdminSite();
  const currentSite = sites.find((s) => s.id === selectedSiteId);
  usePageTitle("admin.staticPages");
  const [staticPages, setStaticPages] = useState<StaticPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    category: "blog" as "blog" | "tudastar" | "infok",
    titleHu: "",
    titleEn: "",
    titleDe: "",
    shortDescriptionHu: "",
    shortDescriptionEn: "",
    shortDescriptionDe: "",
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
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      // Reset to first page when site changes
      setPagination((prev) => ({ ...prev, page: 1 }));
    } else {
      // Reset loading state if no site
      setIsLoading(false);
    }
  }, [selectedSiteId]);

  useEffect(() => {
    if (selectedSiteId) {
      loadStaticPages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, pagination.page, pagination.limit]);

  const loadStaticPages = async () => {
    if (!selectedSiteId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getStaticPages(
        selectedSiteId,
        undefined,
        pagination.page,
        pagination.limit
      );
      // Backend always returns paginated response now
      if (Array.isArray(response)) {
        // Fallback for backward compatibility (should not happen)
        setStaticPages(response);
        setPagination((prev) => ({ ...prev, total: response.length, totalPages: 1 }));
      } else {
        setStaticPages(response.staticPages || []);
        setPagination(response.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      }
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
    if (!selectedSiteId) return;
    if (!validateForm()) return;

    try {
      await createStaticPage({
        tenantId: selectedSiteId!,
        category: formData.category,
        translations: (() => {
          const translations: Array<{
            lang: string;
            title: string;
            shortDescription: string | null;
            content: string | null;
            seoTitle: string | null;
            seoDescription: string | null;
            seoImage: string | null;
            seoKeywords: string[];
          }> = [
            {
              lang: "hu",
              title: formData.titleHu,
              shortDescription: formData.shortDescriptionHu || null,
              content: formData.contentHu || null,
              seoTitle: formData.seoTitleHu || null,
              seoDescription: formData.seoDescriptionHu || null,
              seoImage: formData.seoImageHu || null,
              seoKeywords: formData.seoKeywordsHu
                ? formData.seoKeywordsHu.split(",").map((k) => k.trim())
                : [],
            },
          ];
          if (formData.titleEn.trim()) {
            translations.push({
              lang: "en",
              title: formData.titleEn,
              shortDescription: formData.shortDescriptionEn || null,
              content: formData.contentEn || null,
              seoTitle: formData.seoTitleEn || null,
              seoDescription: formData.seoDescriptionEn || null,
              seoImage: formData.seoImageEn || null,
              seoKeywords: formData.seoKeywordsEn
                ? formData.seoKeywordsEn.split(",").map((k) => k.trim())
                : [],
            });
          }
          if (formData.titleDe.trim()) {
            translations.push({
              lang: "de",
              title: formData.titleDe,
              shortDescription: formData.shortDescriptionDe || null,
              content: formData.contentDe || null,
              seoTitle: formData.seoTitleDe || null,
              seoDescription: formData.seoDescriptionDe || null,
              seoImage: formData.seoImageDe || null,
              seoKeywords: formData.seoKeywordsDe
                ? formData.seoKeywordsDe.split(",").map((k) => k.trim())
                : [],
            });
          }
          appendExtraLanguages(translations, formData, "title", [
            "shortDescription",
            "content",
            "seoTitle",
            "seoDescription",
            "seoImage",
            "seoKeywords",
          ]);
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
                seoKeywords: formData.seoKeywordsHu
                  ? formData.seoKeywordsHu.split(",").map((k) => k.trim())
                  : [],
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
                seoKeywords: formData.seoKeywordsEn
                  ? formData.seoKeywordsEn.split(",").map((k) => k.trim())
                  : [],
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
                seoKeywords: formData.seoKeywordsDe
                  ? formData.seoKeywordsDe.split(",").map((k) => k.trim())
                  : [],
              });
            }
            appendExtraLanguages(translations, formData, "title", [
              "content",
              "seoTitle",
              "seoDescription",
              "seoImage",
              "seoKeywords",
            ]);
            return translations;
          })(),
          isActive: formData.isActive,
        },
        selectedSiteId || undefined
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
      await deleteStaticPage(id, selectedSiteId || undefined);
      await loadStaticPages();
      notifyEntityChanged("staticPages");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteStaticPageFailed"));
    }
  };

  const startEdit = (staticPage: StaticPage) => {
    setEditingId(staticPage.id);
    const hu = findTranslation(staticPage.translations, "hu" as Lang);
    const en = findTranslation(staticPage.translations, "en" as Lang);
    const de = findTranslation(staticPage.translations, "de" as Lang);
    setFormData({
      category: staticPage.category,
      titleHu: hu?.title || "",
      titleEn: en?.title || "",
      titleDe: de?.title || "",
      shortDescriptionHu: hu?.shortDescription || "",
      shortDescriptionEn: en?.shortDescription || "",
      shortDescriptionDe: de?.shortDescription || "",
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
      shortDescriptionHu: "",
      shortDescriptionEn: "",
      shortDescriptionDe: "",
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

  // Wait for site context to initialize
  if (isSiteLoading) {
    return null;
  }

  if (!selectedSiteId) {
    return <div style={{ padding: 24 }}>{t("admin.table.pleaseSelectSite")}</div>;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "clamp(24px, 5vw, 32px)",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <h1
          style={{
            fontSize: "clamp(20px, 4vw, 28px)",
            fontWeight: 700,
            fontFamily:
              "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: "white",
            textShadow: "0 2px 4px rgba(0,0,0,0.1)",
            margin: 0,
          }}
        >
          {t("admin.staticPages")}
        </h1>
        <button
          onClick={() => {
            setEditingId(null);
            setIsCreating(true);
            resetForm();
          }}
          disabled={!!editingId || isCreating}
          style={{
            padding: "10px 20px",
            background: editingId || isCreating ? "#ccc" : "white",
            color: editingId || isCreating ? "#999" : "#667eea",
            border: editingId || isCreating ? "2px solid #ccc" : "2px solid #667eea",
            borderRadius: 8,
            cursor: editingId || isCreating ? "not-allowed" : "pointer",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 700,
            boxShadow: editingId || isCreating ? "none" : "0 4px 12px rgba(102, 126, 234, 0.3)",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            if (!editingId && !isCreating) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.4)";
              e.currentTarget.style.background = "#f8f8ff";
            }
          }}
          onMouseLeave={(e) => {
            if (!editingId && !isCreating) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
              e.currentTarget.style.background = "white";
            }
          }}
        >
          {t("admin.forms.newStaticPage")}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: "#fee",
            color: "#c00",
            borderRadius: 4,
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div
          style={{
            padding: 24,
            background: "white",
            borderRadius: 8,
            marginBottom: 24,
            border: "1px solid #ddd",
          }}
        >
          <h2
            style={{
              marginBottom: 16,
              fontFamily:
                "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {editingId ? t("admin.forms.editStaticPage") : t("admin.forms.newStaticPage")}
          </h2>

          <div style={{ marginBottom: 16 }}>
            <StaticPageCategoryAutocomplete
              value={formData.category}
              onChange={(category) => setFormData({ ...formData, category })}
              placeholder={t("admin.category")}
            />
          </div>

          {/* Active Checkbox - moved to top */}
          <div
            style={{
              marginBottom: 16,
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
                gap: 12,
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

          <LanguageAwareForm>
            {(selectedLang) => (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("common.title")} ({selectedLang.toUpperCase()}) *
                  </label>
                  <AiPostfixField
                    draft={{
                      kind: "staticPage",
                      field: "title",
                      lang: selectedLang,
                      name: readLang(formData, "title", selectedLang),
                    }}
                    value={readLang(formData, "title", selectedLang)}
                    onApply={(text) =>
                      setFormData(patchLang(formData, "title", selectedLang, text))
                    }
                  >
                  <input
                    type="text"
                    value={
                      readLang(formData, "title", selectedLang)
                    }
                    onChange={(e) => {
                      setFormData(patchLang(formData, "title", selectedLang, e.target.value));
                    }}
                    style={{
                      width: "100%",
                      padding: 8,
                      fontSize: 16,
                      border:
                        readLang(formErrors, "title", selectedLang)
                          ? "1px solid #dc3545"
                          : "1px solid #ddd",
                      borderRadius: 4,
                    }}
                  />
                  </AiPostfixField>
                  {readLang(formErrors, "title", selectedLang) ? (
                    <div
                      style={{
                        color: "#dc3545",
                        fontSize: "clamp(13px, 3vw, 15px)",
                        marginTop: 4,
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {readLang(formErrors, "title", selectedLang)}
                    </div>
                  ) : null}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.shortDescription") || "Rövid leírás (lista oldal)"}
                  </label>
                  <TipTapEditorWithUpload
                    value={
                      readLang(formData, "shortDescription", selectedLang)
                    }
                    onChange={(value) => {
                      setFormData(patchLang(formData, "shortDescription", selectedLang, value));
                    }}
                    placeholder={
                      t("admin.shortDescriptionPlaceholder") ||
                      "Rövid leírás a lista oldali kártyához (richtext)"
                    }
                    height={150}
                    uploadFolder="editor/static-pages"
                    aiDraft={{
                      kind: "staticPage",
                      field: "shortDescription",
                      lang: selectedLang,
                      name: readLang(formData, "title", selectedLang),
                    }}
                  />
                  <small
                    style={{
                      color: "#666",
                      fontSize: "clamp(13px, 3vw, 15px)",
                      marginTop: 4,
                      display: "block",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.shortDescriptionHint") ||
                      "Ez a mező jelenik meg a lista oldali kártyákon"}
                  </small>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.content")}
                  </label>
                  <TipTapEditorWithUpload
                    value={
                      readLang(formData, "content", selectedLang)
                    }
                    onChange={(value) => {
                      setFormData(patchLang(formData, "content", selectedLang, value));
                    }}
                    placeholder={t("admin.content")}
                    height={300}
                    uploadFolder="editor/static-pages"
                    aiDraft={{
                      kind: "staticPage",
                      field: "content",
                      lang: selectedLang,
                      name: readLang(formData, "title", selectedLang),
                    }}
                  />
                </div>

                {/* SEO Fields Section */}
                <div
                  style={{
                    marginTop: 24,
                    padding: 16,
                    background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
                    borderRadius: 8,
                    border: "1px solid #667eea30",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: "clamp(16px, 3.5vw, 18px)",
                      fontWeight: 600,
                      color: "#667eea",
                      fontFamily:
                        "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    🔍 SEO {t("admin.settings")}
                  </h3>

                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      SEO {t("common.title")}
                    </label>
                    <AiPostfixField
                      draft={{
                        kind: "staticPage",
                        field: "seoTitle",
                        lang: selectedLang,
                        name: readLang(formData, "title", selectedLang),
                      }}
                      value={readLang(formData, "seoTitle", selectedLang)}
                      onApply={(text) =>
                        setFormData(patchLang(formData, "seoTitle", selectedLang, text))
                      }
                    >
                    <input
                      type="text"
                      value={
                        readLang(formData, "seoTitle", selectedLang)
                      }
                      onChange={(e) => {
                        setFormData(patchLang(formData, "seoTitle", selectedLang, e.target.value));
                      }}
                      placeholder={
                        t("admin.seoTitlePlaceholder") || "SEO title (leave empty for auto)"
                      }
                      style={{
                        width: "100%",
                        padding: 8,
                        fontSize: 16,
                        border: "1px solid #ddd",
                        borderRadius: 4,
                      }}
                    />
                    </AiPostfixField>
                    <small
                      style={{
                        color: "#666",
                        fontSize: "clamp(13px, 3vw, 15px)",
                        marginTop: 4,
                        display: "block",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {t("admin.seoTitleHint") || "If empty, page title will be used"}
                    </small>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      SEO {t("common.description")}
                    </label>
                    <AiPostfixField
                      draft={{
                        kind: "staticPage",
                        field: "seoDescription",
                        lang: selectedLang,
                        name: readLang(formData, "title", selectedLang),
                      }}
                      value={readLang(formData, "seoDescription", selectedLang)}
                      onApply={(text) =>
                        setFormData(patchLang(formData, "seoDescription", selectedLang, text))
                      }
                      variant="textarea"
                    >
                    <textarea
                      value={
                        readLang(formData, "seoDescription", selectedLang)
                      }
                      onChange={(e) => {
                        setFormData(patchLang(formData, "seoDescription", selectedLang, e.target.value));
                      }}
                      placeholder={
                        t("admin.seoDescriptionPlaceholder") ||
                        "SEO description (leave empty for auto)"
                      }
                      rows={3}
                      style={{
                        width: "100%",
                        padding: 8,
                        fontSize: 16,
                        border: "1px solid #ddd",
                        borderRadius: 4,
                      }}
                    />
                    </AiPostfixField>
                    <small
                      style={{
                        color: "#666",
                        fontSize: "clamp(13px, 3vw, 15px)",
                        marginTop: 4,
                        display: "block",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {t("admin.seoDescriptionHint") ||
                        "If empty, first 2 sentences from content will be used"}
                    </small>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      SEO {t("common.image")}
                    </label>
                    <input
                      type="url"
                      value={
                        readLang(formData, "seoImage", selectedLang)
                      }
                      onChange={(e) => {
                        setFormData(patchLang(formData, "seoImage", selectedLang, e.target.value));
                      }}
                      placeholder={t("admin.seoImagePlaceholder") || "SEO image URL"}
                      style={{
                        width: "100%",
                        padding: 8,
                        fontSize: 16,
                        border: "1px solid #ddd",
                        borderRadius: 4,
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 0 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {t("admin.seoKeywords")}
                    </label>
                    <input
                      type="text"
                      value={
                        readLang(formData, "seoKeywords", selectedLang)
                      }
                      onChange={(e) => {
                        setFormData(patchLang(formData, "seoKeywords", selectedLang, e.target.value));
                      }}
                      placeholder={
                        t("admin.seoKeywordsPlaceholder") || "keyword1, keyword2, keyword3"
                      }
                      style={{
                        width: "100%",
                        padding: 8,
                        fontSize: 16,
                        border: "1px solid #ddd",
                        borderRadius: 4,
                      }}
                    />
                    <small
                      style={{
                        color: "#666",
                        fontSize: "clamp(13px, 3vw, 15px)",
                        marginTop: 4,
                        display: "block",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {t("admin.seoKeywordsHint") || "Comma-separated keywords for search engines"}
                    </small>
                  </div>
                </div>
              </>
            )}
          </LanguageAwareForm>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => (editingId ? handleUpdate(editingId) : handleCreate())}
              style={{
                padding: "10px 20px",
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
                padding: "10px 20px",
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

      {!isCreating && !editingId && (
        <AdminResponsiveTable<StaticPage>
          data={staticPages}
          getItemId={(staticPage) => staticPage.id}
          searchQuery={searchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.staticPages")}
          onSearchChange={(query) => {
            setSearchQuery(query);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          isLoading={isLoading}
          filterFn={(staticPage, query) => {
            const lowerQuery = query.toLowerCase();
            const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
            const translation =
              staticPage.translations.find((t) => t.lang === currentLang) ||
              findTranslation(staticPage.translations, "hu" as Lang);
            return (
              getCategoryLabel(staticPage.category).toLowerCase().includes(lowerQuery) ||
              translation?.title.toLowerCase().includes(lowerQuery) ||
              false
            );
          }}
          columns={[
            {
              key: "category",
              label: t("admin.category"),
              render: (staticPage) => getCategoryLabel(staticPage.category),
            },
            {
              key: "title",
              label: t("common.title"),
              render: (staticPage) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
                const translation =
                  staticPage.translations.find((t) => t.lang === currentLang) ||
                  findTranslation(staticPage.translations, "hu" as Lang);
                return translation?.title || "-";
              },
            },
            {
              key: "status",
              label: t("admin.table.status"),
              render: (staticPage) => (
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: staticPage.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: "clamp(13px, 3vw, 15px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {staticPage.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          cardTitle={(staticPage) => {
            const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
            const translation =
              staticPage.translations.find((t) => t.lang === currentLang) ||
              findTranslation(staticPage.translations, "hu" as Lang);
            return translation?.title || "-";
          }}
          cardSubtitle={(staticPage) => getCategoryLabel(staticPage.category)}
          cardFields={[
            {
              key: "status",
              render: (staticPage) => (
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: staticPage.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {staticPage.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
            {
              key: "view",
              render: (staticPage) => {
                const publicUrl = currentSite?.slug
                  ? buildUrl({
                      lang: i18n.language || "hu",
                      siteKey: currentSite.slug,
                      path: `static-page/${staticPage.id}`,
                    })
                  : null;
                return publicUrl ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(publicUrl, "_blank");
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: "clamp(13px, 3vw, 15px)",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      marginTop: 8,
                      transition: "all 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      color: "#10b981",
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(16, 185, 129, 0.2)";
                      e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)";
                      e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.3)";
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }}
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {t("admin.viewPublic") || "Megnézem"}
                  </button>
                ) : null;
              },
            },
          ]}
          onEdit={startEdit}
          onView={(staticPage) => {
            const publicUrl = currentSite?.slug
              ? buildUrl({
                  lang: i18n.language || "hu",
                  siteKey: currentSite.slug,
                  path: `static-page/${staticPage.id}`,
                })
              : null;
            if (publicUrl) {
              window.open(publicUrl, "_blank");
            }
          }}
          onDelete={(staticPage) => handleDelete(staticPage.id)}
          error={error}
        />
      )}
      {!isMobile && !isLoading && !isCreating && !editingId && pagination.total > 0 && (
        <div style={{ marginTop: 16 }}>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
            onLimitChange={(limit) => setPagination((prev) => ({ ...prev, limit, page: 1 }))}
          />
        </div>
      )}
    </div>
  );
}

// src/pages/admin/LegalPagesPage.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminSite } from "../../contexts/AdminSiteContext";
import { getLegalPages, createLegalPage, updateLegalPage, deleteLegalPage } from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { LoadingSpinner as LoadingSpinnerComponent } from "../../components/LoadingSpinner";
import { Pagination } from "../../components/Pagination";
import { AdminResponsiveTable, type TableColumn, type CardField } from "../../components/AdminResponsiveTable";

interface LegalPage {
  id: string;
  tenantId: string;
  key: "imprint" | "terms" | "privacy";
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

export function LegalPagesPage() {
  const { t, i18n } = useTranslation();
  const { selectedSiteId, isLoading: isSiteLoading } = useAdminSite();
  const queryClient = useQueryClient();
  usePageTitle("admin.legalPages");
  const [legalPages, setLegalPages] = useState<LegalPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    key: "imprint" as "imprint" | "terms" | "privacy",
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
      setPagination(prev => ({ ...prev, page: 1 }));
    } else {
      // Reset loading state if no site
      setIsLoading(false);
    }
  }, [selectedSiteId]);

  useEffect(() => {
    if (selectedSiteId) {
      loadLegalPages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, pagination.page, pagination.limit]);

  const loadLegalPages = async () => {
    if (!selectedSiteId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getLegalPages(selectedSiteId, pagination.page, pagination.limit);
      // Backend always returns paginated response now
      if (Array.isArray(response)) {
        // Fallback for backward compatibility (should not happen)
        setLegalPages(response);
        setPagination(prev => ({ ...prev, total: response.length, totalPages: 1 }));
      } else {
        setLegalPages(response.legalPages || []);
        setPagination(response.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadLegalPagesFailed"));
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
      await createLegalPage({
        tenantId: selectedSiteId!,
        key: formData.key,
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
              seoKeywords: formData.seoKeywordsHu ? formData.seoKeywordsHu.split(",").map((k) => k.trim()) : [],
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
              seoKeywords: formData.seoKeywordsEn ? formData.seoKeywordsEn.split(",").map((k) => k.trim()) : [],
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
              seoKeywords: formData.seoKeywordsDe ? formData.seoKeywordsDe.split(",").map((k) => k.trim()) : [],
            });
          }
          return translations;
        })(),
        isActive: formData.isActive,
      });
      setIsCreating(false);
      resetForm();
      await loadLegalPages();
      // Invalidate legal pages cache to refresh public pages
      queryClient.invalidateQueries({ queryKey: ["legal"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.createLegalPageFailed"));
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validateForm()) return;

    try {
      await updateLegalPage(
        id,
        {
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
                seoKeywords: formData.seoKeywordsHu ? formData.seoKeywordsHu.split(",").map((k) => k.trim()) : [],
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
                seoKeywords: formData.seoKeywordsEn ? formData.seoKeywordsEn.split(",").map((k) => k.trim()) : [],
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
                seoKeywords: formData.seoKeywordsDe ? formData.seoKeywordsDe.split(",").map((k) => k.trim()) : [],
              });
            }
            return translations;
          })(),
          isActive: formData.isActive,
        },
        selectedSiteId || undefined
      );
      setEditingId(null);
      resetForm();
      await loadLegalPages();
      // Invalidate legal pages cache to refresh public pages
      queryClient.invalidateQueries({ queryKey: ["legal"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateLegalPageFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmations.deleteLegalPage"))) return;

    try {
      await deleteLegalPage(id, selectedSiteId || undefined);
      await loadLegalPages();
      // Invalidate legal pages cache to refresh public pages
      queryClient.invalidateQueries({ queryKey: ["legal"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteLegalPageFailed"));
    }
  };

  const startEdit = (legalPage: LegalPage) => {
    setEditingId(legalPage.id);
    const hu = legalPage.translations.find((t) => t.lang === "hu");
    const en = legalPage.translations.find((t) => t.lang === "en");
    const de = legalPage.translations.find((t) => t.lang === "de");
    setFormData({
      key: legalPage.key,
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
      isActive: legalPage.isActive,
    });
  };

  const resetForm = () => {
    setFormData({
      key: "imprint",
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

  // Wait for site context to initialize
  if (isSiteLoading) {
    return <LoadingSpinnerComponent isLoading={true} />;
  }

  if (!selectedSiteId) {
    return <div style={{ padding: 24 }}>{t("admin.table.pleaseSelectSite")}</div>;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "clamp(24px, 5vw, 32px)",
        flexWrap: "wrap",
        gap: 16,
      }}>
        <h1 style={{
          fontSize: "clamp(20px, 4vw, 28px)",
          fontWeight: 700,
          fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "white",
          textShadow: "0 2px 4px rgba(0,0,0,0.1)",
          margin: 0,
        }}>
          {t("admin.legalPages")}
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
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
          {t("admin.forms.newLegalPage")}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ padding: 24, background: "white", borderRadius: 8, marginBottom: 24, border: "1px solid #ddd" }}>
          <h2 style={{ marginBottom: 16, fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{editingId ? t("admin.forms.editLegalPage") : t("admin.forms.newLegalPage")}</h2>

          {isCreating && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.key")} *</label>
              <select
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value as "imprint" | "terms" | "privacy" })}
                disabled={!!editingId}
                style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
              >
                <option value="imprint">{t("public.legal.imprint.title")}</option>
                <option value="terms">{t("public.legal.terms.title")}</option>
                <option value="privacy">{t("public.legal.privacy.title")}</option>
              </select>
            </div>
          )}

          {/* Active Checkbox - moved to top */}
          <div style={{ marginBottom: 16, padding: "16px 20px", background: "#f8f8ff", borderRadius: 12, border: "2px solid #e0e7ff" }}>
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 12, 
              cursor: "pointer", 
              fontSize: "clamp(14px, 3.5vw, 16px)",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}>
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
                    <div style={{ 
                      color: "#dc3545", 
                      fontSize: "clamp(13px, 3vw, 15px)", 
                      marginTop: 4,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>
                      {selectedLang === "hu"
                        ? formErrors.titleHu
                        : selectedLang === "en"
                        ? formErrors.titleEn
                        : formErrors.titleDe}
                    </div>
                  ) : null}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.shortDescription") || "Rövid leírás (lista oldal)"}</label>
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
                    placeholder={t("admin.shortDescriptionPlaceholder") || "Rövid leírás a lista oldali kártyához (richtext)"}
                    height={150}
                    uploadFolder="editor/legal"
                  />
                  <small style={{ 
                    color: "#666", 
                    fontSize: "clamp(13px, 3vw, 15px)", 
                    marginTop: 4, 
                    display: "block",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}>
                    {t("admin.shortDescriptionHint") || "Ez a mező jelenik meg a lista oldali kártyákon"}
                  </small>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.content")}</label>
                  <TipTapEditorWithUpload
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
                    uploadFolder="editor/legal"
                  />
                </div>

                {/* SEO Fields Section */}
                <div style={{ 
                  marginTop: 24, 
                  padding: 16, 
                  background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
                  borderRadius: 8,
                  border: "1px solid #667eea30"
                }}>
                  <h3 style={{ 
                    margin: "0 0 16px 0", 
                    fontSize: "clamp(16px, 3.5vw, 18px)", 
                    fontWeight: 600, 
                    color: "#667eea", 
                    fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}>
                    🔍 SEO {t("admin.settings")}
                  </h3>
                  
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>SEO {t("common.title")}</label>
                    <input
                      type="text"
                      value={
                        selectedLang === "hu"
                          ? formData.seoTitleHu
                          : selectedLang === "en"
                          ? formData.seoTitleEn
                          : formData.seoTitleDe
                      }
                      onChange={(e) => {
                        if (selectedLang === "hu") setFormData({ ...formData, seoTitleHu: e.target.value });
                        else if (selectedLang === "en") setFormData({ ...formData, seoTitleEn: e.target.value });
                        else setFormData({ ...formData, seoTitleDe: e.target.value });
                      }}
                      placeholder={t("admin.seoTitlePlaceholder") || "SEO title (leave empty for auto)"}
                      style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                    <small style={{ 
                    color: "#666", 
                    fontSize: "clamp(13px, 3vw, 15px)", 
                    marginTop: 4, 
                    display: "block",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}>
                      {t("admin.seoTitleHint") || "If empty, page title will be used"}
                    </small>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>SEO {t("common.description")}</label>
                    <textarea
                      value={
                        selectedLang === "hu"
                          ? formData.seoDescriptionHu
                          : selectedLang === "en"
                          ? formData.seoDescriptionEn
                          : formData.seoDescriptionDe
                      }
                      onChange={(e) => {
                        if (selectedLang === "hu") setFormData({ ...formData, seoDescriptionHu: e.target.value });
                        else if (selectedLang === "en") setFormData({ ...formData, seoDescriptionEn: e.target.value });
                        else setFormData({ ...formData, seoDescriptionDe: e.target.value });
                      }}
                      placeholder={t("admin.seoDescriptionPlaceholder") || "SEO description (leave empty for auto)"}
                      rows={3}
                      style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                    <small style={{ 
                    color: "#666", 
                    fontSize: "clamp(13px, 3vw, 15px)", 
                    marginTop: 4, 
                    display: "block",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}>
                      {t("admin.seoDescriptionHint") || "If empty, first 2 sentences from content will be used"}
                    </small>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>SEO {t("common.image")}</label>
                    <input
                      type="url"
                      value={
                        selectedLang === "hu"
                          ? formData.seoImageHu
                          : selectedLang === "en"
                          ? formData.seoImageEn
                          : formData.seoImageDe
                      }
                      onChange={(e) => {
                        if (selectedLang === "hu") setFormData({ ...formData, seoImageHu: e.target.value });
                        else if (selectedLang === "en") setFormData({ ...formData, seoImageEn: e.target.value });
                        else setFormData({ ...formData, seoImageDe: e.target.value });
                      }}
                      placeholder={t("admin.seoImagePlaceholder") || "SEO image URL"}
                      style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                  </div>

                  <div style={{ marginBottom: 0 }}>
                    <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.seoKeywords")}</label>
                    <input
                      type="text"
                      value={
                        selectedLang === "hu"
                          ? formData.seoKeywordsHu
                          : selectedLang === "en"
                          ? formData.seoKeywordsEn
                          : formData.seoKeywordsDe
                      }
                      onChange={(e) => {
                        if (selectedLang === "hu") setFormData({ ...formData, seoKeywordsHu: e.target.value });
                        else if (selectedLang === "en") setFormData({ ...formData, seoKeywordsEn: e.target.value });
                        else setFormData({ ...formData, seoKeywordsDe: e.target.value });
                      }}
                      placeholder={t("admin.seoKeywordsPlaceholder") || "keyword1, keyword2, keyword3"}
                      style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                    <small style={{ 
                    color: "#666", 
                    fontSize: "clamp(13px, 3vw, 15px)", 
                    marginTop: 4, 
                    display: "block",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}>
                      {t("admin.seoKeywordsHint") || "Comma-separated keywords for search engines"}
                    </small>
                  </div>
                </div>
              </>
            )}
          </LanguageAwareForm>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
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
        <AdminResponsiveTable<LegalPage>
          data={legalPages}
          getItemId={(legalPage) => legalPage.id}
          searchQuery={searchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.legalPages")}
          onSearchChange={(query) => {
            setSearchQuery(query);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          isLoading={isLoading}
          filterFn={(legalPage, query) => {
            const lowerQuery = query.toLowerCase();
            const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
            const translation = legalPage.translations.find((t) => t.lang === currentLang) || 
                               legalPage.translations.find((t) => t.lang === "hu");
            return (
              legalPage.key.toLowerCase().includes(lowerQuery) ||
              translation?.title.toLowerCase().includes(lowerQuery) || false
            );
          }}
          columns={[
            {
              key: "key",
              label: t("admin.key"),
              render: (legalPage) => legalPage.key,
            },
            {
              key: "title",
              label: t("common.title"),
              render: (legalPage) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation = legalPage.translations.find((t) => t.lang === currentLang) || 
                                   legalPage.translations.find((t) => t.lang === "hu");
                return translation?.title || "-";
              },
            },
            {
              key: "status",
              label: t("admin.table.status"),
              render: (legalPage) => (
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: legalPage.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: "clamp(13px, 3vw, 15px)",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {legalPage.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          cardTitle={(legalPage) => {
            const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
            const translation = legalPage.translations.find((t) => t.lang === currentLang) || 
                               legalPage.translations.find((t) => t.lang === "hu");
            return translation?.title || "-";
          }}
          cardSubtitle={(legalPage) => legalPage.key}
          cardFields={[
            {
              key: "status",
              render: (legalPage) => (
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: legalPage.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {legalPage.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          onEdit={startEdit}
          onDelete={(legalPage) => handleDelete(legalPage.id)}
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


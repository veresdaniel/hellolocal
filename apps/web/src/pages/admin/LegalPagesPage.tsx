// src/pages/admin/LegalPagesPage.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminTenant } from "../../contexts/AdminTenantContext";
import { getLegalPages, createLegalPage, updateLegalPage, deleteLegalPage } from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditor } from "../../components/TipTapEditor";
import { LoadingSpinner as LoadingSpinnerComponent } from "../../components/LoadingSpinner";

interface LegalPage {
  id: string;
  tenantId: string;
  key: "imprint" | "terms" | "privacy";
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

export function LegalPagesPage() {
  const { t, i18n } = useTranslation();
  const { selectedTenantId } = useAdminTenant();
  const queryClient = useQueryClient();
  usePageTitle("admin.legalPages");
  const [legalPages, setLegalPages] = useState<LegalPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    key: "imprint" as "imprint" | "terms" | "privacy",
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
      loadLegalPages();
    } else {
      // Reset loading state if no tenant
      setIsLoading(false);
    }
  }, [selectedTenantId]);

  const loadLegalPages = async () => {
    if (!selectedTenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getLegalPages(selectedTenantId);
      setLegalPages(data);
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
    if (!selectedTenantId) return;
    if (!validateForm()) return;

    try {
      await createLegalPage({
        tenantId: selectedTenantId!,
        key: formData.key,
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
      await deleteLegalPage(id, selectedTenantId || undefined);
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

  if (!selectedTenantId) {
    return <div style={{ padding: 24 }}>Please select a tenant</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>Legal Pages</h1>
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
          + {t("admin.forms.newLegalPage")}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4 }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ padding: 24, background: "white", borderRadius: 8, marginBottom: 24, border: "1px solid #ddd" }}>
          <h2 style={{ marginBottom: 16 }}>{editingId ? t("admin.forms.editLegalPage") : t("admin.forms.newLegalPage")}</h2>

          {isCreating && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.key")} *</label>
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
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>Key</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("common.title")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.table.status")}</th>
                <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #ddd", width: "1%", whiteSpace: "nowrap" }}>{t("admin.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {legalPages.map((legalPage) => {
                // Get current language or fallback to Hungarian
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation = legalPage.translations.find((t) => t.lang === currentLang) || 
                                   legalPage.translations.find((t) => t.lang === "hu");
                return (
                  <tr key={legalPage.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>{legalPage.key}</td>
                    <td style={{ padding: 12 }}>{translation?.title || "-"}</td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          background: legalPage.isActive ? "#28a745" : "#dc3545",
                          color: "white",
                          fontSize: 12,
                        }}
                      >
                        {legalPage.isActive ? t("common.active") : t("common.inactive")}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => startEdit(legalPage)}
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
                          onClick={() => handleDelete(legalPage.id)}
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
          {legalPages.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", color: "#999" }}>{t("admin.table.noData")}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}


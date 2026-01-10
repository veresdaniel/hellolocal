// src/pages/admin/TownsPage.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import { useAdminTenant } from "../../contexts/AdminTenantContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getTowns, createTown, updateTown, deleteTown } from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditor } from "../../components/TipTapEditor";
import { MapComponent } from "../../components/MapComponent";
import { LoadingSpinner } from "../../components/LoadingSpinner";

interface Town {
  id: string;
  tenantId: string;
  isActive: boolean;
  lat: number | null;
  lng: number | null;
  translations: Array<{
    id: string;
    lang: string;
    name: string;
    description: string | null;
    heroImage: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoImage: string | null;
    seoKeywords: string[];
  }>;
}

export function TownsPage() {
  const { t, i18n } = useTranslation();
  const { selectedTenantId } = useAdminTenant();
  const queryClient = useQueryClient();
  usePageTitle("admin.towns");
  const [towns, setTowns] = useState<Town[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    nameHu: "",
    nameEn: "",
    nameDe: "",
    descriptionHu: "",
    descriptionEn: "",
    descriptionDe: "",
    heroImageHu: "",
    heroImageEn: "",
    heroImageDe: "",
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
    lat: "",
    lng: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedTenantId) {
      loadTowns();
    } else {
      // Reset loading state if no tenant
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId]);

  const loadTowns = async () => {
    if (!selectedTenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTowns(selectedTenantId);
      setTowns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadTownsFailed"));
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
      const translations: Array<{
        lang: "hu" | "en" | "de";
        name: string;
        description: string | null;
        heroImage: string | null;
        seoTitle: string | null;
        seoDescription: string | null;
        seoImage: string | null;
        seoKeywords: string[];
      }> = [
        {
          lang: "hu",
          name: formData.nameHu,
          description: formData.descriptionHu || null,
          heroImage: formData.heroImageHu || null,
          seoTitle: formData.seoTitleHu || null,
          seoDescription: formData.seoDescriptionHu || null,
          seoImage: formData.seoImageHu || null,
          seoKeywords: formData.seoKeywordsHu ? formData.seoKeywordsHu.split(",").map((k) => k.trim()) : [],
        },
      ];
      if (formData.nameEn.trim()) {
        translations.push({
          lang: "en",
          name: formData.nameEn,
          description: formData.descriptionEn || null,
          heroImage: formData.heroImageEn || null,
          seoTitle: formData.seoTitleEn || null,
          seoDescription: formData.seoDescriptionEn || null,
          seoImage: formData.seoImageEn || null,
          seoKeywords: formData.seoKeywordsEn ? formData.seoKeywordsEn.split(",").map((k) => k.trim()) : [],
        });
      }
      if (formData.nameDe.trim()) {
        translations.push({
          lang: "de",
          name: formData.nameDe,
          description: formData.descriptionDe || null,
          heroImage: formData.heroImageDe || null,
          seoTitle: formData.seoTitleDe || null,
          seoDescription: formData.seoDescriptionDe || null,
          seoImage: formData.seoImageDe || null,
          seoKeywords: formData.seoKeywordsDe ? formData.seoKeywordsDe.split(",").map((k) => k.trim()) : [],
        });
      }
      await createTown({
        tenantId: selectedTenantId,
        translations,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        isActive: formData.isActive,
      });
      setIsCreating(false);
      resetForm();
      await loadTowns();
      // Notify global cache manager that towns have changed
      notifyEntityChanged("towns");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.createTownFailed"));
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validateForm()) return;

    try {
      const translations: Array<{
        lang: "hu" | "en" | "de";
        name: string;
        description: string | null;
        heroImage: string | null;
        seoTitle: string | null;
        seoDescription: string | null;
        seoImage: string | null;
        seoKeywords: string[];
      }> = [
        {
          lang: "hu",
          name: formData.nameHu,
          description: formData.descriptionHu || null,
          heroImage: formData.heroImageHu || null,
          seoTitle: formData.seoTitleHu || null,
          seoDescription: formData.seoDescriptionHu || null,
          seoImage: formData.seoImageHu || null,
          seoKeywords: formData.seoKeywordsHu ? formData.seoKeywordsHu.split(",").map((k) => k.trim()) : [],
        },
      ];
      if (formData.nameEn.trim()) {
        translations.push({
          lang: "en",
          name: formData.nameEn,
          description: formData.descriptionEn || null,
          heroImage: formData.heroImageEn || null,
          seoTitle: formData.seoTitleEn || null,
          seoDescription: formData.seoDescriptionEn || null,
          seoImage: formData.seoImageEn || null,
          seoKeywords: formData.seoKeywordsEn ? formData.seoKeywordsEn.split(",").map((k) => k.trim()) : [],
        });
      }
      if (formData.nameDe.trim()) {
        translations.push({
          lang: "de",
          name: formData.nameDe,
          description: formData.descriptionDe || null,
          heroImage: formData.heroImageDe || null,
          seoTitle: formData.seoTitleDe || null,
          seoDescription: formData.seoDescriptionDe || null,
          seoImage: formData.seoImageDe || null,
          seoKeywords: formData.seoKeywordsDe ? formData.seoKeywordsDe.split(",").map((k) => k.trim()) : [],
        });
      }
      await updateTown(
        id,
        {
          translations,
          lat: formData.lat ? parseFloat(formData.lat) : null,
          lng: formData.lng ? parseFloat(formData.lng) : null,
          isActive: formData.isActive,
        },
        selectedTenantId || undefined
      );
      setEditingId(null);
      resetForm();
      await loadTowns();
      // Invalidate and refetch places cache to refresh lists (all languages and filter combinations)
      await queryClient.invalidateQueries({ queryKey: ["places"] });
      await queryClient.refetchQueries({ queryKey: ["places"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateTownFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmDeleteTown"))) return;

    try {
      await deleteTown(id, selectedTenantId || undefined);
      await loadTowns();
      // Invalidate and refetch places cache to refresh lists (all languages and filter combinations)
      await queryClient.invalidateQueries({ queryKey: ["places"] });
      await queryClient.refetchQueries({ queryKey: ["places"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteTownFailed"));
    }
  };

  const startEdit = (town: Town) => {
    setEditingId(town.id);
    const hu = town.translations.find((t) => t.lang === "hu");
    const en = town.translations.find((t) => t.lang === "en");
    const de = town.translations.find((t) => t.lang === "de");
    setFormData({
      nameHu: hu?.name || "",
      nameEn: en?.name || "",
      nameDe: de?.name || "",
      descriptionHu: hu?.description || "",
      descriptionEn: en?.description || "",
      descriptionDe: de?.description || "",
      heroImageHu: hu?.heroImage || "",
      heroImageEn: en?.heroImage || "",
      heroImageDe: de?.heroImage || "",
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
      lat: town.lat?.toString() || "",
      lng: town.lng?.toString() || "",
      isActive: town.isActive,
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
      heroImageHu: "",
      heroImageEn: "",
      heroImageDe: "",
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
      lat: "",
      lng: "",
      isActive: true,
    });
    setFormErrors({});
  };

  if (!selectedTenantId) {
    return <div style={{ padding: 24 }}>{t("admin.selectTenantFirst")}</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>{t("admin.towns")}</h1>
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
          + {t("admin.newItem")} {t("admin.towns")}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4 }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ padding: 24, background: "white", borderRadius: 8, marginBottom: 24, border: "1px solid #ddd" }}>
          <h2 style={{ marginBottom: 16 }}>{editingId ? t("admin.editItem") : t("admin.newItem")}</h2>

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

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>{t("admin.heroImage")}</label>
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
                    style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                    placeholder={t("admin.urlPlaceholder")}
                  />
                </div>
              </>
            )}
          </LanguageAwareForm>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8 }}>{t("admin.location")} ({t("admin.coordinates")})</label>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ flex: "0 0 400px" }}>
                <MapComponent
                  latitude={formData.lat ? parseFloat(formData.lat) : null}
                  longitude={formData.lng ? parseFloat(formData.lng) : null}
                  onLocationChange={(lat, lng) => {
                    setFormData({ ...formData, lat: lat.toString(), lng: lng.toString() });
                  }}
                  height={500}
                  interactive={true}
                />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>{t("admin.latitude")}</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                    style={{ width: "100%", padding: 8, fontSize: 14, border: "1px solid #ddd", borderRadius: 4 }}
                    placeholder="47.4979"
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>{t("admin.longitude")}</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                    style={{ width: "100%", padding: 8, fontSize: 14, border: "1px solid #ddd", borderRadius: 4 }}
                    placeholder="19.0402"
                  />
                </div>
              </div>
            </div>
          </div>

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
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("common.name")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.table.status")}</th>
                <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #ddd", width: "1%", whiteSpace: "nowrap" }}>{t("admin.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {towns.map((town) => {
                // Get current language or fallback to Hungarian
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation = town.translations.find((t) => t.lang === currentLang) || 
                                   town.translations.find((t) => t.lang === "hu");
                return (
                  <tr key={town.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>{translation?.name || "-"}</td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          background: town.isActive ? "#28a745" : "#dc3545",
                          color: "white",
                          fontSize: 12,
                        }}
                      >
                        {town.isActive ? t("common.active") : t("common.inactive")}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => startEdit(town)}
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
                          onClick={() => handleDelete(town.id)}
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
          {towns.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", color: "#999" }}>{t("admin.table.noData")}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}


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
import { Pagination } from "../../components/Pagination";
import { AdminResponsiveTable, type TableColumn, type CardField } from "../../components/AdminResponsiveTable";

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
  const { selectedTenantId, isLoading: isTenantLoading } = useAdminTenant();
  const queryClient = useQueryClient();
  usePageTitle("admin.towns");
  const [towns, setTowns] = useState<Town[]>([]);
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
      loadTowns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, pagination.page, pagination.limit]);

  const loadTowns = async () => {
    if (!selectedTenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTowns(selectedTenantId, pagination.page, pagination.limit);
      // Backend always returns paginated response now
      if (Array.isArray(response)) {
        // Fallback for backward compatibility (should not happen)
        setTowns(response);
        setPagination(prev => ({ ...prev, total: response.length, totalPages: 1 }));
      } else {
        setTowns(response.towns || []);
        setPagination(response.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      }
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
      // Invalidate places cache - this will automatically refetch active queries
      await queryClient.invalidateQueries({ queryKey: ["places"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateTownFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmDeleteTown"))) return;

    try {
      await deleteTown(id, selectedTenantId || undefined);
      await loadTowns();
      // Invalidate places cache - this will automatically refetch active queries
      await queryClient.invalidateQueries({ queryKey: ["places"] });
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
        <h1 style={{ fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 700, color: "#e0e0ff", margin: 0, textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)" }}>
          {t("admin.towns")}
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
              + {t("admin.forms.newTown")}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: "clamp(12px, 3vw, 16px)", marginBottom: 24, background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)", color: "#991b1b", borderRadius: 12, border: "1px solid #fca5a5", fontSize: "clamp(13px, 3vw, 14px)", fontWeight: 500 }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ padding: "clamp(24px, 5vw, 32px)", background: "white", borderRadius: 16, marginBottom: 32, boxShadow: "0 8px 24px rgba(102, 126, 234, 0.15)", border: "1px solid rgba(102, 126, 234, 0.1)" }}>
          <h2 style={{ marginBottom: 24, color: "#667eea", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 700 }}>
            {editingId ? t("admin.forms.editTown") : t("admin.forms.newTown")}
          </h2>

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
        </div>
      )}

      <LoadingSpinner isLoading={isLoading} />
      {!isLoading && !isCreating && !editingId && (
        <AdminResponsiveTable<Town>
          data={towns}
          getItemId={(town) => town.id}
          searchQuery={searchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.towns")}
          onSearchChange={(query) => {
            setSearchQuery(query);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          filterFn={(town, query) => {
            const lowerQuery = query.toLowerCase();
            const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
            const translation = town.translations.find((t) => t.lang === currentLang) || 
                               town.translations.find((t) => t.lang === "hu");
            return translation?.name.toLowerCase().includes(lowerQuery);
          }}
          columns={[
            {
              key: "name",
              label: t("common.name"),
              render: (town) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation = town.translations.find((t) => t.lang === currentLang) || 
                                   town.translations.find((t) => t.lang === "hu");
                return translation?.name || "-";
              },
            },
            {
              key: "status",
              label: t("admin.table.status"),
              render: (town) => (
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: town.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {town.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          cardTitle={(town) => {
            const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
            const translation = town.translations.find((t) => t.lang === currentLang) || 
                               town.translations.find((t) => t.lang === "hu");
            return translation?.name || "-";
          }}
          cardSubtitle={(town) => town.lat && town.lng ? `📍 ${town.lat.toFixed(4)}, ${town.lng.toFixed(4)}` : ""}
          cardFields={[
            {
              key: "status",
              render: (town) => (
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: town.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {town.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          onEdit={startEdit}
          onDelete={(town) => handleDelete(town.id)}
          isLoading={isLoading}
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
            onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
            onLimitChange={(limit) => setPagination(prev => ({ ...prev, limit, page: 1 }))}
          />
        </div>
      )}
    </div>
  );
}


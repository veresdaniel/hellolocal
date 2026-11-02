// src/pages/admin/TownsPage.tsx
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { appendExtraLanguages, patchLang, readLang } from "../../utils/langFields";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../contexts/AuthContext";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import { useAdminSite } from "../../contexts/useAdminSite";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getPlaces, getTowns, createTown, updateTown, deleteTown } from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { AiPostfixField } from "../../components/AiGeneratePostfixButton";
import { MapComponent } from "../../components/MapComponent";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminDataTable } from "../../components/AdminDataTable";
import { TownMembersPanel } from "../../components/TownMembersPanel";
import { ScopedEventsList } from "../../components/ScopedEventsList";
import { CoordinateSuggestion } from "../../components/CoordinateSuggestion";
import { GaMeasurementField } from "../../components/GaMeasurementField";
import { DomainInput } from "../../components/DomainInput";
import { CrawlableToggle } from "../../components/CrawlableToggle";
import { findTranslation } from "../../utils/langHelpers";
import { isValidGaMeasurementIdInput } from "../../lib/gaMeasurementId";
import type { Lang} from "../../types/enums";

interface Town {
  id: string;
  siteId: string | null;
  tenantId?: string;
  isActive: boolean;
  isCrawlable?: boolean;
  customDomain?: string | null;
  gaMeasurementId?: string | null;
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

function emptyTownForm(siteId = "") {
  return {
    siteId,
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
    isCrawlable: true,
    customDomain: "",
    customDomainEnabled: false,
    gaMeasurementId: "",
  };
}

export function TownsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  const isSuperadmin = currentUser?.role === "superadmin";
  const { selectedSiteId, sites, isLoading: isSiteLoading } = useAdminSite();
  const selectedTenantId = selectedSiteId; // Alias for backward compatibility
  usePageTitle("admin.towns");
  const [towns, setTowns] = useState<Town[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingTown, setViewingTown] = useState<Town | null>(null);
  const [townPlaces, setTownPlaces] = useState<Array<{ id: string; translations?: Array<{ lang: string; name: string }> }>>([]);
  const [formData, setFormData] = useState(() => emptyTownForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const siteLabel = (site: (typeof sites)[number]) => {
    const lang = (i18n.language || "hu").slice(0, 2);
    return (
      site.translations.find((tr) => tr.lang === lang)?.name ||
      site.translations.find((tr) => tr.lang === "hu")?.name ||
      site.slug
    );
  };

  useEffect(() => {
    // Reset to first page when site / unassigned-bucket context changes
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [selectedTenantId]);

  useEffect(() => {
    loadTowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, pagination.page, pagination.limit]);

  useEffect(() => {
    if (!viewingTown) {
      setTownPlaces([]);
      return;
    }
    void getPlaces(viewingTown.siteId || undefined, 1, 200, viewingTown.id)
      .then((rows) => setTownPlaces(Array.isArray(rows) ? rows : rows?.places || []))
      .catch(() => setTownPlaces([]));
  }, [viewingTown]);

  const loadTowns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTowns(undefined, pagination.page, pagination.limit);
      // Backend always returns paginated response now
      if (Array.isArray(response)) {
        // Fallback for backward compatibility (should not happen)
        setTowns(response);
        setPagination((prev) => ({ ...prev, total: response.length, totalPages: 1 }));
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
    if (!isValidGaMeasurementIdInput(formData.gaMeasurementId)) {
      errors.gaMeasurementId = t("admin.googleAnalytics.invalidId");
    }
    // English and German are optional
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    // Standalone towns are created from the unassigned bucket (no régió selected).
    if (!validateForm()) return;

    try {
      const translations: Array<{
        lang: Lang;
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
          seoKeywords: formData.seoKeywordsHu
            ? formData.seoKeywordsHu.split(",").map((k) => k.trim())
            : [],
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
          seoKeywords: formData.seoKeywordsEn
            ? formData.seoKeywordsEn.split(",").map((k) => k.trim())
            : [],
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
          seoKeywords: formData.seoKeywordsDe
            ? formData.seoKeywordsDe.split(",").map((k) => k.trim())
            : [],
        });
      }
      appendExtraLanguages(translations, formData, "name", [
        "description",
        "heroImage",
        "seoTitle",
        "seoDescription",
        "seoImage",
        "seoKeywords",
      ]);
      await createTown({
        siteId: formData.siteId.trim() || null,
        translations,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        isActive: formData.isActive,
        isCrawlable: formData.isCrawlable,
        customDomain: formData.customDomainEnabled ? formData.customDomain || null : null,
        gaMeasurementId: formData.gaMeasurementId.trim()
          ? formData.gaMeasurementId.trim().toUpperCase()
          : null,
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
        lang: Lang;
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
          seoKeywords: formData.seoKeywordsHu
            ? formData.seoKeywordsHu.split(",").map((k) => k.trim())
            : [],
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
          seoKeywords: formData.seoKeywordsEn
            ? formData.seoKeywordsEn.split(",").map((k) => k.trim())
            : [],
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
          seoKeywords: formData.seoKeywordsDe
            ? formData.seoKeywordsDe.split(",").map((k) => k.trim())
            : [],
        });
      }
      appendExtraLanguages(translations, formData, "name", [
        "description",
        "heroImage",
        "seoTitle",
        "seoDescription",
        "seoImage",
        "seoKeywords",
      ]);
      await updateTown(
        id,
        {
          siteId: formData.siteId.trim() || null,
          translations,
          lat: formData.lat ? parseFloat(formData.lat) : null,
          lng: formData.lng ? parseFloat(formData.lng) : null,
          isActive: formData.isActive,
          isCrawlable: formData.isCrawlable,
          customDomain: formData.customDomainEnabled ? formData.customDomain || null : null,
          gaMeasurementId: formData.gaMeasurementId.trim()
            ? formData.gaMeasurementId.trim().toUpperCase()
            : null,
        },
        undefined
      );
      setEditingId(null);
      resetForm();
      await loadTowns();
      // Notify global cache manager that towns have changed
      notifyEntityChanged("towns");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateTownFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmations.deleteTown"))) return;

    try {
      await deleteTown(id);
      await loadTowns();
      // Notify global cache manager that towns have changed
      notifyEntityChanged("towns");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteTownFailed"));
    }
  };

  const startEdit = (town: Town) => {
    setEditingId(town.id);
    const hu = findTranslation(town.translations, "hu" as Lang);
    const en = findTranslation(town.translations, "en" as Lang);
    const de = findTranslation(town.translations, "de" as Lang);
    setFormData({
      ...emptyTownForm(town.siteId || ""),
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
      isCrawlable: town.isCrawlable !== false,
      customDomain: town.customDomain || "",
      customDomainEnabled: !!town.customDomain,
      gaMeasurementId: town.gaMeasurementId || "",
    });
  };

  const resetForm = () => {
    // Pre-select current header site; user can clear to "no region".
    setFormData(emptyTownForm(selectedSiteId || ""));
    setFormErrors({});
  };

  // Wait for site context to initialize
  if (isSiteLoading) {
    return null;
  }

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        title={t("admin.towns")}
        subtitle={
          !isCreating && !editingId
            ? t("admin.townsPage.subtitle")
            : undefined
        }
        newButtonLabel={t("admin.forms.newTown")}
        onNewClick={() => {
          setEditingId(null);
          setIsCreating(true);
          resetForm();
        }}
        showNewButton={isSuperadmin && !isCreating && !editingId}
        isCreatingOrEditing={isCreating || !!editingId}
        onSave={() => (editingId ? handleUpdate(editingId) : handleCreate())}
        onCancel={() => {
          setIsCreating(false);
          setEditingId(null);
          resetForm();
          // Back button will handle navigation
        }}
        saveLabel={editingId ? t("common.update") : t("common.create")}
      />

      {error && (
        <div
          style={{
            padding: "clamp(12px, 3vw, 16px)",
            marginBottom: 24,
            background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
            color: "#991b1b",
            borderRadius: 12,
            border: "1px solid #fca5a5",
            fontSize: "clamp(13px, 3vw, 14px)",
            fontWeight: 500,
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
            padding: "clamp(24px, 5vw, 32px)",
            background: "white",
            borderRadius: 16,
            marginBottom: 32,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
            border: "1px solid rgba(37, 99, 235, 0.1)",
          }}
        >
          <h2
            style={{
              marginBottom: 24,
              color: "var(--admin-primary)",
              fontSize: "clamp(18px, 4vw, 22px)",
              fontWeight: 700,
              fontFamily:
                "var(--admin-font-display)",
            }}
          >
            {editingId ? t("admin.forms.editTown") : t("admin.forms.newTown")}
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {t("admin.region")}{" "}
              <span style={{ color: "#6b7280", fontWeight: 400 }}>
                ({t("common.optional")})
              </span>
            </label>
            <select
              value={formData.siteId || ""}
              onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
              style={{
                width: "100%",
                padding: 8,
                fontSize: 16,
                border: "1px solid #ddd",
                borderRadius: 4,
                background: "white",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              <option value="">{t("admin.noRegion")}</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {siteLabel(site)}
                </option>
              ))}
            </select>
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
                    {t("common.name")} ({selectedLang.toUpperCase()}) *
                  </label>
                  <AiPostfixField
                    draft={{
                      kind: "town",
                      field: "name",
                      lang: selectedLang,
                      siteId: selectedSiteId || undefined,
                      name: readLang(formData, "name", selectedLang),
                    }}
                    value={readLang(formData, "name", selectedLang)}
                    onApply={(text) =>
                      setFormData(patchLang(formData, "name", selectedLang, text))
                    }
                  >
                  <input
                    type="text"
                    value={
                      readLang(formData, "name", selectedLang)
                    }
                    onChange={(e) => {
                      setFormData(patchLang(formData, "name", selectedLang, e.target.value));
                    }}
                    style={{
                      width: "100%",
                      padding: 8,
                      fontSize: 16,
                      border:
                        readLang(formErrors, "name", selectedLang)
                          ? "1px solid #dc3545"
                          : "1px solid #ddd",
                      borderRadius: 4,
                    }}
                  />
                  </AiPostfixField>
                  {readLang(formErrors, "name", selectedLang) ? (
                    <div style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>
                      {readLang(formErrors, "name", selectedLang)}
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
                    {t("common.description")}
                  </label>
                  <TipTapEditorWithUpload
                    value={
                      readLang(formData, "description", selectedLang)
                    }
                    onChange={(value) => {
                      setFormData(patchLang(formData, "description", selectedLang, value));
                    }}
                    placeholder={t("common.description")}
                    height={200}
                    uploadFolder="editor/towns"
                    aiDraft={{
                      kind: "town",
                      field: "description",
                      lang: selectedLang,
                      siteId: selectedSiteId || undefined,
                      name: readLang(formData, "name", selectedLang),
                    }}
                  />
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
                    {t("admin.heroImage")}
                  </label>
                  <input
                    type="text"
                    value={
                      readLang(formData, "heroImage", selectedLang)
                    }
                    onChange={(e) => {
                      setFormData(patchLang(formData, "heroImage", selectedLang, e.target.value));
                    }}
                    style={{
                      width: "100%",
                      padding: 8,
                      fontSize: 16,
                      border: "1px solid #ddd",
                      borderRadius: 4,
                    }}
                    placeholder={t("admin.urlPlaceholder")}
                  />
                </div>
              </>
            )}
          </LanguageAwareForm>

          {/* Active Checkbox - moved before location */}
          <div
            style={{
              marginBottom: 16,
              padding: "16px 20px",
              background: "var(--admin-surface-subtle, #f8fafc)",
              borderRadius: 12,
              border: "2px solid var(--admin-primary-border)",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                fontSize: 15,
              }}
            >
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                style={{ width: 20, height: 20, cursor: "pointer", accentColor: "var(--admin-primary)" }}
              />
              <span style={{ color: "#333", fontWeight: 500 }}>{t("common.active")}</span>
            </label>
          </div>

          <CrawlableToggle
            checked={formData.isCrawlable}
            onChange={(isCrawlable) => setFormData({ ...formData, isCrawlable })}
          />

          <div style={{ marginBottom: 16 }}>
            <DomainInput
              value={formData.customDomain}
              onChange={(value) => setFormData({ ...formData, customDomain: value })}
              checked={formData.customDomainEnabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, customDomainEnabled: checked })
              }
              label={t("admin.customDomain")}
            />
            <p
              style={{
                margin: "8px 0 0",
                color: "#64748b",
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              {t("admin.customDomainHierarchyHint")}
            </p>
          </div>

          <GaMeasurementField
            label={t("admin.googleAnalytics.townLabel")}
            help={t("admin.googleAnalytics.townHelp")}
            value={formData.gaMeasurementId}
            onChange={(gaMeasurementId) => setFormData({ ...formData, gaMeasurementId })}
            error={formErrors.gaMeasurementId}
            hint={t("admin.googleAnalytics.clearHint")}
          />

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8 }}>
              {t("admin.location")} ({t("admin.coordinates")})
            </label>
            <CoordinateSuggestion
              query={formData.nameHu || formData.nameEn || formData.nameDe}
              filled={Boolean(formData.lat && formData.lng)}
              onApply={(lat, lng) =>
                setFormData((prev) => ({ ...prev, lat: String(lat), lng: String(lng) }))
              }
            />
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
                  hideLocationButton={true}
                />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.latitude")}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 12,
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                    placeholder="47.4979"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.longitude")}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 12,
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                    placeholder="19.0402"
                  />
                </div>
              </div>
            </div>
          </div>
          {isSuperadmin && editingId ? <TownMembersPanel townId={editingId} /> : null}
          {editingId ? (
            <ScopedEventsList
              townId={editingId}
              siteId={formData.siteId || selectedSiteId || undefined}
            />
          ) : null}
        </div>
      )}

      {viewingTown && !isSuperadmin && !isCreating && !editingId ? (
        <div className="admin-section-card" style={{ marginBottom: 24 }}>
          <h2 className="admin-section-card__title">
            {findTranslation(viewingTown.translations, (i18n.language || "hu").slice(0, 2) as Lang)?.name ||
              findTranslation(viewingTown.translations, "hu")?.name}
          </h2>
          <p className="admin-section-card__help">{t("admin.townsPage.scopedSubtitle")}</p>
          {viewingTown.siteId ? (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() =>
                navigate(
                  `/${(i18n.language || "hu").split("-")[0]}/admin/places?new=true&townId=${viewingTown.id}`
                )
              }
            >
              {t("admin.townsPage.addPlace")}
            </button>
          ) : (
            <p className="admin-section-card__help">{t("admin.townsPage.needsRegion")}</p>
          )}
          <ul style={{ marginTop: 16 }}>
            {townPlaces.map((place) => (
              <li key={place.id}>
                {place.translations?.find((item) => item.lang === "hu")?.name || place.id}
              </li>
            ))}
          </ul>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setViewingTown(null)}>
            {t("common.close")}
          </button>
        </div>
      ) : null}

      {!isCreating && !editingId && (
        <AdminDataTable
          items={towns}
          getItemId={(town) => town.id}
          stateKey="towns"
          isLoading={isLoading}
          emptyMessage={t("admin.table.noData")}
          pagination={{
            page: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            onPageChange: (page) => setPagination((prev) => ({ ...prev, page })),
            onPageSizeChange: (pageSize) =>
              setPagination((prev) => ({ ...prev, limit: pageSize, page: 1 })),
          }}
          columns={[
            {
              key: "name",
              label: t("common.name"),
              getText: (town) =>
                findTranslation(town.translations, (i18n.language || "hu").slice(0, 2) as Lang)
                  ?.name ||
                findTranslation(town.translations, "hu")?.name ||
                town.id,
              render: (town) =>
                findTranslation(town.translations, (i18n.language || "hu").slice(0, 2) as Lang)
                  ?.name ||
                findTranslation(town.translations, "hu")?.name ||
                town.id,
            },
            {
              key: "region",
              label: t("admin.hierarchy.siteTools"),
              getText: (town) =>
                town.siteId ? sites.find((site) => site.id === town.siteId)?.slug || town.siteId : "",
              render: (town) => {
                if (!town.siteId) return t("admin.hierarchy.unassignedTowns");
                const site = sites.find((item) => item.id === town.siteId);
                return site ? siteLabel(site) : town.siteId;
              },
            },
          ]}
          onAnalytics={(town) =>
            navigate(`/${(i18n.language || "hu").split("-")[0]}/admin/towns/${town.id}/analytics`)
          }
          onEdit={isSuperadmin ? startEdit : (town) => setViewingTown(town)}
          onDelete={isSuperadmin ? (town) => void handleDelete(town.id) : undefined}
        />
      )}
    </div>
  );
}

// src/pages/admin/TownsPage.tsx
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  emptyLangFields,
  mergeTranslations,
  patchLang,
  readLang,
  requirePrimaryLangName,
  translationsFromForm,
} from "../../utils/langFields";
import { useContentLanguages } from "../../hooks/useContentLanguages";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../contexts/AuthContext";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import { useAdminSite } from "../../contexts/useAdminSite";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getMapSettings, getPlaces, getTowns, createTown, updateTown, deleteTown } from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { AiPostfixField } from "../../components/AiGeneratePostfixButton";
import { MapComponent } from "../../components/MapComponent";
import { AdminAutocomplete } from "../../components/AdminAutocomplete";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminDataTable } from "../../components/AdminDataTable";
import { TownMembersPanel } from "../../components/TownMembersPanel";
import { ScopedEventsList } from "../../components/ScopedEventsList";
import { CoordinateSuggestion } from "../../components/CoordinateSuggestion";
import { GaMeasurementField } from "../../components/GaMeasurementField";
import { DomainInput } from "../../components/DomainInput";
import { CrawlableToggle } from "../../components/CrawlableToggle";
import { AdminImageField } from "../../components/AdminImageField";
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
  domainLang?: string | null;
  gaMeasurementId?: string | null;
  lat: number | null;
  lng: number | null;
  zoom?: number | null;
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

const TOWN_LANG_FIELDS = [
  "name",
  "description",
  "heroImage",
  "seoTitle",
  "seoDescription",
  "seoImage",
  "seoKeywords",
];

function emptyTownForm(siteId = "", languages: string[] = ["hu", "en", "de"]) {
  return {
    ...emptyLangFields(languages, TOWN_LANG_FIELDS),
    siteId,
    lat: "",
    lng: "",
    zoom: "",
    isActive: true,
    isCrawlable: true,
    customDomain: "",
    customDomainEnabled: false,
    domainLang: "hu",
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
  const contentLanguages = useContentLanguages();
  const [formData, setFormData] = useState(() => emptyTownForm("", contentLanguages));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [regionZoom, setRegionZoom] = useState<number | null>(null);

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
    const siteId = formData.siteId.trim();
    if (!siteId) {
      setRegionZoom(null);
      return;
    }
    let active = true;
    void getMapSettings(siteId)
      .then((settings) => {
        if (active) setRegionZoom(settings?.zoom ?? null);
      })
      .catch(() => {
        if (active) setRegionZoom(null);
      });
    return () => {
      active = false;
    };
  }, [formData.siteId]);

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
    const missingNameKey = requirePrimaryLangName(formData, contentLanguages, "name");
    if (missingNameKey) errors[missingNameKey] = t("admin.validation.hungarianNameRequired");
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
      const translations = translationsFromForm(
        formData,
        contentLanguages,
        "name",
        TOWN_LANG_FIELDS
      ) as Parameters<typeof createTown>[0]["translations"];
      await createTown({
        siteId: formData.siteId.trim() || null,
        translations,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        zoom: formData.zoom.trim() ? Number(formData.zoom) : null,
        isActive: formData.isActive,
        isCrawlable: formData.isCrawlable,
        customDomain: formData.customDomainEnabled ? formData.customDomain || null : null,
        domainLang: formData.customDomainEnabled ? formData.domainLang || "hu" : null,
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
      const translations = translationsFromForm(
        formData,
        contentLanguages,
        "name",
        TOWN_LANG_FIELDS
      ) as Parameters<typeof createTown>[0]["translations"];
      await updateTown(
        id,
        {
          siteId: formData.siteId.trim() || null,
          translations,
          lat: formData.lat ? parseFloat(formData.lat) : null,
          lng: formData.lng ? parseFloat(formData.lng) : null,
          zoom: formData.zoom.trim() ? Number(formData.zoom) : null,
          isActive: formData.isActive,
          isCrawlable: formData.isCrawlable,
          customDomain: formData.customDomainEnabled ? formData.customDomain || null : null,
        domainLang: formData.customDomainEnabled ? formData.domainLang || "hu" : null,
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
    setFormData({
      ...emptyTownForm(town.siteId || "", contentLanguages),
      lat: town.lat?.toString() || "",
      lng: town.lng?.toString() || "",
      zoom: town.zoom?.toString() || "",
      isActive: town.isActive,
      isCrawlable: town.isCrawlable !== false,
      customDomain: town.customDomain || "",
      customDomainEnabled: !!town.customDomain,
      domainLang: town.domainLang || "hu",
      gaMeasurementId: town.gaMeasurementId || "",
    });
    setFormData((current) =>
      mergeTranslations(
        current,
        town.translations.map((row) => ({
          ...row,
          seoKeywords: row.seoKeywords?.join(", ") ?? null,
        })),
        TOWN_LANG_FIELDS
      )
    );
  };

  const resetForm = () => {
    // Pre-select current header site; user can clear to "no region".
    setFormData(emptyTownForm(selectedSiteId || "", contentLanguages));
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
            <AdminAutocomplete
              value={formData.siteId || ""}
              options={sites.map((site) => ({ value: site.id, label: siteLabel(site) }))}
              clearOptionLabel={t("admin.noRegion")}
              placeholder={t("admin.noRegion")}
              onChange={(siteId) => setFormData({ ...formData, siteId })}
            />
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

                <AdminImageField
                  label={t("admin.heroImage")}
                  value={readLang(formData, "heroImage", selectedLang)}
                  onChange={(url) =>
                    setFormData(patchLang(formData, "heroImage", selectedLang, url))
                  }
                  folder="towns/hero"
                  placeholder={t("admin.urlPlaceholder")}
                />

                <div
                  style={{
                    marginTop: 24,
                    padding: 16,
                    background:
                      "linear-gradient(135deg, var(--admin-primary)15 0%, var(--admin-primary-hover)15 100%)",
                    borderRadius: 8,
                    border: "1px solid var(--admin-primary)30",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "clamp(16px, 3.5vw, 18px)",
                      fontWeight: 600,
                      color: "var(--admin-primary)",
                    }}
                  >
                    SEO / Social ({selectedLang.toUpperCase()})
                  </h3>
                  <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13, lineHeight: 1.45 }}>
                    {t("admin.seoOptionalHint") ||
                      "Optional overrides. Empty fields use the town name, description, and hero image automatically."}
                  </p>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 4 }}>
                      {t("admin.seoTitle")}
                    </label>
                    <AiPostFormField
                      draft={{
                        kind: "town",
                        field: "seoTitle",
                        lang: selectedLang,
                        siteId: selectedSiteId || undefined,
                        name: readLang(formData, "name", selectedLang),
                      }}
                      value={readLang(formData, "seoTitle", selectedLang)}
                      onApply={(text) =>
                        setFormData((prev) => patchLang(prev, "seoTitle", selectedLang, text))
                      }
                    >
                      <input
                        type="text"
                        value={readLang(formData, "seoTitle", selectedLang)}
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
                    </AiPostFormField>
                    <small style={{ color: "#665d78", fontSize: 12, marginTop: 4, display: "block" }}>
                      {t("admin.seoTitleHint") || "If empty, town name will be used"}
                    </small>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 4 }}>
                      {t("admin.seoDescription")}
                    </label>
                    <AiPostFormField
                      draft={{
                        kind: "town",
                        field: "seoDescription",
                        lang: selectedLang,
                        siteId: selectedSiteId || undefined,
                        name: readLang(formData, "name", selectedLang),
                      }}
                      value={readLang(formData, "seoDescription", selectedLang)}
                      onApply={(text) =>
                        setFormData((prev) =>
                          patchLang(prev, "seoDescription", selectedLang, text)
                        )
                      }
                      variant="textarea"
                    >
                      <textarea
                        value={readLang(formData, "seoDescription", selectedLang)}
                        onChange={(e) => {
                          setFormData(
                            patchLang(formData, "seoDescription", selectedLang, e.target.value)
                          );
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
                    </AiPostFormField>
                    <small style={{ color: "#665d78", fontSize: 12, marginTop: 4, display: "block" }}>
                      {t("admin.seoDescriptionHint") ||
                        "If empty, first sentences from the description will be used"}
                    </small>
                  </div>

                  <AdminImageField
                    label={t("admin.seoImage") || t("admin.seoImagePlaceholder")}
                    value={readLang(formData, "seoImage", selectedLang)}
                    onChange={(url) =>
                      setFormData(patchLang(formData, "seoImage", selectedLang, url))
                    }
                    folder="towns/seo"
                    placeholder={
                      t("admin.seoImagePlaceholder") ||
                      "SEO image URL (leave empty for hero image)"
                    }
                    description={t("admin.seoImageHint") || "If empty, hero image will be used"}
                  />

                  <div style={{ marginBottom: 0 }}>
                    <label style={{ display: "block", marginBottom: 4 }}>
                      {t("admin.seoKeywords")}
                    </label>
                    <input
                      type="text"
                      value={readLang(formData, "seoKeywords", selectedLang)}
                      onChange={(e) => {
                        setFormData(
                          patchLang(formData, "seoKeywords", selectedLang, e.target.value)
                        );
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
                    <small style={{ color: "#665d78", fontSize: 12, marginTop: 4, display: "block" }}>
                      {t("admin.seoKeywordsHint") || "Comma-separated keywords for search engines"}
                    </small>
                  </div>
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
              lang={formData.domainLang}
              onLangChange={(domainLang) => setFormData({ ...formData, domainLang })}
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
              query={contentLanguages.map((lang) => readLang(formData, "name", lang)).find(Boolean) || ""}
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
                    setFormData((prev) => ({ ...prev, lat: lat.toString(), lng: lng.toString() }));
                  }}
                  onZoomChange={(zoom) => {
                    const next = String(Math.round(zoom * 10) / 10);
                    setFormData((prev) => {
                      const inherited = regionZoom ?? 15;
                      const current = prev.zoom ? Number(prev.zoom) : inherited;
                      if (Math.abs(zoom - current) < 0.2) return prev;
                      if (prev.zoom === next) return prev;
                      return { ...prev, zoom: next };
                    });
                  }}
                  defaultZoom={formData.zoom ? parseFloat(formData.zoom) : regionZoom ?? 15}
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
                    {t("admin.townsPage.zoom")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    step="0.1"
                    value={formData.zoom}
                    onChange={(e) => setFormData({ ...formData, zoom: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 12,
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                    placeholder={String(regionZoom ?? 15)}
                  />
                  <p className="admin-section-card__help">{t("admin.townsPage.zoomHint")}</p>
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

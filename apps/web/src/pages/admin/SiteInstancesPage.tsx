// src/pages/admin/SiteInstancesPage.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { useAdminSite } from "../../contexts/AdminSiteContext";
import {
  getSiteInstances,
  createSiteInstance,
  updateSiteInstance,
  deleteSiteInstance,
  getSites,
  type SiteInstance,
  type CreateSiteInstanceDto,
  type UpdateSiteInstanceDto,
  type Site,
} from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import {
  AdminResponsiveTable,
  type TableColumn,
  type CardField,
} from "../../components/AdminResponsiveTable";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { ROLE_SUPERADMIN } from "../../types/enums";

export function SiteInstancesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  const { selectedSiteId } = useAdminSite();
  usePageTitle("admin.siteInstances");
  const [siteInstances, setSiteInstances] = useState<SiteInstance[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    siteId: "",
    lang: "hu" as "hu" | "en" | "de",
    isDefault: false,
    mapConfigTownId: "",
    mapConfigLat: "",
    mapConfigLng: "",
    mapConfigZoom: "",
    isCrawlable: true,
    enableEvents: true,
    enableBlog: false,
    enableStaticPages: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      setFormData((prev) => ({ ...prev, siteId: selectedSiteId }));
    }
    loadSiteInstances();
  }, [selectedSiteId]);

  const loadSites = async () => {
    try {
      const data = await getSites();
      setSites(data);
    } catch (err) {
      console.error("Failed to load sites", err);
    }
  };

  const loadSiteInstances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSiteInstances(selectedSiteId || undefined);
      setSiteInstances(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadSiteInstancesFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.siteId.trim()) errors.siteId = t("admin.validation.siteRequired");
    if (!formData.lang) errors.lang = t("admin.validation.languageRequired");

    // Validate map coordinates
    if (formData.mapConfigLat && isNaN(parseFloat(formData.mapConfigLat))) {
      errors.mapConfigLat = t("admin.validation.invalidNumber");
    }
    if (formData.mapConfigLng && isNaN(parseFloat(formData.mapConfigLng))) {
      errors.mapConfigLng = t("admin.validation.invalidNumber");
    }
    if (formData.mapConfigZoom && isNaN(parseFloat(formData.mapConfigZoom))) {
      errors.mapConfigZoom = t("admin.validation.invalidNumber");
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      const dto: CreateSiteInstanceDto = {
        siteId: formData.siteId,
        lang: formData.lang,
        isDefault: formData.isDefault,
        mapConfig: {
          townId: formData.mapConfigTownId.trim() || null,
          lat: formData.mapConfigLat ? parseFloat(formData.mapConfigLat) : null,
          lng: formData.mapConfigLng ? parseFloat(formData.mapConfigLng) : null,
          zoom: formData.mapConfigZoom ? parseFloat(formData.mapConfigZoom) : null,
        },
        features: {
          isCrawlable: formData.isCrawlable,
          enableEvents: formData.enableEvents,
          enableBlog: formData.enableBlog,
          enableStaticPages: formData.enableStaticPages,
        },
      };
      await createSiteInstance(dto);
      setIsCreating(false);
      resetForm();
      await loadSiteInstances();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.createSiteInstanceFailed"));
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validateForm()) return;

    try {
      const dto: UpdateSiteInstanceDto = {
        lang: formData.lang,
        isDefault: formData.isDefault,
        mapConfig: {
          townId: formData.mapConfigTownId.trim() || null,
          lat: formData.mapConfigLat ? parseFloat(formData.mapConfigLat) : null,
          lng: formData.mapConfigLng ? parseFloat(formData.mapConfigLng) : null,
          zoom: formData.mapConfigZoom ? parseFloat(formData.mapConfigZoom) : null,
        },
        features: {
          isCrawlable: formData.isCrawlable,
          enableEvents: formData.enableEvents,
          enableBlog: formData.enableBlog,
          enableStaticPages: formData.enableStaticPages,
        },
      };
      await updateSiteInstance(id, dto);
      setEditingId(null);
      resetForm();
      await loadSiteInstances();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateSiteInstanceFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmations.deleteSiteInstance"))) return;

    try {
      await deleteSiteInstance(id);
      await loadSiteInstances();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteSiteInstanceFailed"));
    }
  };

  const resetForm = () => {
    setFormData({
      siteId: selectedSiteId || "",
      lang: "hu",
      isDefault: false,
      mapConfigTownId: "",
      mapConfigLat: "",
      mapConfigLng: "",
      mapConfigZoom: "",
      isCrawlable: true,
      enableEvents: true,
      enableBlog: false,
      enableStaticPages: true,
    });
    setFormErrors({});
  };

  const startEdit = (instance: SiteInstance) => {
    setEditingId(instance.id);
    setFormData({
      siteId: instance.siteId,
      lang: instance.lang,
      isDefault: instance.isDefault,
      mapConfigTownId: instance.mapConfig?.townId || "",
      mapConfigLat: instance.mapConfig?.lat?.toString() || "",
      mapConfigLng: instance.mapConfig?.lng?.toString() || "",
      mapConfigZoom: instance.mapConfig?.zoom?.toString() || "",
      isCrawlable: instance.features?.isCrawlable ?? true,
      enableEvents: instance.features?.enableEvents ?? true,
      enableBlog: instance.features?.enableBlog ?? false,
      enableStaticPages: instance.features?.enableStaticPages ?? true,
    });
  };

  const filteredInstances = siteInstances.filter((instance) => {
    const siteName = instance.site?.slug || "";
    const lang = instance.lang;
    return (
      siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const columns: TableColumn<SiteInstance>[] = [
    {
      key: "site",
      label: t("admin.site"),
      render: (instance) => instance.site?.slug || instance.siteId,
    },
    {
      key: "lang",
      label: t("common.language"),
      render: (instance) => instance.lang.toUpperCase(),
    },
    {
      key: "isDefault",
      label: t("admin.isDefault"),
      render: (instance) => (instance.isDefault ? t("common.yes") : t("common.no")),
    },
  ];

  const cardFields: CardField<SiteInstance>[] = [
    { key: "site", render: (instance) => instance.site?.slug || instance.siteId },
    { key: "lang", render: (instance) => instance.lang.toUpperCase() },
    {
      key: "isDefault",
      render: (instance) => (instance.isDefault ? t("common.yes") : t("common.no")),
    },
  ];

  const isSuperadmin = currentUser?.role === ROLE_SUPERADMIN;

  if (!isSuperadmin) {
    return <div style={{ padding: 24 }}>{t("admin.accessDenied")}</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(16px, 4vw, 24px)" }}>
      <AdminPageHeader
        title={t("admin.siteInstances")}
        newButtonLabel={t("admin.forms.newSiteInstance")}
        onNewClick={() => setIsCreating(true)}
        showNewButton={!isCreating && !editingId}
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
            padding: 16,
            background: "#f8d7da",
            color: "#721c24",
            borderRadius: 8,
            marginBottom: 24,
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
            boxShadow: "0 8px 24px rgba(102, 126, 234, 0.15)",
          }}
        >
          <h2
            style={{
              marginBottom: 24,
              color: "#667eea",
              fontSize: "clamp(18px, 4vw, 22px)",
              fontWeight: 700,
              fontFamily:
                "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {editingId ? t("admin.forms.editSiteInstance") : t("admin.forms.newSiteInstance")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                {t("admin.site")} *
              </label>
              <select
                value={formData.siteId}
                onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                disabled={!!selectedSiteId || !!editingId}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 15,
                  border: formErrors.siteId ? "2px solid #dc3545" : "2px solid #e0e7ff",
                  borderRadius: 8,
                  boxSizing: "border-box",
                }}
              >
                <option value="">{t("admin.selectSite")}</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.translations.find((t) => t.lang === "hu")?.name || site.slug}
                  </option>
                ))}
              </select>
              {formErrors.siteId && (
                <p style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>{formErrors.siteId}</p>
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                {t("common.language")} *
              </label>
              <select
                value={formData.lang}
                onChange={(e) =>
                  setFormData({ ...formData, lang: e.target.value as "hu" | "en" | "de" })
                }
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 15,
                  border: formErrors.lang ? "2px solid #dc3545" : "2px solid #e0e7ff",
                  borderRadius: 8,
                  boxSizing: "border-box",
                }}
              >
                <option value="hu">{t("admin.languageNames.hu")}</option>
                <option value="en">{t("admin.languageNames.en")}</option>
                <option value="de">{t("admin.languageNames.de")}</option>
              </select>
              {formErrors.lang && (
                <p style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>{formErrors.lang}</p>
              )}
            </div>

            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 15,
                }}
              >
                <input
                  type="checkbox"
                  style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
                <span style={{ color: "#333", fontWeight: 500 }}>{t("admin.isDefault")}</span>
              </label>
            </div>

            <div style={{ borderTop: "1px solid #e0e7ff", paddingTop: 20 }}>
              <h3
                style={{
                  marginBottom: 16,
                  color: "#667eea",
                  fontSize: "clamp(16px, 3.5vw, 18px)",
                  fontWeight: 600,
                  fontFamily:
                    "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.mapConfig")}
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    {t("admin.mapDefaultTownId")}
                  </label>
                  <input
                    type="text"
                    value={formData.mapConfigTownId}
                    onChange={(e) => setFormData({ ...formData, mapConfigTownId: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: 15,
                      border: "2px solid #e0e7ff",
                      borderRadius: 8,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    {t("admin.mapDefaultLat")}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.mapConfigLat}
                    onChange={(e) => setFormData({ ...formData, mapConfigLat: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: 15,
                      border: formErrors.mapConfigLat ? "2px solid #dc3545" : "2px solid #e0e7ff",
                      borderRadius: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  {formErrors.mapConfigLat && (
                    <p style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>
                      {formErrors.mapConfigLat}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    {t("admin.mapDefaultLng")}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.mapConfigLng}
                    onChange={(e) => setFormData({ ...formData, mapConfigLng: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: 15,
                      border: formErrors.mapConfigLng ? "2px solid #dc3545" : "2px solid #e0e7ff",
                      borderRadius: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  {formErrors.mapConfigLng && (
                    <p style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>
                      {formErrors.mapConfigLng}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    {t("admin.mapDefaultZoom")}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.mapConfigZoom}
                    onChange={(e) => setFormData({ ...formData, mapConfigZoom: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: 15,
                      border: formErrors.mapConfigZoom ? "2px solid #dc3545" : "2px solid #e0e7ff",
                      borderRadius: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  {formErrors.mapConfigZoom && (
                    <p style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>
                      {formErrors.mapConfigZoom}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e0e7ff", paddingTop: 20 }}>
              <h3
                style={{
                  marginBottom: 16,
                  color: "#667eea",
                  fontSize: "clamp(16px, 3.5vw, 18px)",
                  fontWeight: 600,
                  fontFamily:
                    "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.features")}
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                      style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
                      checked={formData.isCrawlable}
                      onChange={(e) => setFormData({ ...formData, isCrawlable: e.target.checked })}
                    />
                    <span style={{ color: "#333", fontWeight: 500 }}>{t("admin.isCrawlable")}</span>
                  </label>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#666",
                      marginLeft: 32,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.isCrawlableDescription") ||
                      "Ha be van kapcsolva, a keresőmotorok (Google, Bing, stb.) indexelhetik az oldalt. Ha ki van kapcsolva, a robots.txt és meta tag-ek megakadályozzák az indexelést."}
                  </div>
                </div>
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
                    style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
                    checked={formData.enableEvents}
                    onChange={(e) => setFormData({ ...formData, enableEvents: e.target.checked })}
                  />
                  <span style={{ color: "#333", fontWeight: 500 }}>{t("admin.enableEvents")}</span>
                </label>
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
                    style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
                    checked={formData.enableBlog}
                    onChange={(e) => setFormData({ ...formData, enableBlog: e.target.checked })}
                  />
                  <span style={{ color: "#333", fontWeight: 500 }}>{t("admin.enableBlog")}</span>
                </label>
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
                    style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
                    checked={formData.enableStaticPages}
                    onChange={(e) =>
                      setFormData({ ...formData, enableStaticPages: e.target.checked })
                    }
                  />
                  <span style={{ color: "#333", fontWeight: 500 }}>
                    {t("admin.enableStaticPages")}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isCreating && !editingId && (
        <AdminResponsiveTable<SiteInstance>
          data={filteredInstances}
          getItemId={(instance) => instance.id}
          searchQuery={searchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.siteInstances")}
          onSearchChange={setSearchQuery}
          isLoading={isLoading}
          filterFn={(instance, query) => {
            const lowerQuery = query.toLowerCase();
            const siteName = instance.site?.slug || "";
            return (
              siteName.toLowerCase().includes(lowerQuery) ||
              instance.lang.toLowerCase().includes(lowerQuery)
            );
          }}
          columns={columns}
          cardTitle={(instance) =>
            `${instance.site?.slug || instance.siteId} - ${instance.lang.toUpperCase()}`
          }
          cardFields={cardFields}
          onEdit={startEdit}
          onDelete={(instance) => handleDelete(instance.id)}
        />
      )}
    </div>
  );
}

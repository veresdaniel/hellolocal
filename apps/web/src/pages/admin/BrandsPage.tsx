// src/pages/admin/BrandsPage.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getBrands, createBrand, updateBrand, deleteBrand, type Brand, type CreateBrandDto, type UpdateBrandDto } from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { AdminResponsiveTable, type TableColumn, type CardField } from "../../components/AdminResponsiveTable";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { isValidImageUrl } from "../../utils/urlValidation";

export function BrandsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageTitle("admin.brands");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    logoUrl: "",
    faviconUrl: "",
    defaultPlaceholderCardImage: "",
    defaultPlaceholderDetailHeroImage: "",
    defaultEventPlaceholderCardImage: "",
    brandBadgeIcon: "",
    mapDefaultTownId: "",
    mapDefaultLat: "",
    mapDefaultLng: "",
    mapDefaultZoom: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBrands();
      setBrands(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadBrandsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = t("admin.validation.nameRequired");
    
    // Validate image URLs
    if (formData.logoUrl && !isValidImageUrl(formData.logoUrl)) {
      errors.logoUrl = t("admin.validation.invalidImageUrl");
    }
    if (formData.faviconUrl && !isValidImageUrl(formData.faviconUrl)) {
      errors.faviconUrl = t("admin.validation.invalidImageUrl");
    }
    if (formData.defaultPlaceholderCardImage && !isValidImageUrl(formData.defaultPlaceholderCardImage)) {
      errors.defaultPlaceholderCardImage = t("admin.validation.invalidImageUrl");
    }
    if (formData.defaultPlaceholderDetailHeroImage && !isValidImageUrl(formData.defaultPlaceholderDetailHeroImage)) {
      errors.defaultPlaceholderDetailHeroImage = t("admin.validation.invalidImageUrl");
    }
    if (formData.defaultEventPlaceholderCardImage && !isValidImageUrl(formData.defaultEventPlaceholderCardImage)) {
      errors.defaultEventPlaceholderCardImage = t("admin.validation.invalidImageUrl");
    }
    if (formData.brandBadgeIcon && !isValidImageUrl(formData.brandBadgeIcon)) {
      errors.brandBadgeIcon = t("admin.validation.invalidImageUrl");
    }

    // Validate map coordinates
    if (formData.mapDefaultLat && isNaN(parseFloat(formData.mapDefaultLat))) {
      errors.mapDefaultLat = t("admin.validation.invalidNumber");
    }
    if (formData.mapDefaultLng && isNaN(parseFloat(formData.mapDefaultLng))) {
      errors.mapDefaultLng = t("admin.validation.invalidNumber");
    }
    if (formData.mapDefaultZoom && isNaN(parseFloat(formData.mapDefaultZoom))) {
      errors.mapDefaultZoom = t("admin.validation.invalidNumber");
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      const dto: CreateBrandDto = {
        name: formData.name.trim(),
        logoUrl: formData.logoUrl.trim() || null,
        faviconUrl: formData.faviconUrl.trim() || null,
        placeholders: {
          defaultPlaceholderCardImage: formData.defaultPlaceholderCardImage.trim() || null,
          defaultPlaceholderDetailHeroImage: formData.defaultPlaceholderDetailHeroImage.trim() || null,
          defaultEventPlaceholderCardImage: formData.defaultEventPlaceholderCardImage.trim() || null,
          brandBadgeIcon: formData.brandBadgeIcon.trim() || null,
        },
        mapDefaults: {
          townId: formData.mapDefaultTownId.trim() || null,
          lat: formData.mapDefaultLat ? parseFloat(formData.mapDefaultLat) : null,
          lng: formData.mapDefaultLng ? parseFloat(formData.mapDefaultLng) : null,
          zoom: formData.mapDefaultZoom ? parseFloat(formData.mapDefaultZoom) : null,
        },
      };
      await createBrand(dto);
      setIsCreating(false);
      resetForm();
      await loadBrands();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.createBrandFailed"));
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validateForm()) return;

    try {
      const dto: UpdateBrandDto = {
        name: formData.name.trim(),
        logoUrl: formData.logoUrl.trim() || null,
        faviconUrl: formData.faviconUrl.trim() || null,
        placeholders: {
          defaultPlaceholderCardImage: formData.defaultPlaceholderCardImage.trim() || null,
          defaultPlaceholderDetailHeroImage: formData.defaultPlaceholderDetailHeroImage.trim() || null,
          defaultEventPlaceholderCardImage: formData.defaultEventPlaceholderCardImage.trim() || null,
          brandBadgeIcon: formData.brandBadgeIcon.trim() || null,
        },
        mapDefaults: {
          townId: formData.mapDefaultTownId.trim() || null,
          lat: formData.mapDefaultLat ? parseFloat(formData.mapDefaultLat) : null,
          lng: formData.mapDefaultLng ? parseFloat(formData.mapDefaultLng) : null,
          zoom: formData.mapDefaultZoom ? parseFloat(formData.mapDefaultZoom) : null,
        },
      };
      await updateBrand(id, dto);
      setEditingId(null);
      resetForm();
      await loadBrands();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateBrandFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmations.deleteBrand"))) return;

    try {
      await deleteBrand(id);
      await loadBrands();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteBrandFailed"));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      logoUrl: "",
      faviconUrl: "",
      defaultPlaceholderCardImage: "",
      defaultPlaceholderDetailHeroImage: "",
      defaultEventPlaceholderCardImage: "",
      brandBadgeIcon: "",
      mapDefaultTownId: "",
      mapDefaultLat: "",
      mapDefaultLng: "",
      mapDefaultZoom: "",
    });
    setFormErrors({});
  };

  const startEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setFormData({
      name: brand.name,
      logoUrl: brand.logoUrl || "",
      faviconUrl: brand.faviconUrl || "",
      defaultPlaceholderCardImage: brand.placeholders?.defaultPlaceholderCardImage || "",
      defaultPlaceholderDetailHeroImage: brand.placeholders?.defaultPlaceholderDetailHeroImage || "",
      defaultEventPlaceholderCardImage: brand.placeholders?.defaultEventPlaceholderCardImage || "",
      brandBadgeIcon: brand.placeholders?.brandBadgeIcon || "",
      mapDefaultTownId: brand.mapDefaults?.townId || "",
      mapDefaultLat: brand.mapDefaults?.lat?.toString() || "",
      mapDefaultLng: brand.mapDefaults?.lng?.toString() || "",
      mapDefaultZoom: brand.mapDefaults?.zoom?.toString() || "",
    });
  };

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: TableColumn<Brand>[] = [
    {
      key: "name",
      label: t("common.name"),
      render: (brand) => brand.name,
    },
    {
      key: "tenants",
      label: t("admin.tenants"),
      render: (brand) => brand.tenants?.length || 0,
    },
  ];

  const cardFields: CardField<Brand>[] = [
    { key: "name", render: (brand) => brand.name },
    { key: "tenants", render: (brand) => `${t("admin.tenants")}: ${brand.tenants?.length || 0}` },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(16px, 4vw, 24px)" }}>
      <AdminPageHeader
        title={t("admin.brands")}
        newButtonLabel={t("admin.forms.newBrand")}
        onNewClick={() => setIsCreating(true)}
        showNewButton={!isCreating && !editingId}
        isCreatingOrEditing={isCreating || !!editingId}
        onSave={() => editingId ? handleUpdate(editingId) : handleCreate()}
        onCancel={() => {
          setIsCreating(false);
          setEditingId(null);
          resetForm();
          // Back button will handle navigation
        }}
        saveLabel={editingId ? t("common.update") : t("common.create")}
      />

      {error && (
        <div style={{ 
          padding: 16, 
          background: "#f8d7da", 
          color: "#721c24", 
          borderRadius: 8, 
          marginBottom: 24 
        }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ 
          padding: "clamp(24px, 5vw, 32px)", 
          background: "white", 
          borderRadius: 16, 
          marginBottom: 32, 
          boxShadow: "0 8px 24px rgba(102, 126, 234, 0.15)",
        }}>
          <h2 style={{ 
            marginBottom: 24, 
            color: "#667eea",
            fontSize: "clamp(20px, 5vw, 24px)",
            fontWeight: 700,
          }}>
            {editingId ? t("admin.forms.editBrand") : t("admin.forms.newBrand")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                {t("common.name")} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  border: formErrors.name ? "2px solid #dc3545" : "2px solid #e0e7ff",
                  borderRadius: 8,
                  boxSizing: "border-box",
                }}
              />
              {formErrors.name && (
                <p style={{ 
                  color: "#dc3545", 
                  fontSize: "clamp(13px, 3vw, 15px)", 
                  marginTop: 4,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}>{formErrors.name}</p>
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                {t("admin.logoUrl")}
              </label>
              <input
                type="text"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  border: formErrors.logoUrl ? "2px solid #dc3545" : "2px solid #e0e7ff",
                  borderRadius: 8,
                  boxSizing: "border-box",
                }}
              />
              {formErrors.logoUrl && (
                <p style={{ 
                  color: "#dc3545", 
                  fontSize: "clamp(13px, 3vw, 15px)", 
                  marginTop: 4,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}>{formErrors.logoUrl}</p>
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                {t("admin.faviconUrl")}
              </label>
              <input
                type="text"
                value={formData.faviconUrl}
                onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
                placeholder="https://example.com/favicon.ico"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  border: formErrors.faviconUrl ? "2px solid #dc3545" : "2px solid #e0e7ff",
                  borderRadius: 8,
                  boxSizing: "border-box",
                }}
              />
              {formErrors.faviconUrl && (
                <p style={{ 
                  color: "#dc3545", 
                  fontSize: "clamp(13px, 3vw, 15px)", 
                  marginTop: 4,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}>{formErrors.faviconUrl}</p>
              )}
            </div>

            <div style={{ borderTop: "1px solid #e0e7ff", paddingTop: 20 }}>
              <h3 style={{ 
                marginBottom: 16, 
                color: "#667eea", 
                fontSize: "clamp(16px, 3.5vw, 18px)", 
                fontWeight: 600,
                fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}>
                {t("admin.placeholderImages")}
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    {t("admin.defaultPlaceholderCardImage")}
                  </label>
                  <input
                    type="text"
                    value={formData.defaultPlaceholderCardImage}
                    onChange={(e) => setFormData({ ...formData, defaultPlaceholderCardImage: e.target.value })}
                    placeholder="https://example.com/placeholder-card.jpg"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      border: formErrors.defaultPlaceholderCardImage ? "2px solid #dc3545" : "2px solid #e0e7ff",
                      borderRadius: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  {formErrors.defaultPlaceholderCardImage && (
                    <p style={{ 
                      color: "#dc3545", 
                      fontSize: "clamp(13px, 3vw, 15px)", 
                      marginTop: 4,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>{formErrors.defaultPlaceholderCardImage}</p>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    {t("admin.defaultPlaceholderDetailHeroImage")}
                  </label>
                  <input
                    type="text"
                    value={formData.defaultPlaceholderDetailHeroImage}
                    onChange={(e) => setFormData({ ...formData, defaultPlaceholderDetailHeroImage: e.target.value })}
                    placeholder="https://example.com/placeholder-hero.jpg"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      border: formErrors.defaultPlaceholderDetailHeroImage ? "2px solid #dc3545" : "2px solid #e0e7ff",
                      borderRadius: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  {formErrors.defaultPlaceholderDetailHeroImage && (
                    <p style={{ 
                      color: "#dc3545", 
                      fontSize: "clamp(13px, 3vw, 15px)", 
                      marginTop: 4,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>{formErrors.defaultPlaceholderDetailHeroImage}</p>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    {t("admin.defaultEventPlaceholderCardImage")}
                  </label>
                  <input
                    type="text"
                    value={formData.defaultEventPlaceholderCardImage}
                    onChange={(e) => setFormData({ ...formData, defaultEventPlaceholderCardImage: e.target.value })}
                    placeholder="https://example.com/placeholder-event.jpg"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      border: formErrors.defaultEventPlaceholderCardImage ? "2px solid #dc3545" : "2px solid #e0e7ff",
                      borderRadius: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  {formErrors.defaultEventPlaceholderCardImage && (
                    <p style={{ 
                      color: "#dc3545", 
                      fontSize: "clamp(13px, 3vw, 15px)", 
                      marginTop: 4,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>{formErrors.defaultEventPlaceholderCardImage}</p>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    {t("admin.brandBadgeIcon")}
                  </label>
                  <input
                    type="text"
                    value={formData.brandBadgeIcon}
                    onChange={(e) => setFormData({ ...formData, brandBadgeIcon: e.target.value })}
                    placeholder="https://example.com/badge-icon.png"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      border: formErrors.brandBadgeIcon ? "2px solid #dc3545" : "2px solid #e0e7ff",
                      borderRadius: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  {formErrors.brandBadgeIcon && (
                    <p style={{ 
                      color: "#dc3545", 
                      fontSize: "clamp(13px, 3vw, 15px)", 
                      marginTop: 4,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>{formErrors.brandBadgeIcon}</p>
                  )}
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e0e7ff", paddingTop: 20 }}>
              <h3 style={{ 
                marginBottom: 16, 
                color: "#667eea", 
                fontSize: "clamp(16px, 3.5vw, 18px)", 
                fontWeight: 600,
                fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}>
                {t("admin.mapDefaults")}
              </h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    {t("admin.mapDefaultTownId")}
                  </label>
                  <input
                    type="text"
                    value={formData.mapDefaultTownId}
                    onChange={(e) => setFormData({ ...formData, mapDefaultTownId: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                    value={formData.mapDefaultLat}
                    onChange={(e) => setFormData({ ...formData, mapDefaultLat: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      border: formErrors.mapDefaultLat ? "2px solid #dc3545" : "2px solid #e0e7ff",
                      borderRadius: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  {formErrors.mapDefaultLat && (
                    <p style={{ 
                      color: "#dc3545", 
                      fontSize: "clamp(13px, 3vw, 15px)", 
                      marginTop: 4,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>{formErrors.mapDefaultLat}</p>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    {t("admin.mapDefaultLng")}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.mapDefaultLng}
                    onChange={(e) => setFormData({ ...formData, mapDefaultLng: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      border: formErrors.mapDefaultLng ? "2px solid #dc3545" : "2px solid #e0e7ff",
                      borderRadius: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  {formErrors.mapDefaultLng && (
                    <p style={{ 
                      color: "#dc3545", 
                      fontSize: "clamp(13px, 3vw, 15px)", 
                      marginTop: 4,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>{formErrors.mapDefaultLng}</p>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    {t("admin.mapDefaultZoom")}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.mapDefaultZoom}
                    onChange={(e) => setFormData({ ...formData, mapDefaultZoom: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      border: formErrors.mapDefaultZoom ? "2px solid #dc3545" : "2px solid #e0e7ff",
                      borderRadius: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  {formErrors.mapDefaultZoom && (
                    <p style={{ 
                      color: "#dc3545", 
                      fontSize: "clamp(13px, 3vw, 15px)", 
                      marginTop: 4,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>{formErrors.mapDefaultZoom}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isCreating && !editingId && (
        <AdminResponsiveTable<Brand>
          data={filteredBrands}
          getItemId={(brand) => brand.id}
          searchQuery={searchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.brands")}
          onSearchChange={setSearchQuery}
          isLoading={isLoading}
          filterFn={(brand, query) => 
            brand.name.toLowerCase().includes(query.toLowerCase())
          }
          columns={columns}
          cardTitle={(brand) => brand.name}
          cardFields={cardFields}
          onEdit={startEdit}
          onDelete={(brand) => handleDelete(brand.id)}
        />
      )}
    </div>
  );
}

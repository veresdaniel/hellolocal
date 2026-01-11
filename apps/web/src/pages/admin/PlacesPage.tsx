// src/pages/admin/PlacesPage.tsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useAdminTenant } from "../../contexts/AdminTenantContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../contexts/ToastContext";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Pagination } from "../../components/Pagination";
import { getPlaces, createPlace, updatePlace, deletePlace, getCategories, getTowns, getPriceBands, getTags } from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { TagAutocomplete } from "../../components/TagAutocomplete";
import { CategoryAutocomplete } from "../../components/CategoryAutocomplete";
import { MapComponent } from "../../components/MapComponent";
import { OpeningHoursEditor, type OpeningHour } from "../../components/OpeningHoursEditor";
import { AdminResponsiveTable, type TableColumn, type CardField } from "../../components/AdminResponsiveTable";

interface Place {
  id: string;
  tenantId: string;
  townId: string | null;
  categoryId: string;
  priceBandId: string | null;
  isActive: boolean;
  heroImage: string | null;
  gallery: string[];
  lat: number | null;
  lng: number | null;
  category: { translations: Array<{ lang: string; name: string }> };
  town: { translations: Array<{ lang: string; name: string }> } | null;
  priceBand: { translations: Array<{ lang: string; name: string }> } | null;
  tags: Array<{ tag: { id: string; translations: Array<{ lang: string; name: string }> } }>;
  openingHours?: Array<OpeningHour>;
  translations: Array<{
    lang: string;
    name: string;
    shortDescription: string | null;
    description: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    facebook: string | null;
    whatsapp: string | null;
    accessibility: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoImage: string | null;
    seoKeywords: string[];
  }>;
}

export function PlacesPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { selectedTenantId, isLoading: isTenantLoading } = useAdminTenant();
  const { showToast } = useToast();
  usePageTitle("admin.places");
  const [places, setPlaces] = useState<Place[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [towns, setTowns] = useState<any[]>([]);
  const [priceBands, setPriceBands] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    categoryId: "",
    townId: "",
    priceBandId: "",
    tagIds: [] as string[],
    nameHu: "",
    nameEn: "",
    nameDe: "",
    shortDescriptionHu: "",
    shortDescriptionEn: "",
    shortDescriptionDe: "",
    descriptionHu: "",
    descriptionEn: "",
    descriptionDe: "",
    addressHu: "",
    addressEn: "",
    addressDe: "",
    phone: "",
    email: "",
    website: "",
    facebook: "",
    whatsapp: "",
    openingHours: [] as OpeningHour[],
    accessibilityHu: "",
    accessibilityEn: "",
    accessibilityDe: "",
    seoTitleHu: "",
    seoTitleEn: "",
    seoTitleDe: "",
    seoDescriptionHu: "",
    seoDescriptionEn: "",
    seoDescriptionDe: "",
    seoImageHu: "",
    seoImageEn: "",
    seoImageDe: "",
    seoKeywordsHu: [] as string[],
    seoKeywordsEn: [] as string[],
    seoKeywordsDe: [] as string[],
    heroImage: "",
    lat: "",
    lng: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const previousPathnameRef = useRef<string>(location.pathname);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      // Reset to first page when tenant changes
      setPagination(prev => ({ ...prev, page: 1 }));
      loadData();
    } else {
      // Reset loading state if no tenant
      setIsLoading(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    if (selectedTenantId) {
      loadPlaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, pagination.page, pagination.limit]);


  const loadData = async () => {
    if (!selectedTenantId) return;
    try {
      const [categoriesResponse, townsResponse, priceBandsResponse, tagsResponse] = await Promise.all([
        getCategories(selectedTenantId),
        getTowns(selectedTenantId),
        getPriceBands(selectedTenantId),
        getTags(selectedTenantId),
      ]);
      // Handle paginated responses (used in dropdowns, so we extract the array)
      setCategories(Array.isArray(categoriesResponse) ? categoriesResponse : (categoriesResponse?.categories || []));
      setTowns(Array.isArray(townsResponse) ? townsResponse : (townsResponse?.towns || []));
      setPriceBands(Array.isArray(priceBandsResponse) ? priceBandsResponse : (priceBandsResponse?.priceBands || []));
      setTags(Array.isArray(tagsResponse) ? tagsResponse : (tagsResponse?.tags || []));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.loadPlacesFailed"), "error");
    }
  };

  const loadPlaces = async () => {
    if (!selectedTenantId) return;
    setIsLoading(true);
    try {
      const response = await getPlaces(selectedTenantId, pagination.page, pagination.limit);
      // Backend always returns paginated response now
      if (Array.isArray(response)) {
        // Fallback for backward compatibility (should not happen)
        setPlaces(response);
        setPagination(prev => ({ ...prev, total: response.length, totalPages: 1 }));
      } else {
        setPlaces(response.places || []);
        setPagination(response.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.loadPlacesFailed"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.categoryId) errors.categoryId = t("admin.validation.categoryRequired");
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
        lang: string;
        name: string;
        description: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        website: string | null;
        facebook: string | null;
        whatsapp: string | null;
        accessibility: string | null;
        seoTitle: string | null;
        seoDescription: string | null;
        seoImage: string | null;
        seoKeywords: string[];
      }> = [
        {
          lang: "hu",
          name: formData.nameHu,
          shortDescription: formData.shortDescriptionHu || null,
          description: formData.descriptionHu || null,
          address: formData.addressHu || null,
        phone: formData.phone || null,
        email: formData.email || null,
        website: formData.website || null,
        facebook: formData.facebook || null,
        whatsapp: formData.whatsapp || null,
          accessibility: formData.accessibilityHu || null,
          seoTitle: formData.seoTitleHu || null,
          seoDescription: formData.seoDescriptionHu || null,
          seoImage: formData.seoImageHu || null,
          seoKeywords: formData.seoKeywordsHu || [],
        },
      ];
      if (formData.nameEn.trim()) {
        translations.push({
          lang: "en",
          name: formData.nameEn,
          shortDescription: formData.shortDescriptionEn || null,
          description: formData.descriptionEn || null,
          address: formData.addressEn || null,
        phone: formData.phone || null,
        email: formData.email || null,
        website: formData.website || null,
        facebook: formData.facebook || null,
        whatsapp: formData.whatsapp || null,
          accessibility: formData.accessibilityEn || null,
          seoTitle: formData.seoTitleEn || null,
          seoDescription: formData.seoDescriptionEn || null,
          seoImage: formData.seoImageEn || null,
          seoKeywords: formData.seoKeywordsEn || [],
        });
      }
      if (formData.nameDe.trim()) {
        translations.push({
          lang: "de",
          name: formData.nameDe,
          shortDescription: formData.shortDescriptionDe || null,
          description: formData.descriptionDe || null,
          address: formData.addressDe || null,
        phone: formData.phone || null,
        email: formData.email || null,
        website: formData.website || null,
        facebook: formData.facebook || null,
        whatsapp: formData.whatsapp || null,
          accessibility: formData.accessibilityDe || null,
          seoTitle: formData.seoTitleDe || null,
          seoDescription: formData.seoDescriptionDe || null,
          seoImage: formData.seoImageDe || null,
          seoKeywords: formData.seoKeywordsDe || [],
        });
      }

      await createPlace({
        tenantId: selectedTenantId,
        categoryId: formData.categoryId,
        townId: formData.townId || null,
        priceBandId: formData.priceBandId || null,
        tagIds: formData.tagIds,
        translations,
        openingHours: formData.openingHours,
        heroImage: formData.heroImage || null,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        isActive: formData.isActive,
      });
      setIsCreating(false);
      resetForm();
      await loadPlaces();
      // Notify global cache manager that places have changed
      notifyEntityChanged("places");
      showToast(t("admin.messages.placeCreated"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.createPlaceFailed"), "error");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validateForm()) return;

    try {
      await updatePlace(
        id,
        {
          categoryId: formData.categoryId,
          townId: formData.townId || null,
          priceBandId: formData.priceBandId || null,
          tagIds: formData.tagIds,
          translations: (() => {
            const translations: Array<{
              lang: string;
              name: string;
              description: string | null;
              address: string | null;
              phone: string | null;
              email: string | null;
              website: string | null;
              facebook: string | null;
              whatsapp: string | null;
              accessibility: string | null;
              seoTitle: string | null;
              seoDescription: string | null;
              seoImage: string | null;
              seoKeywords: string[];
            }> = [
              {
                lang: "hu",
                name: formData.nameHu,
                shortDescription: formData.shortDescriptionHu || null,
                description: formData.descriptionHu || null,
                address: formData.addressHu || null,
                phone: formData.phone || null,
                email: formData.email || null,
                website: formData.website || null,
                facebook: formData.facebook || null,
                whatsapp: formData.whatsapp || null,
                accessibility: formData.accessibilityHu || null,
                seoTitle: formData.seoTitleHu || null,
                seoDescription: formData.seoDescriptionHu || null,
                seoImage: formData.seoImageHu || null,
                seoKeywords: formData.seoKeywordsHu || [],
              },
            ];
            if (formData.nameEn.trim()) {
              translations.push({
                lang: "en",
                name: formData.nameEn,
                shortDescription: formData.shortDescriptionEn || null,
                description: formData.descriptionEn || null,
                address: formData.addressEn || null,
                phone: formData.phone || null,
                email: formData.email || null,
                website: formData.website || null,
                facebook: formData.facebook || null,
                whatsapp: formData.whatsapp || null,
                accessibility: formData.accessibilityEn || null,
                seoTitle: formData.seoTitleEn || null,
                seoDescription: formData.seoDescriptionEn || null,
                seoImage: formData.seoImageEn || null,
                seoKeywords: formData.seoKeywordsEn || [],
              });
            }
            if (formData.nameDe.trim()) {
              translations.push({
                lang: "de",
                name: formData.nameDe,
                shortDescription: formData.shortDescriptionDe || null,
                description: formData.descriptionDe || null,
                address: formData.addressDe || null,
                phone: formData.phone || null,
                email: formData.email || null,
                website: formData.website || null,
                facebook: formData.facebook || null,
                whatsapp: formData.whatsapp || null,
                accessibility: formData.accessibilityDe || null,
                seoTitle: formData.seoTitleDe || null,
                seoDescription: formData.seoDescriptionDe || null,
                seoImage: formData.seoImageDe || null,
                seoKeywords: formData.seoKeywordsDe || [],
              });
            }
            return translations;
          })(),
          openingHours: formData.openingHours,
          heroImage: formData.heroImage || null,
          lat: formData.lat ? parseFloat(formData.lat) : null,
          lng: formData.lng ? parseFloat(formData.lng) : null,
          isActive: formData.isActive,
        },
        selectedTenantId || undefined
      );
      setEditingId(null);
      resetForm();
      await loadPlaces();
      // Notify global cache manager that places have changed
      notifyEntityChanged("places");
      showToast(t("admin.messages.placeUpdated"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updatePlaceFailed"), "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmations.deletePlace"))) return;

    try {
      await deletePlace(id, selectedTenantId || undefined);
      await loadPlaces();
      // Notify global cache manager that places have changed
      notifyEntityChanged("places");
      showToast(t("admin.messages.placeDeleted"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.deletePlaceFailed"), "error");
    }
  };

  const startEdit = (place: Place) => {
    setEditingId(place.id);
    const hu = place.translations.find((t) => t.lang === "hu");
    const en = place.translations.find((t) => t.lang === "en");
    const de = place.translations.find((t) => t.lang === "de");
    setFormData({
      categoryId: place.categoryId,
      townId: place.townId || "",
      priceBandId: place.priceBandId || "",
      tagIds: place.tags.map((pt) => pt.tag.id),
      nameHu: hu?.name || "",
      nameEn: en?.name || "",
      nameDe: de?.name || "",
      shortDescriptionHu: hu?.shortDescription || "",
      shortDescriptionEn: en?.shortDescription || "",
      shortDescriptionDe: de?.shortDescription || "",
      descriptionHu: hu?.description || "",
      descriptionEn: en?.description || "",
      descriptionDe: de?.description || "",
      addressHu: hu?.address || "",
      addressEn: en?.address || "",
      addressDe: de?.address || "",
      phone: hu?.phone || "",
      email: hu?.email || "",
      website: hu?.website || "",
      facebook: hu?.facebook || "",
      whatsapp: hu?.whatsapp || "",
      openingHours: place.openingHours || [],
      accessibilityHu: hu?.accessibility || "",
      accessibilityEn: en?.accessibility || "",
      accessibilityDe: de?.accessibility || "",
      seoTitleHu: hu?.seoTitle || "",
      seoTitleEn: en?.seoTitle || "",
      seoTitleDe: de?.seoTitle || "",
      seoDescriptionHu: hu?.seoDescription || "",
      seoDescriptionEn: en?.seoDescription || "",
      seoDescriptionDe: de?.seoDescription || "",
      seoImageHu: hu?.seoImage || "",
      seoImageEn: en?.seoImage || "",
      seoImageDe: de?.seoImage || "",
      seoKeywordsHu: hu?.seoKeywords || [],
      seoKeywordsEn: en?.seoKeywords || [],
      seoKeywordsDe: de?.seoKeywords || [],
      heroImage: place.heroImage || "",
      lat: place.lat?.toString() || "",
      lng: place.lng?.toString() || "",
      isActive: place.isActive,
    });
  };

  const resetForm = () => {
    setFormData({
      categoryId: "",
      townId: "",
      priceBandId: "",
      tagIds: [],
      nameHu: "",
      nameEn: "",
      nameDe: "",
      descriptionHu: "",
      descriptionEn: "",
      descriptionDe: "",
      addressHu: "",
      addressEn: "",
      addressDe: "",
      phone: "",
      email: "",
      website: "",
      facebook: "",
      whatsapp: "",
      openingHours: [],
      accessibilityHu: "",
      accessibilityEn: "",
      accessibilityDe: "",
      seoTitleHu: "",
      seoTitleEn: "",
      seoTitleDe: "",
      seoDescriptionHu: "",
      seoDescriptionEn: "",
      seoDescriptionDe: "",
      seoImageHu: "",
      seoImageEn: "",
      seoImageDe: "",
      seoKeywordsHu: [],
      seoKeywordsEn: [],
      seoKeywordsDe: [],
      heroImage: "",
      lat: "",
      lng: "",
      isActive: true,
    });
    setFormErrors({});
  };

  // Reset edit state when navigating away from this page
  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousPathnameRef.current;
    
    // Only reset if pathname actually changed AND we're no longer on places page
    if (currentPath !== previousPath) {
      previousPathnameRef.current = currentPath;
      
      const isOnPlacesPage = currentPath.includes("/admin/places");
      
      // Only reset if we're NOT on the places page AND we have edit state active
      if (!isOnPlacesPage && (editingId || isCreating)) {
        setEditingId(null);
        setIsCreating(false);
        // Reset form data directly to avoid dependency issues
        setFormData({
          categoryId: "",
          townId: "",
          priceBandId: "",
          tagIds: [],
          nameHu: "",
          nameEn: "",
          nameDe: "",
          descriptionHu: "",
          descriptionEn: "",
          descriptionDe: "",
          addressHu: "",
          addressEn: "",
          addressDe: "",
          phone: "",
          email: "",
          website: "",
          facebook: "",
          whatsapp: "",
          openingHours: [],
          accessibilityHu: "",
          accessibilityEn: "",
          accessibilityDe: "",
          seoTitleHu: "",
          seoTitleEn: "",
          seoTitleDe: "",
          seoDescriptionHu: "",
          seoDescriptionEn: "",
          seoDescriptionDe: "",
          seoImageHu: "",
          seoImageEn: "",
          seoImageDe: "",
          seoKeywordsHu: [],
          seoKeywordsEn: [],
          seoKeywordsDe: [],
          heroImage: "",
          lat: "",
          lng: "",
          isActive: true,
        });
        setFormErrors({});
      }
    }
  }, [location.pathname, editingId, isCreating]);

  // Wait for tenant context to initialize
  if (isTenantLoading) {
    return <LoadingSpinner isLoading={true} />;
  }

  if (!selectedTenantId) {
    return <div style={{ padding: 24 }}>{t("admin.table.pleaseSelectTenant")}</div>;
  }

  // Common label style for better contrast on admin
  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 4,
    fontSize: "clamp(13px, 3vw, 14px)",
    fontWeight: 600,
    color: "#333",
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(24px, 5vw, 32px)", flexWrap: "wrap", gap: 16 }}>
        <h1 style={{
          fontSize: "clamp(20px, 4vw, 28px)",
          fontWeight: 700,
          fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#e0e0ff",
          margin: 0,
          textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        }}>
          {t("admin.places")}
        </h1>
        
        {/* Action buttons */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {(isCreating || editingId) ? (
            <>
              <button
                onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                style={{
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(40, 167, 69, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(40, 167, 69, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(40, 167, 69, 0.3)";
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
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(108, 117, 125, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#5a6268";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(108, 117, 125, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#6c757d";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(108, 117, 125, 0.3)";
                }}
              >
                {t("common.cancel")}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setEditingId(null);
                setIsCreating(true);
                resetForm();
              }}
              style={{
                padding: "12px 24px",
                background: "white",
                color: "#667eea",
                border: "2px solid #667eea",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 700,
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.2)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.3)";
                e.currentTarget.style.background = "#f8f8ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.2)";
                e.currentTarget.style.background = "white";
              }}
            >
              + {t("admin.forms.newPlace")}
            </button>
          )}
        </div>
      </div>


      {(isCreating || editingId) && (
        <div style={{ 
          padding: "clamp(24px, 5vw, 32px)", 
          background: "white", 
          borderRadius: 16, 
          marginBottom: 32, 
          boxShadow: "0 8px 24px rgba(102, 126, 234, 0.15)",
          border: "1px solid rgba(102, 126, 234, 0.1)",
        }}>
          <h2 style={{ 
            marginBottom: 24, 
            color: "#667eea",
            fontSize: "clamp(20px, 5vw, 24px)",
            fontWeight: 700,
            fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            {editingId ? t("admin.forms.editPlace") : t("admin.forms.newPlace")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Category, Town, PriceBand Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
              <div>
                <CategoryAutocomplete
                  categories={categories}
                  selectedCategoryId={formData.categoryId}
                  onChange={(categoryId) => setFormData({ ...formData, categoryId })}
                  placeholder={t("admin.selectCategory")}
                  label={t("admin.categories")}
                  required
                  error={formErrors.categoryId}
                />
              </div>
              <div>
                <label style={{ 
                  display: "block", 
                  marginBottom: 8,
                  color: "#667eea",
                  fontWeight: 600,
                  fontSize: "clamp(13px, 3vw, 14px)",
                }}>
                  {t("admin.towns")}
                </label>
                <select
                  value={formData.townId}
                  onChange={(e) => setFormData({ ...formData, townId: e.target.value })}
                  style={{ 
                    width: "100%", 
                    padding: "12px 16px",
                    fontSize: 15,
                    border: "2px solid #e0e7ff",
                    borderRadius: 8,
                    outline: "none",
                    transition: "all 0.3s ease",
                    fontFamily: "inherit",
                    background: "white",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#667eea";
                    e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e0e7ff";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="">{t("admin.selectTown")}</option>
                  {towns.map((town) => (
                    <option key={town.id} value={town.id}>
                      {town.translations.find((t: any) => t.lang === "hu")?.name || town.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ 
                  display: "block", 
                  marginBottom: 8,
                  color: "#667eea",
                  fontWeight: 600,
                  fontSize: "clamp(13px, 3vw, 14px)",
                }}>
                  {t("admin.priceBands")}
                </label>
                <select
                  value={formData.priceBandId}
                  onChange={(e) => setFormData({ ...formData, priceBandId: e.target.value })}
                  style={{ 
                    width: "100%", 
                    padding: "12px 16px",
                    fontSize: 15,
                    border: "2px solid #e0e7ff",
                    borderRadius: 8,
                    outline: "none",
                    transition: "all 0.3s ease",
                    fontFamily: "inherit",
                    background: "white",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#667eea";
                    e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e0e7ff";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="">{t("admin.selectPriceBand")}</option>
                  {priceBands.map((pb) => (
                    <option key={pb.id} value={pb.id}>
                      {pb.translations.find((t: any) => t.lang === "hu")?.name || pb.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <TagAutocomplete
                tags={tags}
                selectedTagIds={formData.tagIds}
                onChange={(tagIds) => setFormData({ ...formData, tagIds })}
              />
            </div>

          <LanguageAwareForm>
            {(selectedLang) => (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Name */}
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: 8,
                    color: ((selectedLang === "hu" && formErrors.nameHu) ||
                            (selectedLang === "en" && formErrors.nameEn) ||
                            (selectedLang === "de" && formErrors.nameDe)) ? "#dc2626" : "#333",
                    fontWeight: 600,
                    fontSize: "clamp(13px, 3vw, 14px)",
                  }}>
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
                      padding: "12px 16px",
                      fontSize: 15,
                      border:
                        ((selectedLang === "hu" && formErrors.nameHu) ||
                        (selectedLang === "en" && formErrors.nameEn) ||
                        (selectedLang === "de" && formErrors.nameDe))
                          ? "2px solid #fca5a5"
                          : "2px solid #e0e7ff",
                      borderRadius: 8,
                      outline: "none",
                      transition: "all 0.3s ease",
                      fontFamily: "inherit",
                      background: ((selectedLang === "hu" && formErrors.nameHu) ||
                                   (selectedLang === "en" && formErrors.nameEn) ||
                                   (selectedLang === "de" && formErrors.nameDe)) ? "#fef2f2" : "white",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      const hasError = (selectedLang === "hu" && formErrors.nameHu) ||
                                       (selectedLang === "en" && formErrors.nameEn) ||
                                       (selectedLang === "de" && formErrors.nameDe);
                      if (!hasError) {
                        e.target.style.borderColor = "#667eea";
                        e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                      }
                    }}
                    onBlur={(e) => {
                      const hasError = (selectedLang === "hu" && formErrors.nameHu) ||
                                       (selectedLang === "en" && formErrors.nameEn) ||
                                       (selectedLang === "de" && formErrors.nameDe);
                      e.target.style.borderColor = hasError ? "#fca5a5" : "#e0e7ff";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  {((selectedLang === "hu" && formErrors.nameHu) ||
                    (selectedLang === "en" && formErrors.nameEn) ||
                    (selectedLang === "de" && formErrors.nameDe)) && (
                    <div style={{ color: "#dc2626", fontSize: 13, marginTop: 6, fontWeight: 500 }}>
                      {selectedLang === "hu"
                        ? formErrors.nameHu
                        : selectedLang === "en"
                        ? formErrors.nameEn
                        : formErrors.nameDe}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>{t("admin.shortDescription") || "Rövid leírás (lista oldal)"}</label>
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
                    uploadFolder="editor/places"
                  />
                  <small style={{ color: "#666", fontSize: 12, marginTop: 4, display: "block" }}>
                    {t("admin.shortDescriptionHint") || "Ez a mező jelenik meg a lista oldali kártyákon"}
                  </small>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>{t("common.description")}</label>
                  <TipTapEditorWithUpload
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
                    uploadFolder="editor/places"
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>{t("common.openingHoursEditor")}</label>
                  <OpeningHoursEditor
                    value={formData.openingHours}
                    onChange={(hours) => setFormData({ ...formData, openingHours: hours })}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>{t("public.accessibility")}</label>
                  <TipTapEditorWithUpload
                    value={
                      selectedLang === "hu"
                        ? formData.accessibilityHu
                        : selectedLang === "en"
                        ? formData.accessibilityEn
                        : formData.accessibilityDe
                    }
                    onChange={(value) => {
                      if (selectedLang === "hu") setFormData({ ...formData, accessibilityHu: value });
                      else if (selectedLang === "en") setFormData({ ...formData, accessibilityEn: value });
                      else setFormData({ ...formData, accessibilityDe: value });
                    }}
                    placeholder={t("public.accessibility")}
                    height={150}
                    uploadFolder="editor/places"
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
                  <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 600, color: "#667eea", fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                    🔍 SEO {t("admin.settings")}
                  </h3>
                  
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>SEO {t("common.title")}</label>
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
                    <small style={{ color: "#666", fontSize: 12, marginTop: 4, display: "block" }}>
                      {t("admin.seoTitleHint") || "If empty, place name will be used"}
                    </small>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>SEO {t("common.description")}</label>
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
                    <small style={{ color: "#666", fontSize: 12, marginTop: 4, display: "block" }}>
                      {t("admin.seoDescriptionHint") || "If empty, first 2 sentences from description will be used"}
                    </small>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>SEO {t("common.image")}</label>
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
                      placeholder={t("admin.seoImagePlaceholder") || "SEO image URL (leave empty for hero image)"}
                      style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                    <small style={{ color: "#666", fontSize: 12, marginTop: 4, display: "block" }}>
                      {t("admin.seoImageHint") || "If empty, hero image will be used"}
                    </small>
                  </div>

                  <div style={{ marginBottom: 0 }}>
                    <label style={labelStyle}>SEO Keywords</label>
                    <input
                      type="text"
                      value={
                        selectedLang === "hu"
                          ? formData.seoKeywordsHu.join(", ")
                          : selectedLang === "en"
                          ? formData.seoKeywordsEn.join(", ")
                          : formData.seoKeywordsDe.join(", ")
                      }
                      onChange={(e) => {
                        const keywords = e.target.value.split(",").map(k => k.trim()).filter(Boolean);
                        if (selectedLang === "hu") setFormData({ ...formData, seoKeywordsHu: keywords });
                        else if (selectedLang === "en") setFormData({ ...formData, seoKeywordsEn: keywords });
                        else setFormData({ ...formData, seoKeywordsDe: keywords });
                      }}
                      placeholder={t("admin.seoKeywordsPlaceholder") || "keyword1, keyword2, keyword3"}
                      style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                    />
                    <small style={{ color: "#666", fontSize: 12, marginTop: 4, display: "block" }}>
                      {t("admin.seoKeywordsHint") || "Comma-separated keywords for search engines"}
                    </small>
                  </div>
                </div>
              </div>
            )}
          </LanguageAwareForm>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Bal oszlop: Telefon, Email, Website, Facebook, WhatsApp */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>📱 {t("public.phone")}</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+36 30 123 4567"
                  style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={labelStyle}>✉️ {t("public.email")}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@example.com"
                  style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={labelStyle}>🌐 {t("public.website")}</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                  style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={labelStyle}>📘 Facebook</label>
                <input
                  type="url"
                  value={formData.facebook}
                  onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                  placeholder="https://facebook.com/yourpage"
                  style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={labelStyle}>💬 WhatsApp</label>
                <input
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+36 30 123 4567"
                  style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                />
              </div>
            </div>

            {/* Jobb oszlop: Térkép és koordináták */}
            <div>
              <label style={{ ...labelStyle, marginBottom: 8 }}>{t("admin.location")} ({t("admin.coordinates")})</label>
              <div style={{ marginBottom: 16 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: 14 }}>{t("admin.latitude")}</label>
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
                  <label style={{ ...labelStyle, fontSize: 14 }}>{t("admin.longitude")}</label>
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

          {/* Hero kép teljes szélességben */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t("admin.heroImageUrl")}</label>
            <input
              type="url"
              value={formData.heroImage}
              onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
              style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>

          <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <span style={{ color: "#333", fontWeight: 500 }}>{t("common.active")}</span>
            </label>
          </div>
        </div>
        </div>
      )}

      <LoadingSpinner isLoading={isLoading} />
      {!isLoading && !isCreating && !editingId && (
        <AdminResponsiveTable<Place>
          data={places}
          getItemId={(place) => place.id}
          searchQuery={searchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.places")}
          onSearchChange={(query) => {
            setSearchQuery(query);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          filterFn={(place, query) => {
            const lowerQuery = query.toLowerCase();
            const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
            const translation = place.translations.find((t) => t.lang === currentLang) || 
                               place.translations.find((t) => t.lang === "hu");
            const categoryTranslation = place.category.translations.find((t) => t.lang === currentLang) || 
                                       place.category.translations.find((t) => t.lang === "hu");
            const townTranslation = place.town?.translations.find((t) => t.lang === currentLang) || 
                                   place.town?.translations.find((t) => t.lang === "hu");
            return (
              translation?.name.toLowerCase().includes(lowerQuery) ||
              categoryTranslation?.name.toLowerCase().includes(lowerQuery) ||
              townTranslation?.name.toLowerCase().includes(lowerQuery)
            );
          }}
          columns={[
            {
              key: "name",
              label: t("common.name"),
              render: (place) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation = place.translations.find((t) => t.lang === currentLang) || 
                                   place.translations.find((t) => t.lang === "hu");
                return translation?.name || "-";
              },
            },
            {
              key: "category",
              label: t("admin.categories"),
              render: (place) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const categoryTranslation = place.category.translations.find((t) => t.lang === currentLang) || 
                                           place.category.translations.find((t) => t.lang === "hu");
                return categoryTranslation?.name || "-";
              },
            },
            {
              key: "town",
              label: t("admin.towns"),
              render: (place) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const townTranslation = place.town?.translations.find((t) => t.lang === currentLang) || 
                                       place.town?.translations.find((t) => t.lang === "hu");
                return townTranslation?.name || "-";
              },
            },
            {
              key: "status",
              label: t("admin.table.status"),
              render: (place) => (
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: place.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {place.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          cardTitle={(place) => {
            const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
            const translation = place.translations.find((t) => t.lang === currentLang) || 
                               place.translations.find((t) => t.lang === "hu");
            return translation?.name || "-";
          }}
          cardSubtitle={(place) => {
            const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
            const categoryTranslation = place.category.translations.find((t) => t.lang === currentLang) || 
                                       place.category.translations.find((t) => t.lang === "hu");
            return categoryTranslation?.name || "-";
          }}
          cardFields={[
            {
              key: "town",
              render: (place) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const townTranslation = place.town?.translations.find((t) => t.lang === currentLang) || 
                                       place.town?.translations.find((t) => t.lang === "hu");
                return townTranslation ? (
                  <div style={{ color: "#666", fontSize: 14, marginBottom: 8 }}>
                    📍 {townTranslation.name}
                  </div>
                ) : null;
              },
            },
            {
              key: "status",
              render: (place) => (
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: place.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {place.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          onEdit={startEdit}
          onDelete={(place) => handleDelete(place.id)}
          isLoading={isLoading}
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


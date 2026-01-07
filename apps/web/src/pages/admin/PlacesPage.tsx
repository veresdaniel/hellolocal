// src/pages/admin/PlacesPage.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAdminTenant } from "../../contexts/AdminTenantContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { getPlaces, createPlace, updatePlace, deletePlace, getCategories, getTowns, getPriceBands, getTags } from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditor } from "../../components/TipTapEditor";
import { TagAutocomplete } from "../../components/TagAutocomplete";
import { MapComponent } from "../../components/MapComponent";

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
  tags: Array<{ tag: { translations: Array<{ lang: string; name: string }> } }>;
  translations: Array<{
    lang: string;
    name: string;
    teaser: string | null;
    description: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    openingHours: string | null;
    accessibility: string | null;
  }>;
}

export function PlacesPage() {
  const { t, i18n } = useTranslation();
  const { selectedTenantId } = useAdminTenant();
  usePageTitle("admin.places");
  const [places, setPlaces] = useState<Place[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [towns, setTowns] = useState<any[]>([]);
  const [priceBands, setPriceBands] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    teaserHu: "",
    teaserEn: "",
    teaserDe: "",
    descriptionHu: "",
    descriptionEn: "",
    descriptionDe: "",
    addressHu: "",
    addressEn: "",
    addressDe: "",
    phone: "",
    email: "",
    website: "",
    openingHoursHu: "",
    openingHoursEn: "",
    openingHoursDe: "",
    accessibilityHu: "",
    accessibilityEn: "",
    accessibilityDe: "",
    heroImage: "",
    lat: "",
    lng: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedTenantId) {
      loadData();
    }
  }, [selectedTenantId]);

  const loadData = async () => {
    if (!selectedTenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [placesData, categoriesData, townsData, priceBandsData, tagsData] = await Promise.all([
        getPlaces(selectedTenantId),
        getCategories(selectedTenantId),
        getTowns(selectedTenantId),
        getPriceBands(selectedTenantId),
        getTags(selectedTenantId),
      ]);
      setPlaces(placesData);
      setCategories(categoriesData);
      setTowns(townsData);
      setPriceBands(priceBandsData);
      setTags(tagsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
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
      await createPlace({
        tenantId: selectedTenantId,
        categoryId: formData.categoryId,
        townId: formData.townId || null,
        priceBandId: formData.priceBandId || null,
        tagIds: formData.tagIds,
        translations: (() => {
          const translations = [
            {
              lang: "hu" as const,
              name: formData.nameHu,
              teaser: formData.teaserHu || null,
              description: formData.descriptionHu || null,
              address: formData.addressHu || null,
              phone: formData.phone || null,
              email: formData.email || null,
              website: formData.website || null,
              openingHours: formData.openingHoursHu || null,
              accessibility: formData.accessibilityHu || null,
            },
          ];
          if (formData.nameEn.trim()) {
            translations.push({
              lang: "en" as const,
              name: formData.nameEn,
              teaser: formData.teaserEn || null,
              description: formData.descriptionEn || null,
              address: formData.addressEn || null,
              phone: formData.phone || null,
              email: formData.email || null,
              website: formData.website || null,
              openingHours: formData.openingHoursEn || null,
              accessibility: formData.accessibilityEn || null,
            });
          }
          if (formData.nameDe.trim()) {
            translations.push({
              lang: "de" as const,
              name: formData.nameDe,
              teaser: formData.teaserDe || null,
              description: formData.descriptionDe || null,
              address: formData.addressDe || null,
              phone: formData.phone || null,
              email: formData.email || null,
              website: formData.website || null,
              openingHours: formData.openingHoursDe || null,
              accessibility: formData.accessibilityDe || null,
            });
          }
          return translations;
        })(),
        heroImage: formData.heroImage || null,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        isActive: formData.isActive,
      });
      setIsCreating(false);
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create place");
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
            const translations = [
              {
                lang: "hu" as const,
                name: formData.nameHu,
                teaser: formData.teaserHu || null,
                description: formData.descriptionHu || null,
                address: formData.addressHu || null,
                phone: formData.phone || null,
                email: formData.email || null,
                website: formData.website || null,
                openingHours: formData.openingHoursHu || null,
                accessibility: formData.accessibilityHu || null,
              },
            ];
            if (formData.nameEn.trim()) {
              translations.push({
                lang: "en" as const,
                name: formData.nameEn,
                teaser: formData.teaserEn || null,
                description: formData.descriptionEn || null,
                address: formData.addressEn || null,
                phone: formData.phone || null,
                email: formData.email || null,
                website: formData.website || null,
                openingHours: formData.openingHoursEn || null,
                accessibility: formData.accessibilityEn || null,
              });
            }
            if (formData.nameDe.trim()) {
              translations.push({
                lang: "de" as const,
                name: formData.nameDe,
                teaser: formData.teaserDe || null,
                description: formData.descriptionDe || null,
                address: formData.addressDe || null,
                phone: formData.phone || null,
                email: formData.email || null,
                website: formData.website || null,
                openingHours: formData.openingHoursDe || null,
                accessibility: formData.accessibilityDe || null,
              });
            }
            return translations;
          })(),
          heroImage: formData.heroImage || null,
          lat: formData.lat ? parseFloat(formData.lat) : null,
          lng: formData.lng ? parseFloat(formData.lng) : null,
          isActive: formData.isActive,
        },
        selectedTenantId || undefined
      );
      setEditingId(null);
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update place");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this place?")) return;

    try {
      await deletePlace(id, selectedTenantId || undefined);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete place");
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
      teaserHu: hu?.teaser || "",
      teaserEn: en?.teaser || "",
      teaserDe: de?.teaser || "",
      descriptionHu: hu?.description || "",
      descriptionEn: en?.description || "",
      descriptionDe: de?.description || "",
      addressHu: hu?.address || "",
      addressEn: en?.address || "",
      addressDe: de?.address || "",
      phone: hu?.phone || "",
      email: hu?.email || "",
      website: hu?.website || "",
      openingHoursHu: hu?.openingHours || "",
      openingHoursEn: en?.openingHours || "",
      openingHoursDe: de?.openingHours || "",
      accessibilityHu: hu?.accessibility || "",
      accessibilityEn: en?.accessibility || "",
      accessibilityDe: de?.accessibility || "",
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
      teaserHu: "",
      teaserEn: "",
      teaserDe: "",
      descriptionHu: "",
      descriptionEn: "",
      descriptionDe: "",
      addressHu: "",
      addressEn: "",
      addressDe: "",
      phone: "",
      email: "",
      website: "",
      openingHoursHu: "",
      openingHoursEn: "",
      openingHoursDe: "",
      accessibilityHu: "",
      accessibilityEn: "",
      accessibilityDe: "",
      heroImage: "",
      lat: "",
      lng: "",
      isActive: true,
    });
    setFormErrors({});
  };

  if (!selectedTenantId) {
    return <div style={{ padding: 24 }}>Please select a tenant</div>;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>Places</h1>
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
          + {t("admin.forms.newPlace")}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4 }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ padding: 24, background: "white", borderRadius: 8, marginBottom: 24, border: "1px solid #ddd" }}>
          <h2 style={{ marginBottom: 16 }}>{editingId ? t("admin.forms.editPlace") : t("admin.forms.newPlace")}</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.categories")} *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                style={{
                  width: "100%",
                  padding: 8,
                  fontSize: 16,
                  border: formErrors.categoryId ? "1px solid #dc3545" : "1px solid #ddd",
                  borderRadius: 4,
                }}
              >
                <option value="">{t("admin.selectCategory")}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.translations.find((t: any) => t.lang === "hu")?.name || cat.id}
                  </option>
                ))}
              </select>
              {formErrors.categoryId && <div style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>{formErrors.categoryId}</div>}
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.towns")}</label>
              <select
                value={formData.townId}
                onChange={(e) => setFormData({ ...formData, townId: e.target.value })}
                style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
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
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.priceBands")}</label>
              <select
                value={formData.priceBandId}
                onChange={(e) => setFormData({ ...formData, priceBandId: e.target.value })}
                style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
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

          <div style={{ marginBottom: 16 }}>
            <TagAutocomplete
              tags={tags}
              selectedTagIds={formData.tagIds}
              onChange={(tagIds) => setFormData({ ...formData, tagIds })}
            />
          </div>

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
                  <label style={{ display: "block", marginBottom: 4 }}>{t("public.openingHours")}</label>
                  <TipTapEditor
                    value={
                      selectedLang === "hu"
                        ? formData.openingHoursHu
                        : selectedLang === "en"
                        ? formData.openingHoursEn
                        : formData.openingHoursDe
                    }
                    onChange={(value) => {
                      if (selectedLang === "hu") setFormData({ ...formData, openingHoursHu: value });
                      else if (selectedLang === "en") setFormData({ ...formData, openingHoursEn: value });
                      else setFormData({ ...formData, openingHoursDe: value });
                    }}
                    placeholder={t("public.openingHours")}
                    height={150}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>{t("public.accessibility")}</label>
                  <TipTapEditor
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
                  />
                </div>
              </>
            )}
          </LanguageAwareForm>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4 }}>{t("public.phone")}</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4 }}>{t("public.email")}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4 }}>{t("public.website")}</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8 }}>{t("admin.location")} ({t("admin.coordinates")})</label>
            <MapComponent
              latitude={formData.lat ? parseFloat(formData.lat) : null}
              longitude={formData.lng ? parseFloat(formData.lng) : null}
              onLocationChange={(lat, lng) => {
                setFormData({ ...formData, lat: lat.toString(), lng: lng.toString() });
              }}
              height={300}
              interactive={true}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
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

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4 }}>{t("admin.heroImageUrl")}</label>
            <input
              type="url"
              value={formData.heroImage}
              onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
              style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
            />
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
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.categories")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.towns")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.table.status")}</th>
                <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #ddd", width: "1%", whiteSpace: "nowrap" }}>{t("admin.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {places.map((place) => {
                // Get current language or fallback to Hungarian
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation = place.translations.find((t) => t.lang === currentLang) || 
                                   place.translations.find((t) => t.lang === "hu");
                const categoryTranslation = place.category.translations.find((t) => t.lang === currentLang) || 
                                           place.category.translations.find((t) => t.lang === "hu");
                const townTranslation = place.town?.translations.find((t) => t.lang === currentLang) || 
                                       place.town?.translations.find((t) => t.lang === "hu");
                return (
                  <tr key={place.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>{translation?.name || "-"}</td>
                    <td style={{ padding: 12 }}>{categoryTranslation?.name || "-"}</td>
                    <td style={{ padding: 12 }}>{townTranslation?.name || "-"}</td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          background: place.isActive ? "#28a745" : "#dc3545",
                          color: "white",
                          fontSize: 12,
                        }}
                      >
                        {place.isActive ? t("common.active") : t("common.inactive")}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => startEdit(place)}
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
                          onClick={() => handleDelete(place.id)}
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
          {places.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", color: "#999" }}>{t("admin.table.noData")}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}


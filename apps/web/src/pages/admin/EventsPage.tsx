// src/pages/admin/EventsPage.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminTenant } from "../../contexts/AdminTenantContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { getEvents, createEvent, updateEvent, deleteEvent, getCategories, getTowns, getPlaces, getTags, type Event, type CreateEventDto } from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TagAutocomplete } from "../../components/TagAutocomplete";
import { MapComponent } from "../../components/MapComponent";
import { TipTapEditor } from "../../components/TipTapEditor";

export function EventsPage() {
  const { t, i18n } = useTranslation();
  const { selectedTenantId } = useAdminTenant();
  const queryClient = useQueryClient();
  usePageTitle("admin.events");
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [towns, setTowns] = useState<any[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    placeId: "",
    categoryId: "",
    tagIds: [] as string[],
    titleHu: "",
    titleEn: "",
    titleDe: "",
    shortDescriptionHu: "",
    shortDescriptionEn: "",
    shortDescriptionDe: "",
    descriptionHu: "",
    descriptionEn: "",
    descriptionDe: "",
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
    startDate: "",
    endDate: "",
    heroImage: "",
    lat: "",
    lng: "",
    isActive: true,
    isPinned: false,
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
      const [eventsData, categoriesData, townsData, placesData, tagsData] = await Promise.all([
        getEvents(selectedTenantId),
        getCategories(selectedTenantId),
        getTowns(selectedTenantId),
        getPlaces(selectedTenantId),
        getTags(selectedTenantId),
      ]);
      setEvents(eventsData);
      setCategories(categoriesData);
      setTowns(townsData);
      setPlaces(placesData);
      setTags(tagsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadEventsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.titleHu.trim()) errors.titleHu = t("admin.validation.hungarianTitleRequired");
    if (!formData.startDate) errors.startDate = t("admin.validation.startDateRequired");
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!selectedTenantId) return;
    if (!validateForm()) return;

    try {
      const translations: CreateEventDto["translations"] = [
        {
          lang: "hu",
          title: formData.titleHu,
          shortDescription: formData.shortDescriptionHu || null,
          description: formData.descriptionHu || null,
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
          description: formData.descriptionEn || null,
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
          description: formData.descriptionDe || null,
          seoTitle: formData.seoTitleDe || null,
          seoDescription: formData.seoDescriptionDe || null,
          seoImage: formData.seoImageDe || null,
          seoKeywords: formData.seoKeywordsDe ? formData.seoKeywordsDe.split(",").map((k) => k.trim()) : [],
        });
      }

      await createEvent({
        tenantId: selectedTenantId,
        placeId: formData.placeId || null,
        categoryId: formData.categoryId || null,
        tagIds: formData.tagIds,
        translations,
        isActive: formData.isActive,
        isPinned: formData.isPinned,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        heroImage: formData.heroImage || null,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
      });
      setIsCreating(false);
      resetForm();
      await loadData();
      // Invalidate and refetch events cache to refresh lists (all languages and tenant combinations)
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await queryClient.refetchQueries({ queryKey: ["events"] });
      // Invalidate individual event cache (all languages)
      await queryClient.invalidateQueries({ queryKey: ["event"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.createEventFailed"));
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validateForm()) return;

    try {
      const translations: CreateEventDto["translations"] = [
        {
          lang: "hu",
          title: formData.titleHu,
          shortDescription: formData.shortDescriptionHu || null,
          description: formData.descriptionHu || null,
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
          description: formData.descriptionEn || null,
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
          description: formData.descriptionDe || null,
          seoTitle: formData.seoTitleDe || null,
          seoDescription: formData.seoDescriptionDe || null,
          seoImage: formData.seoImageDe || null,
          seoKeywords: formData.seoKeywordsDe ? formData.seoKeywordsDe.split(",").map((k) => k.trim()) : [],
        });
      }

      await updateEvent(
        id,
        {
          placeId: formData.placeId || null,
          categoryId: formData.categoryId || null,
          tagIds: formData.tagIds,
          translations,
          isActive: formData.isActive,
          isPinned: formData.isPinned,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          heroImage: formData.heroImage || null,
          lat: formData.lat ? parseFloat(formData.lat) : null,
          lng: formData.lng ? parseFloat(formData.lng) : null,
        },
        selectedTenantId || undefined
      );
      setEditingId(null);
      resetForm();
      await loadData();
      // Invalidate and refetch events cache to refresh lists (all languages and tenant combinations)
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await queryClient.refetchQueries({ queryKey: ["events"] });
      // Invalidate individual event cache (all languages)
      await queryClient.invalidateQueries({ queryKey: ["event"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateEventFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmDeleteEvent"))) return;

    try {
      await deleteEvent(id, selectedTenantId || undefined);
      await loadData();
      // Invalidate and refetch events cache to refresh lists (all languages and tenant combinations)
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await queryClient.refetchQueries({ queryKey: ["events"] });
      // Invalidate individual event cache (all languages)
      await queryClient.invalidateQueries({ queryKey: ["event"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteEventFailed"));
    }
  };

  const startEdit = (event: Event) => {
    setEditingId(event.id);
    const hu = event.translations.find((t) => t.lang === "hu");
    const en = event.translations.find((t) => t.lang === "en");
    const de = event.translations.find((t) => t.lang === "de");
    setFormData({
      placeId: event.placeId || "",
      categoryId: event.categoryId || "",
      tagIds: event.tags.map((et) => et.tag.id),
      titleHu: hu?.title || "",
      titleEn: en?.title || "",
      titleDe: de?.title || "",
      shortDescriptionHu: hu?.shortDescription || "",
      shortDescriptionEn: en?.shortDescription || "",
      shortDescriptionDe: de?.shortDescription || "",
      descriptionHu: hu?.description || "",
      descriptionEn: en?.description || "",
      descriptionDe: de?.description || "",
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
      startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : "",
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
      heroImage: event.heroImage || "",
      lat: event.lat?.toString() || "",
      lng: event.lng?.toString() || "",
      isActive: event.isActive,
      isPinned: event.isPinned,
    });
  };

  const resetForm = () => {
    setFormData({
      placeId: "",
      categoryId: "",
      tagIds: [],
      titleHu: "",
      titleEn: "",
      titleDe: "",
      shortDescriptionHu: "",
      shortDescriptionEn: "",
      shortDescriptionDe: "",
      descriptionHu: "",
      descriptionEn: "",
      descriptionDe: "",
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
      startDate: "",
      endDate: "",
      heroImage: "",
      lat: "",
      lng: "",
      isActive: true,
      isPinned: false,
    });
    setFormErrors({});
  };

  if (!selectedTenantId) {
    return <div style={{ padding: 24 }}>{t("admin.selectTenantFirst")}</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>{t("admin.events")}</h1>
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
          + {t("admin.forms.newEvent")}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4 }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ padding: 24, background: "white", borderRadius: 8, marginBottom: 24, border: "1px solid #ddd" }}>
          <h2 style={{ marginBottom: 16 }}>{editingId ? t("admin.forms.editEvent") : t("admin.forms.newEvent")}</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.places")}</label>
              <select
                value={formData.placeId}
                onChange={(e) => setFormData({ ...formData, placeId: e.target.value })}
                style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
              >
                <option value="">{t("admin.selectPlace")}</option>
                {places.map((place) => {
                  const name = place.translations.find((t: any) => t.lang === "hu")?.name || place.id;
                  return (
                    <option key={place.id} value={place.id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.categories")}</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
              >
                <option value="">{t("admin.selectCategory")}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.translations.find((t: any) => t.lang === "hu")?.name || cat.id}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.startDate")} *</label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                style={{
                  width: "100%",
                  padding: 8,
                  fontSize: 16,
                  border: formErrors.startDate ? "1px solid #dc3545" : "1px solid #ddd",
                  borderRadius: 4,
                }}
              />
              {formErrors.startDate && <div style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>{formErrors.startDate}</div>}
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.endDate")}</label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
          </div>

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
                  <label style={{ display: "block", marginBottom: 4 }}>{t("admin.shortDescription")} ({selectedLang.toUpperCase()})</label>
                  <textarea
                    value={
                      selectedLang === "hu"
                        ? formData.shortDescriptionHu
                        : selectedLang === "en"
                        ? formData.shortDescriptionEn
                        : formData.shortDescriptionDe
                    }
                    onChange={(e) => {
                      if (selectedLang === "hu") setFormData({ ...formData, shortDescriptionHu: e.target.value });
                      else if (selectedLang === "en") setFormData({ ...formData, shortDescriptionEn: e.target.value });
                      else setFormData({ ...formData, shortDescriptionDe: e.target.value });
                    }}
                    style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4, minHeight: 60 }}
                    placeholder={t("admin.shortDescriptionPlaceholder")}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>{t("common.description")} ({selectedLang.toUpperCase()})</label>
                  <TipTapEditor
                    value={
                      selectedLang === "hu"
                        ? formData.descriptionHu
                        : selectedLang === "en"
                        ? formData.descriptionEn
                        : formData.descriptionDe
                    }
                    onChange={(html) => {
                      if (selectedLang === "hu") setFormData({ ...formData, descriptionHu: html });
                      else if (selectedLang === "en") setFormData({ ...formData, descriptionEn: html });
                      else setFormData({ ...formData, descriptionDe: html });
                    }}
                  />
                </div>
              </>
            )}
          </LanguageAwareForm>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4 }}>{t("admin.heroImage")}</label>
            <input
              type="text"
              value={formData.heroImage}
              onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
              style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
              placeholder="URL"
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

          <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              {t("common.active")}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={formData.isPinned}
                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
              />
              {t("admin.isPinned")}
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
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("common.title")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.startDate")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.place")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.table.status")}</th>
                <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #ddd", width: "1%", whiteSpace: "nowrap" }}>{t("admin.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation = event.translations.find((t) => t.lang === currentLang) || 
                                   event.translations.find((t) => t.lang === "hu");
                return (
                  <tr key={event.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>
                      {event.isPinned && <span style={{ marginRight: 8 }}>📌</span>}
                      {translation?.title || "-"}
                    </td>
                    <td style={{ padding: 12 }}>
                      {new Date(event.startDate).toLocaleDateString(currentLang === "hu" ? "hu-HU" : currentLang === "de" ? "de-DE" : "en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={{ padding: 12 }}>
                      {event.place ? (
                        event.place.translations.find((t) => t.lang === currentLang)?.name || 
                        event.place.translations[0]?.name || 
                        "-"
                      ) : "-"}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          background: event.isActive ? "#28a745" : "#dc3545",
                          color: "white",
                          fontSize: 12,
                        }}
                      >
                        {event.isActive ? t("common.active") : t("common.inactive")}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => startEdit(event)}
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
                          onClick={() => handleDelete(event.id)}
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
          {events.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", color: "#999" }}>
              {t("admin.table.noData")}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}


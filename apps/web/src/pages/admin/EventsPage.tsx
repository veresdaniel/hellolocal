// src/pages/admin/EventsPage.tsx
import { useState, useEffect, useContext } from "react";
import { appendExtraLanguages, patchLang, readLang } from "../../utils/langFields";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAdminSite } from "../../contexts/useAdminSite";
import { usePageTitle } from "../../hooks/usePageTitle";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import { useConfirm } from "../../hooks/useConfirm";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Pagination } from "../../components/Pagination";
import {
  AdminResponsiveTable,
  type TableColumn,
  type CardField,
} from "../../components/AdminResponsiveTable";
import { AdminHierarchyFilters } from "../../components/AdminHierarchyFilters";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getCategories,
  getTowns,
  getPlaces,
  getTags,
  getMyPlaces,
  getSiteMemberships,
  type Event,
  type CreateEventDto,
} from "../../api/admin.api";
import { AuthContext } from "../../contexts/AuthContext";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TagAutocomplete } from "../../components/TagAutocomplete";
import { CategoryAutocomplete } from "../../components/CategoryAutocomplete";
import { MapComponent } from "../../components/MapComponent";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { AiPostfixField } from "../../components/AiGeneratePostfixButton";
import { AiAssistantPanel } from "../../components/AiAssistantPanel";
import { SlugInput } from "../../components/SlugInput";
import { useAdminHierarchyFilters } from "../../hooks/useAdminHierarchyFilters";
import { findTranslation } from "../../utils/langHelpers";
import { isValidGaMeasurementIdInput } from "../../lib/gaMeasurementId";
import type { Lang } from "../../types/enums";
import { buildPublicUrl } from "../../app/urls";
import { useToast } from "../../contexts/ToastContext";

export function EventsPage() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedSiteId, isLoading: isSiteLoading } = useAdminSite();
  const hierarchy = useAdminHierarchyFilters();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  usePageTitle("admin.events");
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [towns, setTowns] = useState<any[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [myPlaces, setMyPlaces] = useState<any[]>([]);
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);
  const [swipedCardId, setSwipedCardId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(() => {
    // Check URL on initial mount
    const params = new URLSearchParams(window.location.search);
    return params.get("new") === "true";
  });
  const [formData, setFormData] = useState({
    placeId: "",
    categoryId: "",
    categoryIds: [] as string[], // For multiple category selection
    tagIds: [] as string[],
    titleHu: "",
    titleEn: "",
    titleDe: "",
    slugHu: "",
    slugEn: "",
    slugDe: "",
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
    phone: "",
    email: "",
    website: "",
    facebook: "",
    whatsapp: "",
    startDate: "",
    endDate: "",
    heroImage: "",
    lat: "",
    lng: "",
    isActive: true,
    isPinned: false,
    isRainSafe: false,
    showOnMap: true,
    gaMeasurementId: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedSiteId) {
      // Reset to first page when site changes
      setPagination((prev) => ({ ...prev, page: 1 }));
    } else {
      // Reset loading state if no site
      setIsLoading(false);
    }
  }, [selectedSiteId]);

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, pagination.page, pagination.limit, hierarchy.placeId, hierarchy.townId]);

  // Load my places and check site admin role for RBAC filtering
  useEffect(() => {
    if (selectedSiteId && currentUser) {
      loadMyPlaces();
      checkSiteAdminRole();
    }
  }, [selectedSiteId, currentUser?.id]);

  const checkSiteAdminRole = async () => {
    if (!selectedSiteId || !currentUser) return;
    try {
      const memberships = await getSiteMemberships(selectedSiteId, currentUser.id);
      const membership = memberships.find(
        (m) => m.siteId === selectedSiteId && m.userId === currentUser.id
      );
      setIsSiteAdmin(membership?.role === "siteadmin" || false);
    } catch (err) {
      console.error("Failed to check site admin role", err);
      setIsSiteAdmin(false);
    }
  };

  // Reload places when they might have changed (e.g., after creating/updating a place)
  // Listen for global cache events
  useEffect(() => {
    const handlePlacesChanged = () => {
      if (selectedSiteId) {
        // Reload only places, not all data
        loadPlacesForDropdown();
        if (currentUser) {
          loadMyPlaces();
        }
      }
    };

    window.addEventListener("admin:places:changed", handlePlacesChanged);
    return () => {
      window.removeEventListener("admin:places:changed", handlePlacesChanged);
    };
  }, [selectedSiteId, currentUser?.id]);

  const loadMyPlaces = async () => {
    if (!selectedSiteId || !currentUser) return;
    try {
      const data = await getMyPlaces(selectedSiteId);
      setMyPlaces(data);
    } catch (err) {
      console.error("Failed to load my places", err);
      setMyPlaces([]);
    }
  };

  const loadPlacesForDropdown = async () => {
    if (!selectedSiteId) return;
    try {
      const response = await getPlaces(selectedSiteId);
      const allPlaces = Array.isArray(response) ? response : response?.places || [];
      setPlaces(allPlaces);
    } catch (err) {
      console.error("Failed to load places", err);
    }
  };

  const loadData = async () => {
    if (!selectedSiteId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Town filter is server-side (townId) so pagination is accurate (no under-fetch).
      const [eventsResponse, categoriesResponse, townsResponse, placesResponse, tagsResponse] =
        await Promise.all([
          getEvents(
            selectedSiteId,
            pagination.page,
            pagination.limit,
            hierarchy.placeId || undefined,
            !hierarchy.placeId && hierarchy.townId ? hierarchy.townId : undefined
          ),
          getCategories(selectedSiteId),
          getTowns(selectedSiteId),
          getPlaces(selectedSiteId),
          getTags(selectedSiteId),
        ]);
      // Backend always returns paginated response now
      if (Array.isArray(eventsResponse)) {
        // Fallback for backward compatibility (should not happen)
        setEvents(eventsResponse);
        const total = eventsResponse.length;
        const limit = pagination.limit;
        setPagination((prev) => ({
          ...prev,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        }));
      } else {
        setEvents(eventsResponse.events || []);
        const paginationData = eventsResponse.pagination;
        if (paginationData) {
          // Ensure totalPages is calculated if missing or incorrect
          const total = paginationData.total || 0;
          const limit = paginationData.limit || pagination.limit || 10;
          const calculatedTotalPages = Math.ceil(total / limit) || 1;
          const totalPages = paginationData.totalPages || calculatedTotalPages;

          setPagination({
            page: paginationData.page || pagination.page || 1,
            limit,
            total,
            totalPages: totalPages > 0 ? totalPages : calculatedTotalPages,
          });
        } else {
          // Fallback: calculate from events array length
          const events = eventsResponse.events || [];
          const total = events.length;
          const limit = pagination.limit;
          setPagination((prev) => ({
            ...prev,
            total,
            totalPages: Math.ceil(total / limit) || 1,
          }));
        }
      }
      // Handle paginated responses for categories, towns, places, tags (used in dropdowns)
      setCategories(
        Array.isArray(categoriesResponse)
          ? categoriesResponse
          : categoriesResponse?.categories || []
      );
      setTowns(Array.isArray(townsResponse) ? townsResponse : townsResponse?.towns || []);
      const allPlaces = Array.isArray(placesResponse)
        ? placesResponse
        : placesResponse?.places || [];
      setPlaces(allPlaces);

      // Load my places for RBAC filtering
      if (currentUser) {
        loadMyPlaces();
      }
      setTags(Array.isArray(tagsResponse) ? tagsResponse : tagsResponse?.tags || []);
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
    if (!isValidGaMeasurementIdInput(formData.gaMeasurementId)) {
      errors.gaMeasurementId = t("admin.googleAnalytics.invalidId");
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!selectedSiteId) return;
    if (!validateForm()) return;

    try {
      const translations: CreateEventDto["translations"] = [
        {
          lang: "hu",
          title: formData.titleHu,
          shortDescription: formData.shortDescriptionHu || null,
          description: formData.descriptionHu || null,
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
          facebook: formData.facebook || null,
          whatsapp: formData.whatsapp || null,
          seoTitle: formData.seoTitleHu || null,
          seoDescription: formData.seoDescriptionHu || null,
          seoImage: formData.seoImageHu || null,
          seoKeywords: formData.seoKeywordsHu
            ? formData.seoKeywordsHu.split(",").map((k) => k.trim())
            : [],
        },
      ];
      if (formData.titleEn.trim()) {
        translations.push({
          lang: "en",
          title: formData.titleEn,
          shortDescription: formData.shortDescriptionEn || null,
          description: formData.descriptionEn || null,
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
          facebook: formData.facebook || null,
          whatsapp: formData.whatsapp || null,
          seoTitle: formData.seoTitleEn || null,
          seoDescription: formData.seoDescriptionEn || null,
          seoImage: formData.seoImageEn || null,
          seoKeywords: formData.seoKeywordsEn
            ? formData.seoKeywordsEn.split(",").map((k) => k.trim())
            : [],
        });
      }
      if (formData.titleDe.trim()) {
        translations.push({
          lang: "de",
          title: formData.titleDe,
          shortDescription: formData.shortDescriptionDe || null,
          description: formData.descriptionDe || null,
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
          facebook: formData.facebook || null,
          whatsapp: formData.whatsapp || null,
          seoTitle: formData.seoTitleDe || null,
          seoDescription: formData.seoDescriptionDe || null,
          seoImage: formData.seoImageDe || null,
          seoKeywords: formData.seoKeywordsDe
            ? formData.seoKeywordsDe.split(",").map((k) => k.trim())
            : [],
        });
      }

      await createEvent({
        siteId: selectedSiteId,
        placeId: formData.placeId || null,
        categoryIds: formData.categoryIds,
        tagIds: formData.tagIds,
        translations,
        isActive: formData.isActive,
        isPinned: formData.isPinned,
        isRainSafe: formData.isRainSafe,
        showOnMap: formData.showOnMap,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        heroImage: formData.heroImage || null,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        gaMeasurementId: formData.gaMeasurementId.trim()
          ? formData.gaMeasurementId.trim().toUpperCase()
          : null,
      });
      setIsCreating(false);
      resetForm();
      await loadData();
      // Notify global cache manager that events have changed
      notifyEntityChanged("events");

      // If we came from dashboard, navigate back to dashboard
      const fromParam = searchParams.get("from");
      if (fromParam === "dashboard") {
        navigate(`/${(i18n.language || "hu").split("-")[0]}/admin`);
        return;
      }
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
          slug: formData.slugHu || null,
          shortDescription: formData.shortDescriptionHu || null,
          description: formData.descriptionHu || null,
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
          facebook: formData.facebook || null,
          whatsapp: formData.whatsapp || null,
          seoTitle: formData.seoTitleHu || null,
          seoDescription: formData.seoDescriptionHu || null,
          seoImage: formData.seoImageHu || null,
          seoKeywords: formData.seoKeywordsHu
            ? formData.seoKeywordsHu.split(",").map((k) => k.trim())
            : [],
        },
      ];
      if (formData.titleEn.trim()) {
        translations.push({
          lang: "en",
          title: formData.titleEn,
          slug: formData.slugEn || null,
          shortDescription: formData.shortDescriptionEn || null,
          description: formData.descriptionEn || null,
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
          facebook: formData.facebook || null,
          whatsapp: formData.whatsapp || null,
          seoTitle: formData.seoTitleEn || null,
          seoDescription: formData.seoDescriptionEn || null,
          seoImage: formData.seoImageEn || null,
          seoKeywords: formData.seoKeywordsEn
            ? formData.seoKeywordsEn.split(",").map((k) => k.trim())
            : [],
        });
      }
      if (formData.titleDe.trim()) {
        translations.push({
          lang: "de",
          title: formData.titleDe,
          slug: formData.slugDe || null,
          shortDescription: formData.shortDescriptionDe || null,
          description: formData.descriptionDe || null,
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
          facebook: formData.facebook || null,
          whatsapp: formData.whatsapp || null,
          seoTitle: formData.seoTitleDe || null,
          seoDescription: formData.seoDescriptionDe || null,
          seoImage: formData.seoImageDe || null,
          seoKeywords: formData.seoKeywordsDe
            ? formData.seoKeywordsDe.split(",").map((k) => k.trim())
            : [],
        });
      }

      await updateEvent(
        id,
        {
          placeId: formData.placeId || null,
          categoryIds: formData.categoryIds,
          tagIds: formData.tagIds,
          translations,
          isActive: formData.isActive,
          isPinned: formData.isPinned,
          isRainSafe: formData.isRainSafe,
          showOnMap: formData.showOnMap,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          heroImage: formData.heroImage || null,
          lat: formData.lat ? parseFloat(formData.lat) : null,
          lng: formData.lng ? parseFloat(formData.lng) : null,
          gaMeasurementId: formData.gaMeasurementId.trim()
            ? formData.gaMeasurementId.trim().toUpperCase()
            : null,
        },
        selectedSiteId || undefined
      );
      setEditingId(null);
      resetForm();
      await loadData();
      // Notify global cache manager that events have changed
      notifyEntityChanged("events");

      // If we came from dashboard, navigate back to dashboard
      const fromParam = searchParams.get("from");
      if (fromParam === "dashboard") {
        navigate(`/${(i18n.language || "hu").split("-")[0]}/admin`);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateEventFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t("admin.confirmations.deleteEvent") || "Delete Event",
      message:
        t("admin.confirmations.deleteEvent") ||
        "Are you sure you want to delete this event? This action cannot be undone.",
      confirmLabel: t("common.delete") || "Delete",
      cancelLabel: t("common.cancel") || "Cancel",
      confirmVariant: "danger",
      size: "medium",
    });

    if (!confirmed) return;

    try {
      await deleteEvent(id, selectedSiteId || undefined);
      await loadData();
      // Notify global cache manager that events have changed
      notifyEntityChanged("events");
      showToast(t("admin.messages.eventDeleted") || "Event deleted successfully", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.deleteEventFailed"), "error");
    }
  };

  const startEdit = (event: Event) => {
    setEditingId(event.id);
    const hu = findTranslation(event.translations, "hu" as Lang);
    const en = findTranslation(event.translations, "en" as Lang);
    const de = findTranslation(event.translations, "de" as Lang);
    setFormData({
      placeId: event.placeId || "",
      categoryId: event.categoryId || "",
      categoryIds:
        event.categories?.map((ec) => ec.category.id) ||
        (event.categoryId ? [event.categoryId] : []),
      tagIds: event.tags.map((et) => et.tag.id),
      titleHu: hu?.title || "",
      titleEn: en?.title || "",
      titleDe: de?.title || "",
      slugHu: hu?.slug || "",
      slugEn: en?.slug || "",
      slugDe: de?.slug || "",
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
      phone: hu?.phone || "",
      email: hu?.email || "",
      website: hu?.website || "",
      facebook: hu?.facebook || "",
      whatsapp: hu?.whatsapp || "",
      startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : "",
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
      heroImage: event.heroImage || "",
      lat: event.lat?.toString() || "",
      lng: event.lng?.toString() || "",
      isActive: event.isActive,
      isPinned: event.isPinned,
      isRainSafe: event.isRainSafe || false,
      showOnMap: event.showOnMap ?? true,
      gaMeasurementId: event.gaMeasurementId || "",
    });
  };

  const resetForm = () => {
    setFormData({
      placeId: "",
      categoryId: "",
      categoryIds: [],
      tagIds: [],
      titleHu: "",
      titleEn: "",
      titleDe: "",
      slugHu: "",
      slugEn: "",
      slugDe: "",
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
      phone: "",
      email: "",
      website: "",
      facebook: "",
      whatsapp: "",
      startDate: "",
      endDate: "",
      heroImage: "",
      lat: "",
      lng: "",
      isActive: true,
      isPinned: false,
      isRainSafe: false,
      showOnMap: true,
      gaMeasurementId: "",
    });
    setFormErrors({});
  };

  // Check for ?new=true query param to auto-open new form
  // Run this early, before data loads, to show form immediately
  useEffect(() => {
    // Check on mount and whenever searchParams change
    const shouldOpenNewForm = searchParams.get("new") === "true" && !isCreating && !editingId;

    if (shouldOpenNewForm) {
      // Set creating state immediately, even if selectedSiteId is not yet loaded
      setIsCreating(true);
      setEditingId(null);
      // Reset form will be called after state is set
      // Use setTimeout to ensure state is updated first
      setTimeout(() => {
        resetForm();
        const placeIdFromUrl = searchParams.get("placeId") || "";
        if (placeIdFromUrl) {
          setFormData((prev) => ({ ...prev, placeId: placeIdFromUrl }));
        }
      }, 0);
      // Remove query param from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("new");
      setSearchParams(newSearchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString(), isCreating, editingId]);

  // Handle ?edit= query param (from hierarchy drill-down)
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && !editingId && !isCreating && events.length > 0) {
      const eventToEdit = events.find((e) => e.id === editId);
      if (eventToEdit) {
        startEdit(eventToEdit);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("edit");
        setSearchParams(newParams, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("edit"), events.length, editingId, isCreating]);

  // Wait for site context to initialize
  if (isSiteLoading) {
    return null;
  }

  if (!selectedSiteId) {
    return <div style={{ padding: 24 }}>{t("admin.table.pleaseSelectSite")}</div>;
  }

  // Hierarchy filters are applied server-side (placeId / townId); search stays client-side.
  const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
  const filteredEvents = events.filter((event) => {
    if (!searchQuery.trim()) return true;
    const translation =
      findTranslation(event.translations, currentLang) ||
      findTranslation(event.translations, "hu" as Lang);
    const searchLower = searchQuery.toLowerCase();
    return (
      translation?.title?.toLowerCase().includes(searchLower) ||
      event.place?.translations
        .find((t) => t.lang === currentLang)
        ?.name?.toLowerCase()
        .includes(searchLower)
    );
  });

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        title={t("admin.events")}
        newButtonLabel={t("admin.forms.newEvent")}
        onNewClick={() => {
          setEditingId(null);
          setIsCreating(true);
          resetForm();
        }}
        showNewButton={!isCreating && !editingId}
        isCreatingOrEditing={isCreating || !!editingId}
        onSave={() => (editingId ? handleUpdate(editingId) : handleCreate())}
        onCancel={() => {
          setIsCreating(false);
          setEditingId(null);
          resetForm();
        }}
        backTo={
          searchParams.get("from") === "dashboard"
            ? `/${(i18n.language || "hu").split("-")[0]}/admin`
            : undefined
        }
        saveLabel={editingId ? t("common.update") : t("common.create")}
      />

      {!isCreating && !editingId && (
        <div style={{ marginBottom: 24 }}>
          <AdminHierarchyFilters
            idPrefix="events-filter"
            requireSite
            allowClearSite={hierarchy.canPickSite}
            siteId={hierarchy.siteId}
            townId={hierarchy.townId}
            placeId={hierarchy.placeId}
            onSiteChange={(next) => {
              hierarchy.setSiteId(next);
              setPagination((prev) => ({ ...prev, page: 1 }));
              setCurrentMobileIndex(0);
            }}
            onTownChange={(next) => {
              hierarchy.setTownId(next);
              setPagination((prev) => ({ ...prev, page: 1 }));
              setCurrentMobileIndex(0);
            }}
            onPlaceChange={(next) => {
              hierarchy.setPlaceId(next);
              setPagination((prev) => ({ ...prev, page: 1 }));
              setCurrentMobileIndex(0);
            }}
            siteOptions={hierarchy.siteOptions}
            townOptions={hierarchy.townOptions}
            placeOptions={hierarchy.placeOptions}
            onClear={() => {
              hierarchy.clearFilters();
              setSearchQuery("");
              setPagination((prev) => ({ ...prev, page: 1 }));
              setCurrentMobileIndex(0);
            }}
            clearDisabled={!hierarchy.filtersActive && !searchQuery.trim()}
          >
            <div className="admin-flist__filter admin-flist__filter--span-2">
              <label htmlFor="events-filter-search">{t("admin.filters.search")}</label>
              <input
                id="events-filter-search"
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentMobileIndex(0);
                }}
                placeholder={t("admin.searchPlaceholders.events")}
              />
            </div>
          </AdminHierarchyFilters>
        </div>
      )}

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
          }}
        >
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div
          style={{
            padding: "clamp(24px, 5vw, 32px)",
            background: "var(--admin-surface)",
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
            {editingId ? t("admin.forms.editEvent") : t("admin.forms.newEvent")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Place and Categories Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: "var(--admin-primary)",
                    fontWeight: 600,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.places")}
                </label>
                <select
                  value={formData.placeId}
                  onChange={(e) => setFormData({ ...formData, placeId: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 15,
                    border: "2px solid var(--admin-primary-border)",
                    borderRadius: 8,
                    outline: "none",
                    transition: "all 0.3s ease",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    background: "var(--admin-surface)",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--admin-primary)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--admin-primary-border)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="">{t("admin.selectPlace")}</option>
                  {(() => {
                    // RBAC: Show only user's places if not superadmin or siteadmin
                    const isSuperadmin = currentUser?.role === "superadmin";
                    const placesToShow = isSuperadmin || isSiteAdmin ? places : myPlaces;

                    if (placesToShow.length === 0 && !isSuperadmin && !isSiteAdmin) {
                      return (
                        <option value="" disabled>
                          {t("admin.noPlacesAvailable")}
                        </option>
                      );
                    }

                    return placesToShow.map((place) => {
                      const huTranslation = place.translations?.find((t: any) => t.lang === "hu");
                      const name = huTranslation?.name || place.translations?.[0]?.name || place.id;
                      return (
                        <option key={place.id} value={place.id}>
                          {name}
                        </option>
                      );
                    });
                  })()}
                </select>
              </div>
              <div>
                <CategoryAutocomplete
                  categories={categories}
                  multiple={true}
                  selectedCategoryIds={formData.categoryIds}
                  onChange={(categoryIds) => setFormData({ ...formData, categoryIds })}
                  placeholder={t("admin.selectCategory")}
                  label={t("admin.categories")}
                />
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
                  <AiAssistantPanel
                    kind="event"
                    lang={selectedLang}
                    siteId={selectedSiteId || undefined}
                    placeId={formData.placeId || undefined}
                    name={readLang(formData, "title", selectedLang)}
                    storageKey={`hl-ai-assistant:event:${editingId || "new"}`}
                    values={{
                      title: readLang(formData, "title", selectedLang),
                      shortDescription: readLang(formData, "shortDescription", selectedLang),
                      description: readLang(formData, "description", selectedLang),
                    }}
                    onApply={(field, text) => {
                      if (field === "seoKeywords") return;
                      setFormData((prev) => patchLang(prev, field, selectedLang, text));
                    }}
                  />
                  {/* Title */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        color:
                          readLang(formErrors, "title", selectedLang)
                            ? "#dc2626"
                            : "var(--admin-primary)",
                        fontWeight: 600,
                        fontSize: "clamp(13px, 3vw, 14px)",
                      }}
                    >
                      {t("common.title")} ({selectedLang.toUpperCase()}) *
                    </label>
                    <AiPostfixField
                      draft={{
                        kind: "event",
                        field: "title",
                        lang: selectedLang,
                        siteId: selectedSiteId || undefined,
                        placeId: formData.placeId || undefined,
                        name: readLang(formData, "title", selectedLang),
                      }}
                      value={readLang(formData, "title", selectedLang)}
                      onApply={(text) =>
                        setFormData((prev) => patchLang(prev, "title", selectedLang, text))
                      }
                    >
                    <input
                      type="text"
                      value={
                        readLang(formData, "title", selectedLang)
                      }
                      onChange={(e) => {
                        setFormData(patchLang(formData, "title", selectedLang, e.target.value));
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: 15,
                        border:
                          readLang(formErrors, "title", selectedLang)
                            ? "2px solid #fca5a5"
                            : "2px solid var(--admin-primary-border)",
                        borderRadius: 8,
                        outline: "none",
                        transition: "all 0.3s ease",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        background:
                          readLang(formErrors, "title", selectedLang)
                            ? "#fef2f2"
                            : "white",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        const hasError =
                          readLang(formErrors, "title", selectedLang);
                        if (!hasError) {
                          e.target.style.borderColor = "var(--admin-primary)";
                          e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                        }
                      }}
                      onBlur={(e) => {
                        const hasError =
                          readLang(formErrors, "title", selectedLang);
                        e.target.style.borderColor = hasError ? "#fca5a5" : "var(--admin-primary-border)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    </AiPostfixField>
                    {(readLang(formErrors, "title", selectedLang)) && (
                      <div
                        style={{ color: "#dc2626", fontSize: 13, marginTop: 6, fontWeight: 500 }}
                      >
                        {readLang(formErrors, "title", selectedLang)}
                      </div>
                    )}
                  </div>

                  {/* Slug - right after Title */}
                  <SlugInput
                    value={
                      readLang(formData, "slug", selectedLang)
                    }
                    onChange={(value) => {
                      setFormData(patchLang(formData, "slug", selectedLang, value));
                    }}
                    sourceName={
                      readLang(formData, "title", selectedLang)
                    }
                    lang={selectedLang}
                    label={t("admin.slug") || "Slug"}
                    placeholder="auto-generated-from-title"
                    error={
                      readLang(formErrors, "slug", selectedLang)
                    }
                  />

                  {/* Description - right after Slug */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        color: "var(--admin-primary)",
                        fontWeight: 600,
                        fontSize: "clamp(13px, 3vw, 14px)",
                      }}
                    >
                      {t("common.description")} ({selectedLang.toUpperCase()})
                    </label>
                    <TipTapEditorWithUpload
                      value={
                        readLang(formData, "description", selectedLang)
                      }
                      onChange={(html) => {
                        setFormData(patchLang(formData, "description", selectedLang, html));
                      }}
                      uploadFolder="editor/events"
                      enableVideo={true}
                      aiDraft={{
                        kind: "event",
                        field: "description",
                        lang: selectedLang,
                        siteId: selectedSiteId || undefined,
                        placeId: formData.placeId || undefined,
                        name: readLang(formData, "title", selectedLang),
                      }}
                    />
                  </div>

                  {/* Short Description - after Description */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        color: "var(--admin-primary)",
                        fontWeight: 600,
                        fontSize: "clamp(13px, 3vw, 14px)",
                      }}
                    >
                      {t("admin.shortDescription") || "Rövid leírás (lista oldal)"} (
                      {selectedLang.toUpperCase()})
                    </label>
                    <TipTapEditorWithUpload
                      value={
                        readLang(formData, "shortDescription", selectedLang)
                      }
                      onChange={(value) => {
                        setFormData(patchLang(formData, "shortDescription", selectedLang, value));
                      }}
                      placeholder={
                        t("admin.shortDescriptionPlaceholder") ||
                        "Rövid leírás a lista oldali kártyához (richtext)"
                      }
                      height={150}
                      uploadFolder="editor/events"
                      aiDraft={{
                        kind: "event",
                        field: "shortDescription",
                        lang: selectedLang,
                        siteId: selectedSiteId || undefined,
                        placeId: formData.placeId || undefined,
                        name: readLang(formData, "title", selectedLang),
                      }}
                    />
                    <small style={{ color: "var(--hl-muted, #665d78)", fontSize: 12, marginTop: 4, display: "block" }}>
                      {t("admin.shortDescriptionHint") ||
                        "Ez a mező jelenik meg a lista oldali kártyákon"}
                    </small>
                  </div>
                </div>
              )}
            </LanguageAwareForm>

            {/* SEO Fields Section */}
            <LanguageAwareForm>
              {(selectedLang) => (
                <div
                  style={{
                    marginTop: 24,
                    padding: 16,
                    background: "linear-gradient(135deg, var(--admin-primary)15 0%, var(--admin-primary-hover)15 100%)",
                    borderRadius: 8,
                    border: "1px solid var(--admin-primary)30",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: "clamp(16px, 3.5vw, 18px)",
                      fontWeight: 600,
                      color: "var(--admin-primary)",
                      fontFamily:
                        "var(--admin-font-display)",
                    }}
                  >
                    🔍 SEO {t("admin.settings")}
                  </h3>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 4 }}>
                      SEO {t("common.title")}
                    </label>
                    <AiPostfixField
                      draft={{
                        kind: "event",
                        field: "seoTitle",
                        lang: selectedLang,
                        siteId: selectedSiteId || undefined,
                        placeId: formData.placeId || undefined,
                        name: readLang(formData, "title", selectedLang),
                      }}
                      value={readLang(formData, "seoTitle", selectedLang)}
                      onApply={(text) =>
                        setFormData((prev) => patchLang(prev, "seoTitle", selectedLang, text))
                      }
                    >
                    <input
                      type="text"
                      value={
                        readLang(formData, "seoTitle", selectedLang)
                      }
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
                    </AiPostfixField>
                    <small style={{ color: "var(--hl-muted, #665d78)", fontSize: 12, marginTop: 4, display: "block" }}>
                      {t("admin.seoTitleHint") || "If empty, event name will be used"}
                    </small>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 4 }}>
                      SEO {t("common.description")}
                    </label>
                    <AiPostfixField
                      draft={{
                        kind: "event",
                        field: "seoDescription",
                        lang: selectedLang,
                        siteId: selectedSiteId || undefined,
                        placeId: formData.placeId || undefined,
                        name: readLang(formData, "title", selectedLang),
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
                      value={
                        readLang(formData, "seoDescription", selectedLang)
                      }
                      onChange={(e) => {
                        setFormData(patchLang(formData, "seoDescription", selectedLang, e.target.value));
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
                    </AiPostfixField>
                    <small style={{ color: "var(--hl-muted, #665d78)", fontSize: 12, marginTop: 4, display: "block" }}>
                      {t("admin.seoDescriptionHint") ||
                        "If empty, first 2 sentences from description will be used"}
                    </small>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 4 }}>
                      SEO {t("common.image")}
                    </label>
                    <input
                      type="url"
                      value={
                        readLang(formData, "seoImage", selectedLang)
                      }
                      onChange={(e) => {
                        setFormData(patchLang(formData, "seoImage", selectedLang, e.target.value));
                      }}
                      placeholder={
                        t("admin.seoImagePlaceholder") ||
                        "SEO image URL (leave empty for hero image)"
                      }
                      style={{
                        width: "100%",
                        padding: 8,
                        fontSize: 16,
                        border: "1px solid #ddd",
                        borderRadius: 4,
                      }}
                    />
                    <small style={{ color: "var(--hl-muted, #665d78)", fontSize: 12, marginTop: 4, display: "block" }}>
                      {t("admin.seoImageHint") || "If empty, hero image will be used"}
                    </small>
                  </div>

                  <div style={{ marginBottom: 0 }}>
                    <label style={{ display: "block", marginBottom: 4 }}>
                      {t("admin.seoKeywords")}
                    </label>
                    <input
                      type="text"
                      value={
                        readLang(formData, "seoKeywords", selectedLang)
                      }
                      onChange={(e) => {
                        setFormData(patchLang(formData, "seoKeywords", selectedLang, e.target.value));
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
                    <small style={{ color: "var(--hl-muted, #665d78)", fontSize: 12, marginTop: 4, display: "block" }}>
                      {t("admin.seoKeywordsHint") || "Comma-separated keywords for search engines"}
                    </small>
                  </div>
                </div>
              )}
            </LanguageAwareForm>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {/* Bal oszlop: Telefon, Email, Website, Facebook, WhatsApp */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label
                    style={{
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      display: "block",
                      marginBottom: 4,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontWeight: 600,
                      color: "var(--hl-ink, #1b1730)",
                    }}
                  >
                    📱 {t("public.phone")}
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+36 30 123 4567"
                    style={{
                      width: "100%",
                      padding: 12,
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      display: "block",
                      marginBottom: 4,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontWeight: 600,
                      color: "var(--hl-ink, #1b1730)",
                    }}
                  >
                    ✉️ {t("public.email")}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@example.com"
                    style={{
                      width: "100%",
                      padding: 12,
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      display: "block",
                      marginBottom: 4,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontWeight: 600,
                      color: "var(--hl-ink, #1b1730)",
                    }}
                  >
                    🌐 {t("public.website")}
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                    style={{
                      width: "100%",
                      padding: 12,
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      display: "block",
                      marginBottom: 4,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontWeight: 600,
                      color: "var(--hl-ink, #1b1730)",
                    }}
                  >
                    📘 Facebook
                  </label>
                  <input
                    type="url"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="https://facebook.com/yourpage"
                    style={{
                      width: "100%",
                      padding: 12,
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      display: "block",
                      marginBottom: 4,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontWeight: 600,
                      color: "var(--hl-ink, #1b1730)",
                    }}
                  >
                    💬 WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="+36 30 123 4567"
                    style={{
                      width: "100%",
                      padding: 12,
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  />
                </div>
              </div>

              {/* Jobb oszlop: Esemény specifikus információk */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Start and End Date */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      color: formErrors.startDate ? "#dc2626" : "var(--admin-primary)",
                      fontWeight: 600,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.startDate")} *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: 15,
                      border: `2px solid ${formErrors.startDate ? "#fca5a5" : "var(--admin-primary-border)"}`,
                      borderRadius: 8,
                      outline: "none",
                      transition: "all 0.3s ease",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      background: formErrors.startDate ? "#fef2f2" : "white",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      if (!formErrors.startDate) {
                        e.target.style.borderColor = "var(--admin-primary)";
                        e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                      }
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = formErrors.startDate ? "#fca5a5" : "var(--admin-primary-border)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  {formErrors.startDate && (
                    <div style={{ color: "#dc2626", fontSize: 13, marginTop: 6, fontWeight: 500 }}>
                      {formErrors.startDate}
                    </div>
                  )}
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      color: "var(--admin-primary)",
                      fontWeight: 600,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.endDate")}
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: 15,
                      border: "2px solid var(--admin-primary-border)",
                      borderRadius: 8,
                      outline: "none",
                      transition: "all 0.3s ease",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--admin-primary)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--admin-primary-border)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Hero Image */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      color: "var(--admin-primary)",
                      fontWeight: 600,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {t("admin.heroImage")}
                  </label>
                  <input
                    type="text"
                    value={formData.heroImage}
                    onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 12,
                      fontSize: "clamp(15px, 3.5vw, 16px)",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                    placeholder={t("admin.urlPlaceholder")}
                  />
                </div>

                {/* Checkboxes */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      fontSize: 15,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.isPinned}
                      onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                      style={{ width: 20, height: 20, cursor: "pointer", accentColor: "var(--admin-primary)" }}
                    />
                    <span style={{ color: "var(--hl-ink, #1b1730)", fontWeight: 500 }}>{t("admin.isPinned")}</span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      fontSize: 15,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.isRainSafe}
                      onChange={(e) => setFormData({ ...formData, isRainSafe: e.target.checked })}
                      style={{ width: 20, height: 20, cursor: "pointer", accentColor: "var(--admin-primary)" }}
                    />
                    <span style={{ color: "var(--hl-ink, #1b1730)", fontWeight: 500 }}>{t("common.isRainSafe")}</span>
                  </label>
                  <div style={{ fontSize: 12, color: "var(--hl-muted, #665d78)", marginTop: -8, marginLeft: 28 }}>
                    {t("common.isRainSafeHint")}
                  </div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      fontSize: 15,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.showOnMap}
                      onChange={(e) => setFormData({ ...formData, showOnMap: e.target.checked })}
                      style={{ width: 20, height: 20, cursor: "pointer", accentColor: "var(--admin-primary)" }}
                    />
                    <span style={{ color: "var(--hl-ink, #1b1730)", fontWeight: 500 }}>{t("admin.showOnMap")}</span>
                  </label>
                  <div style={{ fontSize: 12, color: "var(--hl-muted, #665d78)", marginTop: -8, marginLeft: 28 }}>
                    {t("admin.showOnMapHint")}
                  </div>
                </div>
              </div>

              {/* Jobb oszlop: Térkép és koordináták */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: "var(--admin-primary)",
                    fontWeight: 600,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.location")} ({t("admin.coordinates")})
                </label>
                <div style={{ marginBottom: 16 }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        color: "var(--admin-primary)",
                        fontWeight: 600,
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
                        marginBottom: 8,
                        color: "var(--admin-primary)",
                        fontWeight: 600,
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

            <div style={{ marginBottom: 24, maxWidth: 420 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 500,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                }}
              >
                {t("admin.googleAnalytics.eventLabel")}
              </label>
              <p style={{ margin: "0 0 8px", color: "#6b7280", fontSize: 13 }}>
                {t("admin.googleAnalytics.eventHelp")}
              </p>
              <input
                type="text"
                value={formData.gaMeasurementId}
                onChange={(e) => setFormData({ ...formData, gaMeasurementId: e.target.value })}
                placeholder="G-XXXXXXXX"
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: formErrors.gaMeasurementId ? "1px solid #dc2626" : "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              />
              {formErrors.gaMeasurementId ? (
                <p style={{ margin: "6px 0 0", color: "#dc2626", fontSize: 13 }}>
                  {formErrors.gaMeasurementId}
                </p>
              ) : (
                <p style={{ margin: "6px 0 0", color: "#9ca3af", fontSize: 12 }}>
                  {t("admin.googleAnalytics.clearHint")}
                </p>
              )}
            </div>

            {/* isActive checkbox - prominent at the bottom - visible to everyone */}
            <div
              style={{
                marginBottom: 24,
                padding: 20,
                background: formData.isActive
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                border: "2px solid",
                borderColor: formData.isActive ? "#10b981" : "#ef4444",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  color: "var(--hl-on-dark-strong, #ffffff)",
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{
                    width: 24,
                    height: 24,
                    cursor: "pointer",
                    accentColor: "white",
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "clamp(16px, 4vw, 20px)",
                      fontWeight: 700,
                      marginBottom: 4,
                      fontFamily:
                        "var(--admin-font-display)",
                    }}
                  >
                    {formData.isActive ? t("admin.eventActive") : t("admin.eventInactive")}
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      opacity: 0.9,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {formData.isActive
                      ? t("admin.eventActiveDescription")
                      : t("admin.eventInactiveDescription")}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {!isCreating && !editingId ? (
        <>
          {/* Desktop táblázat nézet */}
          <div
            style={{
              background: "var(--admin-surface)",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid #ddd",
              display: isMobile ? "none" : "block",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>
                    {t("common.title")}
                  </th>
                  <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>
                    {t("admin.startDate")}
                  </th>
                  <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>
                    {t("admin.place")}
                  </th>
                  <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>
                    {t("admin.table.status")}
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: "right",
                      borderBottom: "2px solid #ddd",
                      width: "1%",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t("admin.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
                  const translation =
                    findTranslation(event.translations, currentLang) ||
                    findTranslation(event.translations, "hu" as Lang);
                  return (
                    <tr key={event.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 12 }}>
                        {event.isPinned && <span style={{ marginRight: 8 }}>📌</span>}
                        {translation?.title || "-"}
                      </td>
                      <td style={{ padding: 12 }}>
                        {new Date(event.startDate).toLocaleDateString(
                          currentLang === "hu" ? "hu-HU" : currentLang === "de" ? "de-DE" : "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </td>
                      <td style={{ padding: 12 }}>
                        {event.place
                          ? event.place.translations.find((t) => t.lang === currentLang)?.name ||
                            event.place.translations[0]?.name ||
                            "-"
                          : "-"}
                      </td>
                      <td style={{ padding: 12 }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            background: event.isActive
                              ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                              : "#6c757d",
                            color: "var(--hl-on-dark-strong, #ffffff)",
                            fontSize: 12,
                            fontWeight: 600,
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
                              padding: "6px 10px",
                              background: "var(--admin-primary)",
                              color: "var(--hl-on-dark-strong, #ffffff)",
                              border: "none",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontSize: 12,
                              fontFamily:
                                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                              transition: "all 0.2s ease",
                              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.18)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-1px)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(15, 23, 42, 0.24)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow =
                                "0 2px 8px rgba(15, 23, 42, 0.18)";
                            }}
                            title={t("common.edit")}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" />
                              <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.43741 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" />
                            </svg>
                          </button>
                          {(() => {
                            const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
                            const translation =
                              findTranslation(event.translations, currentLang) ||
                              findTranslation(event.translations, "hu" as Lang);
                            const slug = translation?.slug || "";
                            const publicUrl =
                              slug && currentSite?.slug
                                ? buildPublicUrl({
                                    lang: i18n.language || "hu",
                                    siteKey: currentSite.slug,
                                    entityType: "event",
                                    slug,
                                  })
                                : null;
                            return publicUrl ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(publicUrl, "_blank");
                                }}
                                style={{
                                  padding: "6px 10px",
                                  background: "rgba(16, 185, 129, 0.1)",
                                  border: "1px solid rgba(16, 185, 129, 0.3)",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontFamily:
                                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                                  transition: "all 0.2s ease",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#10b981",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "rgba(16, 185, 129, 0.2)";
                                  e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.5)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)";
                                  e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.3)";
                                }}
                                title={t("admin.viewPublic") || "Megnézem"}
                              >
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ display: "block" }}
                                >
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                            ) : null;
                          })()}
                          <button
                            onClick={() => handleDelete(event.id)}
                            style={{
                              padding: "6px 10px",
                              background: "var(--admin-danger, #b91c1c)",
                              color: "var(--hl-on-dark-strong, #ffffff)",
                              border: "none",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontSize: 12,
                              fontFamily:
                                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                              transition: "all 0.2s ease",
                              boxShadow: "0 2px 8px rgba(245, 87, 108, 0.3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-1px)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(245, 87, 108, 0.4)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = "0 2px 8px rgba(245, 87, 108, 0.3)";
                            }}
                            title={t("common.delete")}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredEvents.length === 0 && (
              <div style={{ padding: 48, textAlign: "center", color: "var(--hl-muted, #665d78)" }}>
                {searchQuery ? t("admin.table.noSearchResults") : t("admin.table.noData")}
              </div>
            )}
            {!isMobile && pagination.total > 0 && !searchQuery && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                onLimitChange={(limit) => setPagination((prev) => ({ ...prev, limit, page: 1 }))}
              />
            )}
          </div>

          {/* Mobil carousel nézet */}
          <div
            style={{
              display: isMobile ? "flex" : "none",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {filteredEvents.length === 0 ? (
              <div
                style={{
                  padding: 48,
                  textAlign: "center",
                  color: "var(--hl-muted, #665d78)",
                  background: "var(--admin-surface)",
                  borderRadius: 12,
                }}
              >
                {searchQuery ? t("admin.table.noSearchResults") : t("admin.table.noData")}
              </div>
            ) : (
              <>
                {/* Card counter and navigation */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    background: "var(--admin-surface)",
                    borderRadius: 8,
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <button
                    onClick={() => setCurrentMobileIndex(Math.max(0, currentMobileIndex - 1))}
                    disabled={currentMobileIndex === 0}
                    style={{
                      padding: "8px 16px",
                      background:
                        currentMobileIndex === 0
                          ? "#e5e7eb"
                          : "var(--admin-primary)",
                      color: currentMobileIndex === 0 ? "#9ca3af" : "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: currentMobileIndex === 0 ? "not-allowed" : "pointer",
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  >
                    ‹
                  </button>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--admin-primary)" }}>
                    {currentMobileIndex + 1} / {filteredEvents.length}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentMobileIndex(
                        Math.min(filteredEvents.length - 1, currentMobileIndex + 1)
                      )
                    }
                    disabled={currentMobileIndex === filteredEvents.length - 1}
                    style={{
                      padding: "8px 16px",
                      background:
                        currentMobileIndex === filteredEvents.length - 1
                          ? "#e5e7eb"
                          : "var(--admin-primary)",
                      color: currentMobileIndex === filteredEvents.length - 1 ? "#9ca3af" : "white",
                      border: "none",
                      borderRadius: 6,
                      cursor:
                        currentMobileIndex === filteredEvents.length - 1
                          ? "not-allowed"
                          : "pointer",
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  >
                    ›
                  </button>
                </div>

                {/* Stacked cards container */}
                <div
                  style={{
                    position: "relative",
                    minHeight: 280,
                    perspective: "1000px",
                  }}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    (e.currentTarget as any).swipeStartX = touch.clientX;
                    (e.currentTarget as any).swipeStartY = touch.clientY;
                    (e.currentTarget as any).swipeStartTime = Date.now();
                  }}
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    const startX = (e.currentTarget as any).swipeStartX || 0;
                    const startY = (e.currentTarget as any).swipeStartY || 0;
                    const diffX = touch.clientX - startX;
                    const diffY = touch.clientY - startY;

                    // Only handle horizontal swipes (not vertical scrolling)
                    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
                      e.preventDefault();
                      (e.currentTarget as any).isHorizontalSwipe = true;
                    }
                  }}
                  onTouchEnd={(e) => {
                    const touch = e.changedTouches[0];
                    const startX = (e.currentTarget as any).swipeStartX || 0;
                    const startY = (e.currentTarget as any).swipeStartY || 0;
                    const diffX = touch.clientX - startX;
                    const diffY = touch.clientY - startY;
                    const timeDiff = Date.now() - ((e.currentTarget as any).swipeStartTime || 0);
                    const isHorizontalSwipe = (e.currentTarget as any).isHorizontalSwipe;

                    // Check if it's a horizontal swipe (not vertical scroll)
                    if (
                      isHorizontalSwipe ||
                      (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50)
                    ) {
                      // Swipe left -> next card
                      if (diffX < -50 && timeDiff < 400) {
                        setCurrentMobileIndex(
                          Math.min(filteredEvents.length - 1, currentMobileIndex + 1)
                        );
                        setSwipedCardId(null);
                      }
                      // Swipe right -> previous card
                      else if (diffX > 50 && timeDiff < 400) {
                        setCurrentMobileIndex(Math.max(0, currentMobileIndex - 1));
                        setSwipedCardId(null);
                      }
                    }

                    (e.currentTarget as any).isHorizontalSwipe = false;
                  }}
                >
                  {filteredEvents.map((event, index) => {
                    const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
                    const translation =
                      findTranslation(event.translations, currentLang) ||
                      findTranslation(event.translations, "hu" as Lang);
                    const isOpen = swipedCardId === event.id;

                    // Calculate position relative to current index
                    const offset = index - currentMobileIndex;
                    const isVisible = Math.abs(offset) <= 2;

                    if (!isVisible) return null;

                    // Styling based on position
                    const getCardStyle = () => {
                      const baseStyle = {
                        position: "absolute" as const,
                        width: "100%",
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        transformOrigin: "center center",
                      };

                      if (offset === 0) {
                        // Current card
                        return {
                          ...baseStyle,
                          zIndex: 30,
                          transform: "translateY(0) scale(1)",
                          opacity: 1,
                        };
                      } else if (offset === 1) {
                        // Next card (behind, slightly below)
                        return {
                          ...baseStyle,
                          zIndex: 20,
                          transform: "translateY(12px) scale(0.95)",
                          opacity: 0.6,
                          pointerEvents: "none" as const,
                        };
                      } else if (offset === 2) {
                        // Card after next (more behind)
                        return {
                          ...baseStyle,
                          zIndex: 10,
                          transform: "translateY(24px) scale(0.9)",
                          opacity: 0.3,
                          pointerEvents: "none" as const,
                        };
                      } else if (offset === -1) {
                        // Previous card (moving out to left)
                        return {
                          ...baseStyle,
                          zIndex: 5,
                          transform: "translateX(-20%) translateY(-12px) scale(0.9)",
                          opacity: 0,
                          pointerEvents: "none" as const,
                        };
                      } else {
                        // Other cards (hidden)
                        return {
                          ...baseStyle,
                          zIndex: 1,
                          transform: "translateY(30px) scale(0.85)",
                          opacity: 0,
                          pointerEvents: "none" as const,
                        };
                      }
                    };

                    return (
                      <div key={event.id} style={getCardStyle()}>
                        <div
                          style={{
                            position: "relative",
                            overflow: "hidden",
                            borderRadius: 12,
                            boxShadow:
                              offset === 0
                                ? "0 8px 24px rgba(0, 0, 0, 0.15)"
                                : "0 2px 8px rgba(0, 0, 0, 0.1)",
                          }}
                        >
                          {/* Háttér gombok (csúsznak rá a kártyára) - csak aktuális kártyán */}
                          {offset === 0 && (
                            <div
                              style={{
                                position: "absolute",
                                right: 0,
                                top: 0,
                                bottom: 0,
                                display: "flex",
                                alignItems: "stretch",
                                gap: 0,
                                borderTopRightRadius: 12,
                                borderBottomRightRadius: 12,
                                overflow: "hidden",
                                transform: isOpen ? "translateX(0)" : "translateX(100%)",
                                transition: "transform 0.3s ease",
                                zIndex: 10,
                              }}
                            >
                              {(() => {
                                const slug = translation?.slug || "";
                                const publicUrl =
                                  slug && currentSite?.slug
                                    ? buildPublicUrl({
                                        lang: i18n.language || "hu",
                                        siteKey: currentSite.slug,
                                        entityType: "event",
                                        slug,
                                      })
                                    : null;
                                return publicUrl ? (
                                  <button
                                    onClick={() => {
                                      window.open(publicUrl, "_blank");
                                      setSwipedCardId(null);
                                    }}
                                    style={{
                                      width: 80,
                                      background: "rgba(16, 185, 129, 0.2)",
                                      border: "1px solid rgba(16, 185, 129, 0.4)",
                                      color: "#10b981",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      transition: "all 0.2s ease",
                                      boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.15)",
                                      padding: 0,
                                    }}
                                    onTouchStart={(e) => {
                                      e.currentTarget.style.filter = "brightness(0.9)";
                                    }}
                                    onTouchEnd={(e) => {
                                      e.currentTarget.style.filter = "brightness(1)";
                                    }}
                                  >
                                    <svg
                                      width="26"
                                      height="26"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                      style={{ display: "block" }}
                                    >
                                      <path
                                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                      <circle
                                        cx="12"
                                        cy="12"
                                        r="3"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                ) : null;
                              })()}
                              <button
                                onClick={() => {
                                  navigate(
                                    `/${i18n.language || "hu"}/admin/events/${event.id}/analytics`
                                  );
                                  setSwipedCardId(null);
                                }}
                                style={{
                                  width: 80,
                                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                  color: "var(--hl-on-dark-strong, #ffffff)",
                                  border: "none",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all 0.2s ease",
                                  boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.15)",
                                  padding: 0,
                                }}
                                onTouchStart={(e) => {
                                  e.currentTarget.style.filter = "brightness(0.9)";
                                }}
                                onTouchEnd={(e) => {
                                  e.currentTarget.style.filter = "brightness(1)";
                                }}
                              >
                                <svg
                                  width="26"
                                  height="26"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  style={{ display: "block" }}
                                >
                                  <path
                                    d="M3 3V21H21"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M7 16L12 11L16 15L21 10"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M21 10V3H14"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  startEdit(event);
                                  setSwipedCardId(null);
                                }}
                                style={{
                                  width: 80,
                                  background: "var(--admin-primary)",
                                  color: "var(--hl-on-dark-strong, #ffffff)",
                                  border: "none",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all 0.2s ease",
                                  boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.15)",
                                  padding: 0,
                                }}
                                onTouchStart={(e) => {
                                  e.currentTarget.style.filter = "brightness(0.9)";
                                }}
                                onTouchEnd={(e) => {
                                  e.currentTarget.style.filter = "brightness(1)";
                                }}
                              >
                                <svg
                                  width="26"
                                  height="26"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  style={{ display: "block" }}
                                >
                                  <path
                                    d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.43741 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  handleDelete(event.id);
                                  setSwipedCardId(null);
                                }}
                                style={{
                                  width: 80,
                                  background: "var(--admin-danger, #b91c1c)",
                                  color: "var(--hl-on-dark-strong, #ffffff)",
                                  border: "none",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all 0.2s ease",
                                  boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.15)",
                                  padding: 0,
                                }}
                                onTouchStart={(e) => {
                                  e.currentTarget.style.filter = "brightness(0.9)";
                                }}
                                onTouchEnd={(e) => {
                                  e.currentTarget.style.filter = "brightness(1)";
                                }}
                              >
                                <svg
                                  width="26"
                                  height="26"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  style={{ display: "block" }}
                                >
                                  <path
                                    d="M3 6H5H21"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M10 11V17"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M14 11V17"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            </div>
                          )}

                          {/* Fő kártya tartalom (NEM mozog) */}
                          <div
                            onClick={() => {
                              if (offset === 0) {
                                if (isOpen) {
                                  setSwipedCardId(null);
                                } else {
                                  setSwipedCardId(event.id);
                                }
                              }
                            }}
                            onTouchStart={(e) => {
                              if (offset !== 0) return;
                              e.stopPropagation();
                              const touch = e.touches[0];
                              (e.currentTarget as any).cardTouchStartX = touch.clientX;
                              (e.currentTarget as any).cardTouchStartTime = Date.now();
                            }}
                            onTouchEnd={(e) => {
                              if (offset !== 0) return;
                              e.stopPropagation();
                              const touch = e.changedTouches[0];
                              const startX = (e.currentTarget as any).cardTouchStartX || 0;
                              const diffX = startX - touch.clientX;
                              const timeDiff =
                                Date.now() - ((e.currentTarget as any).cardTouchStartTime || 0);

                              // Balra swipe = akciók becsúsznak
                              if ((diffX > 60 && timeDiff < 300) || diffX > 90) {
                                setSwipedCardId(event.id);
                              } else if (diffX < -30) {
                                // Jobbra swipe = bezár
                                setSwipedCardId(null);
                              }
                            }}
                            style={{
                              background: "var(--admin-surface)",
                              padding: 20,
                              border: "1px solid var(--admin-border-subtle)",
                              cursor: offset === 0 ? "pointer" : "default",
                              position: "relative",
                              touchAction: offset === 0 ? "pan-y" : "none",
                              userSelect: "none",
                              WebkitUserSelect: "none",
                              MozUserSelect: "none",
                              msUserSelect: "none",
                            }}
                          >
                            {/* Cím és pin */}
                            <div style={{ marginBottom: 12 }}>
                              <div
                                style={{
                                  fontSize: 18,
                                  fontWeight: 700,
                                  color: "var(--hl-ink, #1b1730)",
                                  marginBottom: 4,
                                }}
                              >
                                {event.isPinned && <span style={{ marginRight: 8 }}>📌</span>}
                                {translation?.title || "-"}
                              </div>
                            </div>

                            {/* Dátum */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 8,
                                fontSize: 14,
                                color: "var(--hl-muted, #665d78)",
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>📅</span>
                              {new Date(event.startDate).toLocaleDateString(
                                currentLang === "hu"
                                  ? "hu-HU"
                                  : currentLang === "de"
                                    ? "de-DE"
                                    : "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </div>

                            {/* Hely */}
                            {event.place && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  marginBottom: 8,
                                  fontSize: 14,
                                  color: "var(--hl-muted, #665d78)",
                                }}
                              >
                                <span style={{ fontWeight: 600 }}>📍</span>
                                {event.place.translations.find((t) => t.lang === currentLang)
                                  ?.name ||
                                  event.place.translations[0]?.name ||
                                  "-"}
                              </div>
                            )}

                            {/* Státusz */}
                            <div style={{ marginBottom: 0 }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "6px 12px",
                                  borderRadius: 6,
                                  background: event.isActive
                                    ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                                    : "#6c757d",
                                  color: "var(--hl-on-dark-strong, #ffffff)",
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                {event.isActive ? t("common.active") : t("common.inactive")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

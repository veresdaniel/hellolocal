// src/pages/admin/PlacesPage.tsx
import { useState, useEffect, useRef, useContext } from "react";
import { appendExtraLanguages, mergeTranslations, patchLang, readLang, readLangList } from "../../utils/langFields";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAdminSite } from "../../contexts/useAdminSite";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../contexts/ToastContext";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import { useConfirm } from "../../hooks/useConfirm";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Pagination } from "../../components/Pagination";
import {
  getPlaces,
  getPlace,
  createPlace,
  updatePlace,
  deletePlace,
  getCategories,
  getTowns,
  getPriceBands,
  getTags,
  getPlaceMemberships,
  getSiteMemberships,
  getFloorplans,
  getPlaceFeatureSubscriptions,
  getFloorplanEntitlement,
} from "../../api/admin.api";
import { AuthContext } from "../../contexts/AuthContext";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { AiPostfixField } from "../../components/AiGeneratePostfixButton";
import { AiAssistantPanel } from "../../components/AiAssistantPanel";
import { TagAutocomplete } from "../../components/TagAutocomplete";
import { CategoryAutocomplete } from "../../components/CategoryAutocomplete";
import { MapComponent } from "../../components/MapComponent";
import { OpeningHoursEditor, type OpeningHour } from "../../components/OpeningHoursEditor";
import {
  AdminResponsiveTable,
  type TableColumn,
  type CardField,
} from "../../components/AdminResponsiveTable";
import { AdminHierarchyFilters } from "../../components/AdminHierarchyFilters";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { PlaceBillingSection } from "../../components/PlaceBillingSection";
import { FloorplanEditor } from "../../components/FloorplanEditor";
import { SlugInput } from "../../components/SlugInput";
import { DomainInput } from "../../components/DomainInput";
import { useAdminHierarchyFilters } from "../../hooks/useAdminHierarchyFilters";
import { isSuperadmin, isAdmin } from "../../utils/roleHelpers";
import { isValidGaMeasurementIdInput } from "../../lib/gaMeasurementId";
import type { UserRole, SiteRole, Lang} from "../../types/enums";
import { buildPublicUrl, entityPublicAddress } from "../../app/urls";

interface Place {
  id: string;
  tenantId: string;
  townId: string | null;
  categoryId: string;
  parentPlaceId?: string | null;
  priceBandId: string | null;
  isActive: boolean;
  plan?: "free" | "basic" | "pro";
  isFeatured?: boolean;
  featuredUntil?: string | null;
  heroImage: string | null;
  mapImage?: string | null;
  customDomain?: string | null;
  gaMeasurementId?: string | null;
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
    slug?: string | null;
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

// Floorplan Section Component
function FloorplanSection({
  placeId,
  siteId,
  refreshTrigger,
  hasActiveSubscription,
}: {
  placeId: string;
  siteId: string;
  refreshTrigger?: number;
  hasActiveSubscription?: boolean;
}) {
  const { t } = useTranslation();
  const [entitlement, setEntitlement] = useState<any>(null);
  const [floorplans, setFloorplans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Always load data when component mounts or dependencies change
    // If refreshTrigger is provided and > 0, it means we need to force refresh
    const shouldForceRefresh = refreshTrigger !== undefined && refreshTrigger > 0;
    loadData(shouldForceRefresh);
  }, [placeId, siteId, refreshTrigger, hasActiveSubscription]);

  const loadData = async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    try {
      // If force refresh, add a small delay to ensure backend has processed the subscription
      if (forceRefresh) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      // Try to get both entitlement and subscriptions to have a fallback
      const [ent, floorplanData, subscriptions] = await Promise.all([
        getFloorplanEntitlement(placeId, siteId).catch((err) => {
          console.error("Failed to get floorplan entitlement:", err);
          console.error("Error details:", err?.response?.data || err?.message || err);
          return null;
        }),
        getFloorplans(placeId).catch((err) => {
          console.error("Failed to get floorplans:", err);
          return [];
        }),
        getPlaceFeatureSubscriptions(placeId).catch((err) => {
          console.error("Failed to get feature subscriptions:", err);
          return [];
        }),
      ]);
      // Check if we have an active subscription as fallback
      const activeSub = (subscriptions || []).find(
        (s) =>
          s.status === "active" &&
          s.featureKey === "FLOORPLANS" &&
          (!s.currentPeriodEnd || new Date(s.currentPeriodEnd) > new Date())
      );
      // If entitlement API failed but we have active subscription, create a fallback entitlement
      if (!ent && activeSub) {
        const fallbackEntitlement = {
          entitled: true,
          activeScope: activeSub.scope,
          limit: 1, // All plans allow only 1 floorplan per place
          used: (floorplanData || []).length,
          status: (floorplanData || []).length >= 1 ? "limit_reached" : "active",
        };
        setEntitlement(fallbackEntitlement);
      } else {
        setEntitlement(ent);
      }

      setFloorplans(floorplanData || []);
    } catch (error) {
      console.error("Failed to load floorplan data:", error);
      setEntitlement(null);
      setFloorplans([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: 16, color: "var(--hl-muted, #665d78)" }}>{t("common.loading")}</div>;
  }

  // Show if entitled (even if no floorplans yet - user can upload)
  // Fallback: if we have active subscription from parent, show even if entitlement API fails
  if (!entitlement && !hasActiveSubscription) {
    return null;
  }

  if (entitlement && !entitlement.entitled && !hasActiveSubscription) {
    return null;
  }

  // If we have active subscription but entitlement API failed, still show the editor
  if (hasActiveSubscription && (!entitlement || !entitlement.entitled)) {
  } else {
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <FloorplanEditor placeId={placeId} siteId={siteId} />
    </div>
  );
}

export function PlacesPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedSiteId, isLoading: isSiteLoading, sites } = useAdminSite();
  const currentSite = sites.find((s) => s.id === selectedSiteId);
  const hierarchy = useAdminHierarchyFilters();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  usePageTitle("admin.places");
  const [places, setPlaces] = useState<Place[]>([]);
  const [parentChoices, setParentChoices] = useState<Place[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [towns, setTowns] = useState<any[]>([]);
  const [priceBands, setPriceBands] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [floorplanRefreshTrigger, setFloorplanRefreshTrigger] = useState(0);
  const [hasActiveFloorplanSubscription, setHasActiveFloorplanSubscription] = useState(false);
  const [isCreating, setIsCreating] = useState(() => {
    // Check URL on initial mount
    const params = new URLSearchParams(window.location.search);
    return params.get("new") === "true";
  });
  const [currentPlaceRole, setCurrentPlaceRole] = useState<"owner" | "manager" | "editor" | null>(
    null
  );
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);
  const [formData, setFormData] = useState({
    categoryId: "",
    parentPlaceId: "",
    townId: "",
    priceBandId: "",
    tagIds: [] as string[],
    nameHu: "",
    nameEn: "",
    nameDe: "",
    slugHu: "",
    slugEn: "",
    slugDe: "",
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
    mapImage: "",
    lat: "",
    lng: "",
    isActive: false,
    plan: "free" as "free" | "basic" | "pro",
    isFeatured: false,
    featuredUntil: "",
    customDomain: "",
    customDomainEnabled: false,
    gaMeasurementId: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const previousPathnameRef = useRef<string>(location.pathname);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      // Reset to first page when site changes
      setPagination((prev) => ({ ...prev, page: 1 }));
      loadData();
      checkSiteAdminRole();
    } else {
      // Reset loading state if no site
      setIsLoading(false);
    }
  }, [selectedSiteId, currentUser?.id]);

  const checkSiteAdminRole = async () => {
    if (!selectedSiteId || !currentUser) return;
    try {
      const memberships = await getSiteMemberships(selectedSiteId, currentUser.id);
      const membership = memberships.find(
        (m) => m.siteId === selectedSiteId && m.userId === currentUser.id
      );
      setIsSiteAdmin(
        membership?.role === "siteadmin" ||
          isSuperadmin(currentUser.role) ||
          isAdmin(currentUser.role as UserRole) ||
          false
      );
    } catch (err) {
      console.error("Failed to check site admin role", err);
      setIsSiteAdmin(false);
    }
  };

  const checkPlaceRole = async (placeId: string) => {
    if (!currentUser?.id || !placeId) {
      setCurrentPlaceRole(null);
      return;
    }
    try {
      const data = await getPlaceMemberships(placeId, currentUser.id);
      const membership = data.find((m) => m.placeId === placeId && m.userId === currentUser.id);
      setCurrentPlaceRole((membership?.role as "owner" | "manager" | "editor" | null) || null);
    } catch (err) {
      console.error("Failed to check place role", err);
      setCurrentPlaceRole(null);
    }
  };

  // Check place role when editing
  useEffect(() => {
    if (editingId) {
      checkPlaceRole(editingId);
    } else {
      setCurrentPlaceRole(null);
    }
  }, [editingId, currentUser?.id]);

  // Helper functions for permission checks
  const canModifyPublish = (): boolean => {
    if (!currentUser) return false;
    if (isSuperadmin(currentUser.role) || isAdmin(currentUser.role as UserRole)) return true;
    if (isSiteAdmin) return true;
    return currentPlaceRole === "owner" || currentPlaceRole === "manager";
  };

  const canModifySeo = (): boolean => {
    // Same as canModifyPublish (owner/manager can modify SEO)
    return canModifyPublish();
  };

  const canDeletePlace = (): boolean => {
    if (!currentUser) return false;
    if (isSuperadmin(currentUser.role) || isAdmin(currentUser.role as UserRole)) return true;
    if (isSiteAdmin) return true;
    return currentPlaceRole === "owner";
  };

  useEffect(() => {
    if (selectedSiteId) {
      loadPlaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, pagination.page, pagination.limit, hierarchy.townId, hierarchy.placeId]);

  const loadData = async () => {
    if (!selectedSiteId) return;
    try {
      const [categoriesResponse, townsResponse, priceBandsResponse, tagsResponse, parentsResponse] =
        await Promise.all([
          getCategories(selectedSiteId),
          getTowns(selectedSiteId),
          getPriceBands(selectedSiteId),
          getTags(selectedSiteId),
          getPlaces(selectedSiteId, 1, 200),
        ]);
      // Handle paginated responses (used in dropdowns, so we extract the array)
      setCategories(
        Array.isArray(categoriesResponse)
          ? categoriesResponse
          : categoriesResponse?.categories || []
      );
      setTowns(Array.isArray(townsResponse) ? townsResponse : townsResponse?.towns || []);
      setPriceBands(
        Array.isArray(priceBandsResponse)
          ? priceBandsResponse
          : priceBandsResponse?.priceBands || []
      );
      setTags(Array.isArray(tagsResponse) ? tagsResponse : tagsResponse?.tags || []);
      setParentChoices(
        Array.isArray(parentsResponse) ? parentsResponse : parentsResponse?.places || []
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.loadPlacesFailed"), "error");
    }
  };

  const loadPlaces = async () => {
    if (!selectedSiteId) return;
    setIsLoading(true);
    try {
      // Single-place filter: fetch that place directly so pagination cannot hide it.
      if (hierarchy.placeId) {
        const place = await getPlace(hierarchy.placeId, selectedSiteId);
        setPlaces(place ? [place] : []);
        setPagination((prev) => ({
          ...prev,
          page: 1,
          total: place ? 1 : 0,
          totalPages: 1,
        }));
        return;
      }

      const townIdFilter = hierarchy.townId || undefined;
      const response = await getPlaces(
        selectedSiteId,
        pagination.page,
        pagination.limit,
        townIdFilter
      );
      // Backend always returns paginated response now
      if (Array.isArray(response)) {
        // Fallback for backward compatibility (should not happen)
        setPlaces(response);
        setPagination((prev) => ({ ...prev, total: response.length, totalPages: 1 }));
      } else {
        setPlaces(response.places || []);
        const paginationData = response.pagination;
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
          // Fallback: calculate from places array length
          const places = response.places || [];
          const total = places.length;
          const limit = pagination.limit;
          setPagination((prev) => ({
            ...prev,
            total,
            totalPages: Math.ceil(total / limit) || 1,
          }));
        }
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
    if (!isValidGaMeasurementIdInput(formData.gaMeasurementId)) {
      errors.gaMeasurementId = t("admin.googleAnalytics.invalidId");
    }
    // English and German are optional
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!selectedSiteId) return;
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
        shortDescription?: string | null;
      }> = [
        {
          lang: "hu",
          name: formData.nameHu,
          slug: formData.slugHu || null,
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
          slug: formData.slugEn || null,
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
          slug: formData.slugDe || null,
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
      appendExtraLanguages(
        translations,
        formData,
        "name",
        ["slug", "shortDescription", "description", "address", "accessibility", "seoTitle", "seoDescription", "seoImage", "seoKeywords"],
        {
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
          facebook: formData.facebook || null,
          whatsapp: formData.whatsapp || null,
        }
      );

      await createPlace({
        tenantId: selectedSiteId,
        categoryId: formData.categoryId,
        parentPlaceId: formData.parentPlaceId || null,
        townId: formData.townId || null,
        priceBandId: formData.priceBandId || null,
        tagIds: formData.tagIds,
        translations,
        openingHours: formData.openingHours,
        heroImage: formData.heroImage || null,
        mapImage: formData.mapImage || null,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        isActive: formData.isActive,
        plan: formData.plan,
        isFeatured: formData.isFeatured,
        featuredUntil: formData.featuredUntil
          ? new Date(formData.featuredUntil).toISOString()
          : null,
        customDomain: formData.customDomainEnabled ? formData.customDomain || null : null,
        gaMeasurementId: formData.gaMeasurementId.trim()
          ? formData.gaMeasurementId.trim().toUpperCase()
          : null,
      });
      setIsCreating(false);
      resetForm();
      await loadPlaces();
      // Notify global cache manager that places have changed
      notifyEntityChanged("places");
      showToast(t("admin.messages.placeCreated"), "success");

      // If we came from dashboard, navigate back to dashboard
      const fromParam = searchParams.get("from");
      if (fromParam === "dashboard") {
        navigate(`/${(i18n.language || "hu").split("-")[0]}/admin`);
        return;
      }
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
          parentPlaceId: formData.parentPlaceId || null,
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
              shortDescription?: string | null;
            }> = [
              {
                lang: "hu",
                name: formData.nameHu,
                slug: formData.slugHu || null,
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
                slug: formData.slugEn || null,
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
                slug: formData.slugDe || null,
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
            appendExtraLanguages(
              translations,
              formData,
              "name",
              ["slug", "shortDescription", "description", "address", "accessibility", "seoTitle", "seoDescription", "seoImage", "seoKeywords"],
              {
                phone: formData.phone || null,
                email: formData.email || null,
                website: formData.website || null,
                facebook: formData.facebook || null,
                whatsapp: formData.whatsapp || null,
              }
            );
            return translations;
          })(),
          openingHours: formData.openingHours,
          heroImage: formData.heroImage || null,
          mapImage: formData.mapImage || null,
          lat: formData.lat ? parseFloat(formData.lat) : null,
          lng: formData.lng ? parseFloat(formData.lng) : null,
          isActive: formData.isActive,
          plan: formData.plan,
          isFeatured: formData.isFeatured,
          featuredUntil: formData.featuredUntil
            ? new Date(formData.featuredUntil).toISOString()
            : null,
          customDomain: formData.customDomainEnabled ? formData.customDomain || null : null,
          gaMeasurementId: formData.gaMeasurementId.trim()
            ? formData.gaMeasurementId.trim().toUpperCase()
            : null,
        },
        selectedSiteId || undefined
      );
      setEditingId(null);
      resetForm();
      await loadPlaces();
      // Notify global cache manager that places have changed
      notifyEntityChanged("places");
      showToast(t("admin.messages.placeUpdated"), "success");

      // If we came from dashboard, navigate back to dashboard
      const fromParam = searchParams.get("from");
      if (fromParam === "dashboard") {
        navigate(`/${(i18n.language || "hu").split("-")[0]}/admin`);
        return;
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updatePlaceFailed"), "error");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t("admin.confirmations.deletePlace"),
      message:
        t("admin.confirmations.deletePlace"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      confirmVariant: "danger",
      size: "medium",
    });

    if (!confirmed) return;

    try {
      await deletePlace(id, selectedSiteId || undefined);
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
    checkPlaceRole(place.id);
    const hu = place.translations.find((t) => t.lang === "hu");
    const en = place.translations.find((t) => t.lang === "en");
    const de = place.translations.find((t) => t.lang === "de");
    setFormData({
      categoryId: place.categoryId,
      parentPlaceId: place.parentPlaceId || "",
      townId: place.townId || "",
      priceBandId: place.priceBandId || "",
      tagIds: place.tags.map((pt) => pt.tag.id),
      nameHu: hu?.name || "",
      nameEn: en?.name || "",
      nameDe: de?.name || "",
      slugHu: hu?.slug || "",
      slugEn: en?.slug || "",
      slugDe: de?.slug || "",
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
      mapImage: place.mapImage || "",
      lat: place.lat?.toString() || "",
      lng: place.lng?.toString() || "",
      isActive: place.isActive,
      plan: place.plan || "free",
      isFeatured: place.isFeatured || false,
      featuredUntil: place.featuredUntil
        ? new Date(place.featuredUntil).toISOString().split("T")[0]
        : "",
      customDomain: place.customDomain || "",
      customDomainEnabled: !!place.customDomain,
      gaMeasurementId: place.gaMeasurementId || "",
    });
    setFormData((current) =>
      mergeTranslations(current, place.translations, [
        "name",
        "slug",
        "shortDescription",
        "description",
        "address",
        "accessibility",
        "seoTitle",
        "seoDescription",
        "seoImage",
        "seoKeywords",
      ])
    );
  };

  const resetForm = () => {
    setFormData({
      categoryId: "",
      parentPlaceId: "",
      townId: "",
      priceBandId: "",
      tagIds: [],
      nameHu: "",
      nameEn: "",
      nameDe: "",
      slugHu: "",
      slugEn: "",
      slugDe: "",
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
      mapImage: "",
      lat: "",
      lng: "",
      isActive: false,
      plan: "free",
      isFeatured: false,
      featuredUntil: "",
      customDomain: "",
      customDomainEnabled: false,
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
        const townIdFromUrl = searchParams.get("townId") || "";
        if (townIdFromUrl) {
          setFormData((prev) => ({ ...prev, townId: townIdFromUrl }));
        }
      }, 0);
      // Remove query param from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("new");
      setSearchParams(newSearchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString(), isCreating, editingId]);

  // Handle edit query parameter
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && !editingId && !isCreating && places.length > 0) {
      const placeToEdit = places.find((p) => p.id === editId);
      if (placeToEdit) {
        startEdit(placeToEdit);
        // Remove edit param from URL after opening edit form
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("edit");
        setSearchParams(newParams, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("edit"), places.length, editingId, isCreating]);

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
          parentPlaceId: "",
          townId: "",
          priceBandId: "",
          tagIds: [],
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
          mapImage: "",
          lat: "",
          lng: "",
          isActive: false,
          plan: "free" as "free" | "basic" | "pro",
          isFeatured: false,
          featuredUntil: "",
          customDomain: "",
          customDomainEnabled: false,
          gaMeasurementId: "",
        });
        setFormErrors({});
      }
    }
  }, [location.pathname, editingId, isCreating]);

  // Wait for site context to initialize
  if (isSiteLoading) {
    return null;
  }

  if (!selectedSiteId) {
    return <div style={{ padding: 24 }}>{t("admin.table.pleaseSelectSite")}</div>;
  }

  // Common label style for better contrast on admin
  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "block",
    marginBottom: 4,
    fontSize: "clamp(14px, 3.5vw, 16px)",
    fontWeight: 600,
    color: "var(--hl-ink, #1b1730)",
  };

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        title={t("admin.places")}
        newButtonLabel={t("admin.forms.newPlace")}
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
              color: "var(--admin-primary, #2563eb)",
              fontSize: "clamp(18px, 4vw, 22px)",
              fontWeight: 700,
              fontFamily:
                "var(--admin-font-display, Inter, system-ui, sans-serif)",
            }}
          >
            {editingId ? t("admin.forms.editPlace") : t("admin.forms.newPlace")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Category, Town, PriceBand Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 16,
              }}
            >
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
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: "var(--admin-primary, #2563eb)",
                    fontWeight: 600,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                  }}
                >
                  {t("admin.parentPlace")}
                </label>
                <select
                  value={formData.parentPlaceId}
                  onChange={(e) => setFormData({ ...formData, parentPlaceId: e.target.value })}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                >
                  <option value="">{t("admin.noParentPlace")}</option>
                  {parentChoices
                    .filter((place) => place.id !== editingId)
                    .map((place) => {
                      const currentLang = (i18n.language || "hu").split("-")[0];
                      const name =
                        place.translations.find((item) => item.lang === currentLang)?.name ||
                        place.translations.find((item) => item.lang === "hu")?.name ||
                        place.id;
                      return (
                        <option key={place.id} value={place.id}>
                          {name}
                        </option>
                      );
                    })}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: "var(--admin-primary, #2563eb)",
                    fontWeight: 600,
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("admin.towns")}
                </label>
                <select
                  value={formData.townId}
                  onChange={(e) => setFormData({ ...formData, townId: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 15,
                    border: "2px solid var(--admin-primary-border, #bfdbfe)",
                    borderRadius: 8,
                    outline: "none",
                    transition: "all 0.3s ease",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    background: "white",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--admin-primary, #2563eb)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--admin-primary-border, #bfdbfe)";
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
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: "var(--admin-primary, #2563eb)",
                    fontWeight: 600,
                    fontSize: "clamp(13px, 3vw, 14px)",
                  }}
                >
                  {t("admin.priceBands")}
                </label>
                <select
                  value={formData.priceBandId}
                  onChange={(e) => setFormData({ ...formData, priceBandId: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 15,
                    border: "2px solid var(--admin-primary-border, #bfdbfe)",
                    borderRadius: 8,
                    outline: "none",
                    transition: "all 0.3s ease",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    background: "white",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--admin-primary, #2563eb)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--admin-primary-border, #bfdbfe)";
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
                  <AiAssistantPanel
                    kind="place"
                    lang={selectedLang}
                    siteId={selectedSiteId || undefined}
                    placeId={editingId || undefined}
                    name={readLang(formData, "name", selectedLang)}
                    categoryId={formData.categoryId || undefined}
                    townId={formData.townId || undefined}
                    storageKey={`hl-ai-assistant:place:${editingId || "new"}`}
                    values={{
                      name: readLang(formData, "name", selectedLang),
                      shortDescription: readLang(formData, "shortDescription", selectedLang),
                      description: readLang(formData, "description", selectedLang),
                      seoTitle: readLang(formData, "seoTitle", selectedLang),
                      seoDescription: readLang(formData, "seoDescription", selectedLang),
                      seoKeywords: readLangList(formData, "seoKeywords", selectedLang).join(", "),
                    }}
                    onApply={(field, text) => {
                      if (field === "seoKeywords") {
                        const keywords = text
                          .split(/[,;]/)
                          .map((part) => part.trim())
                          .filter(Boolean);
                        setFormData(patchLang(formData, "seoKeywords", selectedLang, keywords));
                        return;
                      }
                      setFormData(patchLang(formData, field, selectedLang, text));
                    }}
                  />
                  {/* Name - only editable by owner/manager (affects slugs) */}
                  {canModifySeo() ? (
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: 8,
                          color:
                            readLang(formErrors, "name", selectedLang)
                              ? "#dc2626"
                              : "#333",
                          fontWeight: 600,
                          fontSize: "clamp(13px, 3vw, 14px)",
                        }}
                      >
                        {t("common.name")} ({selectedLang.toUpperCase()}) *
                      </label>
                      <AiPostfixField
                        draft={{
                          kind: "place",
                          field: "name",
                          lang: selectedLang,
                          siteId: selectedSiteId || undefined,
                          placeId: editingId || undefined,
                          name: readLang(formData, "name", selectedLang),
                          categoryId: formData.categoryId || undefined,
                          townId: formData.townId || undefined,
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
                          padding: "12px 16px",
                          fontSize: 15,
                          border:
                            readLang(formErrors, "name", selectedLang)
                              ? "2px solid #fca5a5"
                              : "2px solid var(--admin-primary-border, #bfdbfe)",
                          borderRadius: 8,
                          outline: "none",
                          transition: "all 0.3s ease",
                          fontFamily:
                            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          background:
                            readLang(formErrors, "name", selectedLang)
                              ? "#fef2f2"
                              : "white",
                          boxSizing: "border-box",
                        }}
                        onFocus={(e) => {
                          const hasError =
                            readLang(formErrors, "name", selectedLang);
                          if (!hasError) {
                            e.target.style.borderColor = "var(--admin-primary, #2563eb)";
                            e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                          }
                        }}
                        onBlur={(e) => {
                          const hasError =
                            readLang(formErrors, "name", selectedLang);
                          e.target.style.borderColor = hasError ? "#fca5a5" : "var(--admin-primary-border, #bfdbfe)";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                      </AiPostfixField>
                      {(readLang(formErrors, "name", selectedLang)) && (
                        <div
                          style={{
                            color: "#dc2626",
                            fontSize: "clamp(14px, 3.5vw, 16px)",
                            marginTop: 6,
                            fontWeight: 500,
                            fontFamily:
                              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          }}
                        >
                          {readLang(formErrors, "name", selectedLang)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: 12,
                        background: "#f3f4f6",
                        borderRadius: 8,
                        color: "#6b7280",
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {t("common.name")}:{" "}
                      {readLang(formData, "name", selectedLang)}
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: "clamp(13px, 3vw, 15px)",
                          fontStyle: "italic",
                          fontFamily:
                            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        {t("admin.readOnlyEditor")}
                      </div>
                    </div>
                  )}

                  {/* Slug - right after Name */}
                  {canModifySeo() ? (
                    <SlugInput
                      value={
                        readLang(formData, "slug", selectedLang)
                      }
                      onChange={(value) => {
                        setFormData(patchLang(formData, "slug", selectedLang, value));
                      }}
                      sourceName={
                        readLang(formData, "name", selectedLang)
                      }
                      lang={selectedLang}
                      label={t("admin.slug")}
                      placeholder="auto-generated-from-name"
                      error={
                        readLang(formErrors, "slug", selectedLang)
                      }
                    />
                  ) : null}

                  {/* Description - right after Slug */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>{t("common.description")}</label>
                    <TipTapEditorWithUpload
                      value={
                        readLang(formData, "description", selectedLang)
                      }
                      onChange={(value) => {
                        setFormData(patchLang(formData, "description", selectedLang, value));
                      }}
                      placeholder={t("common.description")}
                      height={200}
                      uploadFolder="editor/places"
                      aiDraft={{
                        kind: "place",
                        field: "description",
                        lang: selectedLang,
                        siteId: selectedSiteId || undefined,
                        placeId: editingId || undefined,
                        name: readLang(formData, "name", selectedLang),
                        categoryId: formData.categoryId || undefined,
                        townId: formData.townId || undefined,
                      }}
                    />
                  </div>

                  {/* Short Description - after Description */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>{t("admin.shortDescription")}</label>
                    <TipTapEditorWithUpload
                      value={
                        readLang(formData, "shortDescription", selectedLang)
                      }
                      onChange={(value) => {
                        setFormData(patchLang(formData, "shortDescription", selectedLang, value));
                      }}
                      placeholder={t("admin.shortDescriptionPlaceholder")}
                      height={150}
                      uploadFolder="editor/places"
                      aiDraft={{
                        kind: "place",
                        field: "shortDescription",
                        lang: selectedLang,
                        siteId: selectedSiteId || undefined,
                        placeId: editingId || undefined,
                        name: readLang(formData, "name", selectedLang),
                        categoryId: formData.categoryId || undefined,
                        townId: formData.townId || undefined,
                      }}
                    />
                    <small
                      style={{
                        color: "var(--hl-muted, #665d78)",
                        fontSize: "clamp(13px, 3vw, 15px)",
                        marginTop: 4,
                        display: "block",
                        fontFamily:
                          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      {t("admin.shortDescriptionHint")}
                    </small>
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
                        readLang(formData, "accessibility", selectedLang)
                      }
                      onChange={(value) => {
                        setFormData(patchLang(formData, "accessibility", selectedLang, value));
                      }}
                      placeholder={t("public.accessibility")}
                      height={150}
                      aiDraft={{
                        kind: "place",
                        field: "accessibility",
                        lang: selectedLang,
                        siteId: selectedSiteId || undefined,
                        placeId: editingId || undefined,
                        name: readLang(formData, "name", selectedLang),
                        categoryId: formData.categoryId || undefined,
                        townId: formData.townId || undefined,
                      }}
                      uploadFolder="editor/places"
                    />
                  </div>

                  {/* SEO Fields Section - only visible to owner/manager */}
                  {canModifySeo() && (
                    <div
                      style={{
                        marginTop: 24,
                        padding: 16,
                        background: "linear-gradient(135deg, var(--admin-primary, #2563eb)15 0%, var(--admin-primary-hover, #1d4ed8)15 100%)",
                        borderRadius: 8,
                        border: "1px solid var(--admin-primary, #2563eb)30",
                      }}
                    >
                      <h3
                        style={{
                          margin: "0 0 16px 0",
                          fontSize: "clamp(16px, 3.5vw, 18px)",
                          fontWeight: 600,
                          color: "var(--admin-primary, #2563eb)",
                          fontFamily:
                            "var(--admin-font-display, Inter, system-ui, sans-serif)",
                        }}
                      >
                        🔍 SEO {t("admin.settings")}
                      </h3>

                      <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>SEO {t("common.title")}</label>
                        <AiPostfixField
                          draft={{
                            kind: "place",
                            field: "seoTitle",
                            lang: selectedLang,
                            siteId: selectedSiteId || undefined,
                            placeId: editingId || undefined,
                            name: readLang(formData, "name", selectedLang),
                          }}
                          value={readLang(formData, "seoTitle", selectedLang)}
                          onApply={(text) =>
                            setFormData(patchLang(formData, "seoTitle", selectedLang, text))
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
                          placeholder={t("admin.seoTitlePlaceholder")}
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
                        </AiPostfixField>
                        <small
                          style={{
                            color: "var(--hl-muted, #665d78)",
                            fontSize: "clamp(13px, 3vw, 15px)",
                            marginTop: 4,
                            display: "block",
                            fontFamily:
                              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          }}
                        >
                          {t("admin.seoTitleHint")}
                        </small>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>SEO {t("common.description")}</label>
                        <AiPostfixField
                          draft={{
                            kind: "place",
                            field: "seoDescription",
                            lang: selectedLang,
                            siteId: selectedSiteId || undefined,
                            placeId: editingId || undefined,
                            name: readLang(formData, "name", selectedLang),
                          }}
                          value={readLang(formData, "seoDescription", selectedLang)}
                          onApply={(text) =>
                            setFormData(patchLang(formData, "seoDescription", selectedLang, text))
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
                          placeholder={t("admin.seoDescriptionPlaceholder")}
                          rows={3}
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
                        </AiPostfixField>
                        <small
                          style={{ color: "var(--hl-muted, #665d78)", fontSize: 12, marginTop: 4, display: "block" }}
                        >
                          {t("admin.seoDescriptionHint")}
                        </small>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>SEO {t("common.image")}</label>
                        <input
                          type="url"
                          value={
                            readLang(formData, "seoImage", selectedLang)
                          }
                          onChange={(e) => {
                            setFormData(patchLang(formData, "seoImage", selectedLang, e.target.value));
                          }}
                          placeholder={t("admin.seoImagePlaceholder")}
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
                        <small
                          style={{ color: "var(--hl-muted, #665d78)", fontSize: 12, marginTop: 4, display: "block" }}
                        >
                          {t("admin.seoImageHint")}
                        </small>
                      </div>

                      <div style={{ marginBottom: 0 }}>
                        <label style={labelStyle}>{t("admin.seoKeywords")}</label>
                        <input
                          type="text"
                          value={
                            readLangList(formData, "seoKeywords", selectedLang).join(", ")
                          }
                          onChange={(e) => {
                            const keywords = e.target.value
                              .split(",")
                              .map((k) => k.trim())
                              .filter(Boolean);
                            setFormData(patchLang(formData, "seoKeywords", selectedLang, keywords));
                          }}
                          placeholder={t("admin.seoKeywordsPlaceholder")}
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
                        <small
                          style={{
                            color: "var(--hl-muted, #665d78)",
                            fontSize: "clamp(13px, 3vw, 15px)",
                            marginTop: 4,
                            display: "block",
                            fontFamily:
                              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          }}
                        >
                          {t("admin.seoKeywordsHint")}
                        </small>
                      </div>
                    </div>
                  )}
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
                  <label style={labelStyle}>📱 {t("public.phone")}</label>
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
                  <label style={labelStyle}>✉️ {t("public.email")}</label>
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
                  <label style={labelStyle}>🌐 {t("public.website")}</label>
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
                  <label style={labelStyle}>📘 Facebook</label>
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
                  <label style={labelStyle}>💬 WhatsApp</label>
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

              {/* Jobb oszlop: Térkép és koordináták */}
              <div>
                <label style={{ ...labelStyle, marginBottom: 8 }}>
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
                    <label style={{ ...labelStyle, fontSize: "clamp(14px, 3.5vw, 16px)" }}>
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
                    <label style={{ ...labelStyle, fontSize: "clamp(14px, 3.5vw, 16px)" }}>
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

            <div style={{ marginBottom: 24 }}>
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

            <div style={{ marginBottom: 24, maxWidth: 420 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 500,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                }}
              >
                {t("admin.googleAnalytics.placeLabel")}
              </label>
              <p style={{ margin: "0 0 8px", color: "#6b7280", fontSize: 13 }}>
                {t("admin.googleAnalytics.placeHelp")}
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

            {/* isActive checkbox - prominent at the top - visible to everyone, but disabled for editors */}
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
                opacity: canModifyPublish() ? 1 : 0.7,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: canModifyPublish() ? "pointer" : "not-allowed",
                  color: "var(--hl-on-dark-strong, #ffffff)",
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  disabled={!canModifyPublish()}
                  onChange={(e) => {
                    if (!canModifyPublish()) return;
                    setFormData({ ...formData, isActive: e.target.checked });
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    cursor: canModifyPublish() ? "pointer" : "not-allowed",
                    accentColor: "white",
                    opacity: canModifyPublish() ? 1 : 0.6,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "clamp(16px, 4vw, 20px)",
                      fontWeight: 700,
                      marginBottom: 4,
                      fontFamily:
                        "var(--admin-font-display, Inter, system-ui, sans-serif)",
                    }}
                  >
                    {formData.isActive ? t("admin.placeActive") : t("admin.placeInactive")}
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
                      ? t("admin.placeActiveDescription")
                      : t("admin.placeInactiveDescription")}
                  </div>
                </div>
              </label>
            </div>

            {/* Hero kép teljes szélességben */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{t("admin.heroImageUrl")}</label>
              <input
                type="url"
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
              />
            </div>

            {/* Optional map-card image (falls back to hero) */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{t("admin.mapImageUrl")}</label>
              <input
                type="url"
                value={formData.mapImage}
                onChange={(e) => setFormData({ ...formData, mapImage: e.target.value })}
                placeholder={t("admin.mapImagePlaceholder")}
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
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "#666",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.mapImageDescription")}
              </div>
            </div>

            {/* Billing/Plan fields - visible to everyone, but modification disabled for editors */}
            {editingId && (
              <div style={{ marginBottom: 16 }}>
                <PlaceBillingSection
                  placeId={editingId}
                  currentPlan={formData.plan}
                  currentIsFeatured={formData.isFeatured}
                  currentFeaturedUntil={formData.featuredUntil}
                  siteId={selectedSiteId || ""}
                  userRole={currentUser?.role || "viewer"}
                  onPlanChange={async (newPlan) => {
                    // Just update the form data - the PlaceBillingSection component
                    // will handle the API call and update the subscription
                    setFormData({ ...formData, plan: newPlan });
                    // No need to reload the entire page or call updatePlace here
                    // The subscription update is handled by PlaceBillingSection
                  }}
                  onFloorplanSubscriptionChange={() => {
                    // Trigger refresh of FloorplanSection when subscription changes
                    setFloorplanRefreshTrigger((prev) => prev + 1);
                  }}
                  onActiveFloorplanSubscriptionChange={(hasActive) => {
                    setHasActiveFloorplanSubscription(hasActive);
                    // Also trigger refresh when subscription status changes
                    if (hasActive) {
                      setFloorplanRefreshTrigger((prev) => prev + 1);
                    }
                  }}
                />
              </div>
            )}

            {/* Floorplans section - separate block, only visible if entitled */}
            {editingId && selectedSiteId && (
              <div
                style={{
                  marginTop: 32,
                  padding: "clamp(24px, 5vw, 32px)",
                  background: "white",
                  borderRadius: 16,
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                  border: "1px solid rgba(37, 99, 235, 0.1)",
                }}
              >
                <FloorplanSection
                  placeId={editingId}
                  siteId={selectedSiteId}
                  refreshTrigger={floorplanRefreshTrigger}
                  hasActiveSubscription={hasActiveFloorplanSubscription}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {!isCreating && !editingId && (
        <>
        <div style={{ marginBottom: 16 }}>
          <AdminHierarchyFilters
            idPrefix="places-filter"
            requireSite
            allowClearSite={hierarchy.canPickSite}
            siteId={hierarchy.siteId}
            townId={hierarchy.townId}
            placeId={hierarchy.placeId}
            onSiteChange={(next) => {
              hierarchy.setSiteId(next);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            onTownChange={(next) => {
              hierarchy.setTownId(next);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            onPlaceChange={(next) => {
              hierarchy.setPlaceId(next);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            siteOptions={hierarchy.siteOptions}
            townOptions={hierarchy.townOptions}
            placeOptions={hierarchy.placeOptions}
            onClear={() => {
              hierarchy.clearFilters();
              setSearchQuery("");
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            clearDisabled={!hierarchy.filtersActive && !searchQuery.trim()}
          />
        </div>
        <AdminResponsiveTable<Place>
          data={
            hierarchy.placeId
              ? places.filter((place) => place.id === hierarchy.placeId)
              : places
          }
          getItemId={(place) => place.id}
          searchQuery={searchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.places")}
          onSearchChange={(query) => {
            setSearchQuery(query);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          filterFn={(place, query) => {
            const lowerQuery = query.toLowerCase();
            const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
            const translation =
              place.translations?.find((t) => t.lang === currentLang) ||
              place.translations?.find((t) => t.lang === "hu");
            const categoryTranslation =
              place.category?.translations?.find((t) => t.lang === currentLang) ||
              place.category?.translations?.find((t) => t.lang === "hu");
            const townTranslation =
              place.town?.translations?.find((t) => t.lang === currentLang) ||
              place.town?.translations?.find((t) => t.lang === "hu");
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
                const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
                const translation =
                  place.translations.find((t) => t.lang === currentLang) ||
                  place.translations.find((t) => t.lang === "hu");
                return translation?.name || "-";
              },
            },
            {
              key: "category",
              label: t("admin.categories"),
              render: (place) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
                const categoryTranslation =
                  place.category?.translations?.find((t) => t.lang === currentLang) ||
                  place.category?.translations?.find((t) => t.lang === "hu");
                return categoryTranslation?.name || "-";
              },
            },
            {
              key: "town",
              label: t("admin.towns"),
              render: (place) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
                const townTranslation =
                  place.town?.translations.find((t) => t.lang === currentLang) ||
                  place.town?.translations.find((t) => t.lang === "hu");
                return townTranslation?.name || "-";
              },
            },
            // Only show status column if user has admin permissions (admin/superadmin/siteadmin)
            // Editor/viewer should not see isActive status
            ...(currentUser?.role === "superadmin" || currentUser?.role === "admin" || isSiteAdmin
              ? [
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
                          color: "var(--hl-on-dark-strong, #ffffff)",
                          fontSize: "clamp(14px, 3.5vw, 16px)",
                          fontWeight: 600,
                          fontFamily:
                            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        {place.isActive ? t("common.active") : t("common.inactive")}
                      </span>
                    ),
                  },
                ]
              : []),
            {
              key: "priceList",
              label: t("admin.priceList"),
              align: "right" as const,
              render: (place) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/${i18n.language || "hu"}/admin/places/${place.id}/pricelist`);
                  }}
                  style={{
                    padding: "6px 12px",
                    background: "var(--admin-danger, #b91c1c)",
                    color: "var(--hl-on-dark-strong, #ffffff)",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: "clamp(13px, 3vw, 15px)",
                    fontWeight: 600,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 8px rgba(245, 87, 108, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 87, 108, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(245, 87, 108, 0.3)";
                  }}
                >
                  {t("admin.priceList")}
                </button>
              ),
            },
            {
              key: "analytics",
              label: t("admin.analyticsLabel"),
              align: "right" as const,
              render: (place) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/${i18n.language || "hu"}/admin/places/${place.id}/analytics`);
                  }}
                  style={{
                    padding: "6px 12px",
                    background: "var(--admin-primary, #2563eb)",
                    color: "var(--hl-on-dark-strong, #ffffff)",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: "clamp(13px, 3vw, 15px)",
                    fontWeight: 600,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.18)",
                    marginLeft: 8,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.24)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(15, 23, 42, 0.18)";
                  }}
                >
                  {t("admin.analyticsLabel")}
                </button>
              ),
            },
          ]}
          cardTitle={(place) => {
            const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
            const translation =
              place.translations.find((t) => t.lang === currentLang) ||
              place.translations.find((t) => t.lang === "hu");
            return translation?.name || "-";
          }}
          cardSubtitle={(place) => {
            const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
            const categoryTranslation =
              place.category.translations.find((t) => t.lang === currentLang) ||
              place.category.translations.find((t) => t.lang === "hu");
            return categoryTranslation?.name || "-";
          }}
          cardFields={[
            {
              key: "town",
              render: (place) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
                const townTranslation =
                  place.town?.translations.find((t) => t.lang === currentLang) ||
                  place.town?.translations.find((t) => t.lang === "hu");
                return townTranslation ? (
                  <div
                    style={{
                      color: "var(--hl-muted, #665d78)",
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      marginBottom: 8,
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}
                  >
                    {townTranslation.name}
                  </div>
                ) : null;
              },
            },
            {
              key: "priceList",
              render: (place) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/${i18n.language || "hu"}/admin/places/${place.id}/pricelist`);
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "var(--admin-danger, #b91c1c)",
                    color: "var(--hl-on-dark-strong, #ffffff)",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: "clamp(13px, 3vw, 15px)",
                    fontWeight: 600,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    marginTop: 8,
                    boxShadow: "0 2px 8px rgba(245, 87, 108, 0.3)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 87, 108, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(245, 87, 108, 0.3)";
                  }}
                >
                  {t("admin.priceList")}
                </button>
              ),
            },
            {
              key: "view",
              render: (place) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
                const translation =
                  place.translations.find((t) => t.lang === currentLang) ||
                  place.translations.find((t) => t.lang === "hu");
                const slug = translation?.slug || "";
                const publicUrl =
                  slug && currentSite?.slug
                    ? place.customDomain
                      ? entityPublicAddress({
                          lang: i18n.language || "hu",
                          siteSlug: currentSite.slug,
                          entityType: "place",
                          entitySlug: slug,
                          primaryDomain: currentSite.primaryDomain,
                          customDomain: place.customDomain,
                        })
                      : buildPublicUrl({
                          lang: i18n.language || "hu",
                          siteKey: currentSite.slug,
                          entityType: "place",
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
                      padding: "8px 16px",
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: "clamp(13px, 3vw, 15px)",
                      fontFamily:
                        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      marginTop: 8,
                      transition: "all 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      color: "#10b981",
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(16, 185, 129, 0.2)";
                      e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)";
                      e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.3)";
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }}
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {t("admin.viewPublic")}
                  </button>
                ) : null;
              },
            },
            {
              key: "analytics",
              render: (place) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/${i18n.language || "hu"}/admin/places/${place.id}/analytics`);
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "var(--admin-primary, #2563eb)",
                    color: "var(--hl-on-dark-strong, #ffffff)",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: "clamp(13px, 3vw, 15px)",
                    fontWeight: 600,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    marginTop: 8,
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.18)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.24)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(15, 23, 42, 0.18)";
                  }}
                >
                  {t("admin.analyticsLabel")}
                </button>
              ),
            },
            // Only show status field if user has admin permissions (admin/superadmin/siteadmin)
            // Editor/viewer should not see isActive status
            ...(currentUser?.role === "superadmin" || currentUser?.role === "admin" || isSiteAdmin
              ? [
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
                          color: "var(--hl-on-dark-strong, #ffffff)",
                          fontSize: "clamp(14px, 3.5vw, 16px)",
                          fontWeight: 600,
                          fontFamily:
                            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        {place.isActive ? t("common.active") : t("common.inactive")}
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
          onEdit={startEdit}
          onView={(place) => {
            const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
            const translation =
              place.translations.find((t) => t.lang === currentLang) ||
              place.translations.find((t) => t.lang === "hu");

            if (!translation) {
              showToast(
                t("admin.errors.placeHasNoTranslation"),
                "error"
              );
              return;
            }

            if (!currentSite?.slug) {
              showToast(
                t("admin.errors.siteNotSelected"),
                "error"
              );
              return;
            }

            // Prefer place customDomain; else region host / platform slug path
            const slug =
              translation.slug ||
              (translation.name
                ? translation.name
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "")
                : "");
            if (!slug) {
              showToast(t("admin.errors.placeHasNoSlug"), "error");
              return;
            }
            const publicUrl = place.customDomain
              ? entityPublicAddress({
                  lang: i18n.language || "hu",
                  siteSlug: currentSite.slug,
                  entityType: "place",
                  entitySlug: slug,
                  primaryDomain: currentSite.primaryDomain,
                  customDomain: place.customDomain,
                })
              : buildPublicUrl({
                  lang: i18n.language || "hu",
                  siteKey: currentSite.slug,
                  entityType: "place",
                  slug,
                });

            window.open(publicUrl, "_blank");
          }}
          onDelete={(place) => {
            // Check if user can delete this place (owner or siteadmin)
            // We need to check the role for this specific place
            const checkAndDelete = async () => {
              if (!currentUser?.id) {
                showToast(t("admin.errors.notAuthorized"), "error");
                return;
              }
              // Superadmin and siteadmin can always delete
              if (
                currentUser.role === "superadmin" ||
                currentUser.role === "admin" ||
                isSiteAdmin
              ) {
                handleDelete(place.id);
                return;
              }
              // Check place role
              try {
                const data = await getPlaceMemberships(place.id, currentUser.id);
                const membership = data.find(
                  (m) => m.placeId === place.id && m.userId === currentUser.id
                );
                if (membership?.role === "owner") {
                  handleDelete(place.id);
                } else {
                  showToast(t("admin.errors.cannotDeletePlace"), "error");
                }
              } catch (err) {
                showToast(t("admin.errors.cannotDeletePlace"), "error");
              }
            };
            checkAndDelete();
          }}
          isLoading={isLoading}
          error={null}
        />
        </>
      )}
      {!isMobile && !isLoading && !isCreating && !editingId && pagination.total > 0 && (
        <div style={{ marginTop: 16 }}>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
            onLimitChange={(limit) => setPagination((prev) => ({ ...prev, limit, page: 1 }))}
          />
        </div>
      )}
    </div>
  );
}

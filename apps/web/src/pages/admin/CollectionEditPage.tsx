// src/pages/admin/CollectionEditPage.tsx
import { useState, useEffect, useContext, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../contexts/ToastContext";
import { AuthContext } from "../../contexts/AuthContext";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { SlugInput } from "../../components/SlugInput";
import { DomainInput } from "../../components/DomainInput";
import {
  getCollection,
  createCollection,
  updateCollection,
  addCollectionItem,
  updateCollectionItem,
  deleteCollectionItem,
  reorderCollectionItems,
  updateCollectionItems,
  getSites,
  type Collection,
  type Site,
} from "../../api/admin.api";
import { findTranslation } from "../../utils/langHelpers";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import { useConfirm } from "../../hooks/useConfirm";
import type { Lang } from "../../types/enums";

type TabId = "content" | "items";

export function CollectionEditPage() {
  const { t, i18n } = useTranslation();
  const { id: urlId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  
  // Use local state for id to avoid navigation/reload when creating new collection
  const [localId, setLocalId] = useState<string | undefined>(urlId);
  const id = localId || urlId;
  const isNew = !id || id === "new";
  const [collection, setCollection] = useState<Collection | null>(null);
  
    // Dynamic page title based on collection name
  useEffect(() => {
    const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
    const currentTranslation = collection
      ? findTranslation(collection.translations, currentLang)
      : null;
    const collectionTitle = currentTranslation?.title;
    const adminSuffix = t("admin.titleSuffix", { defaultValue: "Admin" });
    
    let title: string;
    if (isNew) {
      title = `${t("admin.collections")} - ${t("common.new")} | ${adminSuffix}`;
    } else if (collectionTitle) {
      title = `${collectionTitle} | ${adminSuffix}`;
    } else {
      title = `${t("admin.collections")} | ${adminSuffix}`;
    }
    
    // Truncate if too long (browser tabs typically show ~30-40 chars)
    if (title.length > 50) {
      const truncatedTitle = title.substring(0, 47) + "...";
      document.title = truncatedTitle;
    } else {
      document.title = title;
    }
  }, [collection, isNew, t, i18n.language]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("content");
  const autoSaveCompletedRef = useRef(false);
  const [formData, setFormData] = useState({
    slug: "",
    domain: "",
    domainEnabled: false,
    isActive: true,
    isCrawlable: true,
    order: 0,
    titleHu: "",
    titleEn: "",
    titleDe: "",
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
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [siteSearchQuery, setSiteSearchQuery] = useState("");
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  // Store pending items changes (additions, deletions, reordering) - only save on explicit save button click
  const [pendingItems, setPendingItems] = useState<Collection["items"] | null>(null);

  // Helper function to build translations array from form data
  const buildTranslations = useCallback(() => {
    const translations: Array<{
      lang: Lang;
      title: string;
      description?: string | null;
      heroImage?: string | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
      seoImage?: string | null;
      seoKeywords?: string[];
    }> = [];

    if (formData.titleHu) {
      translations.push({
        lang: "hu",
        title: formData.titleHu,
        description: formData.descriptionHu || null,
        heroImage: formData.heroImageHu || null,
        seoTitle: formData.seoTitleHu || null,
        seoDescription: formData.seoDescriptionHu || null,
        seoImage: formData.seoImageHu || null,
        seoKeywords: formData.seoKeywordsHu
          ? formData.seoKeywordsHu.split(",").map((k) => k.trim()).filter(Boolean)
          : [],
      });
    }
    if (formData.titleEn) {
      translations.push({
        lang: "en",
        title: formData.titleEn,
        description: formData.descriptionEn || null,
        heroImage: formData.heroImageEn || null,
        seoTitle: formData.seoTitleEn || null,
        seoDescription: formData.seoDescriptionEn || null,
        seoImage: formData.seoImageEn || null,
        seoKeywords: formData.seoKeywordsEn
          ? formData.seoKeywordsEn.split(",").map((k) => k.trim()).filter(Boolean)
          : [],
      });
    }
    if (formData.titleDe) {
      translations.push({
        lang: "de",
        title: formData.titleDe,
        description: formData.descriptionDe || null,
        heroImage: formData.heroImageDe || null,
        seoTitle: formData.seoTitleDe || null,
        seoDescription: formData.seoDescriptionDe || null,
        seoImage: formData.seoImageDe || null,
        seoKeywords: formData.seoKeywordsDe
          ? formData.seoKeywordsDe.split(",").map((k) => k.trim()).filter(Boolean)
          : [],
      });
    }

    return translations;
  }, [formData]);

  useEffect(() => {
    // Update localId when urlId changes (e.g., direct navigation)
    if (urlId && urlId !== localId) {
      setLocalId(urlId);
    }
  }, [urlId, localId]);

  useEffect(() => {
    console.log("useEffect [id, isNew]:", { id, isNew, isLoading, hasCollection: !!collection });
    // Only load if we don't already have the collection data (avoid reload after create)
    if (!isNew && id && (!collection || collection.id !== id)) {
      console.log("useEffect: loading collection", { id, currentCollectionId: collection?.id });
      loadCollection(true); // Show loading spinner
    } else {
      console.log("useEffect: new collection or no id or already loaded, setting loading to false");
      setIsLoading(false);
    }
    loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  // Auto-switch to items tab after successful save (for new collections)
  // This is now handled directly in handleTabChange, but keeping as backup
  useEffect(() => {
    if (id && !isNew && autoSaveCompletedRef.current && collection && activeTab === "content") {
      // Collection was just created, switch to items tab
      console.log("useEffect: auto-switching to items tab", { id, hasCollection: !!collection });
      setActiveTab("items");
      setIsAutoSaving(false);
      autoSaveCompletedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew, collection, activeTab]);

  const loadCollection = async (showLoading = false) => {
    console.log("loadCollection: called", { id, showLoading });
    if (!id || id === "new") {
      console.log("loadCollection: no id or is new, returning", { id });
      return;
    }
    if (showLoading) {
      console.log("loadCollection: setting isLoading to true");
      setIsLoading(true);
    }
    try {
      console.log("loadCollection: fetching collection", { id });
      const data = await getCollection(id);
      console.log("loadCollection: received data", { id: data.id, itemsCount: data.items?.length, items: data.items });
      setCollection(data);
      console.log("loadCollection: collection state updated", { id: data.id, itemsCount: data.items?.length });
      // Clear pending items when collection is reloaded from server
      setPendingItems(null);

      const translationHu = data.translations.find((t) => t.lang === "hu");
      const translationEn = data.translations.find((t) => t.lang === "en");
      const translationDe = data.translations.find((t) => t.lang === "de");

      setFormData({
        slug: data.slug,
        domain: data.domain || "",
        domainEnabled: !!data.domain,
        isActive: data.isActive,
        isCrawlable: data.isCrawlable ?? true,
        order: data.order,
        titleHu: translationHu?.title || "",
        titleEn: translationEn?.title || "",
        titleDe: translationDe?.title || "",
        descriptionHu: translationHu?.description || "",
        descriptionEn: translationEn?.description || "",
        descriptionDe: translationDe?.description || "",
        heroImageHu: translationHu?.heroImage || "",
        heroImageEn: translationEn?.heroImage || "",
        heroImageDe: translationDe?.heroImage || "",
        seoTitleHu: translationHu?.seoTitle || "",
        seoTitleEn: translationEn?.seoTitle || "",
        seoTitleDe: translationDe?.seoTitle || "",
        seoDescriptionHu: translationHu?.seoDescription || "",
        seoDescriptionEn: translationEn?.seoDescription || "",
        seoDescriptionDe: translationDe?.seoDescription || "",
        seoImageHu: translationHu?.seoImage || "",
        seoImageEn: translationEn?.seoImage || "",
        seoImageDe: translationDe?.seoImage || "",
        seoKeywordsHu: (translationHu?.seoKeywords || []).join(", "),
        seoKeywordsEn: (translationEn?.seoKeywords || []).join(", "),
        seoKeywordsDe: (translationDe?.seoKeywords || []).join(", "),
      });
      console.log("loadCollection: formData updated");
    } catch (err) {
      console.error("loadCollection: error", err);
      showToast(t("admin.errors.loadCollectionFailed"), "error");
    } finally {
      if (showLoading) {
        console.log("loadCollection: setting isLoading to false");
        setIsLoading(false);
      }
    }
  };

  const loadSites = async () => {
    try {
      const data = await getSites();
      setSites(data.filter((s) => s.isActive));
    } catch (err) {
      console.error("Failed to load sites", err);
    }
  };

  // Validate form - required fields: slug and at least one title
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.slug || !formData.slug.trim()) {
      errors.slug = t("admin.validation.slugRequired") || "Slug is required";
    }
    
    if (!formData.titleHu?.trim() && !formData.titleEn?.trim() && !formData.titleDe?.trim()) {
      errors.titleHu = t("admin.validation.atLeastOneTitleRequired") || "At least one title (HU, EN, or DE) is required";
    }
    
    console.log("validateForm:", { 
      hasSlug: !!formData.slug, 
      slug: formData.slug,
      hasTitleHu: !!formData.titleHu?.trim(),
      hasTitleEn: !!formData.titleEn?.trim(),
      hasTitleDe: !!formData.titleDe?.trim(),
      errors: Object.keys(errors),
      isValid: Object.keys(errors).length === 0
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Auto-save function (used when switching to items tab)
  const handleAutoSave = async (): Promise<boolean> => {
    if (!validateForm()) {
      return false;
    }

    setIsAutoSaving(true);
    setFormErrors({});

    try {
      const translations = buildTranslations();

      if (isNew || !id) {
        console.log("handleAutoSave: creating new collection", {
          slug: formData.slug,
          domain: formData.domainEnabled ? (formData.domain || null) : null,
          isActive: formData.isActive,
          isCrawlable: formData.isCrawlable,
          order: formData.order,
          translationsCount: translations.length,
          translations: translations
        });
        
        const newCollection = await createCollection({
          slug: formData.slug,
          domain: formData.domainEnabled ? (formData.domain || null) : null,
          isActive: formData.isActive,
          isCrawlable: formData.isCrawlable,
          order: formData.order,
          translations,
        });
        
        console.log("handleAutoSave: collection created successfully", { 
          id: newCollection.id, 
          slug: newCollection.slug 
        });
        
        // Update form data from the new collection
        const translationHu = newCollection.translations.find((t) => t.lang === "hu");
        const translationEn = newCollection.translations.find((t) => t.lang === "en");
        const translationDe = newCollection.translations.find((t) => t.lang === "de");
        
        setFormData({
          slug: newCollection.slug,
          domain: newCollection.domain || "",
          domainEnabled: !!newCollection.domain,
          isActive: newCollection.isActive,
          isCrawlable: newCollection.isCrawlable ?? true,
          order: newCollection.order,
          titleHu: translationHu?.title || "",
          titleEn: translationEn?.title || "",
          titleDe: translationDe?.title || "",
          descriptionHu: translationHu?.description || "",
          descriptionEn: translationEn?.description || "",
          descriptionDe: translationDe?.description || "",
          heroImageHu: translationHu?.heroImage || "",
          heroImageEn: translationEn?.heroImage || "",
          heroImageDe: translationDe?.heroImage || "",
          seoTitleHu: translationHu?.seoTitle || "",
          seoTitleEn: translationEn?.seoTitle || "",
          seoTitleDe: translationDe?.seoTitle || "",
          seoDescriptionHu: translationHu?.seoDescription || "",
          seoDescriptionEn: translationEn?.seoDescription || "",
          seoDescriptionDe: translationDe?.seoDescription || "",
          seoImageHu: translationHu?.seoImage || "",
          seoImageEn: translationEn?.seoImage || "",
          seoImageDe: translationDe?.seoImage || "",
          seoKeywordsHu: (translationHu?.seoKeywords || []).join(", "),
          seoKeywordsEn: (translationEn?.seoKeywords || []).join(", "),
          seoKeywordsDe: (translationDe?.seoKeywords || []).join(", "),
        });
        
        showToast(t("admin.messages.collectionCreated"), "success");
        notifyEntityChanged("collections");
        
        // Update local ID and collection state without navigation to avoid page reload
        setLocalId(newCollection.id);
        setCollection(newCollection);
        
        // Mark that auto-save completed - will switch tab after state update
        autoSaveCompletedRef.current = true;
        setIsAutoSaving(false);
        
        // Update URL silently without navigation/reload
        window.history.replaceState({}, "", `/admin/collections/${newCollection.id}/edit`);
        
        return true;
      } else if (id) {
        await updateCollection(id, {
          slug: formData.slug,
          domain: formData.domainEnabled ? (formData.domain || null) : null,
          isActive: formData.isActive,
          isCrawlable: formData.isCrawlable,
          order: formData.order,
          translations,
        });
        showToast(t("admin.messages.collectionUpdated"), "success");
        notifyEntityChanged("collections");
        await loadCollection();
        setIsAutoSaving(false);
        return true;
      }
      setIsAutoSaving(false);
      return false;
    } catch (err: any) {
      console.error("handleAutoSave: error creating/updating collection", err);
      const errorMessage = err?.response?.data?.message || err?.message || t("admin.errors.saveCollectionFailed");
      console.error("handleAutoSave: error message", errorMessage);
      showToast(errorMessage, "error");
      if (err?.response?.data?.errors) {
        console.error("handleAutoSave: validation errors", err.response.data.errors);
        setFormErrors(err.response.data.errors);
      }
      setIsAutoSaving(false);
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setFormErrors({});

    try {
      const translations = buildTranslations();

      if (isNew) {
        const newCollection = await createCollection({
          slug: formData.slug,
          domain: formData.domainEnabled ? (formData.domain || null) : null,
          isActive: formData.isActive,
          isCrawlable: formData.isCrawlable,
          order: formData.order,
          translations,
        });
        showToast(t("admin.messages.collectionCreated"), "success");
        notifyEntityChanged("collections");
        // Navigate back one step in history
        navigate(-1);
      } else if (id) {
        await updateCollection(id, {
          slug: formData.slug,
          domain: formData.domainEnabled ? (formData.domain || null) : null,
          isActive: formData.isActive,
          isCrawlable: formData.isCrawlable,
          order: formData.order,
          translations,
        });
        
        // Save pending items changes if any (additions, deletions, reordering)
        if (pendingItems) {
          await saveItems();
        }
        
        showToast(t("admin.messages.collectionUpdated"), "success");
        notifyEntityChanged("collections");
        await loadCollection();
        // Navigate back one step in history after update
        navigate(-1);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || t("admin.errors.saveCollectionFailed");
      showToast(errorMessage, "error");
      if (err?.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle tab change - auto-save if switching to items tab and collection is new
  const handleTabChange = async (newTab: TabId) => {
    console.log("handleTabChange: called", { newTab, isNew, id, currentTab: activeTab });
    
    if (newTab === "items" && (isNew || !id)) {
      console.log("handleTabChange: switching to items tab, need to auto-save first", { isNew, id });
      // Validate and auto-save before switching to items tab
      const saved = await handleAutoSave();
      console.log("handleTabChange: auto-save result", { saved, isNew, id });
      if (!saved) {
        // Don't switch tab if save failed - stay on content tab
        console.log("handleTabChange: auto-save failed, not switching tab");
        return;
      }
      // After successful save, switch to items tab immediately
      // The collection state is already updated in handleAutoSave
      console.log("handleTabChange: switching to items tab after save", { id, isNew, collectionId: collection?.id });
      setActiveTab(newTab);
      return;
    }
    console.log("handleTabChange: normal tab switch", { newTab });
    setActiveTab(newTab);
  };

  // Add item locally (no API call, will be saved on explicit save)
  const handleAddItem = (siteId: string) => {
    if (!id || isNew) {
      console.error("handleAddItem: missing id or isNew", { id, isNew });
      return;
    }

    // Get current items (use pendingItems if exists, otherwise use collection.items)
    const currentItems = pendingItems || collection?.items || [];
    
    // Check if site is already in the collection
    if (currentItems.some(item => item.siteId === siteId)) {
      showToast(t("admin.errors.itemAlreadyInCollection") || "This site is already in the collection", "error");
      return;
    }

    // Find the site to get its data
    const site = sites.find(s => s.id === siteId);
    if (!site) {
      showToast(t("admin.errors.siteNotFound") || "Site not found", "error");
      return;
    }

    // Create a temporary item (will get a real ID when saved)
    const newOrder = currentItems.length;
    const newItem: Collection["items"][0] = {
      id: `temp-${Date.now()}`, // Temporary ID
      collectionId: id,
      siteId: siteId,
      order: newOrder,
      isHighlighted: false,
      site: site as any, // Site object for UI display
      translations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Update pending items
    const updatedItems = [...currentItems, newItem];
    setPendingItems(updatedItems);
    
    console.log("handleAddItem: added item locally", { 
      siteId, 
      newOrder, 
      totalItems: updatedItems.length 
    });
    
    setSiteSearchQuery("");
  };

  // Delete item locally (no API call, no confirmation, will be saved on explicit save)
  const handleDeleteItem = (itemId: string) => {
    if (!id || isNew) {
      console.error("handleDeleteItem: missing id or isNew", { id, isNew });
      return;
    }

    // Get current items (use pendingItems if exists, otherwise use collection.items)
    const currentItems = pendingItems || collection?.items || [];
    
    // Remove the item
    const updatedItems = currentItems.filter(item => item.id !== itemId);
    setPendingItems(updatedItems);
    
    console.log("handleDeleteItem: deleted item locally", { 
      itemId, 
      remainingItems: updatedItems.length 
    });
  };

  // Store pending item order changes locally (no API call)
  const handleReorderItems = (itemIds: string[]) => {
    if (!id || isNew) return;
    
    // Get current items (use pendingItems if exists, otherwise use collection.items)
    const currentItems = pendingItems || collection?.items || [];
    
    // Reorder items according to itemIds
    const itemsMap = new Map(currentItems.map(item => [item.id, item]));
    const reorderedItems = itemIds
      .map(id => itemsMap.get(id))
      .filter((item): item is NonNullable<typeof item> => item !== undefined)
      .map((item, index) => ({ ...item, order: index }));
    
    // Update pending items with new order
    setPendingItems(reorderedItems);
    
    console.log("handleReorderItems: reordered items locally", { 
      itemIds, 
      itemsCount: reorderedItems.length 
    });
  };

  // Save pending items changes (called from handleSave)
  const saveItems = async () => {
    if (!id || isNew || !pendingItems) return;

    try {
      // Prepare items for backend (only send necessary fields, not full objects)
      const itemsToSave = pendingItems.map(item => ({
        id: item.id.startsWith('temp-') ? undefined : item.id,
        siteId: item.siteId,
        order: item.order,
        isHighlighted: item.isHighlighted,
        translations: item.translations?.map(t => ({
          lang: t.lang,
          titleOverride: t.titleOverride || null,
          descriptionOverride: t.descriptionOverride || null,
          imageOverride: t.imageOverride || null,
        })) || [],
      }));
      
      // Send the full items array to backend
      await updateCollectionItems(id, itemsToSave);
      notifyEntityChanged("collections");
      // Clear pending changes after successful save
      setPendingItems(null);
    } catch (err: any) {
      showToast(err?.message || t("admin.errors.saveItemsFailed"), "error");
      throw err; // Re-throw to let handleSave handle the error
    }
  };

  const isSuperadmin = currentUser?.role === "superadmin";

  if (!isSuperadmin) {
    return <div style={{ padding: 24 }}>{t("admin.accessDenied")}</div>;
  }

  if (isLoading) {
    return null;
  }

  const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
  const currentTranslation = collection
    ? findTranslation(collection.translations, currentLang)
    : null;

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "content", label: t("admin.collectionEdit.tabs.content") || "Tartalom" },
    { id: "items", label: t("admin.collectionEdit.tabs.items") || "Elemek" },
  ];

  // Get items for current collection (use pendingItems if exists, otherwise use collection.items)
  const items = pendingItems || collection?.items || [];
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  // Filter sites by search query
  const filteredSites = sites.filter((site) => {
    if (!siteSearchQuery.trim()) return true;
    const query = siteSearchQuery.toLowerCase();
    const translation = findTranslation(site.translations, currentLang);
    const name = translation?.name || "";
    const slug = site.slug || "";
    return name.toLowerCase().includes(query) || slug.toLowerCase().includes(query);
  });

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <AdminPageHeader
        title={currentTranslation?.title || collection?.slug || t("admin.collections.newCollection")}
        isCreatingOrEditing={true}
        onSave={handleSave}
        onCancel={() => navigate(-1)}
        saveLabel={t("common.save")}
        cancelLabel={t("common.cancel")}
      />

      {/* Form container with white background and shadow */}
      <div style={{ 
        padding: "clamp(24px, 5vw, 32px)", 
        background: "white", 
        borderRadius: 16, 
        marginBottom: 32, 
        boxShadow: "0 8px 24px rgba(102, 126, 234, 0.15)",
        border: "1px solid rgba(102, 126, 234, 0.1)",
      }}>
        {/* Status chips */}
        {collection && (
          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: "0.85em",
                backgroundColor: collection.isActive ? "#d1fae5" : "#fee2e2",
                color: collection.isActive ? "#065f46" : "#991b1b",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 500,
              }}
            >
              {collection.isActive ? t("common.active") : t("common.inactive")}
            </span>
            {collection.domain && (
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: "0.85em",
                  backgroundColor: "#dbeafe",
                  color: "#1e40af",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontWeight: 500,
                }}
              >
                {collection.domain}
              </span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            overflow: "hidden",
            background: "white",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 0,
              overflowX: "auto",
              borderBottom: "1px solid #e5e7eb",
              background: "#f9fafb",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("Tab button clicked", { tabId: tab.id, currentTab: activeTab });
                  handleTabChange(tab.id);
                }}
                style={{
                  padding: "16px 24px",
                  border: "none",
                  borderBottom: activeTab === tab.id ? "3px solid #667eea" : "3px solid transparent",
                  background: activeTab === tab.id ? "white" : "transparent",
                  color: activeTab === tab.id ? "#667eea" : "#6b7280",
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = "#f3f4f6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = activeTab === tab.id ? "white" : "transparent";
                  }
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {tab.label}
                  {tab.id === "items" && isAutoSaving && (
                    <span style={{ 
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      border: "2px solid currentColor",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.6s linear infinite",
                    }} />
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: "clamp(24px, 5vw, 32px)", minHeight: 400 }}>
            {activeTab === "content" && (
              <ContentTab
                formData={formData}
                setFormData={setFormData}
                formErrors={formErrors}
                t={t}
                i18n={i18n}
              />
            )}
            {activeTab === "items" && (
              <>
                {(!id || id === "new" || isAutoSaving) ? (
                  <div style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    padding: 48,
                    minHeight: 400,
                    gap: 16
                  }}>
                    <div style={{ 
                      color: "#6b7280",
                      fontSize: 14,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      textAlign: "center"
                    }}>
                      {isAutoSaving 
                        ? (t("admin.collectionEdit.savingCollection") || "Mentés...")
                        : (t("admin.collectionEdit.saveCollectionFirst") || "Kérjük, először mentsd el a collection-t a Tartalom tab-on")
                      }
                    </div>
                  </div>
                ) : (
                  <ItemsTab
                    collection={collection}
                    collectionId={id}
                    items={sortedItems}
                    sites={sites}
                    siteSearchQuery={siteSearchQuery}
                    setSiteSearchQuery={setSiteSearchQuery}
                    onAddItem={handleAddItem}
                    onDeleteItem={handleDeleteItem}
                    onReorderItems={handleReorderItems}
                    loadCollection={loadCollection}
                    draggedItemId={draggedItemId}
                    setDraggedItemId={setDraggedItemId}
                    dragOverItemId={dragOverItemId}
                    setDragOverItemId={setDragOverItemId}
                    currentLang={currentLang}
                    t={t}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// Content Tab Component
function ContentTab({
  formData,
  setFormData,
  formErrors,
  t,
  i18n,
}: {
  formData: any;
  setFormData: (data: any) => void;
  formErrors: Record<string, string>;
  t: any;
  i18n: any;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Language-specific fields - Title and Description first */}
      <LanguageAwareForm>
        {(selectedLang) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Title - FIRST */}
            <div>
              <label style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                color: ((selectedLang === "hu" && formErrors.titleHu) ||
                        (selectedLang === "en" && formErrors.titleEn) ||
                        (selectedLang === "de" && formErrors.titleDe)) ? "#dc3545" : "#374151",
              }}>
                {t("admin.collections.title")} ({selectedLang.toUpperCase()}) *
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
                  padding: "10px 14px",
                  border: ((selectedLang === "hu" && formErrors.titleHu) ||
                          (selectedLang === "en" && formErrors.titleEn) ||
                          (selectedLang === "de" && formErrors.titleDe)) ? "1px solid #dc3545" : "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => {
                  if (!((selectedLang === "hu" && formErrors.titleHu) ||
                        (selectedLang === "en" && formErrors.titleEn) ||
                        (selectedLang === "de" && formErrors.titleDe))) {
                    e.currentTarget.style.borderColor = "#667eea";
                  }
                }}
                onBlur={(e) => {
                  if (!((selectedLang === "hu" && formErrors.titleHu) ||
                        (selectedLang === "en" && formErrors.titleEn) ||
                        (selectedLang === "de" && formErrors.titleDe))) {
                    e.currentTarget.style.borderColor = "#d1d5db";
                  }
                }}
              />
              {((selectedLang === "hu" && formErrors.titleHu) ||
                (selectedLang === "en" && formErrors.titleEn) ||
                (selectedLang === "de" && formErrors.titleDe)) && (
                <div style={{ 
                  color: "#dc3545", 
                  fontSize: 14, 
                  marginTop: 6,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}>
                  {selectedLang === "hu" ? formErrors.titleHu :
                   selectedLang === "en" ? formErrors.titleEn :
                   formErrors.titleDe}
                </div>
              )}
            </div>

            {/* Slug - right after Title */}
            <div>
              <SlugInput
                value={formData.slug}
                onChange={(value) => setFormData({ ...formData, slug: value })}
                sourceName={
                  selectedLang === "hu"
                    ? formData.titleHu
                    : selectedLang === "en"
                    ? formData.titleEn
                    : formData.titleDe
                }
                lang={selectedLang}
                label={t("admin.collections.slug")}
                placeholder="auto-generated-from-title"
                required
                error={formErrors.slug}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: 8, 
                fontWeight: 600, 
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                color: "#374151",
              }}>
                {t("admin.collections.description")} ({selectedLang.toUpperCase()})
              </label>
              <TipTapEditorWithUpload
                value={
                  selectedLang === "hu"
                    ? formData.descriptionHu || ""
                    : selectedLang === "en"
                    ? formData.descriptionEn || ""
                    : formData.descriptionDe || ""
                }
                onChange={(html) => {
                  if (selectedLang === "hu") setFormData({ ...formData, descriptionHu: html });
                  else if (selectedLang === "en") setFormData({ ...formData, descriptionEn: html });
                  else setFormData({ ...formData, descriptionDe: html });
                }}
              />
            </div>

            {/* Hero Image */}
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: 8, 
                fontWeight: 600, 
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                color: "#374151",
              }}>
                {t("admin.collections.heroImage")} ({selectedLang.toUpperCase()})
              </label>
              <input
                type="text"
                value={
                  selectedLang === "hu"
                    ? formData.heroImageHu || ""
                    : selectedLang === "en"
                    ? formData.heroImageEn || ""
                    : formData.heroImageDe || ""
                }
                onChange={(e) => {
                  if (selectedLang === "hu") setFormData({ ...formData, heroImageHu: e.target.value });
                  else if (selectedLang === "en") setFormData({ ...formData, heroImageEn: e.target.value });
                  else setFormData({ ...formData, heroImageDe: e.target.value });
                }}
                placeholder="https://example.com/image.jpg"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#667eea";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
              />
            </div>

            {/* SEO Fields */}
            <div style={{ 
              marginTop: 24, 
              padding: 20, 
              background: "#f9fafb", 
              borderRadius: 12, 
              border: "1px solid #e5e7eb" 
            }}>
              <h4 style={{ 
                marginBottom: 20, 
                fontSize: "clamp(16px, 3.5vw, 18px)", 
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                color: "#374151",
              }}>
                SEO ({selectedLang.toUpperCase()})
              </h4>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: 8, 
                    fontWeight: 600, 
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    color: "#374151",
                  }}>
                    {t("admin.collections.seoTitle")}
                  </label>
                  <input
                    type="text"
                    value={
                      selectedLang === "hu"
                        ? formData.seoTitleHu || ""
                        : selectedLang === "en"
                        ? formData.seoTitleEn || ""
                        : formData.seoTitleDe || ""
                    }
                    onChange={(e) => {
                      if (selectedLang === "hu") setFormData({ ...formData, seoTitleHu: e.target.value });
                      else if (selectedLang === "en") setFormData({ ...formData, seoTitleEn: e.target.value });
                      else setFormData({ ...formData, seoTitleDe: e.target.value });
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      transition: "border-color 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#667eea";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#d1d5db";
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: 8, 
                    fontWeight: 600, 
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    color: "#374151",
                  }}>
                    {t("admin.collections.seoDescription")}
                  </label>
                  <textarea
                    value={
                      selectedLang === "hu"
                        ? formData.seoDescriptionHu || ""
                        : selectedLang === "en"
                        ? formData.seoDescriptionEn || ""
                        : formData.seoDescriptionDe || ""
                    }
                    onChange={(e) => {
                      if (selectedLang === "hu") setFormData({ ...formData, seoDescriptionHu: e.target.value });
                      else if (selectedLang === "en") setFormData({ ...formData, seoDescriptionEn: e.target.value });
                      else setFormData({ ...formData, seoDescriptionDe: e.target.value });
                    }}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      resize: "vertical",
                      transition: "border-color 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#667eea";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#d1d5db";
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: 8, 
                    fontWeight: 600, 
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    color: "#374151",
                  }}>
                    {t("admin.collections.seoImage")}
                  </label>
                  <input
                    type="text"
                    value={
                      selectedLang === "hu"
                        ? formData.seoImageHu || ""
                        : selectedLang === "en"
                        ? formData.seoImageEn || ""
                        : formData.seoImageDe || ""
                    }
                    onChange={(e) => {
                      if (selectedLang === "hu") setFormData({ ...formData, seoImageHu: e.target.value });
                      else if (selectedLang === "en") setFormData({ ...formData, seoImageEn: e.target.value });
                      else setFormData({ ...formData, seoImageDe: e.target.value });
                    }}
                    placeholder="https://example.com/seo-image.jpg"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      transition: "border-color 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#667eea";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#d1d5db";
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: 8, 
                    fontWeight: 600, 
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    color: "#374151",
                  }}>
                    {t("admin.collections.seoKeywords")}
                  </label>
                  <input
                    type="text"
                    value={
                      selectedLang === "hu"
                        ? formData.seoKeywordsHu || ""
                        : selectedLang === "en"
                        ? formData.seoKeywordsEn || ""
                        : formData.seoKeywordsDe || ""
                    }
                    onChange={(e) => {
                      if (selectedLang === "hu") setFormData({ ...formData, seoKeywordsHu: e.target.value });
                      else if (selectedLang === "en") setFormData({ ...formData, seoKeywordsEn: e.target.value });
                      else setFormData({ ...formData, seoKeywordsDe: e.target.value });
                    }}
                    placeholder={t("admin.collections.seoKeywordsPlaceholder")}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      transition: "border-color 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#667eea";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#d1d5db";
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </LanguageAwareForm>

      {/* Non-language-specific fields - after Title, Slug, Description */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <DomainInput
            value={formData.domain}
            onChange={(value) => setFormData({ ...formData, domain: value })}
            checked={formData.domainEnabled}
            onCheckedChange={(checked) => setFormData({ ...formData, domainEnabled: checked })}
            label={t("admin.collections.domain")}
          />
        </div>

        <div style={{ 
          display: "flex", 
          gap: 24, 
          flexWrap: "wrap",
          padding: "16px 20px",
          background: "#f8f8ff",
          borderRadius: 12,
          border: "2px solid #e0e7ff",
        }}>
          <label style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 10, 
            cursor: "pointer",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
            />
            <span style={{ 
              fontSize: "clamp(14px, 3.5vw, 16px)", 
              fontWeight: 500,
              color: "#374151",
            }}>
              {t("admin.collections.active")}
            </span>
          </label>

          <label style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 10, 
            cursor: "pointer",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            <input
              type="checkbox"
              checked={formData.isCrawlable}
              onChange={(e) => setFormData({ ...formData, isCrawlable: e.target.checked })}
              style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
            />
            <span style={{ 
              fontSize: "clamp(14px, 3.5vw, 16px)", 
              fontWeight: 500,
              color: "#374151",
            }}>
              {t("admin.collections.isCrawlable")}
            </span>
          </label>
        </div>

        <div>
          <label style={{ 
            display: "block", 
            marginBottom: 8, 
            fontWeight: 600, 
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: "#374151",
          }}>
            {t("admin.collections.order")}
          </label>
          <input
            type="number"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: "clamp(14px, 3.5vw, 16px)",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              transition: "border-color 0.2s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#667eea";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#d1d5db";
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Items Tab Component
function ItemsTab({
  collection,
  collectionId,
  items,
  sites,
  siteSearchQuery,
  setSiteSearchQuery,
  onAddItem,
  onDeleteItem,
  onReorderItems,
  draggedItemId,
  setDraggedItemId,
  dragOverItemId,
  setDragOverItemId,
  currentLang,
  t,
  loadCollection,
}: {
  collection: Collection | null;
  collectionId: string | undefined;
  items: Collection["items"];
  sites: Site[];
  siteSearchQuery: string;
  setSiteSearchQuery: (query: string) => void;
  onAddItem: (siteId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onReorderItems: (itemIds: string[]) => void;
  draggedItemId: string | null;
  setDraggedItemId: (id: string | null) => void;
  dragOverItemId: string | null;
  setDragOverItemId: (id: string | null) => void;
  currentLang: Lang;
  t: any;
  loadCollection?: (showLoading?: boolean) => Promise<void>;
}) {
  const [draggedSiteId, setDraggedSiteId] = useState<string | null>(null);
  const [dragOverCollectionPanel, setDragOverCollectionPanel] = useState<boolean>(false);
  const [dragOverCollectionItemId, setDragOverCollectionItemId] = useState<string | null>(null);
  const [siteSortOrder, setSiteSortOrder] = useState<"name" | "date">("name");
  // Use local state that syncs with items prop to ensure updates are reflected immediately
  // Initialize with sorted items to ensure consistent order
  const [currentItems, setCurrentItems] = useState(() => {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    return sorted;
  });
  // Track if user has made local reordering changes
  const hasLocalReorderingRef = useRef(false);
  
  // Use collectionId prop or fallback to collection?.id
  const effectiveCollectionId = collectionId || collection?.id;
  
  // Create a stable reference for items IDs to use in dependency array
  // Use a more stable comparison: include both IDs and order to detect actual changes
  const itemsIds = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    return sorted.map(i => `${i.id}:${i.order}`).join(',');
  }, [items]);
  
  // Use ref to track previous itemsIds to avoid infinite loops
  const prevItemsIdsRef = useRef<string>('');
  
  // Sync local state with items prop whenever it changes from server
  // But don't override if user has made local reordering changes (those will be saved on explicit save)
  useEffect(() => {
    // Sort items to ensure consistent order
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const sortedIds = sorted.map(i => i.id).join(',');
    
    // Only sync if the items actually changed from the server AND user hasn't made local changes
    if (sortedIds !== prevItemsIdsRef.current && !hasLocalReorderingRef.current) {
      console.log("ItemsTab: syncing items prop to local state", { 
        itemsPropLength: items.length,
        itemsCount: sorted.length,
        collectionId: collection?.id,
        itemsIds: sortedIds,
        prevItemsIds: prevItemsIdsRef.current
      });
      setCurrentItems(sorted);
      prevItemsIdsRef.current = sortedIds;
      
      // If server order matches our local order, it means changes were saved - reset the flag
      const currentItemsIds = currentItems.map(i => i.id).join(',');
      if (sortedIds === currentItemsIds) {
        hasLocalReorderingRef.current = false;
      }
    } else if (sortedIds !== prevItemsIdsRef.current && hasLocalReorderingRef.current) {
      // Server data changed but we have local changes - update prevItemsIdsRef to avoid re-syncing
      console.log("ItemsTab: skipping sync due to local reordering changes", {
        sortedIds,
        prevItemsIds: prevItemsIdsRef.current
      });
      prevItemsIdsRef.current = sortedIds;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsIds]);
  
  // Filter out already added sites
  const availableSites = sites.filter((site) => !currentItems.some((item) => item.siteId === site.id));
  
  // Helper to check if a site ID is available (not already in collection)
  const isSiteAvailable = (siteId: string) => {
    return availableSites.some(s => s.id === siteId);
  };
  
  // Filter by search query
  const filteredAvailableSites = availableSites.filter((site) => {
    if (!siteSearchQuery.trim()) return true;
    const query = siteSearchQuery.toLowerCase();
    const translation = site.translations.find((t) => t.lang === currentLang);
    const name = translation?.name || site.slug;
    return name.toLowerCase().includes(query) || site.slug.toLowerCase().includes(query);
  });

  // Sort available sites
  const sortedAvailableSites = [...filteredAvailableSites].sort((a, b) => {
    if (siteSortOrder === "name") {
      const aTranslation = a.translations.find((t) => t.lang === currentLang);
      const bTranslation = b.translations.find((t) => t.lang === currentLang);
      const aName = aTranslation?.name || a.slug;
      const bName = bTranslation?.name || b.slug;
      return aName.localeCompare(bName, currentLang);
    } else {
      // Sort by creation date (newest first) - createdAt is returned by backend
      const aDate = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const bDate = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      if (aDate === 0 && bDate === 0) {
        // Fallback to slug if no date
        return a.slug.localeCompare(b.slug, currentLang);
      }
      return bDate - aDate;
    }
  });

  // Handle drag start for collection items (reordering within collection)
  const handleCollectionItemDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.setData("application/collection-item", "true");
  };

  // Handle drag start for available sites (adding to collection)
  const handleSiteDragStart = (e: React.DragEvent, siteId: string) => {
    console.log("Drag start:", siteId);
    setDraggedSiteId(siteId);
    e.dataTransfer.effectAllowed = "copy";
    // Set data - use text/plain as primary (most compatible)
    e.dataTransfer.setData("text/plain", siteId);
    // Also set custom type for identification
    try {
      e.dataTransfer.setData("application/available-site", "true");
    } catch (err) {
      // Some browsers may not support custom MIME types
      console.warn("Could not set custom MIME type:", err);
    }
  };

  // Handle drag over for collection items (reordering)
  const handleCollectionItemDragOver = (e: React.DragEvent, itemId: string) => {
    // Only handle if dragging a collection item, not a site
    if (!draggedSiteId) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedItemId && draggedItemId !== itemId) {
        setDragOverItemId(itemId);
      }
    }
  };

  // Handle drag over for collection panel (adding new site)
  const handleCollectionPanelDragOver = (e: React.DragEvent) => {
    // Check if collection ID is available first
    if (!effectiveCollectionId || effectiveCollectionId === "new") {
      // Don't prevent default if we can't drop - this allows browser to show "not allowed" cursor
      e.dataTransfer.dropEffect = "none";
      setDragOverCollectionPanel(false);
      return;
    }
    
    // Always prevent default to allow drop (we'll check collection ID in drop handler)
    e.preventDefault();
    e.stopPropagation();
    
    // Check if dragging a site (from state or dataTransfer types)
    const hasDraggedSite = draggedSiteId || 
                          e.dataTransfer.types.includes("application/available-site") ||
                          e.dataTransfer.types.includes("text/plain");
    
    console.log("Drag over: allowing drop", { 
      collectionId, 
      hasDraggedSite, 
      draggedSiteId, 
      draggedItemId 
    });
    
    if (hasDraggedSite) {
      e.dataTransfer.dropEffect = "copy";
      setDragOverCollectionPanel(true);
    } else if (draggedItemId) {
      e.dataTransfer.dropEffect = "move";
      setDragOverCollectionPanel(true);
    } else {
      // Default: allow copy (for sites)
      e.dataTransfer.dropEffect = "copy";
      setDragOverCollectionPanel(true);
    }
  };

  // Handle drag leave for collection panel
  const handleCollectionPanelDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the panel (not just moving to a child)
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverCollectionPanel(false);
    }
  };

  // Handle drop on collection panel (add new site or reorder)
  const handleCollectionPanelDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Capture the dragged IDs immediately before any async operations
    const currentDraggedSiteId = draggedSiteId;
    const currentDraggedItemId = draggedItemId;
    
    // Use effectiveCollectionId (collectionId prop or collection?.id)
    const effectiveCollectionId = collectionId || collection?.id;
    
    console.log("Drop event on panel:", { 
      currentDraggedSiteId, 
      currentDraggedItemId,
      dataTransferTypes: Array.from(e.dataTransfer.types),
      dataTransferData: e.dataTransfer.getData("text/plain"),
      hasCollection: !!collection,
      collectionIdFromProp: collectionId,
      collectionIdFromCollection: collection?.id,
      effectiveCollectionId: effectiveCollectionId
    });
    
    // Ensure collection ID is available (not "new" and not undefined)
    if (!effectiveCollectionId || effectiveCollectionId === "new") {
      console.error("Cannot add item: collection ID not available", { 
        collectionId, 
        effectiveCollectionId,
        collectionIdFromProp: collectionId,
        collectionIdFromCollection: collection?.id,
        hasCollection: !!collection
      });
      e.dataTransfer.dropEffect = 'none';
      // The onAddItem will handle showing the error toast
      return;
    }
    
    // Ensure collection is loaded before proceeding
    if (!collection && loadCollection && effectiveCollectionId) {
      console.log("Collection not loaded, loading now...", { collectionId: effectiveCollectionId });
      try {
        await loadCollection(false);
        // Wait for state to update - need to wait longer for React to re-render
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error("Failed to load collection:", err);
        e.dataTransfer.dropEffect = 'none';
        return;
      }
    }
    
    // Try multiple ways to get the site ID
    const siteIdFromState = currentDraggedSiteId;
    const siteIdFromDataTransfer = e.dataTransfer.getData("text/plain");
    
    const siteIdToAdd = siteIdFromState || siteIdFromDataTransfer;
    
    // Check if it's an available site
    const isAvailableSite = siteIdFromState || 
                            e.dataTransfer.types.includes("application/available-site") ||
                            (siteIdToAdd && availableSites.some(s => s.id === siteIdToAdd));
    
    console.log("Drop check:", { 
      siteIdToAdd, 
      isAvailableSite, 
      currentDraggedSiteId, 
      currentDraggedItemId,
      siteIdFromState,
      siteIdFromDataTransfer,
      availableSiteIds: availableSites.map(s => s.id),
      hasCollection: !!collection,
      collectionId: collectionId,
      effectiveCollectionId: effectiveCollectionId
    });
    
    if (siteIdToAdd && isAvailableSite) {
      console.log("Adding site to collection:", siteIdToAdd);
      // Adding new site to collection - now just calls the handler (no API call)
      try {
        onAddItem(siteIdToAdd);
        console.log("Site added successfully (local)");
        // Set dropEffect to 'copy' to indicate successful drop
        e.dataTransfer.dropEffect = 'copy';
      } catch (err) {
        console.error("Failed to add item:", err);
        e.dataTransfer.dropEffect = 'none';
      }
    } else if (currentDraggedItemId) {
      console.log("Reordering item:", currentDraggedItemId);
      // Reordering within collection - drop at end
      const itemIds = currentItems.map((item) => item.id);
      const draggedIndex = itemIds.indexOf(currentDraggedItemId);
      if (draggedIndex !== -1) {
        const newItemIds = [...itemIds];
        newItemIds.splice(draggedIndex, 1);
        newItemIds.push(currentDraggedItemId);
        try {
          await onReorderItems(newItemIds);
          e.dataTransfer.dropEffect = 'move';
        } catch (err) {
          console.error("Failed to reorder items:", err);
          e.dataTransfer.dropEffect = 'none';
        }
      }
    } else {
      console.warn("Drop event but no valid dragged item:", { 
        siteIdToAdd, 
        isAvailableSite, 
        currentDraggedItemId,
        currentDraggedSiteId,
        types: Array.from(e.dataTransfer.types),
        allSites: sites.map(s => s.id),
        existingItems: currentItems.map(i => i.siteId)
      });
      e.dataTransfer.dropEffect = 'none';
    }

    // Clear state after processing (with a small delay to ensure dropEffect is set)
    setTimeout(() => {
      setDraggedSiteId(null);
      setDraggedItemId(null);
      setDragOverCollectionPanel(false);
      setDragOverItemId(null);
    }, 10);
  };

  // Handle drop on collection item (reordering only - site drops go to panel)
  const handleCollectionItemDrop = async (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only handle reordering collection items, not site drops
    if (draggedItemId && draggedItemId !== itemId) {
      console.log("Reordering item:", draggedItemId, "before:", itemId);
      // Reordering within collection
      const itemIds = currentItems.map((item) => item.id);
      const draggedIndex = itemIds.indexOf(draggedItemId);
      const dropIndex = itemIds.indexOf(itemId);

      if (draggedIndex !== -1 && dropIndex !== -1) {
        const newItemIds = [...itemIds];
        newItemIds.splice(draggedIndex, 1);
        newItemIds.splice(dropIndex, 0, draggedItemId);
        
        // Update local state immediately for instant UI feedback
        const itemsMap = new Map(currentItems.map(item => [item.id, item]));
        const reorderedItems = newItemIds
          .map(id => itemsMap.get(id))
          .filter((item): item is NonNullable<typeof item> => item !== undefined);
        
        // Mark that user has made local reordering changes BEFORE updating state
        // This prevents the sync effect from overriding our changes
        hasLocalReorderingRef.current = true;
        
        // Update local state immediately for instant UI feedback
        setCurrentItems(reorderedItems);
        
        // Notify parent about the change (no API call, just store for later save)
        onReorderItems(newItemIds);
        
        console.log("ItemsTab: reordered items locally", {
          draggedItemId,
          itemId,
          newItemIds,
          reorderedItemsCount: reorderedItems.length,
          hasLocalReordering: hasLocalReorderingRef.current
        });
      }
    }

    setDraggedSiteId(null);
    setDraggedItemId(null);
    setDragOverCollectionPanel(false);
    setDragOverItemId(null);
    setDragOverCollectionItemId(null);
  };

  // Handle drag leave for collection items
  const handleCollectionItemDragLeave = () => {
    setDragOverItemId(null);
    setDragOverCollectionItemId(null);
  };

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent) => {
    // Only clear state if drop was not successful (dropEffect is 'none')
    // If drop was successful, the drop handler will clear the state
    if (e.dataTransfer.dropEffect === 'none') {
      setDraggedSiteId(null);
      setDraggedItemId(null);
      setDragOverCollectionPanel(false);
      setDragOverItemId(null);
      setDragOverCollectionItemId(null);
    } else {
      // Clear state after a short delay to allow drop handler to read it
      setTimeout(() => {
        setDraggedSiteId(null);
        setDraggedItemId(null);
        setDragOverCollectionPanel(false);
        setDragOverItemId(null);
        setDragOverCollectionItemId(null);
      }, 50);
    }
  };

  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "1fr 1fr", 
      gap: 24,
      minHeight: 600,
    }}>
      {/* Left Panel: Available Sites */}
      <div style={{ 
        background: "white", 
        borderRadius: 12, 
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ 
          padding: 16, 
          background: "#f9fafb", 
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <h3 style={{ 
            fontSize: "1.1em", 
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: "#111827",
            margin: 0,
          }}>
            {t("admin.collectionEdit.availableSites") || "Rendelkezésre álló site-ok"} ({sortedAvailableSites.length})
          </h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ 
              fontSize: "clamp(12px, 3vw, 14px)",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              color: "#6b7280",
            }}>
              {t("admin.collectionEdit.sortBy") || "Rendezés:"}
            </label>
            <select
              value={siteSortOrder}
              onChange={(e) => setSiteSortOrder(e.target.value as "name" | "date")}
              style={{
                padding: "6px 10px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: "clamp(12px, 3vw, 14px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                background: "white",
                cursor: "pointer",
              }}
            >
              <option value="name">{t("admin.collectionEdit.sortByName") || "Név (ábécé)"}</option>
              <option value="date">{t("admin.collectionEdit.sortByDate") || "Létrehozás dátuma"}</option>
            </select>
          </div>
        </div>

        <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
          <input
            type="text"
            placeholder={t("admin.collectionEdit.searchSites")}
            value={siteSearchQuery}
            onChange={(e) => setSiteSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: "clamp(14px, 3.5vw, 16px)",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          />
        </div>

        <div style={{ 
          flex: 1,
          overflowY: "auto",
          padding: 8,
        }}>
          {sortedAvailableSites.length === 0 ? (
            <div style={{ 
              padding: 48, 
              textAlign: "center", 
              color: "#6b7280",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}>
              {siteSearchQuery ? t("admin.collectionEdit.noSitesFound") || "Nincs találat" : t("admin.collectionEdit.allSitesAdded") || "Minden site hozzáadva"}
            </div>
          ) : (
            <table style={{ 
              width: "100%", 
              borderCollapse: "collapse",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ 
                    padding: 12, 
                    textAlign: "left", 
                    borderBottom: "2px solid #e5e7eb", 
                    width: 40,
                    fontSize: "clamp(12px, 3vw, 14px)",
                    fontWeight: 600,
                    color: "#374151",
                  }}></th>
                  <th style={{ 
                    padding: 12, 
                    textAlign: "left", 
                    borderBottom: "2px solid #e5e7eb",
                    fontSize: "clamp(12px, 3vw, 14px)",
                    fontWeight: 600,
                    color: "#374151",
                  }}>
                    {t("common.name")}
                  </th>
                  <th style={{ 
                    padding: 12, 
                    textAlign: "left", 
                    borderBottom: "2px solid #e5e7eb",
                    fontSize: "clamp(12px, 3vw, 14px)",
                    fontWeight: 600,
                    color: "#374151",
                  }}>
                    {t("admin.collectionEdit.siteSlug") || "Site Slug"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAvailableSites.map((site) => {
                  const translation = site.translations.find((t) => t.lang === currentLang);
                  const name = translation?.name || site.slug;
                  const isDragging = draggedSiteId === site.id;

                  return (
                    <tr
                      key={site.id}
                      draggable
                      onDragStart={(e) => handleSiteDragStart(e, site.id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: isDragging ? "#f3f4f6" : "white",
                        opacity: isDragging ? 0.5 : 1,
                        cursor: "grab",
                        transition: "background 0.2s ease",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                      onMouseEnter={(e) => {
                        if (!isDragging) {
                          e.currentTarget.style.background = "#f9fafb";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDragging) {
                          e.currentTarget.style.background = "white";
                        }
                      }}
                    >
                      <td style={{ padding: 12, color: "#9ca3af", fontSize: 18 }}>
                        ⋮⋮
                      </td>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 500, fontSize: "clamp(14px, 3.5vw, 16px)", color: "#111827" }}>
                          {name}
                        </div>
                      </td>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontSize: "clamp(13px, 3vw, 14px)", color: "#6b7280" }}>
                          {site.slug}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ 
          padding: 12, 
          background: "#f9fafb", 
          borderTop: "1px solid #e5e7eb",
          fontSize: 12,
          color: "#6b7280",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          textAlign: "center",
        }}>
          {t("admin.collectionEdit.dragToAdd") || "Húzd a site-okat a jobb oldalra a hozzáadáshoz"}
        </div>
      </div>

      {/* Right Panel: Collection Items */}
      <div 
        style={{ 
          background: dragOverCollectionPanel ? "#e0e7ff" : "white", 
          borderRadius: 12, 
          border: dragOverCollectionPanel ? "2px dashed #667eea" : "1px solid #e5e7eb",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.2s ease",
          position: "relative",
        }}
        onDragOver={(e) => {
          // Always handle drag over on the panel itself
          handleCollectionPanelDragOver(e);
        }}
        onDragLeave={(e) => handleCollectionPanelDragLeave(e)}
        onDrop={(e) => {
          // Always handle drop on the panel itself
          console.log("Drop on panel container");
          handleCollectionPanelDrop(e);
        }}
      >
        <div style={{ 
          padding: 16, 
          background: "#f9fafb", 
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <h3 style={{ 
            fontSize: "1.1em", 
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: "#111827",
            margin: 0,
          }}>
            {t("admin.collectionEdit.items")} ({currentItems.length})
          </h3>
          {currentItems.length > 0 && (
            <div style={{ 
              fontSize: 12, 
              color: "#6b7280",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}>
              {t("admin.dragToReorder") || "Húzd az elemeket a rendezéshez"}
            </div>
          )}
        </div>

        {currentItems.length === 0 ? (
          <div style={{ 
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 48, 
            textAlign: "center", 
            color: "#6b7280",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            <div>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📋</div>
              <div>{t("admin.collectionEdit.noItems")}</div>
              <div style={{ fontSize: 12, marginTop: 8, color: "#9ca3af" }}>
                {t("admin.collectionEdit.dragSitesHere") || "Húzd ide a site-okat a bal oldalról"}
              </div>
            </div>
          </div>
        ) : (
          <div 
            style={{ flex: 1, overflowY: "auto" }}
            onDragOver={(e) => {
              // Allow site drops on the table container too
              const hasDraggedSite = draggedSiteId || 
                                    e.dataTransfer.types.includes("application/available-site") ||
                                    e.dataTransfer.types.includes("text/plain");
              if (hasDraggedSite) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "copy";
                setDragOverCollectionPanel(true);
              } else if (draggedItemId) {
                // Allow collection item reordering
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                setDragOverCollectionPanel(true);
              }
            }}
            onDrop={(e) => {
              // Handle drop on table container - bubble up to panel
              e.preventDefault();
              e.stopPropagation();
              console.log("Drop on table container:", { draggedSiteId, draggedItemId });
              // Call the panel drop handler directly
              handleCollectionPanelDrop(e);
            }}
          >
            <table style={{ 
              width: "100%", 
              borderCollapse: "collapse",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ 
                    padding: 12, 
                    textAlign: "left", 
                    borderBottom: "2px solid #e5e7eb", 
                    width: 40,
                    fontSize: "clamp(12px, 3vw, 14px)",
                    fontWeight: 600,
                    color: "#374151",
                  }}></th>
                  <th style={{ 
                    padding: 12, 
                    textAlign: "left", 
                    borderBottom: "2px solid #e5e7eb",
                    fontSize: "clamp(12px, 3vw, 14px)",
                    fontWeight: 600,
                    color: "#374151",
                  }}>
                    {t("common.name")}
                  </th>
                  <th style={{ 
                    padding: 12, 
                    textAlign: "left", 
                    borderBottom: "2px solid #e5e7eb",
                    fontSize: "clamp(12px, 3vw, 14px)",
                    fontWeight: 600,
                    color: "#374151",
                  }}>
                    {t("admin.collectionEdit.siteSlug") || "Site Slug"}
                  </th>
                  <th style={{ 
                    padding: 12, 
                    textAlign: "left", 
                    borderBottom: "2px solid #e5e7eb",
                    fontSize: "clamp(12px, 3vw, 14px)",
                    fontWeight: 600,
                    color: "#374151",
                  }}>
                    {t("admin.collectionEdit.status") || "Státusz"}
                  </th>
                  <th style={{ 
                    padding: 12, 
                    textAlign: "right", 
                    borderBottom: "2px solid #e5e7eb",
                    width: "1%",
                    whiteSpace: "nowrap",
                    fontSize: "clamp(12px, 3vw, 14px)",
                    fontWeight: 600,
                    color: "#374151",
                  }}>
                    {t("admin.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => {
                  const siteTranslation = item.site.translations.find((t) => t.lang === currentLang);
                  const itemTranslation = item.translations.find((t) => t.lang === currentLang);
                  const title = itemTranslation?.titleOverride || siteTranslation?.name || item.site.slug;
                  const isDragging = draggedItemId === item.id;
                  const isDragOver = dragOverItemId === item.id || dragOverCollectionItemId === item.id;

                  return (
                    <tr
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleCollectionItemDragStart(e, item.id)}
                      onDragOver={(e) => {
                        // If dragging a site, allow it to pass through to the panel (don't handle here)
                        if (draggedSiteId || e.dataTransfer.types.includes("application/available-site")) {
                          // Let the event bubble up to the panel
                          return;
                        }
                        // Only handle drag over if dragging a collection item
                        if (!draggedSiteId) {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCollectionItemDragOver(e, item.id);
                        }
                      }}
                      onDragLeave={handleCollectionItemDragLeave}
                      onDrop={(e) => {
                        // If dragging a site, don't handle here - let it bubble to panel
                        if (draggedSiteId || e.dataTransfer.types.includes("application/available-site")) {
                          return;
                        }
                        // Handle drop - use state directly
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedItemId) {
                          // Reordering collection item
                          handleCollectionItemDrop(e, item.id);
                        }
                      }}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: isDragging ? "#f3f4f6" : isDragOver ? "#e0e7ff" : "white",
                        opacity: isDragging ? 0.5 : 1,
                        cursor: "move",
                        transition: "background 0.2s ease",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                      onMouseEnter={(e) => {
                        if (!isDragging && !isDragOver) {
                          e.currentTarget.style.background = "#f9fafb";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDragging && !isDragOver) {
                          e.currentTarget.style.background = "white";
                        }
                      }}
                    >
                      <td style={{ padding: 12, color: "#9ca3af", fontSize: 18 }}>
                        ⋮⋮
                      </td>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 500, fontSize: "clamp(14px, 3.5vw, 16px)", color: "#111827", marginBottom: 4 }}>
                          {title}
                        </div>
                      </td>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontSize: "clamp(13px, 3vw, 14px)", color: "#6b7280" }}>
                          {item.site.slug}
                        </div>
                      </td>
                      <td style={{ padding: 12 }}>
                        {item.isHighlighted && (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 4,
                              fontSize: "clamp(11px, 2.5vw, 12px)",
                              backgroundColor: "#fef3c7",
                              color: "#92400e",
                              fontWeight: 500,
                            }}
                          >
                            {t("admin.collectionEdit.highlighted")}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: 12, textAlign: "right" }}>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          style={{
                            padding: "6px 12px",
                            border: "1px solid #fee2e2",
                            borderRadius: 6,
                            background: "#fee2e2",
                            color: "#991b1b",
                            cursor: "pointer",
                            fontSize: "clamp(12px, 3vw, 14px)",
                            fontWeight: 500,
                            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#fecaca";
                            e.currentTarget.style.borderColor = "#fca5a5";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#fee2e2";
                            e.currentTarget.style.borderColor = "#fee2e2";
                          }}
                        >
                          {t("common.delete")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

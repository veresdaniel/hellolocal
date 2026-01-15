// src/pages/admin/CategoriesPage.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import { useConfirm } from "../../hooks/useConfirm";
import { useAdminSite } from "../../contexts/AdminSiteContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../contexts/ToastContext";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Pagination } from "../../components/Pagination";
import { AdminResponsiveTable, type TableColumn, type CardField } from "../../components/AdminResponsiveTable";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";
import { findTranslation } from "../../utils/langHelpers";
import type { Lang } from "../../types/enums";

interface Category {
  id: string;
  tenantId: string;
  parentId: string | null;
  isActive: boolean;
  color: string | null;
  order: number;
  parent?: Category | null;
  translations: Array<{
    id: string;
    lang: string;
    name: string;
    description: string | null;
  }>;
}

export function CategoriesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  usePageTitle("admin.categories");
  const { selectedSiteId, isLoading: isSiteLoading } = useAdminSite();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nameHu: "",
    nameEn: "",
    nameDe: "",
    descriptionHu: "",
    descriptionEn: "",
    descriptionDe: "",
    isActive: true,
    color: "",
    parentId: "" as string | "",
    order: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedSiteId) {
      // Reset to first page when site changes
      setPagination(prev => ({ ...prev, page: 1 }));
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
      loadCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, pagination.page, pagination.limit]);

  const loadCategories = async () => {
    if (!selectedSiteId) return;
    setIsLoading(true);
    try {
      const response = await getCategories(selectedSiteId, pagination.page, pagination.limit);
      // Backend always returns paginated response now
      if (Array.isArray(response)) {
        // Fallback for backward compatibility (should not happen)
        setCategories(response);
        setPagination(prev => ({ ...prev, total: response.length, totalPages: 1 }));
      } else {
        setCategories(response.categories || []);
        setPagination(response.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.loadCategoriesFailed"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.nameHu.trim()) errors.nameHu = t("admin.validation.hungarianNameRequired");
    // English and German are optional
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!selectedSiteId) return;
    if (!validateForm()) return;

    try {
      const translations: Array<{ lang: string; name: string; description: string | null }> = [
        { lang: "hu", name: formData.nameHu, description: formData.descriptionHu || null },
      ];
      if (formData.nameEn.trim()) {
        translations.push({ lang: "en", name: formData.nameEn, description: formData.descriptionEn || null });
      }
      if (formData.nameDe.trim()) {
        translations.push({ lang: "de", name: formData.nameDe, description: formData.descriptionDe || null });
      }
      await createCategory({
        tenantId: selectedSiteId,
        parentId: formData.parentId || null,
        translations,
        isActive: formData.isActive,
        color: formData.color || null,
        order: formData.order,
      });
      setIsCreating(false);
      resetForm();
      await loadCategories();
      // Notify global cache manager that categories have changed
      notifyEntityChanged("categories");
      showToast(t("admin.messages.categoryCreated"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.createCategoryFailed"), "error");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validateForm()) return;

    try {
      const translations: Array<{ lang: string; name: string; description: string | null }> = [
        { lang: "hu", name: formData.nameHu, description: formData.descriptionHu || null },
      ];
      if (formData.nameEn.trim()) {
        translations.push({ lang: "en", name: formData.nameEn, description: formData.descriptionEn || null });
      }
      if (formData.nameDe.trim()) {
        translations.push({ lang: "de", name: formData.nameDe, description: formData.descriptionDe || null });
      }
      await updateCategory(
        id,
        {
          parentId: formData.parentId || null,
          translations,
          isActive: formData.isActive,
          color: formData.color || null,
          order: formData.order,
        },
        selectedSiteId || undefined
      );
      setEditingId(null);
      resetForm();
      await loadCategories();
      // Notify global cache manager that categories have changed
      notifyEntityChanged("categories");
      showToast(t("admin.messages.categoryUpdated"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updateCategoryFailed"), "error");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t("admin.confirmations.deleteCategory") || "Delete Category",
      message: t("admin.confirmations.deleteCategory") || "Are you sure you want to delete this category? This action cannot be undone.",
      confirmLabel: t("common.delete") || "Delete",
      cancelLabel: t("common.cancel") || "Cancel",
      confirmVariant: "danger",
      size: "medium",
    });

    if (!confirmed) return;

    try {
      await deleteCategory(id, selectedSiteId || undefined);
      await loadCategories();
      // Notify global cache manager that categories have changed
      notifyEntityChanged("categories");
      showToast(t("admin.messages.categoryDeleted"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.deleteCategoryFailed"), "error");
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    const hu = findTranslation(category.translations, "hu" as Lang);
    const en = findTranslation(category.translations, "en" as Lang);
    const de = findTranslation(category.translations, "de" as Lang);
    setFormData({
      nameHu: hu?.name || "",
      nameEn: en?.name || "",
      nameDe: de?.name || "",
      descriptionHu: hu?.description || "",
      descriptionEn: en?.description || "",
      descriptionDe: de?.description || "",
      isActive: category.isActive,
      color: category.color || "",
      parentId: category.parentId || "",
      order: category.order,
    });
  };

  const resetForm = () => {
    setFormData({
      nameHu: "",
      nameEn: "",
      nameDe: "",
      descriptionHu: "",
      descriptionEn: "",
      descriptionDe: "",
      isActive: true,
      color: "",
      parentId: "",
      order: 0,
    });
    setFormErrors({});
  };

  // Wait for site context to initialize
  if (isSiteLoading) {
    return null;
  }

  if (!selectedSiteId) {
    return <div style={{ padding: 24 }}>{t("admin.table.pleaseSelectSite")}</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <AdminPageHeader
        title={t("admin.categories")}
        newButtonLabel={t("admin.forms.newCategory")}
        onNewClick={() => {
          setEditingId(null);
          setIsCreating(true);
          resetForm();
        }}
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
            fontSize: "clamp(18px, 4vw, 22px)",
            fontWeight: 700,
            fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            {editingId ? t("admin.forms.editCategory") : t("admin.forms.newCategory")}
          </h2>

          <LanguageAwareForm>
            {(selectedLang) => (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
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
                  <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("common.description")}</label>
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
                    uploadFolder="editor/categories"
                  />
                </div>
              </>
            )}
          </LanguageAwareForm>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4 }}>
              {t("admin.parentCategory") || "Szülő kategória"}
            </label>
            <select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
            >
              <option value="">{t("admin.noParentCategory")}</option>
              {categories
                .filter((cat) => !editingId || cat.id !== editingId) // Don't allow self as parent
                .map((cat) => {
                  const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
                  const translation = findTranslation(cat.translations, currentLang) || 
                                     findTranslation(cat.translations, "hu" as Lang);
                  const displayName = translation?.name || cat.id;
                  const parentName = cat.parent 
                    ? (findTranslation(cat.parent.translations, currentLang) || 
                       findTranslation(cat.parent.translations, "hu" as Lang))?.name || ""
                    : "";
                  return (
                    <option key={cat.id} value={cat.id}>
                      {parentName ? `${parentName} > ` : ""}{displayName}
                    </option>
                  );
                })}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4 }}>
              {t("admin.order") || "Sorrend"}
            </label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
              min={0}
            />
            <p style={{ color: "#666", fontSize: 12, marginTop: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              {t("admin.orderDescription") || "Kisebb szám = előrébb a listában"}
            </p>
          </div>

          {/* Active Checkbox - moved to top */}
          <div style={{ marginBottom: 16, padding: "16px 20px", background: "#f8f8ff", borderRadius: 12, border: "2px solid #e0e7ff" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 15 }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#667eea" }}
              />
              <span style={{ color: "#333", fontWeight: 500 }}>{t("common.active")}</span>
            </label>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
              {t("admin.categoryColor") || "Kategória színe (kártya alján)"}
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="color"
                value={formData.color || "#667eea"}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                style={{
                  width: 60,
                  height: 40,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              />
              <input
                type="text"
                value={formData.color || ""}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#667eea"
                pattern="^#[0-9A-Fa-f]{6}$"
                style={{
                  flex: 1,
                  padding: 8,
                  fontSize: 14,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                }}
              />
            </div>
            <p style={{ color: "#666", fontSize: 12, marginTop: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              {t("admin.categoryColorDescription") || "Ez a szín jelenik meg a kártya alján. Hex formátum (pl. #667eea)"}
            </p>
          </div>
        </div>
      )}

      {/* Desktop: Drag & Drop Table */}
      {!isCreating && !editingId && !isMobile && (
        <div style={{ background: "white", borderRadius: 8, overflow: "hidden", border: "1px solid #ddd" }}>
          <div style={{ padding: 12, background: "#f5f5f5", borderBottom: "1px solid #ddd", fontSize: 12, color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
            {t("admin.dragToReorder") || "Húzd a kategóriákat a rendezéshez. Húzd egy kategória alá, hogy gyermek kategóriává tedd."}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd", width: 40 }}></th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("common.name")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.parentCategory") || "Szülő"}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.order") || "Sorrend"}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.table.status")}</th>
                <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #ddd", width: "1%", whiteSpace: "nowrap" }}>{t("admin.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => {
                // Get current language or fallback to Hungarian
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation = category.translations.find((t) => t.lang === currentLang) || 
                                   category.translations.find((t) => t.lang === "hu");
                const parentTranslation = category.parent 
                  ? (category.parent.translations.find((t) => t.lang === currentLang) || 
                     category.parent.translations.find((t) => t.lang === "hu"))
                  : null;
                const isDragging = draggedId === category.id;
                const isDragOver = dragOverId === category.id;
                return (
                  <tr
                    key={category.id}
                    draggable={!isMobile}
                    onDragStart={!isMobile ? (e) => {
                      setDraggedId(category.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", category.id);
                    } : undefined}
                    onDragOver={!isMobile ? (e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverId !== category.id && draggedId !== category.id) {
                        setDragOverId(category.id);
                      }
                    } : undefined}
                    onDragLeave={!isMobile ? () => {
                      if (dragOverId === category.id) {
                        setDragOverId(null);
                      }
                    } : undefined}
                    onDrop={!isMobile ? async (e) => {
                      e.preventDefault();
                      const draggedCategoryId = e.dataTransfer.getData("text/plain");
                      if (!draggedCategoryId || draggedCategoryId === category.id) {
                        setDraggedId(null);
                        setDragOverId(null);
                        return;
                      }

                      const draggedCategory = categories.find((c) => c.id === draggedCategoryId);
                      if (!draggedCategory) {
                        setDraggedId(null);
                        setDragOverId(null);
                        return;
                      }

                      // Prevent dropping on itself or its children
                      const isDescendant = (parentId: string, childId: string): boolean => {
                        const child = categories.find((c) => c.id === childId);
                        if (!child || !child.parentId) return false;
                        if (child.parentId === parentId) return true;
                        return isDescendant(parentId, child.parentId);
                      };

                      if (isDescendant(draggedCategoryId, category.id)) {
                        showToast(t("admin.errors.cannotDropOnChild") || "Cannot drop category on its own child", "error");
                        setDraggedId(null);
                        setDragOverId(null);
                        return;
                      }

                      // Determine new parent and order
                      // If dropping on a root category (no parent), make it a child of that category
                      // If dropping on a child category, make it a sibling (same parent)
                      let targetParentId: string | null;
                      if (category.parentId) {
                        // Dropping on a child category - make it a sibling (same parent)
                        targetParentId = category.parentId;
                      } else {
                        // Dropping on a root category - make it a child of that category
                        targetParentId = category.id;
                      }
                      
                      // Prevent setting self as parent
                      if (targetParentId === draggedCategoryId) {
                        targetParentId = null;
                      }
                      
                      const isMovingToDifferentParent = (draggedCategory.parentId ?? null) !== (targetParentId ?? null);
                      
                      // Get all categories that will be in the target group (same parent, excluding dragged one)
                      const targetGroup = categories
                        .filter((c) => {
                          if (c.id === draggedCategoryId) return false;
                          if (targetParentId) {
                            return (c.parentId ?? null) === targetParentId;
                          } else {
                            return (c.parentId ?? null) === null;
                          }
                        })
                        .sort((a, b) => a.order - b.order);

                      // Find target position - where to insert the dragged category
                      const targetIndex = targetGroup.findIndex((c) => c.id === category.id);
                      const insertPosition = targetIndex >= 0 ? targetIndex : targetGroup.length;

                      // Build updates array
                      const updates: Array<{ id: string; parentId: string | null; order: number }> = [];
                      
                      // Get all categories that will be in the target group after the move
                      // This includes all current target group members + the dragged category
                      const finalTargetGroup: Array<{ id: string; currentOrder: number }> = [];
                      
                      // Add all current target group members (excluding dragged if it's already there)
                      targetGroup.forEach(c => {
                        if (c.id !== draggedCategoryId) {
                          finalTargetGroup.push({ id: c.id, currentOrder: c.order });
                        }
                      });
                      
                      // Sort by current order
                      finalTargetGroup.sort((a, b) => a.currentOrder - b.currentOrder);
                      
                      // Insert dragged category at target position
                      finalTargetGroup.splice(insertPosition, 0, { 
                        id: draggedCategoryId, 
                        currentOrder: draggedCategory.order 
                      });
                      
                      // Update all categories in target group with new orders
                      finalTargetGroup.forEach((item, newOrder) => {
                        const currentCat = categories.find(c => c.id === item.id);
                        if (!currentCat) {
                          console.error(`Category not found: ${item.id}`);
                          return;
                        }
                        
                        const currentParentId = currentCat.parentId ?? null;
                        const needsParentUpdate = isMovingToDifferentParent && currentParentId !== targetParentId;
                        const needsOrderUpdate = currentCat.order !== newOrder;
                        
                        if (needsParentUpdate || needsOrderUpdate) {
                          updates.push({
                            id: item.id,
                            parentId: isMovingToDifferentParent ? targetParentId : currentParentId,
                            order: newOrder,
                          });
                        }
                      });
                      
                      // If moving to different parent, update old siblings to fill the gap
                      if (isMovingToDifferentParent) {
                        const oldParentId = draggedCategory.parentId ?? null;
                        const oldGroup = categories
                          .filter((c) => {
                            if (c.id === draggedCategoryId) return false;
                            return (c.parentId ?? null) === oldParentId;
                          })
                          .sort((a, b) => a.order - b.order);
                        
                        oldGroup.forEach((sibling, idx) => {
                          if (sibling.order !== idx) {
                            updates.push({
                              id: sibling.id,
                              parentId: sibling.parentId ?? null,
                              order: idx,
                            });
                          }
                        });
                      }

                      // Validate all category IDs exist before sending
                      const allUpdateIds = updates.map(u => u.id);
                      const missingIds = allUpdateIds.filter(id => !categories.find(c => c.id === id));
                      if (missingIds.length > 0) {
                        console.error("Missing category IDs:", missingIds);
                        console.error("Available categories:", categories.map(c => c.id));
                        showToast(t("admin.errors.invalidCategoryIds") || `Invalid category IDs: ${missingIds.join(", ")}`, "error");
                        setDraggedId(null);
                        setDragOverId(null);
                        return;
                      }

                      // Only send if there are actual changes
                      if (updates.length === 0) {
                        setDraggedId(null);
                        setDragOverId(null);
                        return;
                      }


                      try {
                        // Double-check all IDs exist before sending
                        const allIds = updates.map(u => u.id);
                        const allParentIds = updates.filter(u => u.parentId).map(u => u.parentId!);
                        const missingCategoryIds = allIds.filter(id => !categories.find(c => c.id === id));
                        const missingParentIds = allParentIds.filter(id => !categories.find(c => c.id === id));
                        
                        if (missingCategoryIds.length > 0) {
                          console.error("Missing category IDs before send:", missingCategoryIds);
                          showToast(t("admin.errors.invalidCategoryIds") || `Invalid category IDs: ${missingCategoryIds.join(", ")}`, "error");
                          setDraggedId(null);
                          setDragOverId(null);
                          return;
                        }
                        
                        if (missingParentIds.length > 0) {
                          console.error("Missing parent category IDs before send:", missingParentIds);
                          showToast(t("admin.errors.parentCategoriesNotFound") || `Invalid parent category IDs: ${missingParentIds.join(", ")}`, "error");
                          setDraggedId(null);
                          setDragOverId(null);
                          return;
                        }
                        
                        await reorderCategories(selectedSiteId!, updates);
                        await loadCategories();
                        notifyEntityChanged("categories");
                        showToast(t("admin.messages.categoriesReordered"), "success");
                      } catch (err) {
                        console.error("=== REORDER ERROR ===");
                        console.error("Error object:", err);
                        console.error("Error message:", err instanceof Error ? err.message : String(err));
                        console.error("Error stack:", err instanceof Error ? err.stack : "N/A");
                        console.error("Request was:", {
                          tenantId: selectedSiteId,
                          updates: updates,
                        });
                        console.error("====================");
                        
                        let errorMessage = err instanceof Error ? err.message : t("admin.errors.reorderFailed") || "Failed to reorder categories";
                        
                        // Translate backend error messages
                        if (errorMessage.includes("Some categories not found or don't belong to tenant")) {
                          errorMessage = t("admin.errors.categoriesNotFound");
                        } else if (errorMessage.includes("Some parent categories not found or don't belong to tenant")) {
                          errorMessage = t("admin.errors.parentCategoriesNotFound");
                        } else if (errorMessage.includes("One or more categories not found during update")) {
                          errorMessage = t("admin.errors.oneOrMoreCategoriesNotFound");
                        } else if (errorMessage.includes("Category not found")) {
                          errorMessage = t("admin.errors.categoryNotFound");
                        } else if (errorMessage.includes("404") || errorMessage.includes("Not Found") || errorMessage.includes("Endpoint not found")) {
                          errorMessage = t("admin.errors.reorderFailed") + " (404 - Endpoint nem található. Ellenőrizd, hogy a backend fut-e a 3002-es porton és hogy az /api/admin/categories/reorder route létezik-e)";
                        }
                        
                        showToast(errorMessage, "error");
                      }

                      setDraggedId(null);
                      setDragOverId(null);
                    } : undefined}
                    onDragEnd={!isMobile ? () => {
                      setDraggedId(null);
                      setDragOverId(null);
                    } : undefined}
                    style={{
                      borderBottom: "1px solid #eee",
                      opacity: isDragging ? 0.5 : 1,
                      background: isDragOver ? "#e3f2fd" : "transparent",
                      cursor: isMobile ? "default" : "move",
                    }}
                  >
                    <td style={{ padding: 12, textAlign: "center", color: "#999" }}>
                      <span style={{ fontSize: 18 }}>⋮⋮</span>
                    </td>
                    <td style={{ padding: 12, paddingLeft: category.parentId ? 32 : 12 }}>
                      {category.parentId && <span style={{ color: "#999", marginRight: 8 }}>└─</span>}
                      {translation?.name || "-"}
                    </td>
                    <td style={{ padding: 12 }}>{parentTranslation?.name || "-"}</td>
                    <td style={{ padding: 12 }}>{category.order}</td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          background: category.isActive ? "#28a745" : "#dc3545",
                          color: "white",
                          fontSize: 12,
                        }}
                      >
                        {category.isActive ? t("common.active") : t("common.inactive")}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => startEdit(category)}
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
                          onClick={() => handleDelete(category.id)}
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
          {categories.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", color: "#999" }}>{t("admin.table.noData")}</div>
          )}
          {pagination.total > 0 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
              onLimitChange={(limit) => setPagination(prev => ({ ...prev, limit, page: 1 }))}
            />
          )}
        </div>
      )}
      
      {/* Mobile: AdminResponsiveTable */}
      {!isCreating && !editingId && isMobile && (
        <AdminResponsiveTable<Category>
          data={categories}
          getItemId={(category) => category.id}
          searchQuery={searchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.categories")}
          onSearchChange={(query) => {
            setSearchQuery(query);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          filterFn={(category, query) => {
            const lowerQuery = query.toLowerCase();
            const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
            const translation = category.translations.find((t) => t.lang === currentLang) || 
                               category.translations.find((t) => t.lang === "hu");
            return translation?.name.toLowerCase().includes(lowerQuery) || false;
          }}
          isLoading={isLoading}
          columns={[
            {
              key: "name",
              label: t("common.name"),
              render: (category) => {
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const translation = category.translations.find((t) => t.lang === currentLang) || 
                                   category.translations.find((t) => t.lang === "hu");
                return translation?.name || "-";
              },
            },
            {
              key: "parent",
              label: t("admin.parentCategory") || "Szülő",
              render: (category) => {
                if (!category.parent) return "-";
                const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                const parentTranslation = category.parent.translations.find((t) => t.lang === currentLang) || 
                                         category.parent.translations.find((t) => t.lang === "hu");
                return parentTranslation?.name || "-";
              },
            },
            {
              key: "status",
              label: t("admin.table.status"),
              render: (category) => (
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: category.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {category.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          cardTitle={(category) => {
            const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
            const translation = category.translations.find((t) => t.lang === currentLang) || 
                               category.translations.find((t) => t.lang === "hu");
            return translation?.name || "-";
          }}
          cardSubtitle={(category) => {
            if (!category.parent) return null;
            const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
            const parentTranslation = category.parent.translations.find((t) => t.lang === currentLang) || 
                                     category.parent.translations.find((t) => t.lang === "hu");
            return parentTranslation ? `↳ ${parentTranslation.name}` : null;
          }}
          cardFields={[
            {
              key: "order",
              render: (category) => (
                <div style={{ color: "#666", fontSize: 14, marginBottom: 8 }}>
                  #{category.order}
                </div>
              ),
            },
            {
              key: "status",
              render: (category) => (
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: category.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {category.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          onEdit={startEdit}
          onDelete={(category) => handleDelete(category.id)}
          error={null}
        />
      )}
    </div>
  );
}


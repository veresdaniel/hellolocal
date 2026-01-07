// src/pages/admin/CategoriesPage.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import { useAdminTenant } from "../../contexts/AdminTenantContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "../../api/admin.api";
import { LanguageAwareForm } from "../../components/LanguageAwareForm";
import { TipTapEditor } from "../../components/TipTapEditor";

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
  usePageTitle("admin.categories");
  const { selectedTenantId } = useAdminTenant();
  const queryClient = useQueryClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    if (selectedTenantId) {
      loadCategories();
    }
  }, [selectedTenantId]);

  const loadCategories = async () => {
    if (!selectedTenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCategories(selectedTenantId);
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadCategoriesFailed"));
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
    if (!selectedTenantId) return;
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
        tenantId: selectedTenantId,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.createCategoryFailed"));
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
        selectedTenantId || undefined
      );
      setEditingId(null);
      resetForm();
      await loadCategories();
      // Invalidate and refetch places and events cache to refresh filters and lists (all languages and filter combinations)
      await queryClient.invalidateQueries({ queryKey: ["places"] });
      await queryClient.refetchQueries({ queryKey: ["places"] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await queryClient.refetchQueries({ queryKey: ["events"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateCategoryFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmations.deleteCategory"))) return;

    try {
      await deleteCategory(id, selectedTenantId || undefined);
      await loadCategories();
      // Notify global cache manager that categories have changed
      notifyEntityChanged("categories");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteCategoryFailed"));
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    const hu = category.translations.find((t) => t.lang === "hu");
    const en = category.translations.find((t) => t.lang === "en");
    const de = category.translations.find((t) => t.lang === "de");
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

  if (!selectedTenantId) {
    return <div style={{ padding: 24 }}>{t("admin.table.pleaseSelectTenant")}</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>{t("admin.categories")}</h1>
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
          + {t("admin.forms.newCategory")}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4 }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ padding: 24, background: "white", borderRadius: 8, marginBottom: 24, border: "1px solid #ddd" }}>
          <h2 style={{ marginBottom: 16 }}>{editingId ? t("admin.forms.editCategory") : t("admin.forms.newCategory")}</h2>

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
                  const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
                  const translation = cat.translations.find((t) => t.lang === currentLang) || 
                                     cat.translations.find((t) => t.lang === "hu");
                  const displayName = translation?.name || cat.id;
                  const parentName = cat.parent 
                    ? (cat.parent.translations.find((t) => t.lang === currentLang) || 
                       cat.parent.translations.find((t) => t.lang === "hu"))?.name || ""
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
            <p style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
              {t("admin.orderDescription") || "Kisebb szám = előrébb a listában"}
            </p>
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
            <p style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
              {t("admin.categoryColorDescription") || "Ez a szín jelenik meg a kártya alján. Hex formátum (pl. #667eea)"}
            </p>
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
          <div style={{ padding: 12, background: "#f5f5f5", borderBottom: "1px solid #ddd", fontSize: 12, color: "#666" }}>
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
                    draggable
                    onDragStart={(e) => {
                      setDraggedId(category.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", category.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverId !== category.id && draggedId !== category.id) {
                        setDragOverId(category.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverId === category.id) {
                        setDragOverId(null);
                      }
                    }}
                    onDrop={async (e) => {
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
                        setError(t("admin.errors.cannotDropOnChild") || "Cannot drop category on its own child");
                        setDraggedId(null);
                        setDragOverId(null);
                        return;
                      }

                      // Determine new parent and order
                      // If dropping on a root category (no parent), make it a child of that category
                      // If dropping on a child category, make it a sibling (same parent)
                      const newParentId = category.parentId ? category.parentId : (category.id === draggedCategoryId ? draggedCategory.parentId : category.id);
                      
                      // Get all siblings (categories with same parent, excluding dragged one)
                      const siblings = categories
                        .filter((c) => {
                          if (c.id === draggedCategoryId) return false;
                          if (newParentId) {
                            return c.parentId === newParentId;
                          } else {
                            return !c.parentId;
                          }
                        })
                        .sort((a, b) => a.order - b.order);

                      // Find target position
                      const targetIndex = siblings.findIndex((c) => c.id === category.id);
                      const newOrder = targetIndex >= 0 ? targetIndex : siblings.length;

                      // Build updates array
                      const updates: Array<{ id: string; parentId: string | null; order: number }> = [];
                      
                      // Update dragged category
                      updates.push({
                        id: draggedCategoryId,
                        parentId: newParentId === draggedCategoryId ? null : newParentId,
                        order: newOrder,
                      });

                      // Update siblings that come after the new position
                      siblings.forEach((sibling, idx) => {
                        if (idx >= newOrder) {
                          updates.push({
                            id: sibling.id,
                            parentId: sibling.parentId,
                            order: idx + 1,
                          });
                        } else {
                          // Update order for siblings before (to maintain order)
                          updates.push({
                            id: sibling.id,
                            parentId: sibling.parentId,
                            order: idx,
                          });
                        }
                      });

                      try {
                        await reorderCategories(selectedTenantId!, updates);
                        await loadCategories();
                        notifyEntityChanged("categories");
                        setError(null);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : t("admin.errors.reorderFailed") || "Failed to reorder categories");
                      }

                      setDraggedId(null);
                      setDragOverId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDragOverId(null);
                    }}
                    style={{
                      borderBottom: "1px solid #eee",
                      opacity: isDragging ? 0.5 : 1,
                      background: isDragOver ? "#e3f2fd" : "transparent",
                      cursor: "move",
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
        </div>
      ) : null}
    </div>
  );
}


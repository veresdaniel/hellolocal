// src/pages/admin/GalleriesPage.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect, useRef } from "react";
import { useAdminSite } from "../../contexts/AdminSiteContext";
import {
  getGalleries,
  createGallery,
  updateGallery,
  deleteGallery,
  type Gallery,
  type GalleryImage,
  type CreateGalleryDto,
  type UpdateGalleryDto,
} from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { AdminResponsiveTable, type TableColumn, type CardField } from "../../components/AdminResponsiveTable";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { uploadService } from "../../services/upload/uploadService";

// Generate UUID v4 (using crypto.randomUUID if available, fallback to simple random)
const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export function GalleriesPage() {
  const { t } = useTranslation();
  const { selectedSiteId, isLoading: isSiteLoading } = useAdminSite();
  usePageTitle("admin.galleries");
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    images: [] as GalleryImage[],
    layout: "grid" as "grid" | "masonry" | "carousel",
    columns: { base: 2, md: 3, lg: 4 },
    aspect: "auto" as "auto" | "square" | "4:3" | "16:9",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedSiteId) {
      loadGalleries();
    } else {
      setIsLoading(false);
    }
  }, [selectedSiteId]);

  const loadGalleries = async () => {
    if (!selectedSiteId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getGalleries(selectedSiteId);
      setGalleries(response.galleries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadGalleriesFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (formData.images.length === 0) {
      errors.images = t("admin.validation.atLeastOneImageRequired");
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const url = await uploadService.uploadImage(file, {
          folder: `galleries/${selectedSiteId}`,
        });

        // Get image dimensions
        return new Promise<GalleryImage>((resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve({
              id: generateId(),
              src: url,
              width: img.width,
              height: img.height,
              alt: file.name,
              caption: "",
            });
          };
          img.onerror = () => {
            resolve({
              id: generateId(),
              src: url,
              alt: file.name,
              caption: "",
            });
          };
          img.src = url;
        });
      });

      const newImages = await Promise.all(uploadPromises);
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.uploadFailed"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== imageId),
    }));
  };

  const handleUpdateImageCaption = (imageId: string, caption: string) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img) => (img.id === imageId ? { ...img, caption } : img)),
    }));
  };

  const handleReorderImages = (newOrder: GalleryImage[]) => {
    setFormData((prev) => ({
      ...prev,
      images: newOrder,
    }));
  };

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError(t("admin.errors.invalidUrl") || "Invalid URL");
      return;
    }

    // Get image dimensions if possible
    const imageId = generateId();
    const newImage: GalleryImage = {
      id: imageId,
      src: url,
      alt: "",
      caption: "",
    };

    // Add image first
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, newImage],
    }));
    setImageUrlInput("");

    // Try to get image dimensions
    const img = new Image();
    img.onload = () => {
      setFormData((prev) => ({
        ...prev,
        images: prev.images.map((imgItem) =>
          imgItem.id === imageId ? { ...imgItem, width: img.width, height: img.height } : imgItem
        ),
      }));
    };
    img.onerror = () => {
      // Image failed to load, but we'll still keep it in the list
    };
    img.src = url;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      images: [],
      layout: "grid",
      columns: { base: 2, md: 3, lg: 4 },
      aspect: "auto",
      isActive: true,
    });
    setFormErrors({});
  };

  const handleCreate = async () => {
    if (!selectedSiteId) return;
    if (!validateForm()) return;

    try {
      await createGallery({
        siteId: selectedSiteId,
        name: formData.name || null,
        images: formData.images,
        layout: formData.layout,
        columns: formData.columns,
        aspect: formData.aspect,
        isActive: formData.isActive,
      });
      setIsCreating(false);
      resetForm();
      await loadGalleries();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.createGalleryFailed"));
    }
  };

  const handleUpdate = async (id: string) => {
    if (!selectedSiteId) return;
    if (!validateForm()) return;

    try {
      await updateGallery(
        id,
        {
          name: formData.name || null,
          images: formData.images,
          layout: formData.layout,
          columns: formData.columns,
          aspect: formData.aspect,
          isActive: formData.isActive,
        },
        selectedSiteId
      );
      setEditingId(null);
      resetForm();
      await loadGalleries();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateGalleryFailed"));
    }
  };

  const handleDelete = async (gallery: { id: string }) => {
    if (!selectedSiteId) return;
    if (!confirm(t("admin.confirmations.deleteGallery"))) return;

    try {
      await deleteGallery(gallery.id, selectedSiteId);
      await loadGalleries();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteGalleryFailed"));
    }
  };

  const handleEdit = (gallery: Gallery) => {
    setEditingId(gallery.id);
    setFormData({
      name: gallery.name || "",
      images: gallery.images || [],
      layout: gallery.layout || "grid",
      columns: gallery.columns || { base: 2, md: 3, lg: 4 },
      aspect: gallery.aspect || "auto",
      isActive: gallery.isActive,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    resetForm();
  };

  const getShortcode = (galleryId: string) => {
    return `[gallery id="${galleryId}"]`;
  };

  const filterFn = (gallery: Gallery, query: string) => {
    if (!query) return true;
    const lowerQuery = query.toLowerCase();
    return (
      gallery.name?.toLowerCase().includes(lowerQuery) ||
      gallery.id.toLowerCase().includes(lowerQuery) ||
      (gallery.images?.length || 0).toString().includes(lowerQuery)
    );
  };

  const filteredGalleries = galleries.filter((gallery) => filterFn(gallery, searchQuery));

  const columns: TableColumn<Gallery>[] = [
    {
      key: "name",
      label: t("admin.galleries.name"),
      render: (gallery) => gallery.name || `Gallery ${gallery.id.slice(0, 8)}`,
    },
    {
      key: "images",
      label: t("admin.galleries.images"),
      render: (gallery) => `${gallery.images?.length || 0} ${t("admin.galleries.imagesCount")}`,
    },
    {
      key: "layout",
      label: t("admin.galleries.layout"),
      render: (gallery) => gallery.layout || "grid",
    },
    {
      key: "isActive",
      label: t("admin.common.isActive"),
      render: (gallery) => (gallery.isActive ? t("admin.common.yes") : t("admin.common.no")),
    },
    {
      key: "shortcode",
      label: t("admin.galleries.shortcode"),
      render: (gallery) => (
        <code style={{ fontSize: "0.85em", background: "#f5f5f5", padding: "2px 6px", borderRadius: "3px" }}>
          {getShortcode(gallery.id)}
        </code>
      ),
    },
  ];

  const cardFields: CardField<Gallery>[] = [
    {
      key: "name",
      render: (gallery) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("admin.galleries.name")}</div>
          <div>{gallery.name || `Gallery ${gallery.id.slice(0, 8)}`}</div>
        </div>
      ),
    },
    {
      key: "images",
      render: (gallery) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("admin.galleries.images")}</div>
          <div>{gallery.images?.length || 0} {t("admin.galleries.imagesCount")}</div>
        </div>
      ),
    },
    {
      key: "layout",
      render: (gallery) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("admin.galleries.layout")}</div>
          <div>{gallery.layout || "grid"}</div>
        </div>
      ),
    },
    {
      key: "isActive",
      render: (gallery) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("admin.common.isActive")}</div>
          <div>{gallery.isActive ? t("admin.common.yes") : t("admin.common.no")}</div>
        </div>
      ),
    },
  ];

  if (isSiteLoading || isLoading) {
    return null;
  }

  if (!selectedSiteId) {
    return <div>{t("admin.common.selectSite")}</div>;
  }

  return (
    <div>
      <AdminPageHeader
        title={t("admin.galleries.title")}
        onNewClick={() => setIsCreating(true)}
        newButtonLabel={t("admin.galleries.createGallery")}
        showNewButton={!isCreating && !editingId}
        isCreatingOrEditing={isCreating || !!editingId}
      />

      {error && (
        <div style={{ padding: "12px", margin: "12px 0", background: "#fee", color: "#c33", borderRadius: "4px" }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ padding: "20px", margin: "20px 0", background: "#f9f9f9", borderRadius: "8px" }}>
          <h3>{isCreating ? t("admin.galleries.createGallery") : t("admin.galleries.editGallery")}</h3>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              {t("admin.galleries.name")} ({t("admin.common.optional")})
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
              placeholder={t("admin.galleries.namePlaceholder")}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              {t("admin.galleries.images")} *
            </label>
            {formErrors.images && (
              <div style={{ color: "#c33", marginBottom: "8px", fontSize: "0.9em" }}>{formErrors.images}</div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{
                  padding: "8px 16px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: isUploading ? "not-allowed" : "pointer",
                }}
              >
                {isUploading ? t("admin.common.uploading") : t("admin.galleries.addImages")}
              </button>
              <div style={{ display: "flex", gap: "8px", flex: 1, minWidth: "200px" }}>
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                  placeholder={t("admin.galleries.addImageUrl") || "Add image URL..."}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  disabled={!imageUrlInput.trim()}
                  style={{
                    padding: "8px 16px",
                    background: imageUrlInput.trim() ? "#10b981" : "#ccc",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: imageUrlInput.trim() ? "pointer" : "not-allowed",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("admin.common.add") || "Add"}
                </button>
              </div>
            </div>

            {formData.images.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: "12px",
                  marginTop: "12px",
                }}
              >
                {formData.images.map((image, index) => (
                  <div
                    key={image.id}
                    style={{
                      position: "relative",
                      background: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={image.src}
                      alt={image.alt || `Image ${index + 1}`}
                      style={{ width: "100%", height: "150px", objectFit: "cover", display: "block" }}
                    />
                    <div style={{ padding: "8px" }}>
                      <textarea
                        value={image.caption || ""}
                        onChange={(e) => handleUpdateImageCaption(image.id, e.target.value)}
                        placeholder={t("admin.galleries.captionPlaceholder")}
                        style={{
                          width: "100%",
                          minHeight: "60px",
                          padding: "4px",
                          fontSize: "0.85em",
                          border: "1px solid #ddd",
                          borderRadius: "3px",
                          resize: "vertical",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image.id)}
                        style={{
                          marginTop: "4px",
                          padding: "4px 8px",
                          background: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          cursor: "pointer",
                          fontSize: "0.85em",
                          width: "100%",
                        }}
                      >
                        {t("admin.common.remove")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              {t("admin.galleries.layout")}
            </label>
            <select
              value={formData.layout}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, layout: e.target.value as "grid" | "masonry" | "carousel" }))
              }
              style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
            >
              <option value="grid">{t("admin.galleries.layoutGrid")}</option>
              <option value="masonry">{t("admin.galleries.layoutMasonry")}</option>
              <option value="carousel">{t("admin.galleries.layoutCarousel")}</option>
            </select>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              {t("admin.galleries.aspect")}
            </label>
            <select
              value={formData.aspect}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, aspect: e.target.value as "auto" | "square" | "4:3" | "16:9" }))
              }
              style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
            >
              <option value="auto">{t("admin.galleries.aspectAuto")}</option>
              <option value="square">{t("admin.galleries.aspectSquare")}</option>
              <option value="4:3">{t("admin.galleries.aspect4_3")}</option>
              <option value="16:9">{t("admin.galleries.aspect16_9")}</option>
            </select>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              {t("admin.common.isActive")}
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button
              type="button"
              onClick={isCreating ? handleCreate : () => handleUpdate(editingId!)}
              style={{
                padding: "10px 20px",
                background: "#667eea",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {isCreating ? t("admin.common.create") : t("admin.common.save")}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: "10px 20px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {t("admin.common.cancel")}
            </button>
          </div>
        </div>
      )}

      <AdminResponsiveTable<Gallery>
        data={filteredGalleries}
        getItemId={(gallery) => gallery.id}
        filterFn={filterFn}
        searchQuery={searchQuery}
        searchPlaceholder={t("admin.searchPlaceholders.galleries") || t("admin.galleries.title")}
        onSearchChange={setSearchQuery}
        columns={columns}
        cardTitle={(gallery) => gallery.name || `Gallery ${gallery.id.slice(0, 8)}`}
        cardFields={cardFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

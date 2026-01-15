// src/pages/admin/CollectionsPage.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import {
  getCollections,
  deleteCollection,
  type Collection,
} from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { AdminResponsiveTable, type TableColumn, type CardField } from "../../components/AdminResponsiveTable";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { findTranslation } from "../../utils/langHelpers";
import { notifyEntityChanged } from "../../hooks/useAdminCache";
import type { Lang } from "../../types/enums";
import { useConfirm } from "../../hooks/useConfirm";
import { buildUrl } from "../../app/urls";
import { DEFAULT_SITE_SLUG, HAS_MULTIPLE_SITES } from "../../app/config";

export function CollectionsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  usePageTitle("admin.collectionsPageTitle");
  const confirm = useConfirm();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCollections();
      setCollections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadCollectionsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (collection: Collection) => {
    const confirmed = await confirm({
      title: t("admin.confirmations.deleteCollection") || "Delete Collection",
      message: t("admin.confirmations.deleteCollection") || "Are you sure you want to delete this collection? This action cannot be undone.",
      confirmLabel: t("common.delete") || "Delete",
      cancelLabel: t("common.cancel") || "Cancel",
      confirmVariant: "danger",
      size: "medium",
    });

    if (!confirmed) return;

    try {
      await deleteCollection(collection.id);
      notifyEntityChanged("collections");
      await loadCollections();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteCollectionFailed"));
    }
  };

  const startEdit = (collection: Collection) => {
    navigate(`/admin/collections/${collection.id}/edit`);
  };

  const handleView = (collection: Collection) => {
    const lang = (i18n.language || "hu").split("-")[0];
    // Collections route doesn't include siteKey
    const publicUrl = `/${lang}/collections/${collection.slug}`;
    window.open(publicUrl, "_blank");
  };

  const isSuperadmin = currentUser?.role === "superadmin";

  if (!isSuperadmin) {
    return <div style={{ padding: 24 }}>{t("admin.accessDenied")}</div>;
  }

  const currentLang = (i18n.language || "hu").split("-")[0] as Lang;

  const columns: TableColumn<Collection>[] = [
    {
      key: "title",
      label: t("admin.collections.title"),
      render: (collection) => {
        const translation = findTranslation(collection.translations, currentLang);
        const title = translation?.title || t("admin.collections.noTranslation");
        const hasFallback = !translation && collection.translations.length > 0;
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{title}</div>
            {hasFallback && (
              <div style={{ fontSize: "0.85em", color: "#666", marginTop: 4 }}>
                ({t("admin.collections.fallbackTranslation")})
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "slug",
      label: t("admin.collections.slug"),
      render: (collection) => (
        <code style={{ fontSize: "0.9em", color: "#666" }}>{collection.slug}</code>
      ),
    },
    {
      key: "domain",
      label: t("admin.collections.domain"),
      render: (collection) => (
        <span style={{ color: collection.domain ? "#000" : "#999" }}>
          {collection.domain || t("admin.collections.noDomain")}
        </span>
      ),
    },
    {
      key: "isActive",
      label: t("admin.collections.active"),
      render: (collection) => (
        <span
          style={{
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: "0.85em",
            backgroundColor: collection.isActive ? "#d1fae5" : "#fee2e2",
            color: collection.isActive ? "#065f46" : "#991b1b",
          }}
        >
          {collection.isActive ? t("common.yes") : t("common.no")}
        </span>
      ),
    },
    {
      key: "itemsCount",
      label: t("admin.collections.itemsCount"),
      render: (collection) => (
        <span>{collection.itemsCount ?? collection.items?.length ?? 0}</span>
      ),
    },
  ];

  // Define cardTitle function
  const getCardTitle = (collection: Collection) => {
    const translation = findTranslation(collection.translations, currentLang);
    return translation?.title || t("admin.collections.noTranslation");
  };

  const cardFields: CardField<Collection>[] = [
    {
      key: "title",
      label: t("admin.collections.title"),
      render: (collection) => {
        const translation = findTranslation(collection.translations, currentLang);
        return translation?.title || t("admin.collections.noTranslation");
      },
    },
    {
      key: "slug",
      label: t("admin.collections.slug"),
      render: (collection) => (
        <code style={{ fontSize: "0.9em" }}>{collection.slug}</code>
      ),
    },
    {
      key: "domain",
      label: t("admin.collections.domain"),
      render: (collection) => collection.domain || t("admin.collections.noDomain"),
    },
    {
      key: "isActive",
      label: t("admin.collections.active"),
      render: (collection) => (
        <span
          style={{
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: "0.85em",
            backgroundColor: collection.isActive ? "#d1fae5" : "#fee2e2",
            color: collection.isActive ? "#065f46" : "#991b1b",
          }}
        >
          {collection.isActive ? t("common.yes") : t("common.no")}
        </span>
      ),
    },
    {
      key: "isCrawlable",
      label: t("admin.collections.isCrawlable"),
      render: (collection) => (
        <span
          style={{
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: "0.85em",
            backgroundColor: collection.isCrawlable ? "#dbeafe" : "#fee2e2",
            color: collection.isCrawlable ? "#1e40af" : "#991b1b",
          }}
        >
          {collection.isCrawlable ? t("common.yes") : t("common.no")}
        </span>
      ),
    },
    {
      key: "itemsCount",
      label: t("admin.collections.itemsCount"),
      render: (collection) => collection.itemsCount ?? collection.items?.length ?? 0,
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <AdminPageHeader
        title={t("admin.collectionsPageTitle")}
        newButtonLabel={t("admin.collections.newCollection")}
        onNewClick={() => navigate("new")}
        showNewButton={true}
        isCreatingOrEditing={false}
      />

      {error && (
        <div
          style={{
            padding: "clamp(12px, 3vw, 16px)",
            marginBottom: 24,
            background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
            color: "#991b1b",
            borderRadius: 12,
            border: "1px solid #fca5a5",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {isLoading ? null : (
        <AdminResponsiveTable
          data={collections}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("admin.collections.searchPlaceholder")}
          filterFn={(collection, query) => {
            if (!query.trim()) return true;
            const searchQuery = query.toLowerCase();
            const translation = findTranslation(collection.translations, currentLang);
            const title = translation?.title || "";
            const slug = collection.slug || "";
            const domain = collection.domain || "";
            return (
              title.toLowerCase().includes(searchQuery) ||
              slug.toLowerCase().includes(searchQuery) ||
              domain.toLowerCase().includes(searchQuery)
            );
          }}
          columns={columns}
          cardTitle={getCardTitle}
          cardFields={cardFields}
          onEdit={startEdit}
          onDelete={handleDelete}
          onView={handleView}
          shouldShowView={(collection) => collection.isActive}
          getItemId={(item) => item.id}
          emptyMessage={t("admin.collections.noCollections")}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminFilterableList } from "../../components/AdminFilterableList";
import { AdminHierarchyFilters } from "../../components/AdminHierarchyFilters";
import { AiPostfixField } from "../../components/AiGeneratePostfixButton";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useAdminSite } from "../../contexts/useAdminSite";
import { useToast } from "../../contexts/ToastContext";
import { useAdminHierarchyFilters } from "../../hooks/useAdminHierarchyFilters";
import {
  createProduct,
  deleteProduct,
  getAdminProducts,
  updateProduct,
  type AdminProduct,
  type ProductWriteInput,
} from "../../api/products.api";
import { uploadService } from "../../services/upload/uploadService";
import { LANG_VALUES, type Lang } from "../../app/config";
import "../../styles/products.css";

type Draft = {
  id?: string;
  price: string;
  currency: string;
  imageUrl: string;
  category: string;
  placeId: string;
  isActive: boolean;
  sortOrder: string;
  names: Record<Lang, string>;
  descriptions: Record<Lang, string>;
};

type FormErrors = {
  placeId?: string;
  name?: string;
};

type VisibilityFilter = "all" | "visible" | "hidden";

const PAGE_SIZE_DEFAULT = 10;

function emptyDraft(): Draft {
  return {
    price: "",
    currency: "HUF",
    imageUrl: "",
    category: "",
    placeId: "",
    isActive: true,
    sortOrder: "0",
    names: { hu: "", en: "", de: "" },
    descriptions: { hu: "", en: "", de: "" },
  };
}

function draftFrom(product: AdminProduct): Draft {
  const draft = emptyDraft();
  draft.id = product.id;
  draft.price = String(product.price);
  draft.currency = product.currency;
  draft.imageUrl = product.imageUrl || "";
  draft.category = product.category;
  draft.placeId = product.placeId || "";
  draft.isActive = product.isActive;
  draft.sortOrder = String(product.sortOrder);
  for (const row of product.translations) {
    if (row.lang === "hu" || row.lang === "en" || row.lang === "de") {
      draft.names[row.lang] = row.name;
      draft.descriptions[row.lang] = row.description || "";
    }
  }
  return draft;
}

function productName(product: AdminProduct, lang: Lang): string {
  return (
    product.translations.find((row) => row.lang === lang)?.name ||
    product.translations.find((row) => row.lang === "hu")?.name ||
    product.translations[0]?.name ||
    product.id
  );
}

export function ProductsAdminPage() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const { selectedSiteId } = useAdminSite();
  const {
    siteId,
    townId,
    placeId: placeFilter,
    setSiteId,
    setTownId,
    setPlaceId: setPlaceFilter,
    clearFilters: clearHierarchyFilters,
    siteOptions,
    townOptions,
    placeOptions,
    allPlaceOptions,
    matchingPlaceIds,
    filtersActive: hierarchyFiltersActive,
    isLoadingOptions,
    canPickSite,
  } = useAdminHierarchyFilters();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [langTab, setLangTab] = useState<Lang>("hu");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [categoryFilter, setCategoryFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const contentLang = (i18n.language || "hu").split("-")[0] as Lang;
  const urlPlaceId = searchParams.get("placeId") || "";
  const urlEditId = searchParams.get("edit") || "";
  const wantNew = searchParams.get("new") === "true";

  const productsQuery = useQuery({
    queryKey: ["adminProducts", selectedSiteId, placeFilter || null],
    queryFn: () => getAdminProducts(selectedSiteId || "", undefined, placeFilter || undefined),
    enabled: Boolean(selectedSiteId),
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const product of productsQuery.data || []) {
      const category = product.category?.trim();
      if (category) set.add(category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, contentLang));
  }, [productsQuery.data, contentLang]);

  const filteredProducts = useMemo(() => {
    const placeIdSet =
      townId || placeFilter ? new Set(matchingPlaceIds) : null;
    return (productsQuery.data || []).filter((product) => {
      if (placeIdSet && (!product.placeId || !placeIdSet.has(product.placeId))) return false;
      if (categoryFilter && product.category !== categoryFilter) return false;
      if (visibilityFilter === "visible" && !product.isActive) return false;
      if (visibilityFilter === "hidden" && product.isActive) return false;
      return true;
    });
  }, [
    productsQuery.data,
    placeFilter,
    townId,
    matchingPlaceIds,
    categoryFilter,
    visibilityFilter,
  ]);

  const filtersActive =
    hierarchyFiltersActive ||
    Boolean(categoryFilter) ||
    visibilityFilter !== "all";

  function resetFilters() {
    clearHierarchyFilters();
    setCategoryFilter("");
    setVisibilityFilter("all");
    setPage(1);
  }

  function openDraft(next: Draft) {
    setFormErrors({});
    setDraft(next);
  }

  useEffect(() => {
    if (!productsQuery.isSuccess) return;
    if (urlEditId) {
      const product = (productsQuery.data || []).find((row) => row.id === urlEditId);
      if (product) openDraft(draftFrom(product));
      return;
    }
    if (wantNew) {
      const next = emptyDraft();
      if (urlPlaceId) next.placeId = urlPlaceId;
      openDraft(next);
    }
  }, [productsQuery.isSuccess, productsQuery.data, urlEditId, wantNew, urlPlaceId]);

  function patchDraft(patch: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  async function save() {
    if (!draft || !selectedSiteId) return;

    const errors: FormErrors = {};
    if (!draft.placeId.trim()) {
      errors.placeId = t("admin.catalog.placeRequired");
    }
    const translations = LANG_VALUES.filter((lang) => draft.names[lang].trim()).map((lang) => ({
      lang,
      name: draft.names[lang].trim(),
      description: draft.descriptions[lang].trim(),
    }));
    if (translations.length === 0) {
      errors.name = t("admin.catalog.nameRequired");
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload: ProductWriteInput = {
      placeId: draft.placeId.trim(),
      price: Math.max(0, Math.round(Number(draft.price) || 0)),
      currency: draft.currency || "HUF",
      imageUrl: draft.imageUrl || null,
      category: draft.category,
      isActive: draft.isActive,
      sortOrder: Math.round(Number(draft.sortOrder) || 0),
      translations,
    };
    setSaving(true);
    try {
      if (draft.id) await updateProduct(selectedSiteId, draft.id, payload);
      else await createProduct(selectedSiteId, payload);
      await queryClient.invalidateQueries({ queryKey: ["adminProducts", selectedSiteId] });
      setDraft(null);
      setFormErrors({});
      showToast(t("admin.catalog.saved"), "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("admin.catalog.saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(product: AdminProduct) {
    if (!selectedSiteId) return;
    if (!window.confirm(t("admin.catalog.deleteConfirm"))) return;
    try {
      await deleteProduct(selectedSiteId, product.id);
      await queryClient.invalidateQueries({ queryKey: ["adminProducts", selectedSiteId] });
      if (draft?.id === product.id) {
        setDraft(null);
        setFormErrors({});
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("admin.catalog.saveFailed"), "error");
    }
  }

  async function onFile(file: File | undefined) {
    if (!file || !draft) return;
    setUploading(true);
    try {
      const url = await uploadService.uploadImage(file, { folder: "products" });
      patchDraft({ imageUrl: url });
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("admin.catalog.saveFailed"), "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="catalog-admin">
      <AdminPageHeader
        title={t("admin.dashboardCards.products")}
        subtitle={t("admin.dashboardCards.productsDesc")}
        newButtonLabel={t("admin.catalog.new")}
        onNewClick={() => openDraft(emptyDraft())}
        showNewButton={!draft}
        isCreatingOrEditing={Boolean(draft)}
        onSave={save}
        onCancel={() => {
          setDraft(null);
          setFormErrors({});
        }}
        saveLabel={saving ? t("admin.catalog.saving") : t("admin.catalog.save")}
      />
      {!selectedSiteId ? <p>{t("admin.catalog.pickSite")}</p> : null}
      {productsQuery.isLoading && !draft ? <LoadingSpinner isLoading /> : null}
      {draft ? (
        <form
          className="catalog-admin__form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <h2 className="catalog-admin__title">
            {draft.id ? t("admin.catalog.edit") : t("admin.catalog.new")}
          </h2>

          <div className="catalog-admin__field catalog-admin__field--place">
            <label htmlFor="catalog-place">
              {t("admin.catalog.place")} <span className="catalog-admin__required">*</span>
            </label>
            <select
              id="catalog-place"
              required
              value={draft.placeId}
              aria-invalid={Boolean(formErrors.placeId)}
              className={formErrors.placeId ? "is-invalid" : undefined}
              onChange={(event) => {
                setFormErrors((current) => ({ ...current, placeId: undefined }));
                patchDraft({ placeId: event.target.value });
              }}
            >
              <option value="" disabled>
                {isLoadingOptions ? "…" : t("admin.catalog.selectPlace")}
              </option>
              {allPlaceOptions.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.label}
                </option>
              ))}
            </select>
            {formErrors.placeId ? (
              <p className="catalog-admin__error" role="alert">
                {formErrors.placeId}
              </p>
            ) : null}
          </div>

          <div className="catalog-admin__langs" role="tablist" aria-label="Language">
            {LANG_VALUES.map((lang) => (
              <button
                key={lang}
                type="button"
                role="tab"
                aria-selected={langTab === lang}
                className={`catalog-admin__lang${langTab === lang ? " is-on" : ""}`}
                onClick={() => setLangTab(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="catalog-admin__field">
            <label htmlFor="catalog-name">{t("admin.catalog.name")}</label>
            <AiPostfixField
              draft={{
                kind: "product",
                field: "name",
                lang: langTab,
                siteId: selectedSiteId || undefined,
                placeId: draft.placeId || undefined,
                name: draft.names[langTab],
                contextHints: draft.category || undefined,
              }}
              value={draft.names[langTab]}
              onApply={(text) => {
                setFormErrors((current) => ({ ...current, name: undefined }));
                setDraft({
                  ...draft,
                  names: { ...draft.names, [langTab]: text },
                });
              }}
            >
            <input
              id="catalog-name"
              value={draft.names[langTab]}
              aria-invalid={Boolean(formErrors.name)}
              onChange={(event) => {
                setFormErrors((current) => ({ ...current, name: undefined }));
                setDraft({
                  ...draft,
                  names: { ...draft.names, [langTab]: event.target.value },
                });
              }}
            />
            </AiPostfixField>
            {formErrors.name ? <p className="catalog-admin__error">{formErrors.name}</p> : null}
          </div>

          <div className="catalog-admin__field">
            <label htmlFor="catalog-description">{t("admin.catalog.description")}</label>
            <AiPostfixField
              draft={{
                kind: "product",
                field: "description",
                lang: langTab,
                siteId: selectedSiteId || undefined,
                placeId: draft.placeId || undefined,
                name: draft.names[langTab],
                contextHints: draft.category || undefined,
              }}
              value={draft.descriptions[langTab]}
              onApply={(text) => {
                const plain = text
                  .replace(/<[^>]*>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
                setDraft({
                  ...draft,
                  descriptions: { ...draft.descriptions, [langTab]: plain },
                });
              }}
              variant="textarea"
            >
            <textarea
              id="catalog-description"
              value={draft.descriptions[langTab]}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  descriptions: { ...draft.descriptions, [langTab]: event.target.value },
                })
              }
            />
            </AiPostfixField>
          </div>

          <div className="catalog-admin__grid catalog-admin__grid--3">
            <div className="catalog-admin__field">
              <label htmlFor="catalog-price">{t("admin.catalog.price")}</label>
              <input
                id="catalog-price"
                inputMode="numeric"
                value={draft.price}
                onChange={(event) => patchDraft({ price: event.target.value })}
              />
            </div>
            <div className="catalog-admin__field">
              <label htmlFor="catalog-currency">{t("admin.catalog.currency")}</label>
              <input
                id="catalog-currency"
                value={draft.currency}
                onChange={(event) => patchDraft({ currency: event.target.value })}
              />
            </div>
            <div className="catalog-admin__field">
              <label htmlFor="catalog-category">{t("admin.catalog.category")}</label>
              <input
                id="catalog-category"
                value={draft.category}
                onChange={(event) => patchDraft({ category: event.target.value })}
              />
            </div>
          </div>

          <div className="catalog-admin__field">
            <label htmlFor="catalog-image-url">{t("admin.catalog.image")}</label>
            <div className="catalog-admin__image-row">
              <input
                id="catalog-image-url"
                value={draft.imageUrl}
                placeholder="https://"
                onChange={(event) => patchDraft({ imageUrl: event.target.value })}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                disabled={uploading}
                onChange={(event) => void onFile(event.target.files?.[0])}
              />
              <button
                type="button"
                className="catalog-admin__upload"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? t("admin.common.uploading") : t("admin.catalog.uploadImage")}
              </button>
            </div>
            {draft.imageUrl ? (
              <img className="catalog-admin__preview" src={draft.imageUrl} alt="" />
            ) : null}
          </div>

          <div className="catalog-admin__grid catalog-admin__grid--meta">
            <div className="catalog-admin__field">
              <label htmlFor="catalog-sort">{t("admin.catalog.sort")}</label>
              <input
                id="catalog-sort"
                inputMode="numeric"
                value={draft.sortOrder}
                onChange={(event) => patchDraft({ sortOrder: event.target.value })}
              />
            </div>
            <label className="catalog-admin__check" htmlFor="catalog-active">
              <input
                id="catalog-active"
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => patchDraft({ isActive: event.target.checked })}
              />
              <span>{t("admin.catalog.active")}</span>
            </label>
          </div>
        </form>
      ) : null}

      {!draft && selectedSiteId ? (
        <AdminFilterableList
          items={filteredProducts}
          getItemId={(product) => product.id}
          isLoading={productsQuery.isLoading}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(limit) => {
            setPageSize(limit);
            setPage(1);
          }}
          emptyMessage={
            filtersActive
              ? t("admin.catalog.filters.noResults")
              : t("admin.catalog.filters.empty")
          }
          onRowClick={(product) => openDraft(draftFrom(product))}
          filters={
            <AdminHierarchyFilters
              idPrefix="catalog-filter"
              variant="fields"
              requireSite
              allowClearSite={canPickSite}
              siteId={siteId}
              townId={townId}
              placeId={placeFilter}
              onSiteChange={(next) => {
                setSiteId(next);
                setPage(1);
              }}
              onTownChange={(next) => {
                setTownId(next);
                setPage(1);
              }}
              onPlaceChange={(next) => {
                setPlaceFilter(next);
                setPage(1);
              }}
              siteOptions={siteOptions}
              townOptions={townOptions}
              placeOptions={placeOptions}
              onClear={resetFilters}
              clearDisabled={!filtersActive}
            >
              <div className="admin-flist__filter">
                <label htmlFor="catalog-filter-category">{t("admin.catalog.filters.category")}</label>
                <select
                  id="catalog-filter-category"
                  value={categoryFilter}
                  onChange={(event) => {
                    setCategoryFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t("admin.catalog.filters.allCategories")}</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-flist__filter">
                <label htmlFor="catalog-filter-visibility">
                  {t("admin.catalog.filters.visibility")}
                </label>
                <select
                  id="catalog-filter-visibility"
                  value={visibilityFilter}
                  onChange={(event) => {
                    setVisibilityFilter(event.target.value as VisibilityFilter);
                    setPage(1);
                  }}
                >
                  <option value="all">{t("admin.catalog.filters.visibilityAll")}</option>
                  <option value="visible">{t("admin.catalog.filters.visibilityVisible")}</option>
                  <option value="hidden">{t("admin.catalog.filters.visibilityHidden")}</option>
                </select>
              </div>
            </AdminHierarchyFilters>
          }
          columns={[
            {
              key: "name",
              label: t("admin.catalog.name"),
              render: (product) => productName(product, contentLang),
            },
            {
              key: "place",
              label: t("admin.catalog.place"),
              render: (product) => product.placeName || t("admin.catalog.noPlace"),
            },
            {
              key: "category",
              label: t("admin.catalog.category"),
              render: (product) => product.category || "—",
            },
            {
              key: "price",
              label: t("admin.catalog.price"),
              render: (product) => `${product.price} ${product.currency}`,
            },
            {
              key: "visibility",
              label: t("admin.catalog.filters.visibility"),
              render: (product) =>
                product.isActive ? t("admin.catalog.active") : t("admin.catalog.hidden"),
            },
            {
              key: "clicks",
              label: t("admin.catalog.clicks"),
              render: (product) => String(product.clicks ?? 0),
              align: "right",
            },
          ]}
          cardTitle={(product) => productName(product, contentLang)}
          cardSubtitle={(product) => (
            <>
              <span>
                {product.price} {product.currency}
              </span>
              {product.category ? <span>{product.category}</span> : null}
              {product.placeName ? <span>{product.placeName}</span> : null}
              <span>
                {product.isActive ? t("admin.catalog.active") : t("admin.catalog.hidden")}
              </span>
            </>
          )}
          onDelete={(product) => void remove(product)}
        />
      ) : null}
    </div>
  );
}

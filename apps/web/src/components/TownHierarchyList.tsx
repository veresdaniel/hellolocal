import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  getEvents,
  getGalleries,
  getPlace,
  getPlaces,
  getSiteMemberships,
  type Event,
  type Gallery,
  type SiteMembership,
} from "../api/admin.api";
import { getAdminProducts, type AdminProduct } from "../api/products.api";
import { AuthContext } from "../contexts/AuthContext";
import { findTranslation } from "../utils/langHelpers";
import { isSuperadmin } from "../utils/roleHelpers";
import type { Lang } from "../types/enums";
import { LoadingSpinner } from "./LoadingSpinner";
import "../styles/town-hierarchy.css";

type HierarchyTag = {
  id: string;
  isActive: boolean;
  translations: Array<{ lang: string; name: string }>;
};

type HierarchyPlace = {
  id: string;
  townId: string | null;
  isActive: boolean;
  translations: Array<{ lang: string; name: string }>;
};

type TownLike = {
  id: string;
  isActive: boolean;
  translations: Array<{ lang: string; name: string }>;
};

type PlaceTab = "events" | "galleries" | "products" | "tags";

type TownHierarchyListProps = {
  /** Null = unassigned/standalone towns bucket (no régió places/memberships fetch). */
  siteId: string | null;
  towns: TownLike[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onEditTown: (townId: string) => void;
  onDeleteTown: (townId: string) => void;
  onDeletePlace: (placeId: string) => Promise<boolean>;
  isLoadingTowns?: boolean;
  error?: string | null;
};

function placeName(place: HierarchyPlace, lang: Lang): string {
  return (
    findTranslation(place.translations, lang)?.name ||
    findTranslation(place.translations, "hu" as Lang)?.name ||
    place.id
  );
}

function eventTitle(event: Event, lang: Lang): string {
  return (
    findTranslation(event.translations, lang)?.title ||
    findTranslation(event.translations, "hu" as Lang)?.title ||
    event.id
  );
}

function townName(town: TownLike, lang: Lang): string {
  return (
    findTranslation(town.translations, lang)?.name ||
    findTranslation(town.translations, "hu" as Lang)?.name ||
    town.id
  );
}

export function TownHierarchyList({
  siteId,
  towns,
  searchQuery,
  onSearchChange,
  onEditTown,
  onDeleteTown,
  onDeletePlace,
  isLoadingTowns = false,
  error = null,
}: TownHierarchyListProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  const userIsSuperadmin = currentUser ? isSuperadmin(currentUser.role) : false;
  const lang = ((i18n.language || "hu").split("-")[0] || "hu") as Lang;
  const langPrefix = `/${i18n.language || "hu"}`;

  const [places, setPlaces] = useState<HierarchyPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [expandedTownIds, setExpandedTownIds] = useState<Set<string>>(new Set());
  const [expandedPlaceIds, setExpandedPlaceIds] = useState<Set<string>>(new Set());
  const [placeTabById, setPlaceTabById] = useState<Record<string, PlaceTab>>({});
  const [eventsByPlace, setEventsByPlace] = useState<Record<string, Event[]>>({});
  const [eventsLoading, setEventsLoading] = useState<Record<string, boolean>>({});
  const [galleriesByPlace, setGalleriesByPlace] = useState<Record<string, Gallery[]>>({});
  const [galleriesLoading, setGalleriesLoading] = useState<Record<string, boolean>>({});
  const [productsByPlace, setProductsByPlace] = useState<Record<string, AdminProduct[]>>({});
  const [productsLoading, setProductsLoading] = useState<Record<string, boolean>>({});
  const [tagsByPlace, setTagsByPlace] = useState<Record<string, HierarchyTag[]>>({});
  const [tagsLoading, setTagsLoading] = useState<Record<string, boolean>>({});
  const [membershipsOpen, setMembershipsOpen] = useState(false);
  const [memberships, setMemberships] = useState<SiteMembership[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [didAutoExpand, setDidAutoExpand] = useState(false);

  const loadPlaces = useCallback(async () => {
    if (!siteId) return;
    setPlacesLoading(true);
    try {
      const response = await getPlaces(siteId, 1, 500);
      const list = Array.isArray(response) ? response : response?.places || [];
      setPlaces(
        list.map((p: any) => ({
          id: p.id,
          townId: p.townId ?? null,
          isActive: !!p.isActive,
          translations: p.translations || [],
        }))
      );
    } catch (err) {
      console.error("Failed to load places for hierarchy", err);
      setPlaces([]);
    } finally {
      setPlacesLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadPlaces();
    setExpandedTownIds(new Set());
    setExpandedPlaceIds(new Set());
    setPlaceTabById({});
    setEventsByPlace({});
    setGalleriesByPlace({});
    setProductsByPlace({});
    setTagsByPlace({});
    setDidAutoExpand(false);
    setMembershipsOpen(false);
  }, [loadPlaces]);

  useEffect(() => {
    if (didAutoExpand || isLoadingTowns || placesLoading || towns.length !== 1) return;
    setExpandedTownIds(new Set([towns[0].id]));
    setDidAutoExpand(true);
  }, [didAutoExpand, isLoadingTowns, placesLoading, towns]);

  const filteredTowns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return towns;
    return towns.filter((town) => townName(town, lang).toLowerCase().includes(q));
  }, [towns, searchQuery, lang]);

  const placesByTown = useMemo(() => {
    const map = new Map<string, HierarchyPlace[]>();
    for (const place of places) {
      if (!place.townId) continue;
      const list = map.get(place.townId) || [];
      list.push(place);
      map.set(place.townId, list);
    }
    return map;
  }, [places]);

  const unassignedPlaces = useMemo(
    () => places.filter((p) => !p.townId),
    [places]
  );

  const toggleTown = (townId: string) => {
    setExpandedTownIds((prev) => {
      const next = new Set(prev);
      if (next.has(townId)) next.delete(townId);
      else next.add(townId);
      return next;
    });
  };

  const loadEventsForPlace = async (placeId: string) => {
    if (eventsByPlace[placeId] || eventsLoading[placeId]) return;
    setEventsLoading((prev) => ({ ...prev, [placeId]: true }));
    try {
      const response = await getEvents(siteId, 1, 200, placeId);
      const list = Array.isArray(response) ? response : response?.events || [];
      setEventsByPlace((prev) => ({ ...prev, [placeId]: list }));
    } catch (err) {
      console.error("Failed to load events for place", placeId, err);
      setEventsByPlace((prev) => ({ ...prev, [placeId]: [] }));
    } finally {
      setEventsLoading((prev) => ({ ...prev, [placeId]: false }));
    }
  };

  const loadGalleriesForPlace = async (placeId: string) => {
    if (galleriesByPlace[placeId] || galleriesLoading[placeId]) return;
    setGalleriesLoading((prev) => ({ ...prev, [placeId]: true }));
    try {
      const response = await getGalleries(siteId, placeId, undefined, 1, 200);
      setGalleriesByPlace((prev) => ({ ...prev, [placeId]: response.galleries || [] }));
    } catch (err) {
      console.error("Failed to load galleries for place", placeId, err);
      setGalleriesByPlace((prev) => ({ ...prev, [placeId]: [] }));
    } finally {
      setGalleriesLoading((prev) => ({ ...prev, [placeId]: false }));
    }
  };

  const loadProductsForPlace = async (placeId: string) => {
    if (productsByPlace[placeId] || productsLoading[placeId]) return;
    setProductsLoading((prev) => ({ ...prev, [placeId]: true }));
    try {
      const list = await getAdminProducts(siteId, undefined, placeId);
      setProductsByPlace((prev) => ({ ...prev, [placeId]: list || [] }));
    } catch (err) {
      console.error("Failed to load products for place", placeId, err);
      setProductsByPlace((prev) => ({ ...prev, [placeId]: [] }));
    } finally {
      setProductsLoading((prev) => ({ ...prev, [placeId]: false }));
    }
  };

  const loadTagsForPlace = async (placeId: string) => {
    if (tagsByPlace[placeId] || tagsLoading[placeId]) return;
    setTagsLoading((prev) => ({ ...prev, [placeId]: true }));
    try {
      const place = await getPlace(placeId, siteId);
      const list = (place?.tags || [])
        .map((row: { tag?: HierarchyTag }) => row.tag)
        .filter(Boolean) as HierarchyTag[];
      setTagsByPlace((prev) => ({ ...prev, [placeId]: list }));
    } catch (err) {
      console.error("Failed to load tags for place", placeId, err);
      setTagsByPlace((prev) => ({ ...prev, [placeId]: [] }));
    } finally {
      setTagsLoading((prev) => ({ ...prev, [placeId]: false }));
    }
  };

  const ensurePlaceLoaded = (placeId: string) => {
    void loadEventsForPlace(placeId);
    void loadGalleriesForPlace(placeId);
    void loadProductsForPlace(placeId);
    void loadTagsForPlace(placeId);
  };

  const togglePlace = (placeId: string) => {
    setExpandedPlaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) {
        next.delete(placeId);
      } else {
        next.add(placeId);
        ensurePlaceLoaded(placeId);
        setPlaceTabById((tabs) =>
          tabs[placeId] ? tabs : { ...tabs, [placeId]: "events" }
        );
      }
      return next;
    });
  };

  const setPlaceTab = (placeId: string, tab: PlaceTab) => {
    setPlaceTabById((prev) => ({ ...prev, [placeId]: tab }));
    ensurePlaceLoaded(placeId);
  };

  const productTitle = (product: AdminProduct): string =>
    product.translations.find((row) => row.lang === lang)?.name ||
    product.translations.find((row) => row.lang === "hu")?.name ||
    product.translations[0]?.name ||
    product.id;

  const tagTitle = (tag: HierarchyTag): string =>
    findTranslation(tag.translations, lang)?.name ||
    findTranslation(tag.translations, "hu" as Lang)?.name ||
    tag.id;

  const toggleMemberships = async () => {
    if (!siteId) return;
    const next = !membershipsOpen;
    setMembershipsOpen(next);
    if (next && memberships.length === 0) {
      setMembershipsLoading(true);
      try {
        const data = await getSiteMemberships(siteId);
        setMemberships(data);
      } catch (err) {
        console.error("Failed to load site memberships", err);
        setMemberships([]);
      } finally {
        setMembershipsLoading(false);
      }
    }
  };

  const statusBadge = (active: boolean) => (
    <span
      className={`admin-hierarchy__badge${active ? "" : " admin-hierarchy__badge--off"}`}
    >
      {active ? t("common.active") : t("common.inactive")}
    </span>
  );

  const dateLocale =
    lang === "hu" ? "hu-HU" : lang === "de" ? "de-DE" : "en-US";

  const renderPlaceBlock = (place: HierarchyPlace, nested = true) => {
    const open = expandedPlaceIds.has(place.id);
    const tab = placeTabById[place.id] || "events";
    const events = eventsByPlace[place.id] || [];
    const galleries = galleriesByPlace[place.id] || [];
    const products = productsByPlace[place.id] || [];
    const tags = tagsByPlace[place.id] || [];
    const busy =
      (tab === "events" && eventsLoading[place.id]) ||
      (tab === "galleries" && galleriesLoading[place.id]) ||
      (tab === "products" && productsLoading[place.id]) ||
      (tab === "tags" && tagsLoading[place.id]);

    const tabs: Array<{ id: PlaceTab; label: string; count?: number; loaded: boolean }> = [
      {
        id: "events",
        label: t("admin.events"),
        count: events.length,
        loaded: place.id in eventsByPlace,
      },
      {
        id: "galleries",
        label: t("admin.galleries.title"),
        count: galleries.length,
        loaded: place.id in galleriesByPlace,
      },
      {
        id: "products",
        label: t("admin.dashboardCards.products"),
        count: products.length,
        loaded: place.id in productsByPlace,
      },
      {
        id: "tags",
        label: t("admin.dashboardCards.tags"),
        count: tags.length,
        loaded: place.id in tagsByPlace,
      },
    ];

    const addAction =
      tab === "events"
        ? {
            label: `+ ${t("admin.forms.newEvent")}`,
            href: `${langPrefix}/admin/events?new=true&placeId=${place.id}`,
          }
        : tab === "galleries"
          ? {
              label: `+ ${t("admin.galleries.createGallery")}`,
              href: `${langPrefix}/admin/galleries?new=true&placeId=${place.id}`,
            }
          : tab === "products"
            ? {
                label: `+ ${t("admin.hierarchy.newProduct")}`,
                href: `${langPrefix}/admin/products?new=true&placeId=${place.id}`,
              }
            : {
                label: t("admin.hierarchy.manageTags"),
                href: `${langPrefix}/admin/places?edit=${place.id}`,
              };

    return (
      <div
        key={place.id}
        className="admin-hierarchy__place"
        style={{ marginLeft: nested ? 8 : 0 }}
      >
        <div
          className="admin-hierarchy__place-head"
          onClick={() => togglePlace(place.id)}
        >
          <button
            type="button"
            className="admin-hierarchy__toggle admin-hierarchy__toggle--sm"
            onClick={(e) => {
              e.stopPropagation();
              togglePlace(place.id);
            }}
            aria-expanded={open}
            aria-label={open ? t("common.collapse", { defaultValue: "Bezárás" }) : t("common.expand", { defaultValue: "Kinyitás" })}
          >
            {open ? "−" : "+"}
          </button>
          <div className="admin-hierarchy__place-name">{placeName(place, lang)}</div>
          {statusBadge(place.isActive)}
          <button
            type="button"
            className="admin-hierarchy__btn"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`${langPrefix}/admin/places/${place.id}/analytics`);
            }}
          >
            📊 {t("admin.analyticsLabel")}
          </button>
          <button
            type="button"
            className="admin-hierarchy__btn admin-hierarchy__btn--primary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`${langPrefix}/admin/places?edit=${place.id}`);
            }}
          >
            {t("common.edit")}
          </button>
          <button
            type="button"
            className="admin-hierarchy__btn admin-hierarchy__btn--icon admin-hierarchy__btn--danger"
            aria-label={t("common.delete")}
            title={t("common.delete")}
            onClick={(e) => {
              e.stopPropagation();
              void onDeletePlace(place.id).then((deleted) => {
                if (!deleted) return;
                setPlaces((prev) => prev.filter((item) => item.id !== place.id));
                setExpandedPlaceIds((prev) => {
                  const next = new Set(prev);
                  next.delete(place.id);
                  return next;
                });
              });
            }}
          >
            🗑
          </button>
        </div>

        {open && (
          <div className="admin-hierarchy__place-panel">
            <div className="admin-hierarchy__tabs" role="tablist">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`admin-hierarchy__tab${tab === item.id ? " is-active" : ""}`}
                  onClick={() => setPlaceTab(place.id, item.id)}
                >
                  {item.label}
                  {item.loaded ? (
                    <span className="admin-hierarchy__tab-count">{item.count}</span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="admin-hierarchy__panel-toolbar">
              <button
                type="button"
                className="admin-hierarchy__btn"
                onClick={() => navigate(addAction.href)}
              >
                {addAction.label}
              </button>
            </div>

            {busy ? (
              <LoadingSpinner isLoading />
            ) : tab === "events" ? (
              events.length === 0 ? (
                <p className="admin-hierarchy__empty">{t("admin.noEvents")}</p>
              ) : (
                <ul className="admin-hierarchy__rows">
                  {events.map((event) => (
                    <li key={event.id} className="admin-hierarchy__row">
                      <span className="admin-hierarchy__row-title">
                        {eventTitle(event, lang)}
                      </span>
                      <span className="admin-hierarchy__row-meta">
                        {new Date(event.startDate).toLocaleDateString(dateLocale)}
                      </span>
                      {statusBadge(event.isActive)}
                      <button
                        type="button"
                        className="admin-hierarchy__btn admin-hierarchy__btn--primary"
                        onClick={() =>
                          navigate(
                            `${langPrefix}/admin/events?edit=${event.id}&placeId=${place.id}`
                          )
                        }
                      >
                        {t("common.edit")}
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : tab === "galleries" ? (
              galleries.length === 0 ? (
                <p className="admin-hierarchy__empty">{t("admin.galleries.noGalleries")}</p>
              ) : (
                <ul className="admin-hierarchy__rows">
                  {galleries.map((gallery) => (
                    <li key={gallery.id} className="admin-hierarchy__row">
                      <span className="admin-hierarchy__row-title">
                        {gallery.name?.trim() ||
                          t("admin.hierarchy.unnamedGallery", {
                            count: gallery.images?.length || 0,
                          })}
                      </span>
                      <span className="admin-hierarchy__row-meta">
                        {gallery.images?.length || 0} {t("admin.hierarchy.images")}
                      </span>
                      {statusBadge(gallery.isActive)}
                      <button
                        type="button"
                        className="admin-hierarchy__btn admin-hierarchy__btn--primary"
                        onClick={() =>
                          navigate(
                            `${langPrefix}/admin/galleries?edit=${gallery.id}&placeId=${place.id}`
                          )
                        }
                      >
                        {t("common.edit")}
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : tab === "products" ? (
              products.length === 0 ? (
                <p className="admin-hierarchy__empty">{t("admin.hierarchy.noProducts")}</p>
              ) : (
                <ul className="admin-hierarchy__rows">
                  {products.map((product) => (
                    <li key={product.id} className="admin-hierarchy__row">
                      <span className="admin-hierarchy__row-title">
                        {productTitle(product)}
                      </span>
                      {product.category ? (
                        <span className="admin-hierarchy__row-meta">{product.category}</span>
                      ) : null}
                      {statusBadge(product.isActive)}
                      <button
                        type="button"
                        className="admin-hierarchy__btn admin-hierarchy__btn--primary"
                        onClick={() =>
                          navigate(
                            `${langPrefix}/admin/products?edit=${product.id}&placeId=${place.id}`
                          )
                        }
                      >
                        {t("common.edit")}
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : tags.length === 0 ? (
              <p className="admin-hierarchy__empty">{t("admin.hierarchy.noTags")}</p>
            ) : (
              <ul className="admin-hierarchy__rows">
                {tags.map((tag) => (
                  <li key={tag.id} className="admin-hierarchy__row">
                    <span className="admin-hierarchy__row-title">{tagTitle(tag)}</span>
                    {statusBadge(tag.isActive)}
                    <button
                      type="button"
                      className="admin-hierarchy__btn admin-hierarchy__btn--primary"
                      onClick={() =>
                        navigate(`${langPrefix}/admin/places?edit=${place.id}`)
                      }
                    >
                      {t("common.edit")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoadingTowns) {
    return <LoadingSpinner isLoading />;
  }

  return (
    <div className="admin-hierarchy">
      {/* Site / régió tools — only when a region is selected (not unassigned bucket). */}
      {siteId && (
      <section className="admin-hierarchy__site-tools" aria-label={t("admin.hierarchy.siteTools")}>
        <div className="admin-hierarchy__section-label">
          {t("admin.hierarchy.siteTools")}
        </div>
        <div className="admin-hierarchy__tool-row">
          <div className="admin-hierarchy__tool">
            <div className="admin-hierarchy__tool-copy">
              <span className="admin-hierarchy__tool-title">
                {t("admin.hierarchy.regionAnalytics")}
              </span>
              <span className="admin-hierarchy__tool-hint">
                {t("admin.hierarchy.regionAnalyticsHint")}
              </span>
            </div>
            <button
              type="button"
              className="admin-hierarchy__btn"
              onClick={() => navigate(`${langPrefix}/admin/analytics/region`)}
            >
              📊 {t("admin.analyticsLabel")}
            </button>
          </div>

          {userIsSuperadmin && (
            <div className="admin-hierarchy__tool admin-hierarchy__tool--members">
              <button
                type="button"
                className="admin-hierarchy__toggle admin-hierarchy__toggle--sm"
                onClick={() => void toggleMemberships()}
                aria-expanded={membershipsOpen}
                aria-label={t("admin.tenantMemberships")}
              >
                {membershipsOpen ? "−" : "+"}
              </button>
              <button
                type="button"
                className="admin-hierarchy__tool-copy admin-hierarchy__tool-copy--btn"
                onClick={() => void toggleMemberships()}
              >
                <span className="admin-hierarchy__tool-title">
                  {t("admin.tenantMemberships")}
                </span>
                <span className="admin-hierarchy__tool-hint">
                  {t("admin.hierarchy.membershipsHint")}
                </span>
              </button>
              <button
                type="button"
                className="admin-hierarchy__btn"
                onClick={() => navigate(`${langPrefix}/admin/site-memberships`)}
              >
                {t("admin.hierarchy.manage")}
              </button>
              {membershipsOpen && (
                <div className="admin-hierarchy__tool-panel">
                  {membershipsLoading ? (
                    <LoadingSpinner isLoading />
                  ) : memberships.length === 0 ? (
                    <p className="admin-hierarchy__empty">{t("admin.hierarchy.noMemberships")}</p>
                  ) : (
                    <ul className="admin-hierarchy__rows">
                      {memberships.map((m) => (
                        <li key={m.id} className="admin-hierarchy__row">
                          <span className="admin-hierarchy__row-title">
                            {m.user
                              ? `${m.user.firstName} ${m.user.lastName} (${m.user.email})`
                              : m.userId}
                          </span>
                          <strong>{t(`admin.roles.${m.role}`)}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      )}

      <div className="admin-hierarchy__section-label">
        {t("admin.hierarchy.townsList")}
      </div>

      <label htmlFor="admin-hierarchy-search" className="hl-visually-hidden">
        {t("admin.searchPlaceholders.towns")}
      </label>
      <input
        id="admin-hierarchy-search"
        type="search"
        className="admin-hierarchy__search"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t("admin.searchPlaceholders.towns")}
        aria-label={t("admin.searchPlaceholders.towns")}
      />

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      {placesLoading && towns.length > 0 && (
        <p className="admin-hierarchy__muted-on-dark" style={{ marginBottom: 8 }}>
          {t("admin.hierarchy.loadingPlaces")}
        </p>
      )}

      {filteredTowns.length === 0 ? (
        <p className="admin-hierarchy__muted-on-dark">{t("admin.list.noResults")}</p>
      ) : (
        filteredTowns.map((town) => {
          const open = expandedTownIds.has(town.id);
          const linkedPlaces = placesByTown.get(town.id) || [];
          const townPlaces =
            towns.length === 1
              ? [
                  ...linkedPlaces,
                  ...unassignedPlaces.filter(
                    (p) => !linkedPlaces.some((lp) => lp.id === p.id)
                  ),
                ]
              : linkedPlaces;

          return (
            <div key={town.id} className="admin-hierarchy__town">
              <div className="admin-hierarchy__town-head">
                <button
                  type="button"
                  className="admin-hierarchy__toggle"
                  onClick={() => toggleTown(town.id)}
                  aria-expanded={open}
                  aria-label={
                    open
                      ? t("common.collapse", { defaultValue: "Bezárás" })
                      : t("common.expand", { defaultValue: "Kinyitás" })
                  }
                >
                  {open ? "−" : "+"}
                </button>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="admin-hierarchy__title">{townName(town, lang)}</div>
                  <p className="admin-hierarchy__meta">
                    {t("admin.hierarchy.placeCount", { count: townPlaces.length })}
                  </p>
                </div>
                {statusBadge(town.isActive)}
                <button
                  type="button"
                  className="admin-hierarchy__btn"
                  onClick={() =>
                    navigate(`${langPrefix}/admin/towns/${town.id}/analytics`)
                  }
                >
                  📊 {t("admin.analyticsLabel")}
                </button>
                <button
                  type="button"
                  className="admin-hierarchy__btn admin-hierarchy__btn--icon admin-hierarchy__btn--primary"
                  aria-label={t("common.edit")}
                  title={t("common.edit")}
                  onClick={() => onEditTown(town.id)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="admin-hierarchy__btn admin-hierarchy__btn--icon admin-hierarchy__btn--danger"
                  aria-label={t("common.delete")}
                  title={t("common.delete")}
                  onClick={() => onDeleteTown(town.id)}
                >
                  🗑
                </button>
              </div>

              {open && (
                <div className="admin-hierarchy__town-body">
                  <div className="admin-hierarchy__places-bar">
                    <strong>{t("admin.places")}</strong>
                    <button
                      type="button"
                      className="admin-hierarchy__btn"
                      onClick={() =>
                        navigate(
                          `${langPrefix}/admin/places?new=true&townId=${town.id}`
                        )
                      }
                    >
                      + {t("admin.forms.newPlace")}
                    </button>
                  </div>
                  {townPlaces.length === 0 ? (
                    <p className="admin-hierarchy__empty">{t("admin.hierarchy.noPlaces")}</p>
                  ) : (
                    townPlaces.map((place) => renderPlaceBlock(place))
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {towns.length > 1 && unassignedPlaces.length > 0 && (
        <div className="admin-hierarchy__unassigned">
          <strong>{t("admin.hierarchy.unassignedPlaces")}</strong>
          <div style={{ marginTop: 10 }}>
            {unassignedPlaces.map((place) => renderPlaceBlock(place, false))}
          </div>
        </div>
      )}
    </div>
  );
}

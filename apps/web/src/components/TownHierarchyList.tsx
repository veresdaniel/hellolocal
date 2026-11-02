import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getPlaces } from "../api/admin.api";
import { findTranslation } from "../utils/langHelpers";
import type { Lang } from "../types/enums";
import { AdminDataTable } from "./AdminDataTable";
import { LoadingSpinner } from "./LoadingSpinner";
import "../styles/town-hierarchy.css";

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
  const lang = ((i18n.language || "hu").split("-")[0] || "hu") as Lang;
  const langPrefix = `/${i18n.language || "hu"}`;

  const [places, setPlaces] = useState<HierarchyPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [expandedTownIds, setExpandedTownIds] = useState<Set<string>>(new Set());
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
    setDidAutoExpand(false);
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

  const renderPlacesTable = (rows: HierarchyPlace[], stateKey: string) => (
    <AdminDataTable
      items={rows}
      getItemId={(place) => place.id}
      stateKey={stateKey}
      columns={[
        {
          key: "name",
          label: t("common.name"),
          getText: (place) => placeName(place, lang),
          render: (place) => placeName(place, lang),
        },
        {
          key: "status",
          label: t("admin.table.status"),
          getText: (place) => (place.isActive ? t("common.active") : t("common.inactive")),
          render: (place) => statusBadge(place.isActive),
        },
      ]}
      onEdit={(place) => navigate(`${langPrefix}/admin/places?edit=${place.id}`)}
      onAnalytics={(place) => navigate(`${langPrefix}/admin/places/${place.id}/analytics`)}
      onDelete={(place) => {
        void onDeletePlace(place.id).then((deleted) => {
          if (!deleted) return;
          setPlaces((prev) => prev.filter((item) => item.id !== place.id));
        });
      }}
    />
  );

  const statusBadge = (active: boolean) => (
    <span
      className={`admin-hierarchy__badge${active ? "" : " admin-hierarchy__badge--off"}`}
    >
      {active ? t("common.active") : t("common.inactive")}
    </span>
  );

  if (isLoadingTowns) {
    return <LoadingSpinner isLoading />;
  }

  return (
    <div className="admin-hierarchy">
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
                    renderPlacesTable(townPlaces, `town-${town.id}`)
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
            {renderPlacesTable(unassignedPlaces, "unassigned-places")}
          </div>
        </div>
      )}
    </div>
  );
}

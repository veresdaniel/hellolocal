import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { HierarchyFilterOption } from "../hooks/useAdminHierarchyFilters";
import "../styles/admin-filterable-list.css";

export type AdminHierarchyFiltersProps = {
  idPrefix?: string;
  /** "bar" wraps fields in the shared filter strip; "fields" returns bare controls for composition. */
  variant?: "bar" | "fields";
  showSite?: boolean;
  showTown?: boolean;
  showPlace?: boolean;
  /** When true, content pages need a site; empty option is “none selected” (not “all sites”). */
  requireSite?: boolean;
  /** Superadmin: allow clearing Régió to null (“Nincs kiválasztva”). */
  allowClearSite?: boolean;
  siteId: string | null;
  townId: string;
  placeId: string;
  onSiteChange?: (siteId: string) => void;
  onTownChange: (townId: string) => void;
  onPlaceChange: (placeId: string) => void;
  siteOptions?: HierarchyFilterOption[];
  townOptions: HierarchyFilterOption[];
  placeOptions: HierarchyFilterOption[];
  disabled?: boolean;
  /** Extra controls rendered after hierarchy selects (search, category, …). */
  children?: ReactNode;
  /** Optional clear action (usually shown when variant="bar"). */
  onClear?: () => void;
  clearDisabled?: boolean;
};

/**
 * Cascading Site/Régió → Település → Hely filter controls for admin lists.
 */
export function AdminHierarchyFilters({
  idPrefix = "admin-hier",
  variant = "bar",
  showSite = true,
  showTown = true,
  showPlace = true,
  requireSite = true,
  allowClearSite = false,
  siteId,
  townId,
  placeId,
  onSiteChange,
  onTownChange,
  onPlaceChange,
  siteOptions = [],
  townOptions,
  placeOptions,
  disabled = false,
  children,
  onClear,
  clearDisabled = true,
}: AdminHierarchyFiltersProps) {
  const { t } = useTranslation();

  const fields = (
    <>
      {showSite ? (
        <div className="admin-flist__filter">
          <label htmlFor={`${idPrefix}-site`}>{t("admin.filters.site")}</label>
          <select
            id={`${idPrefix}-site`}
            value={siteId || ""}
            disabled={disabled || !onSiteChange}
            onChange={(event) => {
              const next = event.target.value;
              if (requireSite && !next && !allowClearSite) return;
              onSiteChange?.(next);
            }}
          >
            {!requireSite ? (
              <option value="">{t("admin.filters.allSites")}</option>
            ) : allowClearSite ? (
              <option value="">{t("admin.filters.noneSelected")}</option>
            ) : null}
            {siteOptions.map((site) => (
              <option key={site.id} value={site.id}>
                {site.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showTown ? (
        <div className="admin-flist__filter">
          <label htmlFor={`${idPrefix}-town`}>{t("admin.filters.town")}</label>
          <select
            id={`${idPrefix}-town`}
            value={townId}
            disabled={disabled || !siteId}
            onChange={(event) => onTownChange(event.target.value)}
          >
            <option value="">{t("admin.filters.allTowns")}</option>
            {townOptions.map((town) => (
              <option key={town.id} value={town.id}>
                {town.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showPlace ? (
        <div className="admin-flist__filter">
          <label htmlFor={`${idPrefix}-place`}>{t("admin.filters.place")}</label>
          <select
            id={`${idPrefix}-place`}
            value={placeId}
            disabled={disabled || !siteId}
            onChange={(event) => onPlaceChange(event.target.value)}
          >
            <option value="">{t("admin.filters.allPlaces")}</option>
            {placeOptions.map((place) => (
              <option key={place.id} value={place.id}>
                {place.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {children}

      {onClear ? (
        <div className="admin-flist__filter admin-flist__filter-actions">
          <button
            type="button"
            className="admin-flist__clear"
            disabled={clearDisabled}
            onClick={onClear}
          >
            {t("admin.list.clearFilters")}
          </button>
        </div>
      ) : null}
    </>
  );

  if (variant === "fields") {
    return fields;
  }

  return <div className="admin-flist__filters">{fields}</div>;
}

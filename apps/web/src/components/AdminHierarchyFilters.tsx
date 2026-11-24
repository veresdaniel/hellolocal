import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { HierarchyFilterOption } from "../hooks/useAdminHierarchyFilters";
import { AdminAutocomplete } from "./AdminAutocomplete";
import { optionsFromLabeled } from "../utils/adminSelectOptions";
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

  const siteClearLabel = !requireSite
    ? t("admin.filters.allSites")
    : allowClearSite && siteOptions.length > 1
      ? t("admin.filters.noneSelected")
      : undefined;

  const fields = (
    <>
      {showSite ? (
        <div className="admin-flist__filter">
          {siteOptions.length === 1 ? (
            <>
              <label>{t("admin.filters.site")}</label>
              <div className="admin-flist__filter-value">{siteOptions[0].label}</div>
            </>
          ) : (
            <AdminAutocomplete
              id={`${idPrefix}-site`}
              label={t("admin.filters.site")}
              value={siteId || ""}
              options={optionsFromLabeled(siteOptions)}
              clearOptionLabel={siteClearLabel}
              placeholder={siteClearLabel || t("admin.filters.site")}
              disabled={disabled || !onSiteChange}
              inputStyle={{ padding: "8px 12px", fontSize: 14 }}
              onChange={(next) => {
                if (requireSite && !next && !allowClearSite) return;
                onSiteChange?.(next);
              }}
            />
          )}
        </div>
      ) : null}

      {showTown ? (
        <div className="admin-flist__filter">
          <AdminAutocomplete
            id={`${idPrefix}-town`}
            label={t("admin.filters.town")}
            value={townId}
            options={optionsFromLabeled(townOptions)}
            clearOptionLabel={t("admin.filters.allTowns")}
            placeholder={t("admin.filters.allTowns")}
            disabled={disabled || !siteId}
            inputStyle={{ padding: "8px 12px", fontSize: 14 }}
            onChange={onTownChange}
          />
        </div>
      ) : null}

      {showPlace ? (
        <div className="admin-flist__filter">
          <AdminAutocomplete
            id={`${idPrefix}-place`}
            label={t("admin.filters.place")}
            value={placeId}
            options={optionsFromLabeled(placeOptions)}
            clearOptionLabel={t("admin.filters.allPlaces")}
            placeholder={t("admin.filters.allPlaces")}
            disabled={disabled || !siteId}
            inputStyle={{ padding: "8px 12px", fontSize: 14 }}
            onChange={onPlaceChange}
          />
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

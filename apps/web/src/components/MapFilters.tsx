import { useTranslation } from "react-i18next";
import {
  FilterControls,
  activeFilterCount,
  clearFilters,
  type FilterControlProps,
} from "./FilterControls";
import "../styles/map-dock.css";

export function MapFilters({ variant = "card", ...props }: FilterControlProps & { variant?: "card" | "toolbar" }) {
  const { t } = useTranslation();
  const count = activeFilterCount(props);
  const toolbar = variant === "toolbar";

  return (
    <section className={toolbar ? "map-filters-inline map-filters-inline--toolbar" : "map-filters-inline"}>
      {!toolbar && (
        <div className="map-filters-inline__head">
          <h2>{t("public.filtersTitle")}</h2>
          {count > 0 && (
            <button type="button" className="map-filters-inline__clear" onClick={() => clearFilters(props)}>
              {t("public.filters.clear")}
            </button>
          )}
        </div>
      )}
      <FilterControls {...props} />
      {toolbar && count > 0 && (
        <button type="button" className="map-filters-inline__clear" onClick={() => clearFilters(props)}>
          {t("public.filters.clear")}
        </button>
      )}
    </section>
  );
}

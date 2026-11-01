import { useTranslation } from "react-i18next";
import {
  FilterControls,
  activeFilterCount,
  clearFilters,
  type FilterControlProps,
} from "./FilterControls";
import "../styles/map-dock.css";

export function MapFilters(props: FilterControlProps) {
  const { t } = useTranslation();
  const count = activeFilterCount(props);

  return (
    <section className="map-filters-inline">
      <div className="map-filters-inline__head">
        <h2>{t("public.filtersTitle")}</h2>
        {count > 0 && (
          <button type="button" className="map-filters-inline__clear" onClick={() => clearFilters(props)}>
            {t("public.filters.clear")}
          </button>
        )}
      </div>
      <FilterControls {...props} />
    </section>
  );
}

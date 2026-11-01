import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { HAS_MULTIPLE_SITES, type Lang} from "../app/config";
import { useSiteContext } from "../app/site/useSiteContext";
import { getPlaces } from "../api/places.api";
import { useFiltersStore } from "../stores/useFiltersStore";
import { comparePriceLabels, visitorPriceLabel } from "../utils/priceLabel";

export interface FilterControlProps {
  lang: Lang;
  selectedCategories: string[];
  selectedPriceBands: string[];
  onCategoriesChange: (categories: string[]) => void;
  onPriceBandsChange: (priceBands: string[]) => void;
  isOpenNow: boolean;
  hasEventToday: boolean;
  within30Minutes: boolean;
  rainSafe: boolean;
  onOpenNowChange: (value: boolean) => void;
  onHasEventTodayChange: (value: boolean) => void;
  onWithin30MinutesChange: (value: boolean) => void;
  onRainSafeChange: (value: boolean) => void;
}

export function activeFilterCount(props: FilterControlProps) {
  return (
    props.selectedCategories.length +
    props.selectedPriceBands.length +
    Number(props.isOpenNow) +
    Number(props.hasEventToday) +
    Number(props.within30Minutes) +
    Number(props.rainSafe)
  );
}

export function clearFilters(props: FilterControlProps) {
  props.onCategoriesChange([]);
  props.onPriceBandsChange([]);
  props.onOpenNowChange(false);
  props.onHasEventTodayChange(false);
  props.onWithin30MinutesChange(false);
  props.onRainSafeChange(false);
}

function toggle(list: string[], id: string, onChange: (next: string[]) => void) {
  onChange(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
}

export function FilterControls(props: FilterControlProps) {
  const { t } = useTranslation();
  const { siteKey } = useSiteContext();
  const effectiveSiteKey = HAS_MULTIPLE_SITES ? siteKey : undefined;
  const userLocation = useFiltersStore((state) => state.userLocation);

  const { data: places } = useQuery({
    queryKey: ["places", props.lang, effectiveSiteKey, [], []],
    queryFn: () => getPlaces(props.lang, effectiveSiteKey || "", undefined, undefined),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!props.lang && !!effectiveSiteKey,
  });

  const categories = useMemo(() => {
    if (!places || !Array.isArray(places)) return [];
    const names = new Set<string>();
    places.forEach((place) => {
      if (place.categoryKind === "service") return;
      if (place.category) names.add(place.category);
    });
    return Array.from(names).map((name) => ({ id: name, name }));
  }, [places]);

  const priceBands = useMemo(() => {
    if (!places || !Array.isArray(places)) return [];
    const bands = new Map<string, { id: string; name: string }>();
    places.forEach((place) => {
      if (!place.priceBand) return;
      const id = place.priceBandId || place.priceBand;
      if (!bands.has(id)) bands.set(id, { id, name: visitorPriceLabel(place.priceBand) });
    });
    return Array.from(bands.values()).sort((a, b) => comparePriceLabels(a.name, b.name));
  }, [places]);

  const quick = [
    {
      key: "open",
      label: t("public.filters.openNow"),
      pressed: props.isOpenNow,
      onClick: () => props.onOpenNowChange(!props.isOpenNow),
    },
    {
      key: "today",
      label: t("public.filters.eventToday"),
      pressed: props.hasEventToday,
      onClick: () => props.onHasEventTodayChange(!props.hasEventToday),
    },
    ...(userLocation
      ? [
          {
            key: "walk",
            label: t("public.filters.within10MinutesWalk"),
            pressed: props.within30Minutes,
            onClick: () => props.onWithin30MinutesChange(!props.within30Minutes),
          },
        ]
      : []),
    {
      key: "rain",
      label: t("public.filters.rainSafe"),
      pressed: props.rainSafe,
      onClick: () => props.onRainSafeChange(!props.rainSafe),
    },
  ];

  return (
    <>
      <div className="map-dock__section">
        <div className="map-dock__chips">
          {quick.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="map-dock__chip"
              aria-pressed={chip.pressed}
              onClick={chip.onClick}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="map-dock__section">
          <h3>{t("public.filters.categories")}</h3>
          <div className="map-dock__chips">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className="map-dock__chip"
                aria-pressed={props.selectedCategories.includes(category.id)}
                onClick={() =>
                  toggle(props.selectedCategories, category.id, props.onCategoriesChange)
                }
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {priceBands.length > 0 && (
        <div className="map-dock__section">
          <h3>{t("public.filters.price")}</h3>
          <div className="map-dock__chips">
            {priceBands.map((band) => (
              <button
                key={band.id}
                type="button"
                className="map-dock__chip"
                aria-pressed={props.selectedPriceBands.includes(band.id)}
                onClick={() => toggle(props.selectedPriceBands, band.id, props.onPriceBandsChange)}
              >
                {band.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

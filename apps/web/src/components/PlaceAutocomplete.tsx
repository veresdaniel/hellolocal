import { useTranslation } from "react-i18next";
import { AdminAutocomplete } from "./AdminAutocomplete";
import { optionsFromTranslations } from "../utils/adminSelectOptions";
import type { AutocompleteItem } from "./BaseAutocomplete";

export interface PlaceAutocompleteItem extends AutocompleteItem {
  id: string;
  translations?: Array<{ lang: string; name?: string | null }>;
  name?: string;
}

type PlaceAutocompleteProps = {
  places: PlaceAutocompleteItem[];
  selectedPlaceId: string;
  onChange: (placeId: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  clearOptionLabel?: string;
};

/** Single-select place combobox for admin forms (events, etc.). */
export function PlaceAutocomplete({
  places,
  selectedPlaceId,
  onChange,
  placeholder,
  label,
  required = false,
  error,
  clearOptionLabel,
}: PlaceAutocompleteProps) {
  const { t, i18n } = useTranslation();

  return (
    <AdminAutocomplete
      label={label || t("admin.places")}
      required={required}
      value={selectedPlaceId}
      options={optionsFromTranslations(places, i18n.language)}
      placeholder={placeholder || t("admin.selectPlace")}
      clearOptionLabel={clearOptionLabel ?? (required ? t("admin.selectPlace") : undefined)}
      error={error}
      emptyLabel={t("admin.noPlacesAvailable")}
      onChange={onChange}
    />
  );
}

// src/components/CategoryAutocomplete.tsx
import { useTranslation } from "react-i18next";
import { BaseAutocomplete, AutocompleteItem } from "./BaseAutocomplete";

interface Category extends AutocompleteItem {
  id: string;
  translations: Array<{ lang: string; name: string }>;
}

interface CategoryAutocompletePropsBase {
  categories: Category[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
}

interface CategoryAutocompletePropsMultiple extends CategoryAutocompletePropsBase {
  multiple: true;
  selectedCategoryIds: string[];
  onChange: (categoryIds: string[]) => void;
}

interface CategoryAutocompletePropsSingle extends CategoryAutocompletePropsBase {
  multiple?: false;
  selectedCategoryId: string;
  onChange: (categoryId: string) => void;
}

type CategoryAutocompleteProps = CategoryAutocompletePropsMultiple | CategoryAutocompletePropsSingle;

export function CategoryAutocomplete(props: CategoryAutocompleteProps) {
  const { t, i18n } = useTranslation();
  const {
    categories,
    placeholder,
    label,
    required = false,
    error,
  } = props;
  const defaultPlaceholder = placeholder || t("admin.selectCategoryPlaceholder");

  // Determine if multiple mode: if multiple prop is explicitly true, or if selectedCategoryIds exists
  // Default to single select mode (multiple = false) unless explicitly set to true
  const multiple = props.multiple === true;
  const currentLang = i18n.language;

  // Handle both single and multiple modes
  const selectedCategoryIds: string[] = multiple 
    ? ((props as CategoryAutocompletePropsMultiple).selectedCategoryIds || [])
    : ((props as CategoryAutocompletePropsSingle).selectedCategoryId && (props as CategoryAutocompletePropsSingle).selectedCategoryId !== "" 
        ? [(props as CategoryAutocompletePropsSingle).selectedCategoryId] 
        : []);

  const getCategoryName = (category: Category) => {
    return category.translations.find((t) => t.lang === currentLang)?.name || 
           category.translations.find((t) => t.lang === "hu")?.name || 
           category.translations[0]?.name || 
           category.id;
  };

  const handleSelect = (categoryId: string) => {
    if (multiple) {
      (props as CategoryAutocompletePropsMultiple).onChange([...selectedCategoryIds, categoryId]);
    } else {
      (props as CategoryAutocompletePropsSingle).onChange(categoryId);
    }
  };

  const handleRemove = (categoryId: string) => {
    if (multiple) {
      (props as CategoryAutocompletePropsMultiple).onChange(selectedCategoryIds.filter((id) => id !== categoryId));
    } else {
      (props as CategoryAutocompletePropsSingle).onChange("");
    }
  };

  return (
    <BaseAutocomplete
      items={categories}
      selectedItemIds={selectedCategoryIds}
      onSelect={handleSelect}
      onRemove={handleRemove}
      getItemName={getCategoryName}
      placeholder={placeholder || defaultPlaceholder}
      label={label || t("admin.categories")}
      required={required}
      error={error}
      multiple={multiple}
    />
  );
}

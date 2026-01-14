// src/components/TagAutocomplete.tsx
import { useTranslation } from "react-i18next";
import { BaseAutocomplete, AutocompleteItem } from "./BaseAutocomplete";
import { getHuTranslation } from "../utils/langHelpers";

interface Tag extends AutocompleteItem {
  id: string;
  translations: Array<{ lang: string; name: string }>;
}

interface TagAutocompleteProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  placeholder?: string;
}

export function TagAutocomplete({ tags, selectedTagIds, onChange, placeholder = "Add tags..." }: TagAutocompleteProps) {
  const { t } = useTranslation();

  const getTagName = (tag: Tag) => {
    const huTranslation = getHuTranslation(tag.translations);
    return huTranslation?.name || tag.translations[0]?.name || tag.id;
  };

  const handleSelect = (tagId: string) => {
    onChange([...selectedTagIds, tagId]);
  };

  const handleRemove = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  return (
    <BaseAutocomplete
      items={tags}
      selectedItemIds={selectedTagIds}
      onSelect={handleSelect}
      onRemove={handleRemove}
      getItemName={getTagName}
      placeholder={placeholder}
      label={t("admin.tags")}
      multiple={true}
    />
  );
}

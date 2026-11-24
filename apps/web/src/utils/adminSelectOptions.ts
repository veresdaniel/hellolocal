import type { AdminAutocompleteOption } from "../components/AdminAutocomplete";

type TranslationRow = { lang?: string; name?: string | null; title?: string | null };

/** Build autocomplete options from entities with `translations[].name` (or title). */
export function optionsFromTranslations(
  items: Array<{ id: string; translations?: TranslationRow[]; name?: string | null }>,
  lang = "hu"
): AdminAutocompleteOption[] {
  const code = lang.split("-")[0];
  return items.map((item) => {
    const rows = item.translations || [];
    const match =
      rows.find((row) => row.lang === code) ||
      rows.find((row) => row.lang === "hu") ||
      rows[0];
    const label =
      item.name?.trim() ||
      match?.name?.trim() ||
      match?.title?.trim() ||
      item.id;
    return { value: item.id, label };
  });
}

export function optionsFromLabeled(
  items: Array<{ id: string; label: string }>
): AdminAutocompleteOption[] {
  return items.map((item) => ({ value: item.id, label: item.label }));
}

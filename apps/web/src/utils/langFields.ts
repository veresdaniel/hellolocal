import { isLang } from "../types/enums";

export function langField(field: string, lang: string): string {
  return `${field}${lang.charAt(0).toUpperCase()}${lang.slice(1)}`;
}

export function readLang(data: object, field: string, lang: string): string {
  const value = (data as Record<string, unknown>)[langField(field, lang)];
  return typeof value === "string" ? value : "";
}

export function readLangList(data: object, field: string, lang: string): string[] {
  const value = (data as Record<string, unknown>)[langField(field, lang)];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function patchLang<T extends object>(data: T, field: string, lang: string, value: unknown): T {
  return { ...data, [langField(field, lang)]: value };
}

export function languagesOnForm(data: object, field: string): string[] {
  return Object.keys(data as Record<string, unknown>)
    .filter((key) => key.startsWith(field) && key.length > field.length)
    .map((key) => {
      const rest = key.slice(field.length);
      return `${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
    })
    .filter(isLang);
}

export function appendExtraLanguages(
  rows: Array<Record<string, unknown>>,
  form: object,
  requiredField: string,
  fields: string[],
  shared: Record<string, unknown> = {}
): void {
  for (const lang of languagesOnForm(form, requiredField)) {
    if (rows.some((row) => row.lang === lang)) continue;
    const required = readLang(form, requiredField, lang).trim();
    if (!required) continue;
    const row: Record<string, unknown> = { lang, [requiredField]: required, ...shared };
    for (const field of fields) {
      if (field === requiredField) continue;
      const key = langField(field, lang);
      const raw = (form as Record<string, unknown>)[key];
      if (Array.isArray(raw)) {
        row[field] = raw;
      } else if (typeof raw === "string" && field.toLowerCase().includes("keyword")) {
        row[field] = raw
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      } else {
        row[field] = typeof raw === "string" && raw.trim() ? raw : null;
      }
    }
    rows.push(row);
  }
}

export function mergeTranslations<T extends object>(
  base: T,
  translations: Array<{ lang: string } & Record<string, unknown>>,
  fields: string[]
): T {
  return translations.reduce((data, translation) => {
    return fields.reduce((current, field) => {
      if (!(field in translation)) return current;
      const value = translation[field];
      if (value == null) return current;
      return patchLang(current, field, translation.lang, value);
    }, data);
  }, base);
}

export function languageLabel(code: string, uiLang = "hu"): string {
  try {
    const names = new Intl.DisplayNames([uiLang, "en"], { type: "language" });
    const label = names.of(code);
    if (label) return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    /* ignore */
  }
  return code.toUpperCase();
}

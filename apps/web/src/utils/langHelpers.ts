/**
 * Language-aware form field helpers
 * Reduces code duplication for multi-language form fields
 */

import type { Lang } from "../types/enums";
import { LANG_VALUES } from "../types/enums";

export interface LangFieldValues {
  nameHu?: string;
  nameEn?: string;
  nameDe?: string;
  descriptionHu?: string;
  descriptionEn?: string;
  descriptionDe?: string;
  shortDescriptionHu?: string;
  shortDescriptionEn?: string;
  shortDescriptionDe?: string;
  [key: string]: string | undefined;
}

/**
 * Get field value for a specific language
 */
export function getLangFieldValue(values: LangFieldValues, field: string, lang: Lang): string {
  const key = `${field}${lang.charAt(0).toUpperCase() + lang.slice(1)}` as keyof LangFieldValues;
  return values[key] || "";
}

/**
 * Set field value for a specific language
 */
export function setLangFieldValue(
  values: LangFieldValues,
  field: string,
  lang: Lang,
  value: string
): LangFieldValues {
  const key = `${field}${lang.charAt(0).toUpperCase() + lang.slice(1)}` as keyof LangFieldValues;
  return { ...values, [key]: value };
}

/**
 * Get error for a specific language field
 */
export function getLangFieldError(
  errors: Record<string, string>,
  field: string,
  lang: Lang
): string | undefined {
  const key = `${field}${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
  return errors[key];
}

/**
 * Check if field has error for a specific language
 */
export function hasLangFieldError(
  errors: Record<string, string>,
  field: string,
  lang: Lang
): boolean {
  return !!getLangFieldError(errors, field, lang);
}

/**
 * Convert form data with lang suffixes to translations array
 */
export function formDataToTranslations<T extends LangFieldValues>(
  formData: T,
  requiredFields: string[] = ["name"]
): Array<{ lang: Lang; [key: string]: string | null }> {
  const translations: Array<{ lang: Lang; [key: string]: string | null }> = [];

  // Process each language dynamically
  for (const lang of LANG_VALUES) {
    const langKey = `${lang.charAt(0).toUpperCase() + lang.slice(1)}` as "Hu" | "En" | "De";
    const nameField = `name${langKey}` as keyof LangFieldValues;

    // Always include Hungarian if nameHu exists, for others only if name field exists
    if (lang === "hu" ? formData[nameField]?.trim() : formData[nameField]?.trim()) {
      const translation: { lang: Lang; [key: string]: string | null } = { lang };
      requiredFields.forEach((field) => {
        const value = getLangFieldValue(formData, field, lang);
        translation[field] = value || null;
      });
      translations.push(translation);
    }
  }

  return translations;
}

/**
 * Convert translations array to form data with lang suffixes
 */
export function translationsToFormData<T extends LangFieldValues>(
  translations: Array<{ lang: Lang; [key: string]: string | null }>,
  fields: string[] = ["name", "description", "shortDescription"]
): Partial<T> {
  const formData: Partial<T> = {};

  translations.forEach((translation) => {
    const lang = translation.lang;
    fields.forEach((field) => {
      const key = `${field}${lang.charAt(0).toUpperCase() + lang.slice(1)}` as keyof T;
      const value = translation[field];
      if (value !== undefined) {
        (formData as any)[key] = value || "";
      }
    });
  });

  return formData;
}

/**
 * Find translation for a specific language
 * Helper to avoid repeated .find() calls with hardcoded lang strings
 */
export function findTranslation<T extends { lang: Lang }>(
  translations: T[],
  lang: Lang
): T | undefined {
  return translations.find((t) => t.lang === lang);
}

/**
 * Get translation for a specific language, with fallback
 * Returns the requested language, or the first available, or undefined
 */
export function getTranslation<T extends { lang: Lang }>(
  translations: T[],
  lang: Lang,
  fallbackToFirst: boolean = true
): T | undefined {
  const translation = findTranslation(translations, lang);
  if (translation) return translation;
  if (fallbackToFirst && translations.length > 0) return translations[0];
  return undefined;
}

/**
 * Get Hungarian translation (most common fallback)
 */
export function getHuTranslation<T extends { lang: Lang }>(translations: T[]): T | undefined {
  return getTranslation(translations, "hu", true);
}

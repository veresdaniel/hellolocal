import { BadRequestException } from "@nestjs/common";
import {
  FALLBACK_LANG,
  isLanguageCode,
  isUiLang,
  normalizeLanguageCode,
  type Lang,
  type UiLang,
} from "./language-code";

export {
  FALLBACK_LANG,
  isUiLang,
  normalizeLanguageCode,
  normalizeLanguageList,
  type Lang,
  type UiLang,
} from "./language-code";

export function supportedLangList(): string {
  return "an ISO 639 language code such as hu, en, de or fr";
}

export function isSupportedLang(value: string | null | undefined): value is Lang {
  return isLanguageCode(value);
}

export function requireLang(lang: string | null | undefined): Lang {
  const code = normalizeLanguageCode(lang);
  if (!lang) {
    throw new BadRequestException("Language parameter is required.");
  }
  if (!code) {
    throw new BadRequestException(
      `Invalid language code: "${lang}". Use a two- or three-letter ISO 639 code.`
    );
  }
  return code;
}

export function assertLang(lang: string): void {
  requireLang(lang);
}

/** Invalid or missing codes fall back instead of failing the request. */
export function langOrDefault(
  lang: string | null | undefined,
  options?: { lower?: boolean }
): Lang {
  const value = options?.lower && lang ? lang.toLowerCase() : lang;
  return normalizeLanguageCode(value) ?? FALLBACK_LANG;
}

export function requireUiLang(lang: string | null | undefined): UiLang {
  const code = normalizeLanguageCode(lang);
  if (!code || !isUiLang(code)) {
    throw new BadRequestException("The interface language must be hu, en or de.");
  }
  return code;
}

export function langFromPath(pathname: string | null | undefined): Lang | null {
  if (!pathname) return null;
  const match = pathname.match(/\/([a-z]{2,3})(?:\/|$)/);
  return match ? normalizeLanguageCode(match[1]) : null;
}

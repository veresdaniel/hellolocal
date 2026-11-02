import { isUiLang, normalizeLanguageCode } from "./language-code";

/** Language a custom hostname opens in. Empty when the hostname itself is empty. */
export function domainLanguage(raw: string | null | undefined, hasDomain: boolean): string | null {
  if (!hasDomain) return null;
  const code = normalizeLanguageCode(String(raw || ""));
  return code && isUiLang(code) ? code : "hu";
}

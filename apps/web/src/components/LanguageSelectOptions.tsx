import { useTranslation } from "react-i18next";
import catalog from "../i18n/languages.json";
import { languageLabel } from "../utils/langFields";

type Variant = "code" | "endonym" | "translated";

export function LanguageSelectOptions({
  variant = "endonym",
  codes,
}: {
  variant?: Variant;
  codes?: string[];
}) {
  const { t, i18n } = useTranslation();
  const known = new Map(catalog.languages.map((language) => [language.code, language]));
  const list = codes?.length ? codes : catalog.languages.map((language) => language.code);

  return (
    <>
      {list.map((code) => {
        const language = known.get(code);
        const endonym = language?.endonym || languageLabel(code, i18n.language);
        const label =
          variant === "code"
            ? code.toUpperCase()
            : variant === "endonym"
              ? endonym
              : `${language?.flag ? `${language.flag} ` : ""}${t(`admin.languageNames.${code}`, { defaultValue: endonym })}`;
        return (
          <option key={code} value={code}>
            {label}
          </option>
        );
      })}
    </>
  );
}

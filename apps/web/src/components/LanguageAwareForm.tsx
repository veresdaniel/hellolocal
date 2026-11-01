// src/components/LanguageAwareForm.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { type Lang } from "../types/enums";
import { useContentLanguages } from "../hooks/useContentLanguages";
import { languageLabel } from "../utils/langFields";

interface LanguageAwareFormProps {
  children: (selectedLang: Lang) => ReactNode;
  defaultLang?: Lang;
}

export function LanguageAwareForm({ children, defaultLang = "hu" }: LanguageAwareFormProps) {
  const { t, i18n } = useTranslation();
  const languages = useContentLanguages();
  const [selectedLang, setSelectedLang] = useState<Lang>(defaultLang);
  const activeLang = languages.includes(selectedLang) ? selectedLang : languages[0] || defaultLang;

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <label
          style={{
            fontWeight: "bold",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.language")}:
        </label>
        <select
          value={activeLang}
          onChange={(e) => setSelectedLang(e.target.value as Lang)}
          style={{
            padding: "6px 12px",
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            background: "white",
            cursor: "pointer",
          }}
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {t(`admin.languageNames.${lang}`, {
                defaultValue: languageLabel(lang, i18n.language),
              })}
            </option>
          ))}
        </select>
      </div>
      {children(activeLang)}
    </div>
  );
}

// src/components/LanguageAwareEditor.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TipTapEditorWithUpload } from "./TipTapEditorWithUpload";
import { type Lang } from "../types/enums";
import { useContentLanguages } from "../hooks/useContentLanguages";
import { languageLabel } from "../utils/langFields";

interface LanguageAwareEditorProps {
  values: {
    hu: string;
    en: string;
    de: string;
    [lang: string]: string;
  };
  onChange: (lang: Lang, value: string) => void;
  placeholder?: string;
  height?: number;
  label?: string;
}

export function LanguageAwareEditor({
  values,
  onChange,
  placeholder,
  height = 300,
  label,
}: LanguageAwareEditorProps) {
  const { t, i18n } = useTranslation();
  const languages = useContentLanguages();
  const [selectedLang, setSelectedLang] = useState<Lang>(languages[0] || "hu");
  const activeLang = languages.includes(selectedLang) ? selectedLang : languages[0] || "hu";

  return (
    <div>
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontWeight: "bold",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {label}
        </label>
      )}
      <div style={{ marginBottom: 8 }}>
        <select
          value={activeLang}
          onChange={(e) => setSelectedLang(e.target.value as Lang)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            background: "white",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
      <TipTapEditorWithUpload
        value={values[activeLang] || ""}
        onChange={(value) => onChange(activeLang, value)}
        placeholder={
          placeholder
            ? `${placeholder} (${t(`admin.languageNames.${activeLang}`, {
                defaultValue: languageLabel(activeLang, i18n.language),
              })})`
            : undefined
        }
        height={height}
        uploadFolder="editor"
      />
    </div>
  );
}

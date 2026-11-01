// src/components/LanguageAwareEditor.tsx
import { useState, useEffect } from "react";
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
  const { t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState<Lang>("hu");

  useEffect(() => {
    // Update editor content when values change externally
  }, [values]);

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
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value as Lang)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            background: "white",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {t(`admin.languageNames.${lang}`, { defaultValue: languageLabel(lang, i18n.language) })}
            <option key={lang} value={lang}>
              {t(`admin.languageNames.${lang}`)}
            </option>
          ))}
        </select>
        value={values[activeLang] || ""}
        onChange={(value) => onChange(activeLang, value)}
        placeholder={
          placeholder
            ? `${placeholder} (${t(`admin.languageNames.${activeLang}`, { defaultValue: languageLabel(activeLang, i18n.language) })})`
            : undefined
        placeholder={
          placeholder ? `${placeholder} (${t(`admin.languageNames.${selectedLang}`)})` : undefined
        }
        height={height}
        uploadFolder="editor"
      />
    </div>
  );
}

// src/components/LanguageAwareEditor.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TipTapEditorWithUpload } from "./TipTapEditorWithUpload";

type Lang = "hu" | "en" | "de";

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

  const LANGUAGES: Lang[] = ["hu", "en", "de"];

  return (
    <div>
      {label && (
        <label style={{ display: "block", marginBottom: 8, fontWeight: "bold", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
          {label}
        </label>
      )}
      <div style={{ marginBottom: 8 }}>
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value as Lang)}
          style={{
            padding: "6px 12px",
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: 14,
            background: "white",
          }}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {t(`admin.languageNames.${lang}`)}
            </option>
          ))}
        </select>
      </div>
      <TipTapEditorWithUpload
        value={values[selectedLang]}
        onChange={(value) => onChange(selectedLang, value)}
        placeholder={placeholder ? `${placeholder} (${t(`admin.languageNames.${selectedLang}`)})` : undefined}
        height={height}
        uploadFolder="editor"
      />
    </div>
  );
}


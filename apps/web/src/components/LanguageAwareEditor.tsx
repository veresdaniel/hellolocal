// src/components/LanguageAwareEditor.tsx
import { useState, useEffect } from "react";
import { TipTapEditor } from "./TipTapEditor";

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

const LANGUAGES: { code: Lang; name: string }[] = [
  { code: "hu", name: "Hungarian" },
  { code: "en", name: "English" },
  { code: "de", name: "German" },
];

export function LanguageAwareEditor({
  values,
  onChange,
  placeholder,
  height = 300,
  label,
}: LanguageAwareEditorProps) {
  const [selectedLang, setSelectedLang] = useState<Lang>("hu");

  useEffect(() => {
    // Update editor content when values change externally
  }, [values]);

  return (
    <div>
      {label && (
        <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
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
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
      <TipTapEditor
        value={values[selectedLang]}
        onChange={(value) => onChange(selectedLang, value)}
        placeholder={placeholder ? `${placeholder} (${LANGUAGES.find((l) => l.code === selectedLang)?.name})` : undefined}
        height={height}
      />
    </div>
  );
}


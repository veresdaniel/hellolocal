// src/components/LanguageAwareForm.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

type Lang = "hu" | "en" | "de";

const LANGUAGES: Lang[] = ["hu", "en", "de"];

interface LanguageAwareFormProps {
  children: (selectedLang: Lang) => ReactNode;
  defaultLang?: Lang;
}

export function LanguageAwareForm({ children, defaultLang = "hu" }: LanguageAwareFormProps) {
  const { t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState<Lang>(defaultLang);

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ fontWeight: "bold", fontSize: 14 }}>{t("admin.language")}:</label>
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value as Lang)}
          style={{
            padding: "6px 12px",
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: 14,
            background: "white",
            cursor: "pointer",
          }}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {t(`admin.languageNames.${lang}`)}
            </option>
          ))}
        </select>
      </div>
      {children(selectedLang)}
    </div>
  );
}


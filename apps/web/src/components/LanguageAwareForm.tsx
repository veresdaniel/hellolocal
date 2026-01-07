// src/components/LanguageAwareForm.tsx
import { useState } from "react";
import type { ReactNode } from "react";

type Lang = "hu" | "en" | "de";

const LANGUAGES: { code: Lang; name: string }[] = [
  { code: "hu", name: "Hungarian" },
  { code: "en", name: "English" },
  { code: "de", name: "German" },
];

interface LanguageAwareFormProps {
  children: (selectedLang: Lang) => ReactNode;
  defaultLang?: Lang;
}

export function LanguageAwareForm({ children, defaultLang = "hu" }: LanguageAwareFormProps) {
  const [selectedLang, setSelectedLang] = useState<Lang>(defaultLang);

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ fontWeight: "bold", fontSize: 14 }}>Language:</label>
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
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
      {children(selectedLang)}
    </div>
  );
}


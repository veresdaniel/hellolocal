// src/components/LanguageSelector.tsx
import { useTranslation } from "react-i18next";

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang: "hu" | "en" | "de") => {
    i18n.changeLanguage(lang);
    localStorage.setItem("i18nextLng", lang);
  };

  return (
    <select
      value={i18n.language || "hu"}
      onChange={(e) => handleLanguageChange(e.target.value as "hu" | "en" | "de")}
      style={{
        padding: "8px 16px",
        fontSize: 16,
        borderRadius: 4,
        border: "1px solid #ddd",
        background: "white",
        cursor: "pointer",
      }}
    >
      <option value="hu">🇭🇺 HU</option>
      <option value="en">🇬🇧 EN</option>
      <option value="de">🇩🇪 DE</option>
    </select>
  );
}


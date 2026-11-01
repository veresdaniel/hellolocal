// src/components/LanguageSelector.tsx
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { buildUrl } from "../app/urls";
import { useRouteCtx } from "../app/useRouteCtx";
import { HAS_MULTIPLE_SITES, DEFAULT_SITE_SLUG, type Lang } from "../app/config";
import { LanguageSelectOptions } from "./LanguageSelectOptions";
import { usePublishedLanguages } from "../hooks/useContentLanguages";

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { lang: currentLang, siteKey } = useRouteCtx();
  const languages = usePublishedLanguages();
  const isAdminPage = location.pathname.includes("/admin");

  const handleLanguageChange = (lang: Lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("i18nextLng", lang);

    // If we're on a public page (has lang in URL), navigate to new language URL
    if (!isAdminPage && currentLang) {
      const currentPath = location.pathname;
      // Replace the language segment in the path
      const newPath = currentPath.replace(`/${currentLang}`, `/${lang}`);
      if (newPath !== currentPath) {
        navigate(newPath + location.search, { replace: true });
      } else {
        // If no lang in path, build new path with language
        const basePath = buildUrl({ lang, siteKey, path: "" });
        navigate(basePath + location.search, { replace: true });
      }
    }

    // Admin pages: replace language in URL
    if (isAdminPage && currentLang) {
      const currentPath = location.pathname;
      const newPath = currentPath.replace(`/${currentLang}/admin`, `/${lang}/admin`);
      if (newPath !== currentPath) {
        navigate(newPath + location.search, { replace: true });
      }
    }
  };

  return (
    <select
      value={i18n.language || "hu"}
      onChange={(e) => handleLanguageChange(e.target.value as Lang)}
      aria-label={t("common.language")}
      style={{
        padding: "8px 16px",
        fontSize: "clamp(14px, 3.5vw, 16px)",
        borderRadius: 8,
        border: "1px solid rgba(0, 0, 0, 0.1)",
        background: "transparent",
        cursor: "pointer",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "var(--hl-ink, #1b1730)",
        fontWeight: 500,
        transition: "all 0.2s",
        height: "auto",
        lineHeight: 1,
        boxSizing: "border-box",
      }}
    >
      <LanguageSelectOptions variant="code" codes={languages} />
    </select>
  );
}

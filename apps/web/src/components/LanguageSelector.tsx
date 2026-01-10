// src/components/LanguageSelector.tsx
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { buildPath } from "../app/routing/buildPath";
import { HAS_MULTIPLE_TENANTS, DEFAULT_TENANT_SLUG, type Lang } from "../app/config";

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ lang?: Lang; tenantSlug?: string }>();
  
  // Try to get lang from URL params (for public pages and admin pages)
  const currentLang = params.lang;
  const tenantSlug = HAS_MULTIPLE_TENANTS ? (params.tenantSlug || DEFAULT_TENANT_SLUG) : DEFAULT_TENANT_SLUG;
  const isAdminPage = location.pathname.includes("/admin");

  const handleLanguageChange = (lang: "hu" | "en" | "de") => {
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
        const basePath = buildPath({ tenantSlug, lang, path: "" });
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


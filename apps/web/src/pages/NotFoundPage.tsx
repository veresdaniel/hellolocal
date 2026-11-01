import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {  DEFAULT_LANG, HAS_MULTIPLE_SITES, DEFAULT_SITE_SLUG, type Lang, isLang} from "../app/config";
import { useActiveSitesCount } from "../hooks/useActiveSitesCount";
import "../styles/not-found.css";


export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const { data: sitesCountData } = useActiveSitesCount();

  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  const shouldShowSiteSlug = HAS_MULTIPLE_SITES && (sitesCountData?.count ?? 0) > 1;
  const siteSlug = shouldShowSiteSlug ? DEFAULT_SITE_SLUG : undefined;
  const homePath = siteSlug ? `/${lang}/${siteSlug}` : `/${lang}`;

  return (
    <div className="not-found hl-public">
      <div className="not-found__sky" aria-hidden="true" />
      <div className="not-found__card">
        <img className="not-found__mark" src="/icons/icon-192.png" alt="" />
        <p className="not-found__code">404</p>
        <h1>{t("error.pageNotFound")}</h1>
        <p>{t("error.pageNotFoundDescription")}</p>
        <div className="not-found__actions">
          <Link to={homePath}>{t("error.goHome")}</Link>
          <button type="button" onClick={() => navigate(-1)}>
            {t("error.goBack")}
          </button>
        </div>
      </div>
    </div>
  );
}

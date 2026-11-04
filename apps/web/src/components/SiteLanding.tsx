import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FloatingHeader } from "./FloatingHeader";
import { ShortcodeRenderer } from "./ShortcodeRenderer";
import { openSiteExplore, type SiteLandingContent } from "../utils/siteLanding";
import { mapViewSegment } from "../app/entityPaths";
import { buildUrl } from "../app/urls";
import type { Lang } from "../app/config";
import "../styles/story.css";

export function SiteLanding({
  lang,
  siteKey,
  landing,
}: {
  lang: string;
  siteKey: string;
  landing: SiteLandingContent;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="story">
      <FloatingHeader landingMode />
      <div className="story__sky" aria-hidden="true" />
      <div className="story__wrap">
        {landing.hero ? (
          <div className="story__hero">
            <img src={landing.hero} alt="" loading="eager" decoding="async" fetchPriority="high" />
          </div>
        ) : null}
        <article className="story__sheet">
          <h1>{landing.name}</h1>
          <div className="story__body">
            <ShortcodeRenderer content={landing.html} lang={lang} siteKey={siteKey} />
          </div>
          <div className="story__actions">
            <button
              type="button"
              className="story__action story__action--primary"
              onClick={() => {
                openSiteExplore("map");
                navigate(
                  buildUrl({
                    lang: lang as Lang,
                    siteKey,
                    path: mapViewSegment(lang),
                  })
                );
              }}
            >
              {t("public.mapView")}
            </button>
            <button type="button" className="story__action" onClick={() => openSiteExplore("list")}>
              {t("public.listView")}
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FloatingHeader } from "./FloatingHeader";
import { ImageWithSkeleton } from "./ImageWithSkeleton";
import { ShortcodeRenderer } from "./ShortcodeRenderer";
import { openSiteExplore, type SiteLandingContent } from "../utils/siteLanding";
import { mapViewSegment } from "../app/entityPaths";
import { buildUrl } from "../app/urls";
import type { Lang } from "../app/config";
import { sanitizeImageUrl } from "../utils/urlValidation";
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
        {sanitizeImageUrl(landing.hero) ? (
          <div className="story__hero">
            <ImageWithSkeleton
              src={sanitizeImageUrl(landing.hero) || landing.hero}
              alt=""
              priority
              width={1600}
              height={700}
              sizes="(max-width: 1080px) 100vw, 1080px"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
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

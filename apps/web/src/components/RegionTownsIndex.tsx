import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FloatingHeader } from "./FloatingHeader";
import { ShortcodeRenderer } from "./ShortcodeRenderer";
import { openSiteExplore, type SiteLandingContent } from "../utils/siteLanding";
import { sanitizeImageUrl } from "../utils/urlValidation";
import type { PublicTown } from "../api/places.api";
import "../styles/story.css";
import "../styles/region-towns.css";

type RegionTownsIndexProps = {
  lang: string;
  siteKey: string;
  regionName: string;
  landing: SiteLandingContent | null;
  towns: PublicTown[];
  onSelectTown: (town: PublicTown) => void;
};

export function RegionTownsIndex({
  lang,
  siteKey,
  regionName,
  landing,
  towns,
  onSelectTown,
}: RegionTownsIndexProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return towns;
    return towns.filter((town) => town.name.toLowerCase().includes(q));
  }, [towns, query]);

  return (
    <div className="story region-towns">
      <FloatingHeader landingMode />
      <div className="story__sky" aria-hidden="true" />
      <div className="story__wrap">
        {landing?.hero ? (
          <div className="story__hero">
            <img src={landing.hero} alt="" loading="eager" decoding="async" fetchPriority="high" />
          </div>
        ) : null}

        <article className="story__sheet region-towns__intro">
          <p className="region-towns__eyebrow">{t("public.region.eyebrow")}</p>
          <h1>{landing?.name || regionName}</h1>
          {landing?.html ? (
            <div className="story__body">
              <ShortcodeRenderer content={landing.html} lang={lang} siteKey={siteKey} />
            </div>
          ) : (
            <p className="region-towns__lead">{t("public.region.lead")}</p>
          )}
          <div className="story__actions">
            <button
              type="button"
              className="story__action story__action--primary"
              onClick={() => openSiteExplore("map")}
            >
              {t("public.mapView")}
            </button>
            <button type="button" className="story__action" onClick={() => openSiteExplore("list")}>
              {t("public.listView")}
            </button>
          </div>
        </article>

        <section className="region-towns__list" aria-label={t("public.region.townsHeading")}>
          <div className="region-towns__list-head">
            <h2 className="hl-page-title">{t("public.region.townsHeading")}</h2>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("public.region.searchTowns")}
              className="region-towns__search"
              aria-label={t("public.region.searchTowns")}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="hl-page-muted region-towns__empty">{t("public.region.noTowns")}</p>
          ) : (
            <ul className="region-towns__grid">
              {filtered.map((town) => {
                const hero = sanitizeImageUrl(town.heroImage);
                return (
                  <li key={town.id}>
                    <button
                      type="button"
                      className="hl-content-card region-towns__card"
                      onClick={() => onSelectTown(town)}
                    >
                      {hero ? (
                        <div className="region-towns__card-media">
                          <img src={hero} alt="" loading="lazy" decoding="async" />
                        </div>
                      ) : null}
                      <div className="region-towns__card-body">
                        <h3>{town.name}</h3>
                        <p>
                          {t("public.region.placeCount", { count: town.placeCount })}
                        </p>
                        <span className="region-towns__card-cta">{t("public.region.openTown")}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

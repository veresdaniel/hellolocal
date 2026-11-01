import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { buildUrl } from "../../app/urls";
import { useRouteCtx } from "../../app/useRouteCtx";
import { useTranslation } from "react-i18next";
import { getPlatformSettings } from "../../api/places.api";
import { sanitizeImageUrl } from "../../utils/urlValidation";
import type { StaticPage } from "../../api/static-pages.api";

interface StaticPageCardProps {
  staticPage: StaticPage;
  index?: number;
}

function categoryLabel(category: string, t: (key: string) => string): string {
  if (category === "blog") return t("admin.categoryBlog");
  if (category === "tudastar") return t("admin.categoryTudastar");
  if (category === "infok") return t("admin.categoryInfok");
  return category;
}

export function StaticPageCard({ staticPage }: StaticPageCardProps) {
  const { lang, siteKey } = useRouteCtx();
  const { t } = useTranslation();

  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", lang, siteKey],
    queryFn: () => getPlatformSettings(lang, siteKey),
    staleTime: 5 * 60 * 1000,
  });

  const imageUrl = sanitizeImageUrl(platformSettings?.defaultPlaceholderCardImage) || null;
  const plain =
    staticPage.shortDescription?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";

  return (
    <Link
      className="story-card"
      to={buildUrl({ lang, siteKey, path: `static-page/${staticPage.id}` })}
    >
      {imageUrl ? (
        <div className="story-card__media">
          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
        </div>
      ) : null}
      <div className="story-card__body">
        <p className="story__eyebrow">{categoryLabel(staticPage.category, t)}</p>
        <h3>{staticPage.title}</h3>
        {plain ? <p>{plain}</p> : null}
        <span className="story-card__more">{t("public.open")}</span>
      </div>
    </Link>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Event } from "../../api/places.api";
import { buildUrl } from "../../app/urls";
import { useRouteCtx } from "../../app/useRouteCtx";
import { Badge } from "../../components/Badge";
import { ImageWithSkeleton } from "../../components/ImageWithSkeleton";
import { sanitizeImageUrl } from "../../utils/urlValidation";
import "../../styles/list-card.css";

export function EventGridCard({
  event,
  placeholderImage,
}: {
  event: Event;
  placeholderImage?: string | null;
}) {
  const { lang, siteKey } = useRouteCtx();
  const { t } = useTranslation();
  const imageUrl = sanitizeImageUrl(event.heroImage) || sanitizeImageUrl(placeholderImage) || null;
  const hasValidSlug = Boolean(event.slug && event.slug !== event.id);
  const when = new Date(event.startDate).toLocaleDateString(
    lang === "hu" ? "hu-HU" : lang === "de" ? "de-DE" : "en-US",
    { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
  );

  const card = (
    <article
      className="list-card"
      style={{
        ["--list-accent" as string]: "#c45c26",
        opacity: hasValidSlug ? 1 : 0.75,
      }}
    >
      <div className="list-card__media" style={{ background: "#c45c26" }}>
        {imageUrl ? (
          <div className="list-card__media-fill">
            <ImageWithSkeleton
              src={imageUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center top",
                display: "block",
              }}
              skeletonStyle={{ borderRadius: 0 }}
            />
          </div>
        ) : null}
        <div style={{ position: "absolute", top: 12, left: 12, zIndex: 2 }}>
          <Badge
            variant="custom"
            backgroundColor="rgba(102, 126, 234, 0.95)"
            textColor="white"
            size="small"
            uppercase
            style={{ backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)" }}
          >
            {t("public.events")}
          </Badge>
        </div>
      </div>
      <div className="list-card__body">
        <h3 className="list-card__title">
          {event.isPinned ? "📌 " : ""}
          {event.name}
        </h3>
        <div className="list-card__meta">{when}</div>
        <p className="list-card__copy">{event.shortDescription || "\u00a0"}</p>
        <div className="list-card__extra">{event.placeName ? `📍 ${event.placeName}` : "\u00a0"}</div>
        <div className="list-card__footer">
          <span style={{ color: hasValidSlug ? "#c45c26" : "#8a829c" }}>
            {hasValidSlug
              ? `${t("public.readMore")} →`
              : t("public.placeSlugMissing") || "Részletek hamarosan..."}
          </span>
        </div>
      </div>
    </article>
  );

  if (!hasValidSlug) return card;

  return (
    <Link
      to={buildUrl({ lang, siteKey, path: `event/${event.slug}` })}
      style={{ display: "flex", flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}
    >
      {card}
    </Link>
  );
}

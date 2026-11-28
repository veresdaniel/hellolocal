import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Place } from "../../types/place";
import { buildUrl } from "../../app/urls";
import { placeEntityPath } from "../../app/entityPaths";
import { useRouteCtx } from "../../app/useRouteCtx";
import { useTranslation } from "react-i18next";
import { getPlatformSettings } from "../../api/places.api";
import { sanitizeImageUrl } from "../../utils/urlValidation";
import { SafeHtml } from "../../components/SafeHtml";
import { Badge } from "../../components/Badge";
import { ImageWithSkeleton } from "../../components/ImageWithSkeleton";
import { StarRating } from "../../components/StarRating";
import { visitorPriceLabel } from "../../utils/priceLabel";
import { trackGtmSelectItem } from "../../lib/gtmEvents";
import "../../styles/list-card.css";

// Function to get color for category
function getCategoryColor(categoryName: string | null | undefined): string {
  if (!categoryName) return "#c45c26";

  const normalized = categoryName.toLowerCase();

  // Color mapping based on category name
  const colorMap: Record<string, string> = {
    borászat: "#8B4513", // Brown for winery
    winery: "#8B4513",
    weingut: "#8B4513",
    szállás: "#4169E1", // Royal blue for accommodation
    accommodation: "#4169E1",
    unterkunft: "#4169E1",
    gasztro: "#FF6347", // Tomato red for gastronomy
    gastronomy: "#FF6347",
    gastronomie: "#FF6347",
    étterem: "#FF6347",
    restaurant: "#FF6347",
    turisztika: "#32CD32", // Lime green for tourism
    tourism: "#32CD32",
    tourismus: "#32CD32",
    kézműves: "#FF8C00", // Dark orange for craft
    craft: "#FF8C00",
    handwerk: "#FF8C00",
  };

  // Check for partial matches
  for (const [key, color] of Object.entries(colorMap)) {
    if (normalized.includes(key)) {
      return color;
    }
  }

  // Default gradient colors based on hash of category name
  const colors = [
    "#667eea",
    "#764ba2",
    "#f093fb",
    "#4facfe",
    "#00f2fe",
    "#43e97b",
    "#fa709a",
    "#fee140",
    "#30cfd0",
    "#330867",
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
  ];
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface PlaceCardProps {
  place: Place;
  /** Grid index — first cards are LCP candidates (eager + high priority). */
  index?: number;
}

export function PlaceCard({ place, index = 0 }: PlaceCardProps) {
  const { lang, siteKey } = useRouteCtx();
  const { t } = useTranslation();
  const categoryName = place.category || null;
  // Use category color from database, fallback to getCategoryColor function
  const categoryColor = place.categoryColor || getCategoryColor(categoryName);

  // Load platform settings for default placeholder image
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", lang, siteKey],
    queryFn: () => getPlatformSettings(lang, siteKey),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Prefer dedicated card image, then hero, then platform placeholder.
  // Marketing map ladder: use 480 as primary so SPA matches SSR explore LCP preload.
  const rawImage =
    sanitizeImageUrl(place.cardImage) ||
    sanitizeImageUrl(place.heroImage) ||
    sanitizeImageUrl(platformSettings?.defaultPlaceholderCardImage) ||
    null;
  const imageUrl = rawImage?.match(/\/marketing\/map-szeged/i)
    ? "/marketing/map-szeged-480.webp"
    : rawImage;
  const hasSlug = !!place.slug;

  // Common article content
  const articleContent = (
    <>
      <div
        className="list-card__media"
        style={{
          background: categoryColor,
        }}
      >
        {imageUrl && (
          <div className="list-card__media-fill">
            <ImageWithSkeleton
              src={imageUrl}
              alt={place.name}
              priority={index < 2}
              width={500}
              height={320}
              sizes="(max-width: 680px) 92vw, (max-width: 1040px) 45vw, 30vw"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center top",
                display: "block",
              }}
              skeletonStyle={{
                borderRadius: 0,
              }}
            />
          </div>
        )}
        {categoryName && (
          <div className="list-card__cat-wrap">
            <span className="list-card__cat">{categoryName}</span>
          </div>
        )}
      </div>

      <div className="list-card__body">
        <h3 className="list-card__title">{place.name}</h3>

        {/* Wrappers stay mounted so desktop grid rows can reserve equal slot height;
            mobile CSS collapses :empty. */}
        <div className="list-card__meta">
          {place.rating && (place.rating.avg !== null || place.rating.count !== null) ? (
            <StarRating
              avg={place.rating.avg}
              count={place.rating.count}
              interactive={false}
              size="sm"
            />
          ) : null}
        </div>

        {place.shortDescription ? (
          <SafeHtml html={place.shortDescription} className="list-card__copy" />
        ) : (
          <div className="list-card__copy" aria-hidden="true" />
        )}

        <div className="list-card__extra">
          {place.priceBand ? (
            <Badge
              variant="priceBand"
              size="small"
              opacity={0.1}
              style={{
                color: "#764ba2",
                border: "1px solid rgba(118, 75, 162, 0.2)",
              }}
            >
              {visitorPriceLabel(place.priceBand || "")}
            </Badge>
          ) : null}
          {place.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="tag" size="small">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Footer: Link button or info message */}
        <div className="list-card__footer">
          {hasSlug ? (
            <div
              className="card-read-more"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: categoryColor,
                fontSize: "inherit",
                fontWeight: 500,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                transition: "all 0.3s ease",
              }}
            >
              <span>{t("public.open") || "Tovább"}</span>
              <span
                style={{
                  transition: "transform 0.3s ease",
                  display: "inline-block",
                }}
              >
                →
              </span>
            </div>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#999",
                fontSize: 15,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 400,
                fontStyle: "italic",
              }}
            >
              <span>{t("public.placeSlugMissing") || "Részletek hamarosan..."}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // Cards stay visible as soon as they mount — no opacity:0 stagger that
  // reserves empty grid holes while later items "wait" to animate in.
  // Hover arrow nudge lives in list-card.css (do not inject <style> into the
  // grid: flex/grid children make style tag text visible and steal slots).
  if (!hasSlug) {
    return (
      <article
        className="list-card"
        style={{
          cursor: "default",
          ["--list-accent" as string]: categoryColor,
          opacity: 0.8,
        }}
      >
        {articleContent}
      </article>
    );
  }

  return (
    <Link
      to={buildUrl({ lang, siteKey, path: placeEntityPath(lang, place.slug) })}
      onClick={() =>
        trackGtmSelectItem({
          itemId: place.id,
          itemName: place.name,
          itemCategory: place.category || undefined,
          itemType: "place",
          listName: "places_list",
        })
      }
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flex: 1,
        minWidth: 0,
      }}
    >
      <article
        className="list-card"
        style={{
          cursor: "pointer",
          ["--list-accent" as string]: categoryColor,
        }}
      >
        {articleContent}
      </article>
    </Link>
  );
}

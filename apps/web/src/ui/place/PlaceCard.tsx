import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Place } from "../../types/place";
import { buildUrl } from "../../app/urls";
import { useRouteCtx } from "../../app/useRouteCtx";
import { useTranslation } from "react-i18next";
import { getPlatformSettings } from "../../api/places.api";
import { sanitizeImageUrl } from "../../utils/urlValidation";
import { Badge } from "../../components/Badge";
import { ImageWithSkeleton } from "../../components/ImageWithSkeleton";

// Function to get color for category
function getCategoryColor(categoryName: string | null | undefined): string {
  if (!categoryName) return "#667eea";
  
  const normalized = categoryName.toLowerCase();
  
  // Color mapping based on category name
  const colorMap: Record<string, string> = {
    "borászat": "#8B4513", // Brown for winery
    "winery": "#8B4513",
    "weingut": "#8B4513",
    "szállás": "#4169E1", // Royal blue for accommodation
    "accommodation": "#4169E1",
    "unterkunft": "#4169E1",
    "gasztro": "#FF6347", // Tomato red for gastronomy
    "gastronomy": "#FF6347",
    "gastronomie": "#FF6347",
    "étterem": "#FF6347",
    "restaurant": "#FF6347",
    "turisztika": "#32CD32", // Lime green for tourism
    "tourism": "#32CD32",
    "tourismus": "#32CD32",
    "kézműves": "#FF8C00", // Dark orange for craft
    "craft": "#FF8C00",
    "handwerk": "#FF8C00",
  };
  
  // Check for partial matches
  for (const [key, color] of Object.entries(colorMap)) {
    if (normalized.includes(key)) {
      return color;
    }
  }
  
  // Default gradient colors based on hash of category name
  const colors = [
    "#667eea", "#764ba2", "#f093fb", "#4facfe", "#00f2fe",
    "#43e97b", "#fa709a", "#fee140", "#30cfd0", "#330867",
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"
  ];
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface PlaceCardProps {
  place: Place;
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

  // Determine which image to use: place image or default placeholder
  // Sanitize URLs to prevent XSS attacks
  const imageUrl = sanitizeImageUrl(place.heroImage) || sanitizeImageUrl(platformSettings?.defaultPlaceholderCardImage) || null;
  const hasSlug = !!place.slug;

  // Common article content
  const articleContent = (
    <>
      {imageUrl && (
        <div
          style={{
            width: "100%",
            height: 240,
            overflow: "hidden",
            background: `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}dd 100%)`,
            position: "relative",
          }}
        >
          <ImageWithSkeleton
            src={imageUrl}
            alt={place.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "transform 0.4s ease",
            }}
            skeletonStyle={{
              borderRadius: 0,
            }}
            onMouseEnter={hasSlug ? (e) => {
              e.currentTarget.style.transform = "scale(1.1)";
            } : undefined}
            onMouseLeave={hasSlug ? (e) => {
              e.currentTarget.style.transform = "scale(1)";
            } : undefined}
          />
          {/* Category badge overlay on image */}
          {categoryName && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 10,
              }}
            >
              <Badge
                variant="category"
                color={categoryColor}
                backgroundColor="rgba(255, 255, 255, 0.95)"
                textColor={categoryColor}
                size="small"
                uppercase={true}
                style={{
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                }}
              >
                {categoryName}
              </Badge>
            </div>
          )}
        </div>
      )}

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              color: "#1a1a1a",
              lineHeight: 1.3,
              flex: 1,
              transition: "color 0.3s ease",
              minWidth: 0,
              wordWrap: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {place.name}
          </h3>
        </div>

        {place.shortDescription && (
          <div
            style={{
              fontSize: 14,
              color: "#666",
              lineHeight: 1.6,
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontWeight: 400,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              minWidth: 0,
              wordWrap: "break-word",
              overflowWrap: "break-word",
            }}
            dangerouslySetInnerHTML={{ __html: place.shortDescription }}
          />
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
          {place.priceBand && (
            <Badge
              variant="priceBand"
              size="small"
              opacity={0.1}
              style={{
                color: "#764ba2",
                border: "1px solid rgba(118, 75, 162, 0.2)",
              }}
            >
              {place.priceBand || ""}
            </Badge>
          )}
          {place.tags?.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="tag"
              size="small"
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Footer: Link button or info message */}
        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid #e0e0e0",
          }}
        >
          {hasSlug ? (
            <div
              className="card-read-more"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: categoryColor,
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                fontSize: 14,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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

  return (
    <div
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        animation: `fadeInUp 0.6s ease-out ${index * 0.1}s forwards`,
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        article:hover .card-read-more span:last-child {
          transform: translateX(4px);
        }
      `}</style>
      {hasSlug ? (
        <Link
          to={buildUrl({ lang, siteKey, path: `place/${place.slug}` })}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "block",
          }}
        >
          <article
            style={{
              background: "white",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              cursor: "pointer",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              borderBottom: `3px solid ${categoryColor}`,
              position: "relative",
              maxWidth: "100%",
              minWidth: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.15)";
              e.currentTarget.style.borderBottomWidth = "4px";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
              e.currentTarget.style.borderBottomWidth = "3px";
            }}
          >
            {articleContent}
          </article>
        </Link>
      ) : (
        <article
          style={{
            background: "white",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            cursor: "default",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderBottom: `3px solid ${categoryColor}`,
            position: "relative",
            opacity: 0.8,
            maxWidth: "100%",
            minWidth: 0,
          }}
        >
          {articleContent}
        </article>
      )}
    </div>
  );
}

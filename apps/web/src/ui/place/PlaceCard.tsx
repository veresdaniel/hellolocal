import { Link } from "react-router-dom";
import type { Place } from "../../types/place";
import { useTenantContext } from "../../app/tenant/useTenantContext";
import { buildPath } from "../../app/routing/buildPath";
import { useTranslation } from "react-i18next";

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
  const { lang, tenantSlug } = useTenantContext();
  const { t } = useTranslation();
  const categoryName = typeof place.category === "string" ? place.category : place.category?.name || null;
  const categoryColor = getCategoryColor(categoryName);

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
      <Link
        to={buildPath({ tenantSlug, lang, path: `place/${place.slug}` })}
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
          {place.heroImage && (
            <div
              style={{
                width: "100%",
                height: 240,
                overflow: "hidden",
                background: `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}dd 100%)`,
                position: "relative",
              }}
            >
              <img
                src={place.heroImage}
                alt={place.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  transition: "transform 0.4s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              />
            </div>
          )}

          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  lineHeight: 1.3,
                  flex: 1,
                  transition: "color 0.3s ease",
                }}
              >
                {place.name}
              </h3>
              {categoryName && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: categoryColor,
                    background: `${categoryColor}15`,
                    padding: "4px 12px",
                    borderRadius: 12,
                    whiteSpace: "nowrap",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    border: `1px solid ${categoryColor}40`,
                    transition: "all 0.3s ease",
                  }}
                >
                  {categoryName}
                </span>
              )}
            </div>

            {place.description && (
              <div
                style={{
                  fontSize: 14,
                  color: "#666",
                  lineHeight: 1.6,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                }}
                dangerouslySetInnerHTML={{ __html: place.description }}
              />
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
              {place.priceBand && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#764ba2",
                    background: "rgba(118, 75, 162, 0.1)",
                    border: "1px solid rgba(118, 75, 162, 0.2)",
                    borderRadius: 12,
                    padding: "4px 10px",
                  }}
                >
                  {typeof place.priceBand === "string" ? place.priceBand : place.priceBand.name}
                </span>
              )}
              {place.tags?.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#666",
                    background: "#f5f5f5",
                    border: "1px solid #e0e0e0",
                    borderRadius: 12,
                    padding: "4px 10px",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Tovább button */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid #e0e0e0",
              }}
            >
              <div
                className="card-read-more"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: categoryColor,
                  fontSize: 14,
                  fontWeight: 600,
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
            </div>
          </div>
        </article>
      </Link>
    </div>
  );
}

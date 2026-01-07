import { Link } from "react-router-dom";
import { useTenantContext } from "../../app/tenant/useTenantContext";
import { buildPath } from "../../app/routing/buildPath";
import type { StaticPage } from "../../api/static-pages.api";

interface StaticPageCardProps {
  staticPage: StaticPage;
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case "blog":
      return "Blog";
    case "tudastar":
      return "Tudástár";
    case "infok":
      return "Infók";
    default:
      return category;
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case "blog":
      return "#667eea";
    case "tudastar":
      return "#764ba2";
    case "infok":
      return "#f093fb";
    default:
      return "#667eea";
  }
}

export function StaticPageCard({ staticPage }: StaticPageCardProps) {
  const { lang, tenantSlug } = useTenantContext();
  const categoryColor = getCategoryColor(staticPage.category);
  const categoryLabel = getCategoryLabel(staticPage.category);

  // Strip HTML tags for preview
  const textContent = staticPage.content.replace(/<[^>]*>/g, "").trim();
  const preview = textContent.length > 150 ? textContent.substring(0, 150) + "..." : textContent;

  return (
    <Link
      to={buildPath({ tenantSlug, lang, path: `static-page/${staticPage.id}` })}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        background: "white",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #e0e0e0",
        transition: "all 0.3s ease",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
        const readMore = e.currentTarget.querySelector(".card-read-more") as HTMLElement;
        if (readMore) {
          readMore.style.transform = "translateX(4px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
        const readMore = e.currentTarget.querySelector(".card-read-more") as HTMLElement;
        if (readMore) {
          readMore.style.transform = "translateX(0)";
        }
      }}
    >
      <div
        style={{
          width: "100%",
          height: 240,
          overflow: "hidden",
          background: `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}dd 100%)`,
          position: "relative",
        }}
      >
        {/* Category badge overlay on image */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(8px)",
            padding: "6px 14px",
            borderRadius: 20,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: categoryColor,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {categoryLabel}
          </span>
        </div>
      </div>

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
            {staticPage.title}
          </h3>
        </div>

        {preview && (
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
          >
            {preview}
          </div>
        )}

        {/* Footer: Link button */}
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
            <span>Tovább</span>
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
    </Link>
  );
}


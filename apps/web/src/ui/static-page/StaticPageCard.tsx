import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTenantContext } from "../../app/tenant/useTenantContext";
import { buildPath } from "../../app/routing/buildPath";
import { useTranslation } from "react-i18next";
import { getSiteSettings } from "../../api/places.api";
import { sanitizeImageUrl } from "../../utils/urlValidation";
import { Badge } from "../../components/Badge";
import { ImageWithSkeleton } from "../../components/ImageWithSkeleton";
import type { StaticPage } from "../../api/static-pages.api";

interface StaticPageCardProps {
  staticPage: StaticPage;
  index?: number;
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

export function StaticPageCard({ staticPage, index = 0 }: StaticPageCardProps) {
  const { lang, tenantSlug } = useTenantContext();
  const { t } = useTranslation();
  const categoryColor = getCategoryColor(staticPage.category);
  const categoryLabel = getCategoryLabel(staticPage.category);

  // Load site settings for default placeholder image
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", lang, tenantSlug],
    queryFn: () => getSiteSettings(lang, tenantSlug),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Use default placeholder image if available
  const imageUrl = sanitizeImageUrl(siteSettings?.defaultPlaceholderCardImage) || null;

  // Common article content
  const articleContent = (
    <>
      <div
        style={{
          width: "100%",
          height: 240,
          overflow: "hidden",
          background: `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}dd 100%)`,
          position: "relative",
        }}
      >
        {imageUrl && (
          <ImageWithSkeleton
            src={imageUrl}
            alt={staticPage.title}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          />
        )}
        {/* Category badge overlay on image */}
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
            {categoryLabel}
          </Badge>
        </div>
      </div>

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
            {staticPage.title}
          </h3>
        </div>

        {(staticPage.shortDescription || staticPage.content) && (
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
            dangerouslySetInnerHTML={{ __html: staticPage.shortDescription || staticPage.content || "" }}
          />
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
      <Link
        to={buildPath({ tenantSlug, lang, path: `static-page/${staticPage.id}` })}
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
    </div>
  );
}


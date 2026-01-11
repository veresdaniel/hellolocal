import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Tenant } from "../../api/places.api";
import { useTenantContext } from "../../app/tenant/useTenantContext";
import { buildPath } from "../../app/routing/buildPath";
import { useTranslation } from "react-i18next";
import { getSiteSettings } from "../../api/places.api";
import { sanitizeImageUrl } from "../../utils/urlValidation";
import { ImageWithSkeleton } from "../../components/ImageWithSkeleton";

interface TenantCardProps {
  tenant: Tenant;
  index?: number;
}

export function TenantCard({ tenant, index = 0 }: TenantCardProps) {
  const { lang, tenantSlug } = useTenantContext();
  const { t } = useTranslation();

  // Load site settings for default placeholder image
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", lang, tenantSlug],
    queryFn: () => getSiteSettings(lang, tenantSlug),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Determine which image to use: tenant image or default placeholder
  const imageUrl = sanitizeImageUrl(tenant.heroImage) || sanitizeImageUrl(siteSettings?.defaultPlaceholderCardImage) || null;

  // Default color for tenant cards
  const defaultColor = "#667eea";

  // Common article content
  const articleContent = (
    <>
      {imageUrl && (
        <div
          style={{
            width: "100%",
            height: 240,
            overflow: "hidden",
            background: `linear-gradient(135deg, ${defaultColor} 0%, ${defaultColor}dd 100%)`,
            position: "relative",
          }}
        >
          <ImageWithSkeleton
            src={imageUrl}
            alt={tenant.name}
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
        </div>
      )}

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, flex: 1, justifyContent: "space-between" }}>
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
          {tenant.name}
        </h3>

        {/* Footer: Link button */}
        <div
          style={{
            marginTop: "auto",
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
              color: defaultColor,
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
        to={buildPath({ tenantSlug: tenant.slug, lang, path: "" })}
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
            borderBottom: `3px solid ${defaultColor}`,
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
          {articleContent}
        </article>
      </Link>
    </div>
  );
}

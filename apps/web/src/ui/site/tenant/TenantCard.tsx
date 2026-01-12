import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Tenant } from "../../api/places.api";
import { buildUrl } from "../../app/urls";
import { useRouteCtx } from "../../app/useRouteCtx";
import { useTranslation } from "react-i18next";
import { getPlatformSettings } from "../../api/places.api";
import { sanitizeImageUrl } from "../../utils/urlValidation";
import { ImageWithSkeleton } from "../../components/ImageWithSkeleton";

interface TenantCardProps {
  tenant: Tenant;
  index?: number;
}

export function TenantCard({ tenant, index = 0 }: TenantCardProps) {
  const { lang, tenantKey } = useRouteCtx();
  const { t } = useTranslation();

  // Load site settings for default placeholder image
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", lang, tenantKey],
    queryFn: () => getPlatformSettings(lang, tenantKey),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Determine which image to use: tenant image or default placeholder
  const imageUrl = sanitizeImageUrl(tenant.heroImage) || sanitizeImageUrl(platformSettings?.defaultPlaceholderCardImage) || null;

  // Default gradient colors for tenant cards
  const gradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  ];
  const gradient = gradients[index % gradients.length];

  return (
    <div
      style={{
        opacity: 0,
        transform: "translateY(30px)",
        animation: `fadeInUp 0.6s ease-out ${index * 0.08}s forwards`,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        paddingTop: 12, // Padding to prevent clipping on hover
        paddingBottom: 12,
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .tenant-card:hover .card-read-more span:last-child {
          transform: translateX(6px);
        }
        .tenant-card:hover .card-image {
          transform: scale(1.05);
        }
      `}</style>
      <Link
        to={buildUrl({ lang, tenantKey: tenant.slug, path: "" })}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "block",
          height: "100%",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <article
          className="tenant-card"
          style={{
            background: "white",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            cursor: "pointer",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            position: "relative",
            maxWidth: "100%",
            minWidth: 0,
            width: "100%",
            boxSizing: "border-box",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-12px)";
            e.currentTarget.style.boxShadow = "0 20px 60px rgba(0, 0, 0, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.1)";
          }}
        >
          {/* Image Section */}
          <div
            className="card-image"
            style={{
              width: "100%",
              height: 200,
              overflow: "hidden",
              background: gradient,
              position: "relative",
              transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
            {imageUrl ? (
              <ImageWithSkeleton
                src={imageUrl}
                alt={tenant.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                skeletonStyle={{
                  borderRadius: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 48,
                  fontWeight: 700,
                  opacity: 0.3,
                }}
              >
                {tenant.name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Overlay gradient for better text readability */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "60%",
                background: "linear-gradient(to top, rgba(0, 0, 0, 0.4), transparent)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Content Section */}
          <div
            style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              flex: 1,
              justifyContent: "space-between",
              minWidth: 0,
              background: "white",
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "clamp(18px, 2vw, 22px)",
                  fontWeight: 700,
                  color: "#1a1a1a",
                  lineHeight: 1.3,
                  marginBottom: 8,
                  minWidth: 0,
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
                }}
              >
                {tenant.name}
              </h3>
              {tenant.shortDescription && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: "#666",
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {tenant.shortDescription.replace(/<[^>]*>/g, "").substring(0, 100)}
                  {tenant.shortDescription.length > 100 ? "..." : ""}
                </p>
              )}
            </div>

            {/* Footer: Link button */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: 16,
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <div
                className="card-read-more"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#667eea",
                  fontSize: 15,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                }}
              >
                <span>{t("public.open") || "Megnyitás"}</span>
                <span
                  style={{
                    transition: "transform 0.3s ease",
                    display: "inline-block",
                    fontSize: 18,
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

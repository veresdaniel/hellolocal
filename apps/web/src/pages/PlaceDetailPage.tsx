import { useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { getPlace, getSiteSettings } from "../api/places.api";
import { buildPlaceSeo } from "../seo/buildPlaceSeo";
import { useSeo } from "../seo/useSeo";
import { buildPath } from "../app/routing/buildPath";
import { FloatingHeader } from "../components/FloatingHeader";
import { SocialShareButtons } from "../components/SocialShareButtons";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { sanitizeImageUrl } from "../utils/urlValidation";
import { HAS_MULTIPLE_TENANTS } from "../app/config";

export function PlaceDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { lang, tenantSlug } = useTenantContext();
  const navigate = useNavigate();

  // Get tenantKey for API call (only if multi-tenant mode)
  const tenantKey = HAS_MULTIPLE_TENANTS ? tenantSlug : undefined;

  const { data: place, isLoading, isError, error } = useQuery({
    queryKey: ["place", lang, slug, tenantKey],
    queryFn: () => getPlace(lang, slug!, tenantKey),
    enabled: !!slug,
  });

  // Handle redirects: if the slug was redirected, navigate to the canonical slug
  useEffect(() => {
    if (place?.redirected && place.slug && place.slug !== slug) {
      const canonicalPath = buildPath({ tenantSlug, lang, path: `place/${place.slug}` });
      navigate(canonicalPath, { replace: true });
    }
  }, [place, slug, lang, tenantSlug, navigate]);

  // Load site settings for SEO
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", lang, tenantSlug],
    queryFn: () => getSiteSettings(lang, tenantSlug),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const seo = useMemo(() => {
    if (!place) {
      return {
        title: siteSettings?.seoTitle || t("public.place.title"),
        description: siteSettings?.seoDescription || t("public.place.description"),
      };
    }
    return buildPlaceSeo(place.seo, place, {
      canonical: window.location.href,
    });
  }, [place, siteSettings, t]);

  useSeo(seo, {
    siteName: siteSettings?.siteName,
  });

  if (!slug) return <div style={{ padding: 24 }}>{t("public.errorLoadingPlace")}</div>;
  
  // Show loading spinner while loading
  if (isLoading) {
    return <LoadingSpinner isLoading={true} />;
  }
  
  if (isError)
    return (
      <div style={{ padding: 64, textAlign: "center", color: "#c00" }}>
        <p>{t("public.errorLoadingPlace")}</p>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 16 }}>
          {String(error)}
        </pre>
      </div>
    );
  
  if (!place) return <div style={{ padding: 64, textAlign: "center" }}>{t("public.noPlacesFound")}</div>;

  return (
    <>
      <FloatingHeader />
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)",
          paddingTop: 80,
        }}
      >
        <article
          style={{
            maxWidth: 960,
            margin: "0 auto",
            paddingBottom: 64,
            width: "100%",
          }}
        >
          {/* Hero Image - use default placeholder if no image */}
          {(sanitizeImageUrl(place.heroImage) || sanitizeImageUrl(siteSettings?.defaultPlaceholderDetailHeroImage)) && (
            <div
              style={{
                width: "calc(100% - 32px)",
                margin: "0 16px 24px",
                height: "clamp(250px, 50vw, 400px)",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
              }}
            >
              <img
                src={sanitizeImageUrl(place.heroImage) || sanitizeImageUrl(siteSettings?.defaultPlaceholderDetailHeroImage) || ""}
                alt={place.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
          )}

          {/* Header */}
          <div style={{ margin: "0 16px 32px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 24,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(28px, 5vw, 42px)",
                    fontWeight: 700,
                    color: "#1a1a1a",
                    lineHeight: 1.2,
                    letterSpacing: "-0.02em",
                    marginBottom: 12,
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {place.name}
                </h1>
                {place.category && (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#667eea",
                        background: "rgba(102, 126, 234, 0.1)",
                        padding: "6px 16px",
                        borderRadius: 16,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {place.category}
                    </span>
                    {place.priceBand && (
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#764ba2",
                          background: "rgba(118, 75, 162, 0.1)",
                          padding: "6px 16px",
                          borderRadius: 16,
                        }}
                      >
                        {place.priceBand}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Social Share Buttons */}
            <SocialShareButtons
              url={window.location.href}
              title={place.name}
              description={place.description || place.teaser || ""}
              image={place.heroImage || undefined}
            />
          </div>

          {/* Description */}
          {place.description && (
            <div
              style={{
                fontSize: 18,
                lineHeight: 1.8,
                color: "#333",
                margin: "0 16px 32px",
                background: "white",
                padding: "clamp(16px, 4vw, 32px)",
                borderRadius: 16,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              }}
              dangerouslySetInnerHTML={{ __html: place.description }}
            />
          )}

          {/* Tags */}
          {place.tags && place.tags.length > 0 && (
            <div style={{ margin: "0 16px 48px" }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#666",
                  marginBottom: 16,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t("public.tags")}
              </h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {place.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#666",
                      background: "#f5f5f5",
                      border: "1px solid #e0e0e0",
                      padding: "8px 16px",
                      borderRadius: 20,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact Information */}
          {place.contact && (
            <div
              style={{
                background: "white",
                padding: "clamp(16px, 4vw, 32px)",
                borderRadius: 16,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                margin: "0 16px 32px",
              }}
            >
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: 24,
                }}
              >
                {t("public.contact") || "Kapcsolat"}
              </h3>
              <div style={{ display: "grid", gap: 16 }}>
                {place.contact.address && (
                  <div>
                    <strong style={{ color: "#666", fontSize: 14, display: "block", marginBottom: 4 }}>
                      {t("public.address")}
                    </strong>
                    <div
                      style={{ color: "#333", fontSize: 16 }}
                      dangerouslySetInnerHTML={{ __html: place.contact.address }}
                    />
                  </div>
                )}
                {place.contact.phone && (
                  <div>
                    <strong style={{ color: "#666", fontSize: 14, display: "block", marginBottom: 4 }}>
                      {t("public.phone")}
                    </strong>
                    <a
                      href={`tel:${place.contact.phone}`}
                      style={{ color: "#667eea", textDecoration: "none", fontSize: 16 }}
                    >
                      {place.contact.phone}
                    </a>
                  </div>
                )}
                {place.contact.email && (
                  <div>
                    <strong style={{ color: "#666", fontSize: 14, display: "block", marginBottom: 4 }}>
                      {t("public.email")}
                    </strong>
                    <a
                      href={`mailto:${place.contact.email}`}
                      style={{ color: "#667eea", textDecoration: "none", fontSize: 16 }}
                    >
                      {place.contact.email}
                    </a>
                  </div>
                )}
                {place.contact.website && (
                  <div>
                    <strong style={{ color: "#666", fontSize: 14, display: "block", marginBottom: 4 }}>
                      {t("public.website")}
                    </strong>
                    <a
                      href={place.contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#667eea", textDecoration: "none", fontSize: 16 }}
                    >
                      {place.contact.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Opening Hours */}
          {place.openingHours && (
            <div
              style={{
                background: "white",
                padding: "clamp(16px, 4vw, 32px)",
                borderRadius: 16,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                margin: "0 16px 32px",
              }}
            >
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: 16,
                }}
              >
                {t("public.openingHours")}
              </h3>
              <div
                style={{ color: "#333", fontSize: 16, lineHeight: 1.8 }}
                dangerouslySetInnerHTML={{ __html: place.openingHours }}
              />
            </div>
          )}

          {/* Accessibility */}
          {place.accessibility && (
            <div
              style={{
                background: "white",
                padding: "clamp(16px, 4vw, 32px)",
                borderRadius: 16,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                margin: "0 16px 32px",
              }}
            >
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: 16,
                }}
              >
                {t("public.accessibility")}
              </h3>
              <div
                style={{ color: "#333", fontSize: 16, lineHeight: 1.8 }}
                dangerouslySetInnerHTML={{ __html: place.accessibility }}
              />
            </div>
          )}

          {/* Back Link */}
          <div style={{ margin: "48px 16px 0", paddingTop: 32, borderTop: "1px solid #e0e0e0" }}>
            <Link
              to={buildPath({ tenantSlug, lang, path: "" })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#667eea",
                textDecoration: "none",
                fontSize: 16,
                fontWeight: 500,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#764ba2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#667eea";
              }}
            >
              ← {t("public.backToList") || "Vissza a listához"}
            </Link>
          </div>
        </article>
      </div>
    </>
  );
}

// src/pages/EventDetailPage.tsx
import { useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { getEvent, getSiteSettings } from "../api/places.api";
import { useSeo } from "../seo/useSeo";
import { buildPath } from "../app/routing/buildPath";
import { FloatingHeader } from "../components/FloatingHeader";
import { SocialShareButtons } from "../components/SocialShareButtons";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { HAS_MULTIPLE_TENANTS } from "../app/config";

export function EventDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { lang, tenantSlug } = useTenantContext();
  const navigate = useNavigate();

  // Get tenantKey for API call (only if multi-tenant mode)
  const tenantKey = HAS_MULTIPLE_TENANTS ? tenantSlug : undefined;

  const { data: event, isLoading, isError, error } = useQuery({
    queryKey: ["event", lang, slug, tenantKey],
    queryFn: () => getEvent(lang, slug!, tenantKey),
    enabled: !!slug,
  });

  // Handle redirects: if the slug was redirected, navigate to the canonical slug
  useEffect(() => {
    if (event?.redirected && event.slug && event.slug !== slug) {
      const canonicalPath = buildPath({ tenantSlug, lang, path: `event/${event.slug}` });
      navigate(canonicalPath, { replace: true });
    }
  }, [event, slug, lang, tenantSlug, navigate]);

  // Load site settings for SEO
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", lang],
    queryFn: () => getSiteSettings(lang),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const seo = useMemo(() => {
    if (!event) {
      return {
        title: siteSettings?.seoTitle || t("public.event.title"),
        description: siteSettings?.seoDescription || t("public.event.description"),
      };
    }
    return {
      title: event.seo?.title || event.name,
      description: event.seo?.description || event.shortDescription || event.description || "",
      keywords: event.seo?.keywords || [],
      image: event.seo?.image || event.heroImage,
      canonical: window.location.href,
    };
  }, [event, siteSettings, t]);

  useSeo(seo, {
    siteName: siteSettings?.siteName,
  });

  if (!slug) return <div style={{ padding: 24 }}>{t("public.errorLoadingEvent")}</div>;
  
  // Show loading spinner while loading
  if (isLoading) {
    return <LoadingSpinner isLoading={true} />;
  }
  
  if (isError)
    return (
      <div style={{ padding: 64, textAlign: "center", color: "#c00" }}>
        <p>{t("public.errorLoadingEvent")}</p>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 16 }}>
          {String(error)}
        </pre>
      </div>
    );
  
  if (!event) return <div style={{ padding: 64, textAlign: "center" }}>{t("public.noEvents")}</div>;

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
          {/* Hero Image */}
          {event.heroImage && (
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
                src={event.heroImage}
                alt={event.name}
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
            <Link
              to={buildPath({ tenantSlug, lang, path: "" })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#667eea",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 24,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#764ba2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#667eea";
              }}
            >
              ← {t("public.backToHome")}
            </Link>
            <h1
              style={{
                margin: 0,
                marginBottom: 16,
                fontSize: "clamp(28px, 5vw, 42px)",
                fontWeight: 700,
                color: "#1a1a1a",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                wordWrap: "break-word",
                overflowWrap: "break-word",
              }}
            >
              {event.isPinned && <span style={{ marginRight: 8 }}>📌</span>}
              {event.name}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, color: "#666", fontWeight: 500 }}>
                📅 {new Date(event.startDate).toLocaleDateString(
                  lang === "hu" ? "hu-HU" : lang === "de" ? "de-DE" : "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
                {event.endDate && (
                  <>
                    {" - "}
                    {new Date(event.endDate).toLocaleDateString(
                      lang === "hu" ? "hu-HU" : lang === "de" ? "de-DE" : "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </>
                )}
              </div>
              {event.category && (
                <span
                  style={{
                    padding: "6px 12px",
                    background: "#667eea",
                    color: "white",
                    borderRadius: 20,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {event.category}
                </span>
              )}
            </div>
            {event.placeName && (
              <div style={{ marginBottom: 16 }}>
                <Link
                  to={buildPath({ tenantSlug, lang, path: `place/${event.placeSlug}` })}
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
                  📍 {event.placeName}
                </Link>
              </div>
            )}
            {event.tags && event.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: "4px 12px",
                      background: "#f0f0f0",
                      color: "#666",
                      borderRadius: 16,
                      fontSize: 13,
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Social Share Buttons */}
          <div style={{ margin: "0 16px 32px" }}>
            <SocialShareButtons
              url={window.location.href}
              title={event.name}
              description={event.shortDescription || event.description || ""}
              image={event.heroImage || undefined}
            />
          </div>

          {/* Short Description */}
          {event.shortDescription && (
            <div
              style={{
                fontSize: 18,
                lineHeight: 1.8,
                color: "#333",
                margin: "0 16px 32px",
                fontWeight: 400,
              }}
            >
              {event.shortDescription}
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div
              style={{
                fontSize: 16,
                lineHeight: 1.8,
                color: "#555",
                margin: "0 16px 32px",
              }}
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          )}

          {/* Gallery */}
          {event.gallery && event.gallery.length > 0 && (
            <div style={{ margin: "0 16px 32px" }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#1a1a1a" }}>
                {t("public.gallery")}
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                }}
              >
                {event.gallery.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${event.name} - ${index + 1}`}
                    style={{
                      width: "100%",
                      height: 200,
                      objectFit: "cover",
                      borderRadius: 12,
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div style={{ margin: "0 16px 32px" }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#1a1a1a" }}>
                {t("public.location")}
              </h2>
              <div
                style={{
                  width: "100%",
                  height: 300,
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                }}
              >
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.location.lng - 0.01},${event.location.lat - 0.01},${event.location.lng + 0.01},${event.location.lat + 0.01}&layer=mapnik&marker=${event.location.lat},${event.location.lng}`}
                />
              </div>
            </div>
          )}
        </article>
      </div>
    </>
  );
}


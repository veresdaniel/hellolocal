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
          {/* Hero Image with Category Badges - use default placeholder if no image */}
          {(sanitizeImageUrl(place.heroImage) || sanitizeImageUrl(siteSettings?.defaultPlaceholderDetailHeroImage)) && (
            <div
              style={{
                width: "calc(100% - 32px)",
                margin: "0 16px 16px",
                height: "clamp(250px, 50vw, 400px)",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
                position: "relative",
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
              
              {/* Category badges overlaid on image */}
              {place.category && (
                <div style={{ 
                  position: "absolute", 
                  top: 12,     // Felülre
                  left: 12,    // Balra
                  display: "flex", 
                  gap: 8, 
                  flexWrap: "wrap",
                  justifyContent: "flex-start",
                }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "white",
                      background: "rgba(102, 126, 234, 0.95)",
                      backdropFilter: "blur(8px)",
                      padding: "6px 14px",
                      borderRadius: 8,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    {place.category}
                  </span>
                  {place.priceBand && (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "white",
                        background: "rgba(118, 75, 162, 0.95)",
                        backdropFilter: "blur(8px)",
                        padding: "6px 14px",
                        borderRadius: 8,
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                      }}
                    >
                      {place.priceBand}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tags and Social Share in one row */}
          <div style={{ 
            margin: "0 16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}>
            {/* Tags on the left */}
            {place.tags && place.tags.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
                {place.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#666",
                      background: "#f5f5f5",
                      border: "1px solid #e0e0e0",
                      padding: "6px 12px",
                      borderRadius: 8,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            {/* Social Share on the right */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <SocialShareButtons
                url={window.location.href}
                title={place.name}
                description={place.description || place.teaser || ""}
                image={place.heroImage || undefined}
              />
            </div>
          </div>

          {/* Header */}
          <div style={{ margin: "0 16px 32px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(28px, 5vw, 42px)",
                fontWeight: 700,
                color: "#1a1a1a",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                wordWrap: "break-word",
                overflowWrap: "break-word",
              }}
            >
              {place.name}
            </h1>
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

          {/* Contact Information */}
          {place.contact && (
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                padding: "clamp(20px, 4vw, 32px)",
                borderRadius: 16,
                boxShadow: "0 8px 24px rgba(102, 126, 234, 0.25)",
                margin: "0 16px 32px",
                color: "white",
              }}
            >
              <h3
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "white",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 24 }}>📞</span>
                {t("public.contact") || "Kapcsolat"}
              </h3>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "1fr 1fr",
                gap: 16,
              }}>
                {place.contact.address && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      padding: 16,
                      borderRadius: 12,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <strong style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                      <span>📍</span>
                      {t("public.address")}
                    </strong>
                    <div
                      style={{ color: "white", fontSize: 16, lineHeight: 1.6 }}
                      dangerouslySetInnerHTML={{ __html: place.contact.address }}
                    />
                  </div>
                )}
                {place.contact.phone && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      padding: 16,
                      borderRadius: 12,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <strong style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                      <span>📱</span>
                      {t("public.phone")}
                    </strong>
                    <a
                      href={`tel:${place.contact.phone.replace(/\s/g, '')}`}
                      style={{
                        color: "white",
                        textDecoration: "none",
                        fontSize: 18,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                        e.currentTarget.style.transform = "translateX(4px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      {place.contact.phone}
                      <span style={{ fontSize: 14 }}>→</span>
                    </a>
                  </div>
                )}
                {place.contact.email && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      padding: 16,
                      borderRadius: 12,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <strong style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                      <span>✉️</span>
                      {t("public.email")}
                    </strong>
                    <a
                      href={`mailto:${place.contact.email}`}
                      style={{
                        color: "white",
                        textDecoration: "none",
                        fontSize: 16,
                        fontWeight: 500,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        wordBreak: "break-word",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                        e.currentTarget.style.transform = "translateX(4px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      {place.contact.email}
                      <span style={{ fontSize: 14 }}>→</span>
                    </a>
                  </div>
                )}
                {place.contact.website && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      padding: 16,
                      borderRadius: 12,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <strong style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                      <span>🌐</span>
                      {t("public.website")}
                    </strong>
                    <a
                      href={place.contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "white",
                        textDecoration: "none",
                        fontSize: 16,
                        fontWeight: 500,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        wordBreak: "break-all",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                        e.currentTarget.style.transform = "translateX(4px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      {place.contact.website.replace(/^https?:\/\//i, '')}
                      <span style={{ fontSize: 14 }}>↗</span>
                    </a>
                  </div>
                )}
                {place.contact.facebook && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      padding: 16,
                      borderRadius: 12,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <strong style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                      <span>📘</span>
                      Facebook
                    </strong>
                    <a
                      href={place.contact.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "white",
                        textDecoration: "none",
                        fontSize: 16,
                        fontWeight: 500,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        wordBreak: "break-all",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                        e.currentTarget.style.transform = "translateX(4px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      {place.contact.facebook.replace(/^https?:\/\/(www\.)?facebook\.com\//i, '')}
                      <span style={{ fontSize: 14 }}>↗</span>
                    </a>
                  </div>
                )}
                {place.contact.whatsapp && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      padding: 16,
                      borderRadius: 12,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <strong style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                      <span>💬</span>
                      WhatsApp
                    </strong>
                    <a
                      href={`https://wa.me/${place.contact.whatsapp.replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "white",
                        textDecoration: "none",
                        fontSize: 18,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                        e.currentTarget.style.transform = "translateX(4px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      {place.contact.whatsapp}
                      <span style={{ fontSize: 14 }}>→</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Opening Hours */}
          {place.openingHours && place.openingHours.length > 0 && (
            <div
              style={{
                background: "white",
                padding: "clamp(20px, 4vw, 32px)",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                margin: "0 16px 32px",
                border: "1px solid rgba(102, 126, 234, 0.1)",
              }}
            >
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 22 }}>🕐</span>
                {t("public.openingHours")}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {place.openingHours.map((oh, index) => {
                  const dayName = t(`common.dayOfWeek.${oh.dayOfWeek}`);
                  const isToday = (() => {
                    const now = new Date();
                    const currentDayOfWeek = (now.getDay() + 6) % 7; // Convert Sunday (0) to last (6), Monday (1) to 0, etc.
                    return oh.dayOfWeek === currentDayOfWeek;
                  })();

                  return (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        background: isToday ? "rgba(102, 126, 234, 0.05)" : "transparent",
                        borderRadius: 8,
                        border: isToday ? "1px solid rgba(102, 126, 234, 0.2)" : "1px solid transparent",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: isToday ? 600 : 500,
                          color: isToday ? "#667eea" : "#333",
                          fontSize: 16,
                        }}
                      >
                        {dayName}
                        {isToday && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 12,
                              color: "#667eea",
                              fontWeight: 600,
                            }}
                          >
                            (Ma)
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          color: oh.isClosed ? "#999" : "#333",
                          fontSize: 16,
                          fontWeight: oh.isClosed ? 400 : 500,
                        }}
                      >
                        {oh.isClosed ? (
                          <span style={{ fontStyle: "italic" }}>
                            {t("common.closed") || "Zárva"}
                          </span>
                        ) : oh.openTime && oh.closeTime ? (
                          `${oh.openTime} - ${oh.closeTime}`
                        ) : (
                          "-"
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Accessibility */}
          {place.accessibility && (
            <div
              style={{
                background: "white",
                padding: "clamp(20px, 4vw, 32px)",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                margin: "0 16px 32px",
                border: "1px solid rgba(102, 126, 234, 0.1)",
              }}
            >
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 22 }}>♿</span>
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

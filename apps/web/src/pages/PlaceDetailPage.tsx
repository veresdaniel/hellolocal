import { useMemo, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPlace, getPlaceById, getPlatformSettings } from "../api/places.api";
import { buildPlaceSeo } from "../seo/buildPlaceSeo";
import { useSeo } from "../seo/useSeo";
import { buildUrl } from "../app/urls";
import { FloatingHeader } from "../components/FloatingHeader";
import { SocialShareButtons } from "../components/SocialShareButtons";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorState } from "../components/ErrorState";
import { sanitizeImageUrl } from "../utils/urlValidation";
import { HAS_MULTIPLE_SITES } from "../app/config";
import { Badge } from "../components/Badge";
import { ImageWithSkeleton } from "../components/ImageWithSkeleton";
import { useResolvedSlugRedirect } from "../hooks/useResolvedSlugRedirect";
import { ShortcodeRenderer } from "../components/ShortcodeRenderer";

export function PlaceDetailPage() {
  const { t } = useTranslation();
  const { lang, siteKey, slug } = useParams<{ lang: string; siteKey: string; slug: string }>();

  const resolveQ = useResolvedSlugRedirect({
    lang: lang ?? "",
    siteKey: siteKey ?? "",
    slug: slug ?? "",
  });

  // Load place by entityId after slug resolution (stable, future-proof)
  // Only load if slug is resolved, not redirecting, and entity type is place
  const shouldLoadPlace = resolveQ.data && !resolveQ.data.needsRedirect && resolveQ.data.entityType === "place";

  const { data: place, isLoading, isError, error } = useQuery({
    queryKey: ["place", resolveQ.data?.entityId, lang, siteKey],
    queryFn: () => {
      if (!resolveQ.data || !siteKey) throw new Error("Missing resolve data or siteKey");
      return getPlaceById(lang!, siteKey, resolveQ.data.entityId);
    },
    enabled: shouldLoadPlace && !!siteKey && !!lang,
  });

  const queryClient = useQueryClient();

  // Load site settings for SEO
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", lang, siteKey],
    queryFn: () => getPlatformSettings(lang, siteKey),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Listen for site settings changes from admin
  useEffect(() => {
    const handlePlatformSettingsChanged = () => {
      queryClient.invalidateQueries({ queryKey: ["platformSettings", lang, siteKey] });
      queryClient.refetchQueries({ queryKey: ["platformSettings", lang, siteKey] });
    };

    window.addEventListener("admin:platformSettings:changed", handlePlatformSettingsChanged);
    return () => {
      window.removeEventListener("admin:platformSettings:changed", handlePlatformSettingsChanged);
    };
  }, [lang, siteKey, queryClient]);

  // Refs for HTML content containers
  const descriptionRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const accessibilityRef = useRef<HTMLDivElement>(null);

  // Make images and videos responsive in HTML content
  useEffect(() => {
    const makeMediaResponsive = (container: HTMLElement | null) => {
      if (!container) return;
      
      // Make all images responsive and add lazy loading with skeleton
      const images = container.querySelectorAll("img");
      images.forEach((img) => {
        // Skip if already wrapped
        if (img.parentElement?.classList.contains("image-skeleton-wrapper")) {
          return;
        }

        img.style.maxWidth = "100%";
        img.style.width = "100%";
        img.style.height = "auto";
        img.style.display = "block";
        img.style.margin = "16px auto";
        img.style.opacity = "0";
        img.style.transition = "opacity 0.3s ease-in-out";
        img.style.boxSizing = "border-box";
        
        if (!img.hasAttribute("loading")) {
          img.setAttribute("loading", "lazy");
        }

        // Create wrapper with skeleton
        const wrapper = document.createElement("div");
        wrapper.className = "image-skeleton-wrapper";
        wrapper.style.position = "relative";
        wrapper.style.width = "100%";
        wrapper.style.maxWidth = "100%";
        wrapper.style.margin = "16px auto";
        wrapper.style.boxSizing = "border-box";
        
        // Create skeleton
        const skeleton = document.createElement("div");
        skeleton.className = "image-skeleton";
        skeleton.style.width = "100%";
        skeleton.style.height = img.getAttribute("height") || "auto";
        skeleton.style.minHeight = "200px";
        skeleton.style.background = "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)";
        skeleton.style.backgroundSize = "200% 100%";
        skeleton.style.animation = "skeleton-loading 1.5s ease-in-out infinite";
        skeleton.style.borderRadius = "4px";
        
        // Insert wrapper before image
        img.parentNode?.insertBefore(wrapper, img);
        wrapper.appendChild(skeleton);
        wrapper.appendChild(img);
        
        // Handle image load
        const handleLoad = () => {
          img.style.opacity = "1";
          skeleton.style.display = "none";
        };
        
        if (img.complete) {
          handleLoad();
        } else {
          img.addEventListener("load", handleLoad, { once: true });
          img.addEventListener("error", () => {
            skeleton.style.display = "none";
            img.style.opacity = "1";
          }, { once: true });
        }
      });
      
      // Make all videos responsive
      const videos = container.querySelectorAll("video");
      videos.forEach((video) => {
        video.style.maxWidth = "100%";
        video.style.height = "auto";
        video.style.display = "block";
        video.style.margin = "16px auto";
      });
      
      // Make iframes responsive (for embedded videos)
      const iframes = container.querySelectorAll("iframe");
      iframes.forEach((iframe) => {
        iframe.style.maxWidth = "100%";
        iframe.style.height = "auto";
        iframe.style.display = "block";
        iframe.style.margin = "16px auto";
        // Maintain aspect ratio for iframes (16:9)
        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.paddingBottom = "56.25%"; // 16:9 aspect ratio
        wrapper.style.height = "0";
        wrapper.style.overflow = "hidden";
        wrapper.style.margin = "16px auto";
        iframe.style.position = "absolute";
        iframe.style.top = "0";
        iframe.style.left = "0";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.parentNode?.insertBefore(wrapper, iframe);
        wrapper.appendChild(iframe);
      });
    };

    makeMediaResponsive(descriptionRef.current);
    makeMediaResponsive(addressRef.current);
    makeMediaResponsive(accessibilityRef.current);
    
    // Add skeleton animation CSS if not already added
    if (!document.getElementById("skeleton-animation-style")) {
      const style = document.createElement("style");
      style.id = "skeleton-animation-style";
      style.textContent = `
        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, [place?.description, place?.contact?.address, place?.accessibility]);

  const seo = useMemo(() => {
    if (!place) {
      return {
        title: platformSettings?.seoTitle || t("public.place.title"),
        description: platformSettings?.seoDescription || t("public.place.description"),
      };
    }
    return buildPlaceSeo(place.seo, place, {
      canonical: window.location.href,
    });
  }, [place, platformSettings, t]);

  useSeo(seo, {
    siteName: platformSettings?.siteName,
  });

  if (!slug) {
    return (
      <ErrorState
        title={t("error.notFound")}
        message={t("public.errorLoadingPlace")}
        variant="minimal"
      />
    );
  }
  
  if (resolveQ.isLoading) {
    return <LoadingSpinner isLoading={true} delay={500} />;
  }
  
  if (resolveQ.isError) {
    return (
      <ErrorState
        title={t("error.notFound")}
        message={t("public.errorLoadingPlace")}
        variant="minimal"
      />
    );
  }
  
  // Check if resolved entity type is place
  if (resolveQ.data && resolveQ.data.entityType !== "place") {
    return (
      <ErrorState
        title={t("error.notFound")}
        message={t("public.errorLoadingPlace")}
        variant="minimal"
      />
    );
  }
  
  // Show loading spinner while loading place
  if (isLoading) {
    return <LoadingSpinner isLoading={true} delay={500} />;
  }
  
  if (isError) {
    return (
      <ErrorState
        title={t("error.errorOccurred")}
        message={t("public.errorLoadingPlace")}
        variant="minimal"
      />
    );
  }
  
  if (!place) {
    return (
      <ErrorState
        title={t("error.notFound")}
        message={t("public.noPlacesFound")}
        variant="minimal"
      />
    );
  }

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
            boxSizing: "border-box",
          }}
        >
          {/* Hero Image with Category Badges - use default placeholder if no image */}
          {(sanitizeImageUrl(place.heroImage) || sanitizeImageUrl(platformSettings?.defaultPlaceholderDetailHeroImage)) && (
            <div
              style={{
                width: "calc(100% - 32px)",
                maxWidth: "100%",
                margin: "0 16px 16px",
                height: "clamp(250px, 50vw, 400px)",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
                position: "relative",
                boxSizing: "border-box",
              }}
            >
              <ImageWithSkeleton
                src={sanitizeImageUrl(place.heroImage) || sanitizeImageUrl(platformSettings?.defaultPlaceholderDetailHeroImage) || ""}
                alt={place.name}
                style={{
                  width: "100%",
                  height: "100%",
                  maxWidth: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                skeletonStyle={{
                  borderRadius: 16,
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
                  <Badge
                    variant="category"
                    color="#667eea"
                    size="medium"
                    uppercase={true}
                    opacity={0.95}
                    style={{
                      backdropFilter: "blur(8px)",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    {place.category}
                  </Badge>
                  {place.priceBand && (
                    <Badge
                      variant="priceBand"
                      size="medium"
                      opacity={0.95}
                      style={{
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                      }}
                    >
                      {place.priceBand}
                    </Badge>
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
                  <Badge
                    key={tag}
                    variant="tag"
                    size="medium"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Social Share on the right */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <SocialShareButtons
                url={window.location.href}
                title={place.name}
                description={place.description || ""}
                image={place.heroImage || undefined}
              />
            </div>
          </div>

          {/* Header */}
          <div style={{ margin: "0 16px 24px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(28px, 5vw, 42px)",
                fontWeight: 700,
                fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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

          {/* Contact and Opening Hours side by side */}
          {(() => {
            // Check if contact has any actual data (not just null/undefined fields)
            const hasContact = place.contact && (
              place.contact.address ||
              place.contact.phone ||
              place.contact.email ||
              place.contact.website ||
              place.contact.facebook ||
              place.contact.whatsapp
            );
            const hasOpeningHours = place.openingHours && place.openingHours.length > 0;
            
            if (!hasContact && !hasOpeningHours) {
              return null;
            }
            
            return (
              <div 
                className="contact-opening-hours-grid"
                style={{ 
                  margin: "0 16px 24px",
                  display: "grid",
                  gridTemplateColumns: (hasContact && hasOpeningHours) ? "1fr 1fr" : "1fr",
                  gap: 12,
                }}
              >
              <style>{`
                @media (max-width: 767px) {
                  .contact-opening-hours-grid {
                    gridTemplateColumns: 1fr !important;
                  }
                }
              `}</style>
            {/* Contact Information - Left */}
            {(() => {
              const hasContact = place.contact && (
                place.contact.address ||
                place.contact.phone ||
                place.contact.email ||
                place.contact.website ||
                place.contact.facebook ||
                place.contact.whatsapp
              );
              
              return hasContact ? (
              <div
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  padding: "16px",
                  borderRadius: 12,
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)",
                  color: "white",
                }}
              >
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    color: "white",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 18 }}>📞</span>
                  {t("public.contact") || "Kapcsolat"}
                </h3>
                <div style={{ 
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}>
                {place.contact.address && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <strong style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 11, display: "flex", alignItems: "center", gap: 6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                      <span>📍</span>
                      {t("public.address")}
                    </strong>
                    <div
                      ref={addressRef}
                      style={{ color: "white", fontSize: "clamp(14px, 3.5vw, 16px)", lineHeight: 1.5, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontWeight: 400 }}
                    >
                      <ShortcodeRenderer
                        content={place.contact.address}
                        lang={lang!}
                        siteKey={siteKey!}
                        style={{ color: "white" }}
                      />
                    </div>
                  </div>
                )}
                {place.contact.phone && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <strong style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 11, display: "flex", alignItems: "center", gap: 6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                      <span>📱</span>
                      {t("public.phone")}
                    </strong>
                    <a
                      href={`tel:${place.contact.phone.replace(/\s/g, '')}`}
                      style={{
                        color: "white",
                        textDecoration: "none",
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        fontWeight: 500,
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
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
                      <span style={{ 
                        fontSize: "clamp(13px, 3vw, 15px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}>→</span>
                    </a>
                  </div>
                )}
                {place.contact.email && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <strong style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 11, display: "flex", alignItems: "center", gap: 6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                      <span>✉️</span>
                      {t("public.email")}
                    </strong>
                    <a
                      href={`mailto:${place.contact.email}`}
                      style={{
                        color: "white",
                        textDecoration: "none",
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        fontWeight: 400,
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
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
                      <span style={{ 
                        fontSize: "clamp(13px, 3vw, 15px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}>→</span>
                    </a>
                  </div>
                )}
                {place.contact.website && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <strong style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 11, display: "flex", alignItems: "center", gap: 6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
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
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        fontWeight: 400,
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
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
                      <span style={{ 
                        fontSize: "clamp(13px, 3vw, 15px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}>↗</span>
                    </a>
                  </div>
                )}
                {place.contact.facebook && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <strong style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 11, display: "flex", alignItems: "center", gap: 6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
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
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        fontWeight: 400,
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
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
                      <span style={{ 
                        fontSize: "clamp(13px, 3vw, 15px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}>↗</span>
                    </a>
                  </div>
                )}
                {place.contact.whatsapp && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <strong style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 11, display: "flex", alignItems: "center", gap: 6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
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
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        fontWeight: 500,
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
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
                      <span style={{ 
                        fontSize: "clamp(13px, 3vw, 15px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}>→</span>
                    </a>
                  </div>
                )}
                </div>
              </div>
              ) : null;
            })()}

            {/* Opening Hours - Right */}
            {place.openingHours && place.openingHours.length > 0 && (
              <div
                style={{
                  background: "white",
                  padding: "16px",
                  borderRadius: 12,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                  border: "1px solid rgba(102, 126, 234, 0.1)",
                }}
              >
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    color: "#1a1a1a",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 18 }}>🕐</span>
                  {t("public.openingHours")}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                          padding: "6px 10px",
                          background: isToday ? "rgba(102, 126, 234, 0.05)" : "transparent",
                          borderRadius: 6,
                          border: isToday ? "1px solid rgba(102, 126, 234, 0.2)" : "1px solid transparent",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: isToday ? 500 : 400,
                            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            color: isToday ? "#667eea" : "#333",
                            fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          }}
                        >
                          {dayName}
                          {isToday && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 10,
                                color: "#667eea",
                                fontWeight: 500,
                                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                              }}
                            >
                              (Ma)
                            </span>
                          )}
                        </span>
                        <span
                          style={{
                            color: oh.isClosed ? "#999" : "#333",
                            fontSize: "clamp(14px, 3.5vw, 16px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            fontWeight: 400,
                            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
              </div>
            );
          })()}

          {/* Description with shortcode support */}
          {place.description && (
            <div
              ref={descriptionRef}
              style={{
                margin: "0 16px 32px",
                background: "white",
                padding: "clamp(16px, 4vw, 32px)",
                borderRadius: 16,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              }}
            >
              <ShortcodeRenderer
                content={place.description}
                lang={lang!}
                siteKey={siteKey!}
              />
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
                  fontWeight: 600,
                  fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                ref={accessibilityRef}
                style={{ color: "#333", fontSize: 16, lineHeight: 1.8, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontWeight: 400 }}
              >
                <ShortcodeRenderer
                  content={place.accessibility}
                  lang={lang!}
                  siteKey={siteKey!}
                />
              </div>
            </div>
          )}

          {/* Back Link */}
          <div style={{ margin: "48px 16px 0", paddingTop: 32, borderTop: "1px solid #e0e0e0" }}>
            <Link
              to={buildUrl({ lang, siteKey, path: "" })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#667eea",
                textDecoration: "none",
                fontSize: 16,
                fontWeight: 400,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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

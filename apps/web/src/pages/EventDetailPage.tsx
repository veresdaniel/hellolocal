// src/pages/EventDetailPage.tsx
import { useMemo, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getEvent, getEventById, getPlatformSettings } from "../api/places.api";
import { useSeo } from "../seo/useSeo";
import { generateEventSchema } from "../seo/schemaOrg";
import { buildUrl } from "../app/urls";
import { FloatingHeader } from "../components/FloatingHeader";
import { SocialShareButtons } from "../components/SocialShareButtons";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorState } from "../components/ErrorState";
import { HAS_MULTIPLE_SITES } from "../app/config";
import { Badge } from "../components/Badge";
import { ImageWithSkeleton } from "../components/ImageWithSkeleton";
import { useResolvedSlugRedirect } from "../hooks/useResolvedSlugRedirect";

export function EventDetailPage() {
  const { t } = useTranslation();
  const { lang, siteKey, slug } = useParams<{ lang: string; siteKey: string; slug: string }>();

  const resolveQ = useResolvedSlugRedirect({
    lang: lang ?? "",
    siteKey: siteKey ?? "",
    slug: slug ?? "",
  });

  // Load event by entityId after slug resolution (stable, future-proof)
  // Only load if slug is resolved, not redirecting, and entity type is event
  const shouldLoadEvent = resolveQ.data && !resolveQ.data.needsRedirect && resolveQ.data.entityType === "event";

  const { data: event, isLoading, isError, error } = useQuery({
    queryKey: ["event", resolveQ.data?.entityId, lang, siteKey],
    queryFn: () => {
      if (!resolveQ.data || !siteKey) throw new Error("Missing resolve data or siteKey");
      return getEventById(lang!, siteKey, resolveQ.data.entityId);
    },
    enabled: shouldLoadEvent && !!siteKey && !!lang,
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

  // Ref for HTML content container
  const descriptionRef = useRef<HTMLDivElement>(null);

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
        img.style.height = "auto";
        img.style.display = "block";
        img.style.margin = "16px auto";
        img.style.opacity = "0";
        img.style.transition = "opacity 0.3s ease-in-out";
        
        if (!img.hasAttribute("loading")) {
          img.setAttribute("loading", "lazy");
        }

        // Create wrapper with skeleton
        const wrapper = document.createElement("div");
        wrapper.className = "image-skeleton-wrapper";
        wrapper.style.position = "relative";
        wrapper.style.width = "100%";
        wrapper.style.margin = "16px auto";
        
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
  }, [event?.description]);

  const seo = useMemo(() => {
    if (!event) {
      return {
        title: platformSettings?.seoTitle || t("public.event.title"),
        description: platformSettings?.seoDescription || t("public.event.description"),
      };
    }
    
    // Helper to extract first 2 sentences from HTML/text
    const getFirstSentences = (html: string | undefined, count: number = 2): string => {
      if (!html) return "";
      // Remove HTML tags
      const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      // Split by sentence endings (. ! ?)
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
      return sentences.slice(0, count).join(" ").trim();
    };
    
    const eventImage = event.seo?.image || event.heroImage;
    const fallbackDescription = 
      getFirstSentences(event.description, 2) || 
      getFirstSentences(event.shortDescription, 2) || 
      event.shortDescription || 
      event.description || 
      "";
    
    // Helper to strip HTML
    const stripHtml = (html: string | null | undefined): string => {
      if (!html) return "";
      return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    };

    const eventUrl = window.location.href;
    const startDate = event.startDate ? new Date(event.startDate).toISOString() : "";
    const endDate = event.endDate ? new Date(event.endDate).toISOString() : undefined;

    return {
      title: event.seo?.title || event.name,
      description: event.seo?.description || fallbackDescription,
      keywords: event.seo?.keywords || [],
      image: eventImage,
      canonical: eventUrl,
      og: {
        type: "article",
        title: event.seo?.title || event.name,
        description: event.seo?.description || fallbackDescription,
        image: eventImage,
      },
      twitter: {
        card: eventImage ? "summary_large_image" : "summary",
        title: event.seo?.title || event.name,
        description: event.seo?.description || fallbackDescription,
        image: eventImage,
      },
      schemaOrg: {
        type: "Event",
        data: {
          name: event.name,
          description: stripHtml(event.seo?.description || event.description || event.shortDescription),
          image: eventImage,
          url: eventUrl,
          startDate,
          endDate,
          location: event.location
            ? {
                geo: {
                  latitude: event.location.lat,
                  longitude: event.location.lng,
                },
                ...(event.placeName && { name: event.placeName }),
              }
            : undefined,
          organizer: platformSettings?.siteName
            ? {
                name: platformSettings.siteName,
                url: window.location.origin,
              }
            : undefined,
        },
      },
    };
  }, [event, platformSettings, t]);

  useSeo(seo, {
    siteName: platformSettings?.siteName,
  });

  if (!slug) {
    return (
      <ErrorState
        title={t("error.notFound")}
        message={t("public.errorLoadingEvent")}
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
        message={t("public.errorLoadingEvent")}
        variant="minimal"
      />
    );
  }
  
  // Check if resolved entity type is event
  if (resolveQ.data && resolveQ.data.entityType !== "event") {
    return (
      <ErrorState
        title={t("error.notFound")}
        message={t("public.errorLoadingEvent")}
        variant="minimal"
      />
    );
  }
  
  // Show loading spinner while loading event
  if (isLoading) {
    return <LoadingSpinner isLoading={true} delay={500} />;
  }
  
  if (isError) {
    return (
      <ErrorState
        title={t("error.errorOccurred")}
        message={t("public.errorLoadingEvent")}
        variant="minimal"
      />
    );
  }
  
  if (!event) {
    return (
      <ErrorState
        title={t("error.notFound")}
        message={t("public.noEvents")}
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
              to={buildUrl({ lang, siteKey, path: "" })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#667eea",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
              <div style={{ fontSize: 16, color: "#666", fontWeight: 400, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
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
                <Badge
                  variant="category"
                  color="#667eea"
                  size="medium"
                  opacity={0.9}
                >
                  {event.category}
                </Badge>
              )}
            </div>
            {event.placeName && (
              <div style={{ marginBottom: 16 }}>
                <Link
                  to={buildUrl({ lang, siteKey, path: `place/${event.placeSlug}` })}
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
                  📍 {event.placeName}
                </Link>
              </div>
            )}
            {event.tags && event.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {event.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="tag"
                    size="small"
                  >
                    #{tag}
                  </Badge>
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
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 400,
                color: "#333",
                margin: "0 16px 32px",
              }}
            >
              {event.shortDescription}
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div
              ref={descriptionRef}
              style={{
                fontSize: 16,
                lineHeight: 1.8,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 400,
                color: "#555",
                margin: "0 16px 32px",
              }}
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          )}

          {/* Gallery */}
          {event.gallery && event.gallery.length > 0 && (
            <div style={{ margin: "0 16px 32px" }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", marginBottom: 16, color: "#1a1a1a" }}>
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
                  <div key={index} style={{ position: "relative", width: "100%", height: 200, borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}>
                    <ImageWithSkeleton
                      src={image}
                      alt={`${event.name} - ${index + 1}`}
                      style={{
                        width: "100%",
                        height: 200,
                        objectFit: "cover",
                        borderRadius: 12,
                      }}
                      skeletonStyle={{
                        borderRadius: 12,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div style={{ margin: "0 16px 32px" }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", marginBottom: 16, color: "#1a1a1a" }}>
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


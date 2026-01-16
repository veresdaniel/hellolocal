// src/pages/EventDetailPage.tsx
import { useMemo, useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  getEvent,
  getEventById,
  getPlatformSettings,
  getGallery,
  type PublicGallery,
} from "../api/places.api";
import { createOrUpdateEventRating, getMyEventRating } from "../api/rating.api";
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
import { ShortcodeRenderer } from "../components/ShortcodeRenderer";
import { StarRating } from "../components/StarRating";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { getPlaceMemberships, getSiteMemberships } from "../api/admin.api";
import { isSuperadmin, isAdmin, canEdit } from "../utils/roleHelpers";
import { GalleryViewer } from "../components/GalleryViewer";

export function EventDetailPage() {
  const { t } = useTranslation();
  const { lang, siteKey, slug } = useParams<{ lang: string; siteKey: string; slug: string }>();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const resolveQ = useResolvedSlugRedirect({
    lang: lang ?? "",
    siteKey: siteKey ?? "",
    slug: slug ?? "",
  });

  // Load event by entityId after slug resolution (stable, future-proof)
  // Only load if slug is resolved, not redirecting, and entity type is event
  const shouldLoadEvent =
    resolveQ.data && !resolveQ.data.needsRedirect && resolveQ.data.entityType === "event";

  const {
    data: event,
    isLoading,
    isError,
    error,
  } = useQuery({
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

  // Load user's rating if authenticated
  const { data: myRating, refetch: refetchMyRating } = useQuery({
    queryKey: ["myEventRating", resolveQ.data?.entityId, lang],
    queryFn: () => {
      if (!resolveQ.data?.entityId || !lang) throw new Error("Missing event ID or lang");
      return getMyEventRating(lang, resolveQ.data.entityId);
    },
    enabled: isAuthenticated && !!resolveQ.data?.entityId && !!lang,
    retry: false, // Don't retry on 401
  });

  // Extract gallery IDs from description
  const galleryIds = useMemo(() => {
    if (!event?.description) return [];
    const regex = /\[gallery\s+id="([^"]+)"\]/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(event.description)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }, [event?.description]);

  // Load galleries for the opening hours section
  const { data: galleriesData, isError: isGalleriesError } = useQuery({
    queryKey: ["galleries", galleryIds, lang, siteKey],
    queryFn: async () => {
      if (!lang || !siteKey || galleryIds.length === 0) return {};
      const galleries: Record<string, PublicGallery> = {};
      await Promise.all(
        galleryIds.map(async (galleryId) => {
          try {
            const gallery = await getGallery(lang, siteKey, galleryId);
            galleries[galleryId] = gallery;
          } catch (error) {
            // Log error but don't fail the entire query
            // 404 errors are expected if gallery doesn't exist or is inactive
            const status = (error as Error & { status?: number })?.status;
            if (status === 404) {
              console.warn(`Gallery ${galleryId} not found or inactive`);
            } else {
              console.error(`Failed to load gallery ${galleryId}:`, error);
            }
            // Don't add to galleries object if it fails
          }
        })
      );
      return galleries;
    },
    enabled: galleryIds.length > 0 && !!lang && !!siteKey,
    retry: false, // Don't retry on error
  });

  const galleries = galleriesData || {};

  // Check if user can edit this event (based on place permissions)
  const [canEditEvent, setCanEditEvent] = useState(false);
  const [eventPlaceId, setEventPlaceId] = useState<string | null>(null);
  const [eventSiteId, setEventSiteId] = useState<string | null>(null);

  useEffect(() => {
    if (event?.placeId) {
      setEventPlaceId(event.placeId);
    }
    if (event?.siteId) {
      setEventSiteId(event.siteId);
    }
  }, [event?.placeId, event?.siteId]);

  // Check event permissions (based on place permissions)
  useEffect(() => {
    const checkPermissions = async () => {
      if (!isAuthenticated || !user || !eventPlaceId || !eventSiteId) {
        setCanEditEvent(false);
        return;
      }

      try {
        // Check global role (superadmin, admin, editor can edit)
        if (isSuperadmin(user.role) || isAdmin(user.role) || canEdit(user.role)) {
          setCanEditEvent(true);
          return;
        }

        // Check site-level role
        try {
          const siteMemberships = await getSiteMemberships(eventSiteId, user.id);
          const siteMembership = siteMemberships.find(
            (m) => m.siteId === eventSiteId && m.userId === user.id
          );
          if (
            siteMembership &&
            (siteMembership.role === "siteadmin" || siteMembership.role === "editor")
          ) {
            setCanEditEvent(true);
            return;
          }
        } catch (err) {
          // Site membership check failed, continue to place membership check
        }

        // Check place-level role (owner, manager, editor can edit events)
        try {
          const placeMemberships = await getPlaceMemberships(eventPlaceId, user.id);
          const placeMembership = placeMemberships.find(
            (m) => m.placeId === eventPlaceId && m.userId === user.id
          );
          if (
            placeMembership &&
            (placeMembership.role === "owner" ||
              placeMembership.role === "manager" ||
              placeMembership.role === "editor")
          ) {
            setCanEditEvent(true);
            return;
          }
        } catch (err) {
          // Place membership check failed
        }

        setCanEditEvent(false);
      } catch (err) {
        console.error("Failed to check event permissions", err);
        setCanEditEvent(false);
      }
    };

    checkPermissions();
  }, [isAuthenticated, user, eventPlaceId, eventSiteId]);

  // Handle rating submission
  const [isRatingSaving, setIsRatingSaving] = useState(false);
  const handleRate = async (value: number) => {
    if (!isAuthenticated) {
      // Redirect to login
      navigate(`/${lang}/admin/login`);
      return;
    }

    if (!resolveQ.data?.entityId || !lang) return;

    setIsRatingSaving(true);
    try {
      await createOrUpdateEventRating(lang, resolveQ.data.entityId, value);
      // Refresh event data to get updated rating
      queryClient.invalidateQueries({ queryKey: ["event", resolveQ.data.entityId, lang, siteKey] });
      // Refresh my rating
      await refetchMyRating();
      // Show success toast
      const langCode = lang || "hu";
      if (langCode === "hu") {
        showToast("Köszönjük az értékelést!", "success");
      } else if (langCode === "en") {
        showToast("Thank you for your rating!", "success");
      } else {
        showToast("Vielen Dank für Ihre Bewertung!", "success");
      }
    } catch (error) {
      console.error("Failed to save rating:", error);
      // Show error toast
      const langCode = lang || "hu";
      if (langCode === "hu") {
        showToast("Hiba történt az értékelés mentésekor.", "error");
      } else if (langCode === "en") {
        showToast("An error occurred while saving your rating.", "error");
      } else {
        showToast("Ein Fehler ist beim Speichern Ihrer Bewertung aufgetreten.", "error");
      }
    } finally {
      setIsRatingSaving(false);
    }
  };

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
          img.addEventListener(
            "error",
            () => {
              skeleton.style.display = "none";
              img.style.opacity = "1";
            },
            { once: true }
          );
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
      const text = html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
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
      return html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
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
        card: (eventImage ? "summary_large_image" : "summary") as "summary" | "summary_large_image",
        title: event.seo?.title || event.name,
        description: event.seo?.description || fallbackDescription,
        image: eventImage,
      },
      schemaOrg: {
        type: "Event" as const,
        data: {
          name: event.name,
          description: stripHtml(
            event.seo?.description || event.description || event.shortDescription
          ),
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
      <ErrorState title={t("error.notFound")} message={t("public.noEvents")} variant="minimal" />
    );
  }

  // Build edit URL if user can edit
  const editUrl =
    canEditEvent && resolveQ.data?.entityId
      ? `/${lang}/admin/events?edit=${resolveQ.data.entityId}`
      : undefined;

  return (
    <>
      <FloatingHeader editUrl={editUrl} showEditButton={canEditEvent} />
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)",
          paddingTop: "clamp(72px, 8vw, 88px)",
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
                margin: "24px 16px 16px",
                height: "clamp(250px, 50vw, 400px)",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
                position: "relative",
                boxSizing: "border-box",
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

              {/* Edit button - top right */}
              {canEditEvent && editUrl && (
                <Link
                  to={editUrl}
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    padding: "10px 12px",
                    background: "rgba(102, 126, 234, 0.9)",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                    transition: "all 0.2s ease",
                    textDecoration: "none",
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(102, 126, 234, 1)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(102, 126, 234, 0.9)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
                  }}
                  title={t("common.edit") || "Szerkesztés"}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" />
                    <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.43741 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" />
                  </svg>
                </Link>
              )}

              {/* Tags overlaid on image - bottom right */}
              {event.tags && event.tags.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    right: 12,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  {event.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="tag"
                      size="medium"
                      opacity={0.95}
                      style={{
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                      }}
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Back Link */}
          <div style={{ margin: "0 16px 16px" }}>
            <Link
              to={buildUrl({ lang: lang as "hu" | "en" | "de", siteKey, path: "" })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#667eea",
                textDecoration: "none",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
              ← {t("public.backToHome")}
            </Link>
          </div>

          {/* Title - directly below image with small offset */}
          <div style={{ margin: "0 16px 16px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(28px, 5vw, 42px)",
                fontWeight: 700,
                fontFamily:
                  "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
          </div>

          {/* Rating Section with Share Icons in frame */}
          <div style={{ margin: "0 16px 24px" }}>
            {isAuthenticated ? (
              /* Interactive rating (if authenticated) with share icons */
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "12px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    flex: 1,
                    minWidth: "200px",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "#374151" }}>
                    {!myRating
                      ? lang === "hu"
                        ? "Értékeld az eseményt:"
                        : lang === "en"
                          ? "Rate this event:"
                          : "Bewerten Sie diese Veranstaltung:"
                      : lang === "hu"
                        ? "Módosítsd az értékelésed:"
                        : lang === "en"
                          ? "Update your rating:"
                          : "Aktualisieren Sie Ihre Bewertung:"}
                  </span>
                  <StarRating
                    avg={event.rating?.avg ?? null}
                    count={event.rating?.count ?? null}
                    interactive={true}
                    initialValue={myRating?.value ?? null}
                    onRate={handleRate}
                    saving={isRatingSaving}
                    size="md"
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <SocialShareButtons
                    url={window.location.href}
                    title={event.name}
                    description={event.shortDescription || event.description || ""}
                    image={event.heroImage || undefined}
                  />
                </div>
              </div>
            ) : (
              /* Read-only rating display (if not authenticated) with share icons */
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "12px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <StarRating
                    avg={event.rating?.avg ?? null}
                    count={event.rating?.count ?? null}
                    interactive={false}
                    size="md"
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <SocialShareButtons
                    url={window.location.href}
                    title={event.name}
                    description={event.shortDescription || event.description || ""}
                    image={event.heroImage || undefined}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Opening Hours and Gallery side by side */}
          {(() => {
            const hasOpeningHours = true; // Events always have date/time
            const hasGallery = galleryIds.length > 0 && Object.keys(galleries).length > 0;

            // Show grid if we have opening hours or gallery
            if (!hasOpeningHours && !hasGallery) {
              return null;
            }

            // Always two columns on desktop if we have gallery
            const shouldShowTwoColumns = hasGallery;

            return (
              <div
                className="opening-hours-gallery-grid"
                style={{
                  margin: "0 16px 24px",
                  display: "grid",
                  gridTemplateColumns: shouldShowTwoColumns ? "1fr 1fr" : "1fr",
                  gap: 12,
                }}
              >
                <style>{`
                @media (max-width: 767px) {
                  .opening-hours-gallery-grid {
                    gridTemplateColumns: 1fr !important;
                  }
                  .gallery-compact {
                    order: 2;
                  }
                }
              `}</style>
                {/* Opening Hours - Left */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                    padding: "16px",
                    borderRadius: 12,
                    boxShadow: "0 4px 12px rgba(251, 191, 36, 0.2)",
                    color: "#1a1a1a",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "clamp(18px, 3vw, 24px)",
                      fontWeight: 600,
                      fontFamily:
                        "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      color: "#1a1a1a",
                      marginBottom: "clamp(12px, 2vw, 20px)",
                      marginTop: 0,
                    }}
                  >
                    {t("public.openingHours")}
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.9)",
                        backdropFilter: "blur(10px)",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      <strong
                        style={{
                          color: "rgba(0, 0, 0, 0.7)",
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 6,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontWeight: 500,
                          fontFamily:
                            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}
                      >
                        <span>📅</span>
                        {lang === "hu"
                          ? "Dátum és idő"
                          : lang === "en"
                            ? "Date and time"
                            : "Datum und Uhrzeit"}
                      </strong>
                      <div
                        style={{
                          color: "#1a1a1a",
                          fontSize: "clamp(14px, 3.5vw, 16px)",
                          lineHeight: 1.5,
                          fontFamily:
                            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          fontWeight: 400,
                        }}
                      >
                        {new Date(event.startDate).toLocaleDateString(
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
                    </div>
                    {event.placeName && (
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.9)",
                          backdropFilter: "blur(10px)",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        <strong
                          style={{
                            color: "rgba(0, 0, 0, 0.7)",
                            fontSize: 11,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 6,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            fontWeight: 500,
                            fontFamily:
                              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          }}
                        >
                          <span>📍</span>
                          {lang === "hu" ? "Helyszín" : lang === "en" ? "Location" : "Ort"}
                        </strong>
                        <Link
                          to={buildUrl({
                            lang: lang as "hu" | "en" | "de",
                            siteKey,
                            path: `place/${event.placeSlug}`,
                          })}
                          style={{
                            color: "#1a1a1a",
                            textDecoration: "none",
                            fontSize: "clamp(14px, 3.5vw, 16px)",
                            fontFamily:
                              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            fontWeight: 400,
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
                          {event.placeName}
                          <span
                            style={{
                              fontSize: "clamp(13px, 3vw, 15px)",
                              fontFamily:
                                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            }}
                          >
                            →
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Gallery - Right */}
                {hasGallery ? (
                  <div
                    style={{
                      background: "white",
                      padding: "12px",
                      borderRadius: 12,
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                      border: "1px solid rgba(251, 191, 36, 0.1)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    className="gallery-compact"
                  >
                    {galleryIds.map((galleryId) => {
                      const gallery = galleries[galleryId];
                      if (!gallery || !gallery.images || gallery.images.length === 0) return null;
                      return (
                        <GalleryViewer
                          key={galleryId}
                          images={gallery.images}
                          name={gallery.name}
                          layout={gallery.layout}
                          aspect={gallery.aspect}
                          compact={true}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })()}

          {/* Event Details */}
          <div style={{ margin: "0 16px 32px" }}>
            {event.category && (
              <div style={{ marginBottom: 16 }}>
                <Badge variant="category" color="#667eea" size="medium" opacity={0.9}>
                  {event.category}
                </Badge>
              </div>
            )}
          </div>

          {/* Short Description */}
          {event.shortDescription && (
            <div
              style={{
                fontSize: 18,
                lineHeight: 1.8,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 400,
                color: "#333",
                margin: "0 16px 32px",
              }}
            >
              {event.shortDescription}
            </div>
          )}

          {/* Description with shortcode support */}
          {event.description && (
            <div
              ref={descriptionRef}
              style={{
                fontSize: 16,
                lineHeight: 1.8,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 400,
                color: "#555",
                margin: "0 16px 32px",
              }}
            >
              <ShortcodeRenderer
                content={event.description}
                lang={lang!}
                siteKey={siteKey!}
                hideGalleries={
                  // Hide galleries in description if they're shown in opening hours position
                  galleryIds.length > 0 && Object.keys(galleries).length > 0
                }
              />
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div style={{ margin: "0 16px 32px" }}>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily:
                    "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  marginBottom: 16,
                  color: "#1a1a1a",
                }}
              >
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

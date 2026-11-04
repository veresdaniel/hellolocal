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
import { useHostScope } from "../app/hostScope";
import { placeEntityPath } from "../app/entityPaths";
import { FloatingHeader } from "../components/FloatingHeader";
import { SocialShareButtons } from "../components/SocialShareButtons";
import { PublicPageSkeleton } from "../components/PublicSkeleton";
import { ErrorState } from "../components/ErrorState";
import { NotFoundPage } from "./NotFoundPage";
import { HAS_MULTIPLE_SITES, type Lang} from "../app/config";
import { Badge } from "../components/Badge";
import { ImageWithSkeleton } from "../components/ImageWithSkeleton";
import { useResolvedSlugRedirect } from "../hooks/useResolvedSlugRedirect";
import { devLog } from "../lib/devLog";
import { ShortcodeRenderer } from "../components/ShortcodeRenderer";
import { StarRating } from "../components/StarRating";
import { rememberAuthReturn, visitorAuthPath } from "../auth/visitorAuth";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { getPlaceMemberships, getSiteMemberships } from "../api/admin.api";
import { isSuperadmin, isAdmin, canEdit } from "../utils/roleHelpers";
import { GalleryViewer } from "../components/GalleryViewer";
import { usePublicGaOverride } from "../context/PublicGaOverrideContext";

function formatEventWhen(startIso: string, endIso: string | null | undefined, lang: string) {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const locale = lang === "hu" ? "hu-HU" : lang === "de" ? "de-DE" : "en-US";
  const date = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" });
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  if (!end || Number.isNaN(end.getTime())) return `${date.format(start)} · ${time.format(start)}`;
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) return `${date.format(start)} · ${time.format(start)}–${time.format(end)}`;
  return `${date.format(start)}, ${time.format(start)} – ${date.format(end)}, ${time.format(end)}`;
}

export function EventDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ lang: string; siteKey: string; slug: string }>();
  const hostScope = useHostScope();
  const lang = params.lang;
  const slug =
    params.slug ||
    (hostScope.status === "ready" && hostScope.kind === "event" ? hostScope.entitySlug : "");
  const siteKey =
    params.siteKey ||
    (hostScope.status === "ready" && hostScope.kind !== "platform" && hostScope.kind !== "collection"
      ? hostScope.siteSlug
      : "");
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

  usePublicGaOverride(event?.gaMeasurementId);

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
      sessionStorage.setItem("authReturnUrl", window.location.pathname + window.location.search);
      navigate(`/${lang}/login`);
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

    const eventUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`.replace(/\/$/, "")
        : "";
    const startDate = event.startDate ? new Date(event.startDate).toISOString() : "";
    const endDate = event.endDate ? new Date(event.endDate).toISOString() : undefined;

    return {
      title: event.seo?.title || event.name,
      description: event.seo?.description || fallbackDescription,
      keywords: event.seo?.keywords || [],
      image: eventImage,
      canonical: eventUrl,
      robots:
        (event.isCrawlable ?? platformSettings?.isCrawlable) === false
          ? "noindex, nofollow"
          : "index, follow",
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
    return <NotFoundPage />;
  }

  if (resolveQ.isLoading) {
    return (
      <>
        <FloatingHeader visitorAuth />
        <PublicPageSkeleton label={t("common.loading")} />
      </>
    );
  }

  if (resolveQ.isError) {
    const status = (resolveQ.error as { status?: number })?.status;
    if (status === 404) {
      return <NotFoundPage />;
    }
    devLog.error("[EventDetailPage] resolve failed", resolveQ.error);
    return (
      <ErrorState
        title={t("error.internalServerError")}
        message={t("error.serverErrorDescription")}
        variant="minimal"
        statusCode={500}
      />
    );
  }

  // Check if resolved entity type is event
  if (resolveQ.data && resolveQ.data.entityType !== "event") {
    return <NotFoundPage />;
  }

  if (isLoading) {
    return (
      <>
        <FloatingHeader visitorAuth />
        <PublicPageSkeleton label={t("common.loading")} />
      </>
    );
  }

  if (isError) {
    const status = (error as { status?: number } | null)?.status;
    if (status === 404) {
      return <NotFoundPage />;
    }
    devLog.error("[EventDetailPage] event load failed", error);
    return (
      <ErrorState
        title={t("error.internalServerError")}
        message={t("error.serverErrorDescription")}
        variant="minimal"
        statusCode={500}
      />
    );
  }

  if (!event) {
    return <NotFoundPage />;
  }

  // Build edit URL if user can edit
  const editUrl =
    canEditEvent && resolveQ.data?.entityId
      ? `/${lang}/admin/events?edit=${resolveQ.data.entityId}`
      : undefined;

  return (
    <>
      <FloatingHeader visitorAuth editUrl={editUrl} showEditButton={canEditEvent} />
      <div
        style={{
          minHeight: "100vh",
          background: "transparent",
          paddingTop: "clamp(72px, 8vw, 88px)",
        }}
      >
        <article
          style={{
            maxWidth: 1920,
            margin: "0 auto",
            paddingBottom: 64,
            width: "100%",
          }}
        >
          {/* Hero spans the viewport, and stops at 1920. */}
          {event.heroImage && (
            <div
              style={{
                width: "100%",
                maxWidth: 1920,
                margin: "0 auto 16px",
                height: "clamp(220px, 36vw, 640px)",
                borderRadius: 0,
                overflow: "hidden",
                boxShadow: "0 12px 24px -16px rgba(0, 0, 0, 0.35)",
                position: "relative",
                boxSizing: "border-box",
              }}
            >
              <img
                src={event.heroImage}
                alt={event.name}
                loading="eager"
                decoding="async"
                fetchPriority="high"
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

          <div style={{ maxWidth: 960, margin: "0 auto", width: "100%" }}>
          {event.category && <p className="hl-event__kicker">{event.category}</p>}
          <div style={{ margin: "0 16px 18px" }}>
            <h1
              className="hl-page-title"
              style={{
                margin: 0,
                fontSize: "clamp(28px, 5vw, 42px)",
                fontWeight: 700,
                fontFamily:
                  "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                wordWrap: "break-word",
                overflowWrap: "break-word",
              }}
            >
              {event.isPinned && <span style={{ marginRight: 8 }}>📌</span>}
              {event.name}
            </h1>
          </div>

          <article className="hl-content-card hl-event">
            <dl className="hl-event__facts">
              <div>
                <dt>{t("public.when")}</dt>
                <dd>{formatEventWhen(event.startDate, event.endDate, lang || "hu")}</dd>
              </div>
              {event.placeName && (
                <div>
                  <dt>{t("public.where")}</dt>
                  <dd>
                    {event.placeSlug ? (
                      <Link
                        to={buildUrl({
                          lang: lang as Lang,
                          siteKey,
                          path: placeEntityPath(lang as Lang, event.placeSlug),
                        })}
                      >
                        {event.placeName}
                      </Link>
                    ) : (
                      event.placeName
                    )}
                  </dd>
                </div>
              )}
            </dl>

            {(event.shortDescription || event.description) && (
              <div className="hl-event__copy">
                {event.shortDescription && (
                  <p className="hl-event__lead">{event.shortDescription}</p>
                )}
                {event.description && (
                  <div ref={descriptionRef} className="hl-richtext">
                    <ShortcodeRenderer
                      content={event.description}
                      lang={lang!}
                      siteKey={siteKey!}
                      hideGalleries={galleryIds.length > 0 && Object.keys(galleries).length > 0}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="hl-event__foot">
              <div className="hl-event__rate">
                {isAuthenticated ? (
                  <>
                    <span className="hl-event__rate-label">
                      {!myRating
                        ? lang === "hu"
                          ? "Értékeld az eseményt"
                          : lang === "en"
                            ? "Rate this event"
                            : "Bewerten Sie diese Veranstaltung"
                        : lang === "hu"
                          ? "Módosítsd az értékelésed"
                          : lang === "en"
                            ? "Update your rating"
                            : "Aktualisieren Sie Ihre Bewertung"}
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
                  </>
                ) : (
                  <>
                    <StarRating
                      avg={event.rating?.avg ?? null}
                      count={event.rating?.count ?? null}
                      interactive={false}
                      size="md"
                    />
                    <Link
                      to={visitorAuthPath(lang || "hu", "login")}
                      onClick={() => rememberAuthReturn()}
                      className="hl-event__login"
                    >
                      {t("public.visitorAuth.loginToRate")}
                    </Link>
                  </>
                )}
              </div>
              <div className="hl-event__share">
                <SocialShareButtons
                  url={window.location.href}
                  title={event.name}
                  description={event.shortDescription || event.description || ""}
                  image={event.heroImage || undefined}
                />
              </div>
            </div>
          </article>

          <div className="hl-event__back">
            <Link
              to={buildUrl({ lang: lang as Lang, siteKey, path: "" })}
              className="hl-page-link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 15,
                minHeight: 44,
              }}
            >
              ← {t("public.backToHome")}
            </Link>
          </div>

          {galleryIds.length > 0 && Object.keys(galleries).length > 0 && (
            <div className="hl-content-card hl-event__gallery">
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
          )}

          {/* Location */}
          {event.location && (
            <div style={{ margin: "0 16px 32px" }}>
              <h2
                className="hl-page-title"
                style={{
                  fontSize: 18,
                  fontWeight: 650,
                  letterSpacing: "-0.01em",
                  fontFamily:
                    "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  margin: "0 0 12px",
                }}
              >
                {t("public.location")}
              </h2>
              <div
                className="hl-content-card"
                style={{
                  width: "100%",
                  height: 390,
                  borderRadius: 12,
                  overflow: "hidden",
                  padding: 0,
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
          </div>
        </article>
      </div>
    </>
  );
}

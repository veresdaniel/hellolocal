import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSiteContext } from "../app/site/useSiteContext";
import { useLegalPage } from "../hooks/useLegalPage";
import { useSeo } from "../seo/useSeo";
import { generateWebPageSchema } from "../seo/schemaOrg";
import { getPlatformSettings } from "../api/places.api";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { FloatingHeader } from "../components/FloatingHeader";
import { ShortcodeRenderer } from "../components/ShortcodeRenderer";
import { useAuth } from "../contexts/AuthContext";
import { getSiteMemberships } from "../api/admin.api";
import { isSuperadmin, isAdmin, canEdit } from "../utils/roleHelpers";

type Props = {
  pageKey: "imprint" | "terms" | "privacy";
};

export function LegalPage({ pageKey }: Props) {
  const { t } = useTranslation();
  const { lang, siteKey } = useSiteContext();
  const safeLang = lang ?? "hu";
  const safeSiteKey = siteKey || "default";
  const { isAuthenticated, user } = useAuth();

  const { data, isLoading, error } = useLegalPage(safeLang, safeSiteKey, pageKey);

  // Load site settings for SEO
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", safeLang, siteKey],
    queryFn: () => getPlatformSettings(safeLang, siteKey),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Helper to strip HTML
  const stripHtml = (html: string | null | undefined): string => {
    if (!html) return "";
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const pageUrl = window.location.href;
  const siteUrl = window.location.origin;

  // Use SEO from data if available, otherwise use i18n fallback
  const seo = data?.seo
    ? {
        title: data.seo.title,
        description: data.seo.description,
        image: data.seo.image,
        keywords: data.seo.keywords || [],
        og: {
          type: "article",
          title: (data.seo as any).og?.title || data.seo.title,
          description: (data.seo as any).og?.description || data.seo.description,
          image: (data.seo as any).og?.image || data.seo.image,
        },
        twitter: {
          card: data.seo.image ? ("summary_large_image" as const) : ("summary" as const),
          title: (data.seo as any).twitter?.title || data.seo.title,
          description: (data.seo as any).twitter?.description || data.seo.description,
          image: (data.seo as any).twitter?.image || data.seo.image,
        },
        schemaOrg: {
          type: "WebPage" as const,
          data: {
            name: data.seo.title || data.title,
            description: stripHtml(data.seo.description),
            url: pageUrl,
            inLanguage: safeLang,
            isPartOf: platformSettings?.siteName
              ? {
                  name: platformSettings.siteName,
                  url: siteUrl,
                }
              : undefined,
          },
        },
      }
    : {
        title: platformSettings?.seoTitle || t(`public.legal.${pageKey}.title`),
        description: platformSettings?.seoDescription || "",
        keywords: [],
        og: {
          type: "article" as const,
          title: platformSettings?.seoTitle || t(`public.legal.${pageKey}.title`),
          description: platformSettings?.seoDescription || "",
        },
        schemaOrg: {
          type: "WebPage" as const,
          data: {
            name: platformSettings?.seoTitle || t(`public.legal.${pageKey}.title`),
            description: stripHtml(platformSettings?.seoDescription),
            url: pageUrl,
            inLanguage: safeLang,
            isPartOf: platformSettings?.siteName
              ? {
                  name: platformSettings.siteName,
                  url: siteUrl,
                }
              : undefined,
          },
        },
      };

  useSeo(seo, {
    siteName: platformSettings?.siteName,
  });

  // Ref for HTML content container
  const contentRef = useRef<HTMLDivElement>(null);

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

    makeMediaResponsive(contentRef.current);

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
  }, [data?.content]);

  // Check if user can edit this legal page (site admin permissions)
  // For legal pages, we need to resolve siteKey to siteId
  // Since we're on a public page, we'll use a simplified check based on siteKey
  const [canEditLegalPage, setCanEditLegalPage] = useState(false);

  // Check legal page permissions
  useEffect(() => {
    const checkPermissions = async () => {
      if (!isAuthenticated || !user || !safeSiteKey) {
        setCanEditLegalPage(false);
        return;
      }

      try {
        // Check global role (superadmin, admin, editor can edit)
        if (isSuperadmin(user.role) || isAdmin(user.role) || canEdit(user.role)) {
          setCanEditLegalPage(true);
          return;
        }

        // For site-level role check, we need siteId
        // Since we only have siteKey, we'll try to find the siteId from user's sites
        // This is a simplified approach - in a real scenario, we'd need to resolve siteKey to siteId
        // For now, we'll check if user has any site admin role
        // Note: This is a limitation - we can't check specific site without siteId
        // But for legal pages, if user is editor+ globally or has any site admin role, they can edit
        setCanEditLegalPage(false);
      } catch (err) {
        console.error("Failed to check legal page permissions", err);
        setCanEditLegalPage(false);
      }
    };

    checkPermissions();
  }, [isAuthenticated, user, safeSiteKey]);

  if (error || !data) {
    return (
      <div style={{ padding: 64, textAlign: "center", color: "#c00" }}>
        <p>{t("public.errorLoadingPlace")}</p>
      </div>
    );
  }

  // Build edit URL if user can edit
  // Legal pages use keys: "imprint", "terms", "privacy"
  const editUrl = canEditLegalPage ? `/${lang}/admin/legal-pages?edit=${pageKey}` : undefined;

  return (
    <>
      <LoadingSpinner isLoading={isLoading} />
      <FloatingHeader editUrl={editUrl} showEditButton={canEditLegalPage} />
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
            padding: "0 16px 64px",
            width: "100%",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(24px, 5vw, 36px)",
              fontWeight: 700,
              marginTop: 0,
              marginBottom: 24,
              color: "#1a1a1a",
              lineHeight: 1.3,
            }}
          >
            {data.title}
          </h1>
          <div
            ref={contentRef}
            style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: "#333",
            }}
          >
            <ShortcodeRenderer content={data.content} lang={safeLang} siteKey={safeSiteKey} />
          </div>
        </article>
      </div>
    </>
  );
}

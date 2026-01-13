// src/pages/StaticPageDetailPage.tsx
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSiteContext } from "../app/site/useSiteContext";
import { getStaticPage } from "../api/static-pages.api";
import { getPlatformSettings } from "../api/places.api";
import { useSeo } from "../seo/useSeo";
import { generateWebPageSchema } from "../seo/schemaOrg";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorState } from "../components/ErrorState";
import { FloatingHeader } from "../components/FloatingHeader";
import { HAS_MULTIPLE_SITES } from "../app/config";
import { ShortcodeRenderer } from "../components/ShortcodeRenderer";

export function StaticPageDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { lang, siteKey } = useSiteContext();
  const safeLang = lang ?? "hu";

  // Get siteKey for API call (only if multi-site mode)
  const effectiveSiteKey = HAS_MULTIPLE_SITES ? siteKey : undefined;

  const { data: staticPage, isLoading, error } = useQuery({
    queryKey: ["staticPage", safeLang, id, effectiveSiteKey],
    queryFn: () => getStaticPage(safeLang, id!, effectiveSiteKey),
    enabled: !!id,
  });

  // Load site settings for SEO
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", safeLang, siteKey],
    queryFn: () => getPlatformSettings(safeLang, siteKey),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Helper to strip HTML
  const stripHtml = (html: string | null | undefined): string => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Use SEO from data if available, otherwise use fallback
  const seo = staticPage?.seo ? {
    ...staticPage.seo,
    keywords: staticPage.seo.keywords || [],
    og: {
      type: "article" as const,
      title: staticPage.seo.og?.title || staticPage.seo.title,
      description: staticPage.seo.og?.description || staticPage.seo.description,
      image: staticPage.seo.og?.image || staticPage.seo.image,
    },
    twitter: {
      card: staticPage.seo.image ? "summary_large_image" as const : "summary" as const,
      title: staticPage.seo.twitter?.title || staticPage.seo.title,
      description: staticPage.seo.twitter?.description || staticPage.seo.description,
      image: staticPage.seo.twitter?.image || staticPage.seo.image,
    },
    schemaOrg: {
      type: "WebPage" as const,
      data: {
        name: staticPage.seo.title || staticPage.title,
        description: stripHtml(staticPage.seo.description),
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
  } : {
    title: platformSettings?.seoTitle || staticPage?.title || t("public.staticPages.title"),
    description: platformSettings?.seoDescription || stripHtml(staticPage?.content) || "",
    keywords: [],
    og: {
      type: "article" as const,
      title: platformSettings?.seoTitle || staticPage?.title || t("public.staticPages.title"),
      description: platformSettings?.seoDescription || stripHtml(staticPage?.content) || "",
    },
    schemaOrg: {
      type: "WebPage" as const,
      data: {
        name: platformSettings?.seoTitle || staticPage?.title || t("public.staticPages.title"),
        description: stripHtml(platformSettings?.seoDescription || staticPage?.content),
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
  }, [staticPage?.content]);

  if (error || (!isLoading && !staticPage)) {
    return (
      <ErrorState
        title={t("error.errorOccurred")}
        message={t("public.errorLoadingPlace")}
        variant="minimal"
      />
    );
  }

  if (!staticPage) {
    return <LoadingSpinner isLoading={true} delay={500} />;
  }

  return (
    <>
      <LoadingSpinner isLoading={isLoading} />
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
            padding: "0 16px 64px",
            width: "100%",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(24px, 5vw, 36px)",
              fontWeight: 700,
              marginBottom: 24,
              color: "#1a1a1a",
              lineHeight: 1.3,
            }}
          >
            {staticPage.title}
          </h1>
          <div
            ref={contentRef}
            style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: "#333",
            }}
          >
            <ShortcodeRenderer
              content={staticPage.content}
              lang={safeLang}
              siteKey={effectiveSiteKey || "default"}
            />
          </div>
        </article>
      </div>
    </>
  );
}

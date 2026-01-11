// src/pages/StaticPageDetailPage.tsx
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { getStaticPage } from "../api/static-pages.api";
import { getSiteSettings } from "../api/places.api";
import { useSeo } from "../seo/useSeo";
import { generateWebPageSchema } from "../seo/schemaOrg";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { FloatingHeader } from "../components/FloatingHeader";
import { HAS_MULTIPLE_TENANTS } from "../app/config";

export function StaticPageDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { lang, tenantSlug } = useTenantContext();
  const safeLang = lang ?? "hu";

  // Get tenantKey for API call (only if multi-tenant mode)
  const tenantKey = HAS_MULTIPLE_TENANTS ? tenantSlug : undefined;

  const { data: staticPage, isLoading, error } = useQuery({
    queryKey: ["staticPage", safeLang, id, tenantKey],
    queryFn: () => getStaticPage(safeLang, id!, tenantKey),
    enabled: !!id,
  });

  // Load site settings for SEO
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", safeLang, tenantSlug],
    queryFn: () => getSiteSettings(safeLang, tenantSlug),
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
        isPartOf: siteSettings?.siteName
          ? {
              name: siteSettings.siteName,
              url: siteUrl,
            }
          : undefined,
      },
    },
  } : {
    title: siteSettings?.seoTitle || staticPage?.title || t("public.staticPages.title"),
    description: siteSettings?.seoDescription || stripHtml(staticPage?.content) || "",
    keywords: [],
    og: {
      type: "article" as const,
      title: siteSettings?.seoTitle || staticPage?.title || t("public.staticPages.title"),
      description: siteSettings?.seoDescription || stripHtml(staticPage?.content) || "",
    },
    schemaOrg: {
      type: "WebPage" as const,
      data: {
        name: siteSettings?.seoTitle || staticPage?.title || t("public.staticPages.title"),
        description: stripHtml(siteSettings?.seoDescription || staticPage?.content),
        url: pageUrl,
        inLanguage: safeLang,
        isPartOf: siteSettings?.siteName
          ? {
              name: siteSettings.siteName,
              url: siteUrl,
            }
          : undefined,
      },
    },
  };

  useSeo(seo, {
    siteName: siteSettings?.siteName,
  });

  // Ref for HTML content container
  const contentRef = useRef<HTMLDivElement>(null);

  // Make images and videos responsive in HTML content
  useEffect(() => {
    const makeMediaResponsive = (container: HTMLElement | null) => {
      if (!container) return;
      
      // Make all images responsive
      const images = container.querySelectorAll("img");
      images.forEach((img) => {
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.display = "block";
        img.style.margin = "16px auto";
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
  }, [staticPage?.content]);

  if (error || (!isLoading && !staticPage)) {
    return (
      <div style={{ padding: 64, textAlign: "center", color: "#c00" }}>
        <p>{t("public.errorLoadingPlace")}</p>
      </div>
    );
  }

  if (!staticPage) {
    return <LoadingSpinner isLoading={true} />;
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
            dangerouslySetInnerHTML={{ __html: staticPage.content }}
          />
        </article>
      </div>
    </>
  );
}

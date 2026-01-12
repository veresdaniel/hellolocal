// src/pages/TenantsListPage.tsx
import { useState, useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation, useParams, Navigate } from "react-router-dom";
import { getSites } from "../api/places.api";
import { SiteCard } from "../ui/site/SiteCard";
import { FloatingHeader } from "../components/FloatingHeader";
import { HAS_MULTIPLE_SITES, DEFAULT_SITE_SLUG, APP_LANGS, DEFAULT_LANG, type Lang } from "../app/config";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useSeo } from "../seo/useSeo";
import { useQuery } from "@tanstack/react-query";
import { getPlatformSettings } from "../api/places.api";

const ITEMS_PER_PAGE = 12;

// Map of path to language
const PATH_TO_LANG: Record<string, "hu" | "en" | "de"> = {
  teruletek: "hu",
  regions: "en",
  regionen: "de",
};

// Map of language to path
const LANG_TO_PATH: Record<"hu" | "en" | "de", string> = {
  hu: "teruletek",
  en: "regions",
  de: "regionen",
};

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function SitesListPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const params = useParams<{ lang?: string; siteKey?: string }>();
  
  // Get lang from URL params
  const langParam = params.lang;
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  
  // Get the current path (last segment of URL)
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentPath = pathSegments[pathSegments.length - 1];
  
  // Determine correct language based on path
  const pathLang = PATH_TO_LANG[currentPath];
  
  // Use path language if available, otherwise use URL lang param
  const effectiveLang = pathLang || lang;
  
  // If path language is different from URL lang, redirect to correct URL
  if (pathLang && pathLang !== lang) {
    const redirectPath = `/${pathLang}/${LANG_TO_PATH[pathLang]}`;
    return <Navigate to={redirectPath} replace />;
  }
  
  // Sync i18n language with the determined language
  useEffect(() => {
    if (effectiveLang && i18n.language !== effectiveLang) {
      i18n.changeLanguage(effectiveLang);
      localStorage.setItem("i18nextLng", effectiveLang);
    }
  }, [effectiveLang, i18n]);

  const [searchQuery, setSearchQuery] = useState("");
  const observerTarget = useRef<HTMLDivElement>(null);

  // Load site settings for SEO (no tenant for tenant list page)
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", effectiveLang, undefined],
    queryFn: () => getPlatformSettings(effectiveLang, undefined),
    staleTime: 5 * 60 * 1000,
  });

  // SEO
  const sitesTitle = t("public.sites.title");
  const sitesDescription = t("public.sites.description");
  useSeo({
    title: sitesTitle,
    description: sitesDescription,
    image: platformSettings?.defaultPlaceholderCardImage || undefined,
    og: {
      type: "website",
      title: sitesTitle || platformSettings?.siteName || sitesTitle,
      description: sitesDescription,
      image: platformSettings?.defaultPlaceholderCardImage || undefined,
    },
    twitter: {
      card: platformSettings?.defaultPlaceholderCardImage ? "summary_large_image" : "summary",
      title: sitesTitle || platformSettings?.siteName || sitesTitle,
      description: sitesDescription,
      image: platformSettings?.defaultPlaceholderCardImage || undefined,
    },
  }, {
    siteName: platformSettings?.siteName,
  });

  // Fetch sites with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["sites", effectiveLang, undefined, searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      const sites = await getSites(
        effectiveLang,
        "default", // Use "default" as siteKey for site list page
        searchQuery || undefined,
        ITEMS_PER_PAGE,
        pageParam as number
      );

      return {
        sites,
        nextOffset: sites.length === ITEMS_PER_PAGE ? (pageParam as number) + ITEMS_PER_PAGE : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
  });

  const allSites = data?.pages.flatMap((page) => page.sites) ?? [];

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <>
      <FloatingHeader />
      <style>{`
        body {
          overflow-x: hidden;
        }
        
        .tenants-list-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 0;
          position: relative;
          overflow-x: hidden;
          width: 100%;
          max-width: 100vw;
        }
        
        .tenants-list-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 400px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          z-index: 0;
        }
        
        .tenants-list-content {
          position: relative;
          z-index: 1;
          padding-top: 100px;
          padding-bottom: 80px;
          width: 100%;
          overflow-x: hidden;
        }
        
        .tenants-header {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          margin-bottom: 48px;
          width: 100%;
          box-sizing: border-box;
        }
        
        .tenants-title {
          margin: 0;
          margin-bottom: 16px;
          font-size: clamp(32px, 6vw, 56px);
          font-weight: 800;
          color: white;
          letter-spacing: -0.03em;
          line-height: 1.1;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
        }
        
        .tenants-subtitle {
          margin: 0;
          margin-bottom: 32px;
          font-size: clamp(16px, 2.5vw, 20px);
          font-weight: 400;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          max-width: 600px;
        }
        
        .tenants-search-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          margin-bottom: 48px;
          width: 100%;
          box-sizing: border-box;
        }
        
        .tenants-search {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          position: relative;
          box-sizing: border-box;
        }
        
        .tenants-search-input {
          width: 100%;
          padding: 18px 24px 18px 56px;
          font-size: 16px;
          border: none;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
          font-family: inherit;
        }
        
        .tenants-search-input:focus {
          outline: none;
          background: white;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
          transform: translateY(-2px);
        }
        
        .tenants-search-input::placeholder {
          color: #999;
        }
        
        .tenants-search-icon {
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          opacity: 0.4;
          pointer-events: none;
        }
        
        .tenants-grid-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
        }
        
        .tenants-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          margin-bottom: 48px;
          width: 100%;
          box-sizing: border-box;
          padding-top: 12px; /* Prevent clipping on hover */
          padding-bottom: 12px;
        }
        
        .tenants-grid > * {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        
        @media (min-width: 640px) {
          .tenants-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 32px;
          }
          
          .tenants-header {
            padding: 0 32px;
          }
          
          .tenants-search-container {
            padding: 0 32px;
          }
          
          .tenants-grid-container {
            padding: 0 32px;
          }
        }
        
        @media (min-width: 1024px) {
          .tenants-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 40px;
          }
        }
        
        @media (min-width: 1280px) {
          .tenants-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        .tenants-empty-state {
          text-align: center;
          padding: 80px 24px;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .tenants-empty-state-title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 12px;
          color: white;
        }
        
        .tenants-empty-state-text {
          font-size: 16px;
          opacity: 0.8;
        }
        
        .tenants-error-state {
          text-align: center;
          padding: 80px 24px;
          color: #ff6b6b;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 16px;
          margin: 0 24px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .tenants-loading-more {
          display: flex;
          justify-content: center;
          padding: 40px 0;
        }
      `}</style>
      <div className="tenants-list-container">
        <div className="tenants-list-content">
          {/* Header Section */}
          <div className="tenants-header">
            <h1 className="tenants-title">
              {t("public.sites.title")}
            </h1>
            {sitesDescription && (
              <p className="tenants-subtitle">
                {sitesDescription}
              </p>
            )}
          </div>

          {/* Search Bar */}
          {allSites.length > 0 && (
            <div className="tenants-search-container">
              <div className="tenants-search">
                <svg
                  className="tenants-search-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  className="tenants-search-input"
                  placeholder={t("public.searchTenants") || "Keresés site-ok között..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Sites Grid */}
          <div className="tenants-grid-container">
            {isLoading && allSites.length === 0 ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
                <LoadingSpinner isLoading={true} delay={0} />
              </div>
            ) : isError ? (
              <div className="tenants-error-state">
                <div className="tenants-empty-state-title">
                  {t("public.errorLoadingSites") || "Hiba a site-ok betöltésekor"}
                </div>
                <div className="tenants-empty-state-text">
                  Kérjük, próbáld újra később.
                </div>
              </div>
            ) : allSites.length === 0 ? (
              <div className="tenants-empty-state">
                <div className="tenants-empty-state-title">
                  {t("public.noSitesFound") || "Nincs találat"}
                </div>
                <div className="tenants-empty-state-text">
                  {searchQuery
                    ? "Nincs site, ami megfelelne a keresési feltételeknek."
                    : "Jelenleg nincs elérhető site."}
                </div>
              </div>
            ) : (
              <>
                <div className="tenants-grid">
                  {allSites.map((site, index) => (
                    <SiteCard key={site.slug || site.id} site={site} index={index} />
                  ))}
                </div>

                {/* Infinite scroll trigger */}
                {hasNextPage && (
                  <div ref={observerTarget} className="tenants-loading-more">
                    <LoadingSpinner isLoading={isFetchingNextPage} delay={0} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


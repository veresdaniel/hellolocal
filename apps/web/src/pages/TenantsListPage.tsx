// src/pages/TenantsListPage.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { useLocation, useParams, Navigate } from "react-router-dom";
import { getTenants } from "../api/places.api";
import { TenantCard } from "../ui/tenant/TenantCard";
import { FloatingHeader } from "../components/FloatingHeader";
import { HAS_MULTIPLE_TENANTS, DEFAULT_TENANT_SLUG } from "../app/config";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useSeo } from "../seo/useSeo";
import { useQuery } from "@tanstack/react-query";
import { getSiteSettings } from "../api/places.api";

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

export function TenantsListPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { lang: contextLang, tenantSlug } = useTenantContext();
  
  // Get the current path (last segment of URL)
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentPath = pathSegments[pathSegments.length - 1];
  
  // Determine correct language based on path
  const pathLang = PATH_TO_LANG[currentPath];
  
  // Use path language if available, otherwise use context language
  const lang = pathLang || contextLang;
  
  // If path language is different from context language, redirect to correct URL
  if (pathLang && pathLang !== contextLang) {
    const tenantPart = HAS_MULTIPLE_TENANTS && tenantSlug && tenantSlug !== DEFAULT_TENANT_SLUG 
      ? `/${tenantSlug}` 
      : "";
    const redirectPath = `/${pathLang}${tenantPart}/${LANG_TO_PATH[pathLang]}`;
    return <Navigate to={redirectPath} replace />;
  }
  
  // Sync i18n language with the determined language
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
    }
  }, [lang, i18n]);
  
  const tenantKey = HAS_MULTIPLE_TENANTS ? tenantSlug : undefined;

  const [searchQuery, setSearchQuery] = useState("");
  const observerTarget = useRef<HTMLDivElement>(null);

  // Load site settings for SEO
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", lang, tenantSlug],
    queryFn: () => getSiteSettings(lang, tenantSlug),
    staleTime: 5 * 60 * 1000,
  });

  // SEO
  const tenantsTitle = t("public.tenants.title");
  const tenantsDescription = t("public.tenants.description");
  useSeo({
    title: tenantsTitle,
    description: tenantsDescription,
    image: siteSettings?.defaultPlaceholderCardImage || undefined,
    og: {
      type: "website",
      title: tenantsTitle || siteSettings?.siteName || tenantsTitle,
      description: tenantsDescription,
      image: siteSettings?.defaultPlaceholderCardImage || undefined,
    },
    twitter: {
      card: siteSettings?.defaultPlaceholderCardImage ? "summary_large_image" : "summary",
      title: tenantsTitle || siteSettings?.siteName || tenantsTitle,
      description: tenantsDescription,
      image: siteSettings?.defaultPlaceholderCardImage || undefined,
    },
  }, {
    siteName: siteSettings?.siteName,
  });

  // Fetch tenants with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["tenants", lang, tenantKey, searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      const tenants = await getTenants(
        lang,
        tenantKey,
        searchQuery || undefined,
        ITEMS_PER_PAGE,
        pageParam as number
      );

      return {
        tenants,
        nextOffset: tenants.length === ITEMS_PER_PAGE ? (pageParam as number) + ITEMS_PER_PAGE : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
  });

  const allTenants = data?.pages.flatMap((page) => page.tenants) ?? [];

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
        .tenants-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 32px;
        }
        @media (min-width: 640px) {
          .tenants-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }
        }
        @media (min-width: 900px) {
          .tenants-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
          }
        }
        .tenants-grid > * {
          width: 100%;
        }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)",
          padding: "72px 12px 24px",
        }}
      >
        {/* Header */}
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: 24,
              fontSize: "clamp(24px, 5vw, 36px)",
              fontWeight: 700,
              color: "#1a1a1a",
              letterSpacing: "-0.02em",
              wordWrap: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {t("public.tenants.title")}
          </h1>

          {/* Search Bar */}
          {allTenants.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <input
                type="text"
                placeholder={t("public.searchTenants") || "Keresés..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  padding: "14px 20px",
                  fontSize: 16,
                  border: "2px solid #e0e0e0",
                  borderRadius: 12,
                  background: "white",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.04)";
                }}
              />
            </div>
          )}
        </div>

        {/* Tenants Grid */}
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <LoadingSpinner isLoading={isLoading && allTenants.length === 0} />
          {!isLoading && isError ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "#c00" }}>
              {t("public.errorLoadingTenants") || "Hiba a területek betöltésekor"}
            </div>
          ) : !isLoading && allTenants.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "#666" }}>
              {t("public.noTenantsFound") || "Nincs találat"}
            </div>
          ) : isLoading && allTenants.length === 0 ? null : (
            <>
              <div className="tenants-grid">
                {allTenants.map((tenant, index) => (
                  <TenantCard key={tenant.slug || tenant.id} tenant={tenant} index={index} />
                ))}
              </div>

              {/* Infinite scroll trigger */}
              <div ref={observerTarget} style={{ height: 20, marginBottom: 32 }}>
                <LoadingSpinner isLoading={isFetchingNextPage} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

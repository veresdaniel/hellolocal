// src/pages/CollectionDetailPage.tsx
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSeo } from "../seo/useSeo";
import { getCollectionByDomain, getCollectionBySlug, getPlatformSettings } from "../api/places.api";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { SiteCard } from "../ui/site/SiteCard";
import { useRouteCtx } from "../app/useRouteCtx";
import { FloatingHeader } from "../components/FloatingHeader";
import { DEFAULT_LANG, DEFAULT_SITE_SLUG, type Lang } from "../app/config";
import { buildUrl } from "../app/urls";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (x === "hu" || x === "en" || x === "de");
}

export function CollectionDetailPage() {
  const { t, i18n } = useTranslation();
  const params = useParams<{ lang?: string; slug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { lang: routeLang, siteKey: routeSiteKey } = useRouteCtx();

  // Determine language
  const langParam = params.lang || routeLang;
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;

  // Reserved paths that should not be treated as siteKey
  const RESERVED_PATHS = [
    "sites",
    "teruletek",
    "regions",
    "regionen",
    "admin",
    "static-pages",
    "static-page",
    "impresszum",
    "aszf",
    "adatvedelem",
    "pricing",
    "tarife",
    "preise",
    "collections",
  ];

  // Collections route doesn't have siteKey in URL, always use DEFAULT_SITE_SLUG
  // Use DEFAULT_SITE_SLUG if siteKey is a reserved path or invalid
  const siteKey =
    RESERVED_PATHS.includes(routeSiteKey || "") || !routeSiteKey ? DEFAULT_SITE_SLUG : routeSiteKey;

  // Get slug from URL
  const slug = params.slug;

  // Try to determine if this is a domain-based collection
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isDomainBased = hostname && hostname !== "localhost" && !hostname.includes("127.0.0.1");

  // Load collection
  const {
    data: collection,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["collection", lang, slug, hostname],
    queryFn: async () => {
      if (isDomainBased) {
        return getCollectionByDomain(hostname, lang);
      } else if (slug) {
        return getCollectionBySlug(slug, lang);
      }
      throw new Error("No domain or slug provided");
    },
    enabled: !!slug || isDomainBased,
  });

  // Load platform settings for SEO
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", lang, siteKey],
    queryFn: () => getPlatformSettings(lang, siteKey),
    staleTime: 5 * 60 * 1000,
  });

  // Sync i18n language
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
    }
  }, [lang, i18n]);

  // SEO
  // Determine crawlability: collection-specific > platform global
  const isCrawlable = collection
    ? collection.isCrawlable !== false && (platformSettings?.isCrawlable ?? true)
    : (platformSettings?.isCrawlable ?? true);

  const seo = collection
    ? {
        title: collection.seo.title || collection.title,
        description: collection.seo.description || collection.description || "",
        image: collection.seo.image || collection.heroImage || undefined,
        keywords: collection.seo.keywords || [],
        robots: !isCrawlable ? "noindex, nofollow" : undefined,
        og: {
          type: "website" as const,
          title: collection.seo.title || collection.title,
          description: collection.seo.description || collection.description || "",
          image: collection.seo.image || collection.heroImage || undefined,
        },
        twitter: {
          card:
            collection.seo.image || collection.heroImage
              ? ("summary_large_image" as const)
              : ("summary" as const),
          title: collection.seo.title || collection.title,
          description: collection.seo.description || collection.description || "",
          image: collection.seo.image || collection.heroImage || undefined,
        },
        schemaOrg: isCrawlable
          ? {
              type: "CollectionPage" as const,
              data: {
                name: collection.title,
                description: collection.description || "",
                url: typeof window !== "undefined" ? window.location.href : "",
                inLanguage: lang,
                isPartOf: platformSettings?.siteName
                  ? {
                      name: platformSettings.siteName,
                      url: typeof window !== "undefined" ? window.location.origin : "",
                    }
                  : undefined,
              },
            }
          : undefined,
      }
    : {
        title: platformSettings?.seoTitle || t("public.collections.title"),
        description: platformSettings?.seoDescription || "",
        keywords: [],
        og: {
          type: "website" as const,
          title: platformSettings?.seoTitle || t("public.collections.title"),
          description: platformSettings?.seoDescription || "",
        },
      };

  useSeo(seo, {
    siteName: platformSettings?.siteName,
  });

  if (isLoading) {
    return <LoadingSpinner isLoading={true} />;
  }

  if (error || !collection) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <h1>{t("public.collections.notFound")}</h1>
        <p>{t("public.collections.notFoundDescription")}</p>
      </div>
    );
  }

  // Helper to strip HTML
  const stripHtml = (html: string | null | undefined): string => {
    if (!html) return "";
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  return (
    <>
      <FloatingHeader hideMapViewButton={true} />
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "clamp(16px, 4vw, 24px)",
          paddingTop: "clamp(72px, 8vw, 88px)",
        }}
      >
        {/* Hero section */}
        {collection.heroImage && (
          <div
            style={{
              width: "100%",
              height: "clamp(200px, 40vw, 400px)",
              borderRadius: 12,
              overflow: "hidden",
              marginBottom: 32,
              backgroundImage: `url(${collection.heroImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}

        {/* Title and description */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, marginBottom: 16 }}>
            {collection.title}
          </h1>
          {collection.description && (
            <div
              style={{
                fontSize: "1.1em",
                lineHeight: 1.6,
                color: "#4b5563",
              }}
              dangerouslySetInnerHTML={{ __html: collection.description }}
            />
          )}
        </div>

        {/* Items grid */}
        {collection.items.length > 0 && (
          <div>
            <h2 style={{ fontSize: "1.5em", fontWeight: 600, marginBottom: 24 }}>
              {t("public.collections.items")}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 24,
              }}
            >
              {collection.items.map((item) => {
                const siteUrl = buildUrl({
                  lang,
                  siteKey: item.siteSlug,
                  path: "",
                });

                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(siteUrl)}
                    style={{
                      cursor: "pointer",
                      borderRadius: 12,
                      overflow: "hidden",
                      border: "1px solid #e5e7eb",
                      transition: "transform 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {item.image && (
                      <div
                        style={{
                          width: "100%",
                          height: 200,
                          backgroundImage: `url(${item.image})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                    )}
                    <div style={{ padding: 16 }}>
                      <h3 style={{ fontSize: "1.2em", fontWeight: 600, marginBottom: 8 }}>
                        {item.title}
                      </h3>
                      {item.description && (
                        <p
                          style={{
                            fontSize: "0.9em",
                            color: "#6b7280",
                            lineHeight: 1.5,
                          }}
                          dangerouslySetInnerHTML={{ __html: item.description }}
                        />
                      )}
                      {item.isHighlighted && (
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 8,
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: "0.75em",
                            backgroundColor: "#fef3c7",
                            color: "#92400e",
                          }}
                        >
                          {t("public.collections.highlighted")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {collection.items.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "#6b7280" }}>
            <p>{t("public.collections.noItems")}</p>
          </div>
        )}
      </div>
    </>
  );
}

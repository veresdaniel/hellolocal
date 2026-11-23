/**
 * Public curated collection of regions: hero, SEO, and linked site cards.
 * On a collection custom domain loads by host; otherwise by `/collections/:slug`.
 */
// src/pages/CollectionDetailPage.tsx
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useSeo } from "../seo/useSeo";
import { absoluteCanonical } from "../seo/canonical";
import { resolveSeoFields, stripHtml } from "../seo/resolveSeoFields";
import { getCollectionByDomain, getCollectionBySlug, getPlatformSettings } from "../api/places.api";
import { PublicCardSkeletonGrid, PublicPageSkeleton } from "../components/PublicSkeleton";
import { useRouteCtx } from "../app/useRouteCtx";
import { useHostScope } from "../app/hostScope";
import { FloatingHeader } from "../components/FloatingHeader";
import { ImageWithSkeleton } from "../components/ImageWithSkeleton";
import { DEFAULT_LANG, DEFAULT_SITE_SLUG, type Lang, isLang} from "../app/config";
import { buildUrl } from "../app/urls";
import { sanitizeHtml } from "../utils/sanitizeHtml";
import { sanitizeImageUrl } from "../utils/urlValidation";
import { usePublishedLanguages } from "../hooks/useContentLanguages";
import { NotFoundPage } from "./NotFoundPage";


/** Route page for a curated collection of regions (lazy-loaded from the router). */
export function CollectionDetailPage() {
  const { t, i18n } = useTranslation();
  const params = useParams<{ lang?: string; slug?: string }>();
  const navigate = useNavigate();
  const { lang: routeLang, siteKey: routeSiteKey } = useRouteCtx();

  // Determine language
  const langParam = params.lang || routeLang;
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;

  // Reserved paths that should not be treated as siteKey
  const RESERVED_PATHS = [
    "sites",
    "regiok",
    "teruletek",
    "regions",
    "regionen",
    "hely",
    "place",
    "ort",
    "telepules",
    "town",
    "gemeinde",
    "admin",
    "static-pages",
    "static-page",
    "impresszum",
    "aszf",
    "adatvedelem",
    "imprint",
    "terms",
    "privacy",
    "impressum",
    "agb",
    "datenschutz",
    "pricing",
    "tarife",
    "preise",
    "attekintes",
    "overview",
    "ueberblick",
    "collections",
  ];

  // Collections route doesn't have siteKey in URL, always use DEFAULT_SITE_SLUG
  // Use DEFAULT_SITE_SLUG if siteKey is a reserved path or invalid
  const siteKey =
    RESERVED_PATHS.includes(routeSiteKey || "") || !routeSiteKey ? DEFAULT_SITE_SLUG : routeSiteKey;

  // Get slug from URL
  const slug = params.slug;

  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const hostScope = useHostScope();
  const isDomainBased = hostScope.status === "ready" && hostScope.kind === "collection";

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

  const languages = usePublishedLanguages();

  // SEO — empty seo* cascades from title / description / heroImage
  const globalOn = platformSettings?.globalIndexable ?? platformSettings?.isCrawlable ?? true;
  const isCrawlable = collection ? globalOn && collection.isCrawlable !== false : globalOn;
  const pageCanonical = absoluteCanonical();

  const seo = useMemo(() => {
    // Skip while loading / missing so SSR robots/title are not overwritten.
    if (!collection) return undefined;

    const resolved = resolveSeoFields(
      {
        seoTitle: collection.seo?.title,
        seoDescription: collection.seo?.description,
        seoImage: collection.seo?.image,
        title: collection.title,
        description: collection.description,
        heroImage: collection.heroImage,
      },
      {
        title: t("public.collections.title"),
        description: t("public.collections.description", {
          defaultValue: t("public.collections.title"),
        }),
      }
    );

    return {
      title: resolved.title,
      description: resolved.description,
      image: resolved.image,
      keywords: collection.seo?.keywords || [],
      canonical: pageCanonical,
      robots: !isCrawlable ? "noindex, nofollow" : undefined,
      og: {
        type: "website" as const,
        title: resolved.title,
        description: resolved.description,
        image: resolved.image,
      },
      twitter: {
        card: (resolved.image ? "summary_large_image" : "summary") as
          | "summary_large_image"
          | "summary",
        title: resolved.title,
        description: resolved.description,
        image: resolved.image,
      },
      schemaOrg: isCrawlable
        ? {
            type: "WebPage" as const,
            data: {
              name: collection.title,
              description: stripHtml(collection.description) || resolved.description,
              url: pageCanonical,
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
    };
  }, [collection, platformSettings, isCrawlable, pageCanonical, lang, t]);

  useSeo(seo, {
    siteName: platformSettings?.siteName,
    languages,
    lang,
  });

  if (isLoading) {
    return (
      <>
        <FloatingHeader visitorAuth hideMapViewButton={true} />
        <PublicPageSkeleton bleedHero label={t("common.loading")} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 48px" }}>
          <PublicCardSkeletonGrid count={6} variant="sites" label={t("common.loading")} />
        </div>
      </>
    );
  }

  if (error || !collection) {
    return <NotFoundPage />;
  }

  return (
    <>
      <FloatingHeader visitorAuth hideMapViewButton={true} />
      <div style={{ paddingTop: "clamp(72px, 8vw, 88px)" }}>
        {/* Hero: fixed aspect-ratio + skeleton for LCP/CLS */}
        {sanitizeImageUrl(collection.heroImage) && (
          <div
            style={{
              width: "100%",
              maxWidth: 1920,
              margin: "0 auto 32px",
              aspectRatio: "16 / 9",
              maxHeight: 640,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <ImageWithSkeleton
              src={sanitizeImageUrl(collection.heroImage) || collection.heroImage}
              alt={collection.title}
              priority
              width={1600}
              height={900}
              sizes="100vw"
              style={{
                width: "100%",
                height: "100%",
                maxWidth: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        )}

        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 clamp(16px, 4vw, 24px) clamp(16px, 4vw, 24px)",
          }}
        >
        {/* Title and description */}
        <div style={{ marginBottom: 32 }}>
          <h1
            className="hl-page-title"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, marginBottom: 16 }}
          >
            {collection.title}
          </h1>
          {collection.description && (
            <div
              className="hl-content-card"
              style={{
                fontSize: "1.1em",
                lineHeight: 1.6,
                padding: "clamp(16px, 4vw, 24px)",
              }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(collection.description) }}
            />
          )}
        </div>

        {/* Items grid */}
        {collection.items.length > 0 && (
          <div>
            <h2 className="hl-page-title" style={{ fontSize: "1.5em", fontWeight: 600, marginBottom: 24 }}>
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
                const itemImage = sanitizeImageUrl(item.image);

                return (
                  <div
                    key={item.id}
                    className="hl-content-card"
                    onClick={() => {
                      if (siteUrl.startsWith("http")) window.location.assign(siteUrl);
                      else navigate(siteUrl);
                    }}
                    style={{
                      cursor: "pointer",
                      borderRadius: 12,
                      overflow: "hidden",
                      padding: 0,
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
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "16 / 10",
                        background: "rgba(27, 23, 48, 0.06)",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {itemImage ? (
                        <ImageWithSkeleton
                          src={itemImage}
                          alt={item.title}
                          width={640}
                          height={400}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : null}
                    </div>
                    <div style={{ padding: 16 }}>
                      <h3
                        style={{
                          fontSize: "1.2em",
                          fontWeight: 600,
                          marginBottom: 8,
                          color: "var(--hl-ink)",
                        }}
                      >
                        {item.title}
                      </h3>
                      {item.description && (
                        <p
                          style={{
                            fontSize: "0.9em",
                            color: "var(--hl-muted-on-card)",
                            lineHeight: 1.5,
                          }}
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }}
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
          <div className="hl-page-muted" style={{ padding: 48, textAlign: "center" }}>
            <p>{t("public.collections.noItems")}</p>
          </div>
        )}
        </div>
      </div>
    </>
  );
}

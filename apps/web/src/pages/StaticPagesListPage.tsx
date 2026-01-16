// src/pages/StaticPagesListPage.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSiteContext } from "../app/site/useSiteContext";
import { getStaticPages } from "../api/static-pages.api";
import { StaticPageCard } from "../ui/static-page/StaticPageCard";
import { FloatingHeader } from "../components/FloatingHeader";
import { HAS_MULTIPLE_SITES } from "../app/config";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useSeo } from "../seo/useSeo";

export function StaticPagesListPage() {
  const { t } = useTranslation();
  const { lang, siteKey } = useSiteContext();
  const [selectedCategory, setSelectedCategory] = useState<"blog" | "tudastar" | "infok" | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const effectiveSiteKey = HAS_MULTIPLE_SITES ? siteKey : undefined;

  const {
    data: staticPages = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["staticPages", lang, effectiveSiteKey, selectedCategory],
    queryFn: () =>
      getStaticPages(
        lang,
        effectiveSiteKey,
        selectedCategory === "all" ? undefined : selectedCategory
      ),
  });

  // Filter static pages by search query
  const filteredStaticPages = useMemo(() => {
    if (!searchQuery.trim()) return staticPages;

    const lowerQuery = searchQuery.toLowerCase();
    return staticPages.filter((page) => {
      const titleMatch = page.title.toLowerCase().includes(lowerQuery);
      // Strip HTML tags for content search
      const contentText = page.content.replace(/<[^>]*>/g, " ").toLowerCase();
      const contentMatch = contentText.includes(lowerQuery);
      return titleMatch || contentMatch;
    });
  }, [staticPages, searchQuery]);

  // Load site settings for SEO
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", lang, siteKey],
    queryFn: () => import("../api/places.api").then((m) => m.getPlatformSettings(lang, siteKey)),
    staleTime: 5 * 60 * 1000,
  });

  useSeo(
    {
      title: platformSettings?.seoTitle || t("public.staticPages.title"),
      description: platformSettings?.seoDescription || t("public.staticPages.title"),
      image: platformSettings?.defaultPlaceholderCardImage || undefined,
      og: {
        type: "website",
        title: platformSettings?.seoTitle || t("public.staticPages.title"),
        description: platformSettings?.seoDescription || t("public.staticPages.title"),
        image: platformSettings?.defaultPlaceholderCardImage || undefined,
      },
      twitter: {
        card: platformSettings?.defaultPlaceholderCardImage ? "summary_large_image" : "summary",
        title: platformSettings?.seoTitle || t("public.staticPages.title"),
        description: platformSettings?.seoDescription || t("public.staticPages.title"),
        image: platformSettings?.defaultPlaceholderCardImage || undefined,
      },
    },
    {
      siteName: platformSettings?.siteName,
    }
  );

  const getNoResultsMessage = () => {
    if (selectedCategory === "blog") {
      return t("public.staticPages.noBlogFound");
    } else if (selectedCategory === "tudastar") {
      return t("public.staticPages.noKnowledgeBaseFound");
    } else if (selectedCategory === "infok") {
      return t("public.staticPages.noInfoPageFound");
    }
    return t("public.staticPages.noStaticPagesFound");
  };

  return (
    <>
      <FloatingHeader />
      <style>{`
        .static-pages-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 32px;
          width: 100%;
          max-width: 100%;
        }
        @media (min-width: 640px) {
          .static-pages-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
            max-width: 100%;
          }
        }
        @media (min-width: 900px) {
          .static-pages-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            max-width: 1400px;
            margin-left: auto;
            margin-right: auto;
          }
        }
        .static-pages-grid > * {
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }
        .static-pages-grid > * > article {
          max-width: 100%;
          min-width: 0;
        }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)",
          padding: "clamp(72px, 8vw, 88px) 12px 24px",
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
              marginTop: 0,
              marginBottom: 24,
              fontSize: "clamp(24px, 5vw, 36px)",
              fontWeight: 700,
              color: "#1a1a1a",
              letterSpacing: "-0.02em",
              wordWrap: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {t("public.staticPages.title")}
          </h1>

          {/* Search Bar */}
          <div style={{ marginBottom: 24 }}>
            <input
              type="text"
              placeholder={t("public.searchPlaces") || "Keresés..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                maxWidth: "100%",
                padding: "14px 20px",
                fontSize: 16,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 400,
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

          {/* Category Filter */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => setSelectedCategory("all")}
                style={{
                  padding: "10px 20px",
                  background: selectedCategory === "all" ? "#667eea" : "white",
                  color: selectedCategory === "all" ? "white" : "#666",
                  border: selectedCategory === "all" ? "none" : "2px solid #e0e0e0",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontWeight: 600,
                  transition: "all 0.2s",
                  boxShadow:
                    selectedCategory === "all" ? "0 2px 8px rgba(102, 126, 234, 0.2)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== "all") {
                    e.currentTarget.style.borderColor = "#667eea";
                    e.currentTarget.style.color = "#667eea";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== "all") {
                    e.currentTarget.style.borderColor = "#e0e0e0";
                    e.currentTarget.style.color = "#666";
                  }
                }}
              >
                {t("public.filters.all")}
              </button>
              <button
                onClick={() => setSelectedCategory("blog")}
                style={{
                  padding: "10px 20px",
                  background: selectedCategory === "blog" ? "#667eea" : "white",
                  color: selectedCategory === "blog" ? "white" : "#666",
                  border: selectedCategory === "blog" ? "none" : "2px solid #e0e0e0",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontWeight: 600,
                  transition: "all 0.2s",
                  boxShadow:
                    selectedCategory === "blog" ? "0 2px 8px rgba(102, 126, 234, 0.2)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== "blog") {
                    e.currentTarget.style.borderColor = "#667eea";
                    e.currentTarget.style.color = "#667eea";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== "blog") {
                    e.currentTarget.style.borderColor = "#e0e0e0";
                    e.currentTarget.style.color = "#666";
                  }
                }}
              >
                {t("admin.categoryBlog")}
              </button>
              <button
                onClick={() => setSelectedCategory("tudastar")}
                style={{
                  padding: "10px 20px",
                  background: selectedCategory === "tudastar" ? "#667eea" : "white",
                  color: selectedCategory === "tudastar" ? "white" : "#666",
                  border: selectedCategory === "tudastar" ? "none" : "2px solid #e0e0e0",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontWeight: 600,
                  transition: "all 0.2s",
                  boxShadow:
                    selectedCategory === "tudastar" ? "0 2px 8px rgba(102, 126, 234, 0.2)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== "tudastar") {
                    e.currentTarget.style.borderColor = "#667eea";
                    e.currentTarget.style.color = "#667eea";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== "tudastar") {
                    e.currentTarget.style.borderColor = "#e0e0e0";
                    e.currentTarget.style.color = "#666";
                  }
                }}
              >
                {t("admin.categoryTudastar")}
              </button>
              <button
                onClick={() => setSelectedCategory("infok")}
                style={{
                  padding: "10px 20px",
                  background: selectedCategory === "infok" ? "#667eea" : "white",
                  color: selectedCategory === "infok" ? "white" : "#666",
                  border: selectedCategory === "infok" ? "none" : "2px solid #e0e0e0",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontWeight: 600,
                  transition: "all 0.2s",
                  boxShadow:
                    selectedCategory === "infok" ? "0 2px 8px rgba(102, 126, 234, 0.2)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== "infok") {
                    e.currentTarget.style.borderColor = "#667eea";
                    e.currentTarget.style.color = "#667eea";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== "infok") {
                    e.currentTarget.style.borderColor = "#e0e0e0";
                    e.currentTarget.style.color = "#666";
                  }
                }}
              >
                {t("admin.categoryInfok")}
              </button>
            </div>
          </div>
        </div>

        {/* Static Pages Grid */}
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <LoadingSpinner isLoading={isLoading && staticPages.length === 0} />
          {!isLoading && isError ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "#c00" }}>
              {t("public.errorLoadingPlaces") || "Hiba a statikus oldalak betöltésekor"}
            </div>
          ) : !isLoading && filteredStaticPages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "#666" }}>
              {searchQuery ? t("public.noResults") || "Nincs találat" : getNoResultsMessage()}
            </div>
          ) : isLoading && staticPages.length === 0 ? null : (
            <div className="static-pages-grid">
              {filteredStaticPages.map((staticPage, index) => (
                <StaticPageCard key={staticPage.id} staticPage={staticPage} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

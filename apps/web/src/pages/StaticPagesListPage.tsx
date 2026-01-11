// src/pages/StaticPagesListPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { getStaticPages } from "../api/static-pages.api";
import { StaticPageCard } from "../ui/static-page/StaticPageCard";
import { FloatingHeader } from "../components/FloatingHeader";
import { HAS_MULTIPLE_TENANTS } from "../app/config";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useSeo } from "../seo/useSeo";

export function StaticPagesListPage() {
  const { t } = useTranslation();
  const { lang, tenantSlug } = useTenantContext();
  const [selectedCategory, setSelectedCategory] = useState<"blog" | "tudastar" | "infok" | "all">("all");
  const tenantKey = HAS_MULTIPLE_TENANTS ? tenantSlug : undefined;

  const { data: staticPages = [], isLoading, isError } = useQuery({
    queryKey: ["staticPages", lang, tenantKey, selectedCategory],
    queryFn: () => getStaticPages(lang, tenantKey, selectedCategory === "all" ? undefined : selectedCategory),
  });

  // Load site settings for SEO
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", lang, tenantSlug],
    queryFn: () => import("../api/places.api").then(m => m.getSiteSettings(lang, tenantSlug)),
    staleTime: 5 * 60 * 1000,
  });

  useSeo({
    title: siteSettings?.seoTitle || t("public.staticPages.title"),
    description: siteSettings?.seoDescription || t("public.staticPages.title"),
    image: siteSettings?.defaultPlaceholderCardImage || undefined,
    og: {
      type: "website",
      title: siteSettings?.seoTitle || t("public.staticPages.title"),
      description: siteSettings?.seoDescription || t("public.staticPages.title"),
      image: siteSettings?.defaultPlaceholderCardImage || undefined,
    },
    twitter: {
      card: siteSettings?.defaultPlaceholderCardImage ? "summary_large_image" : "summary",
      title: siteSettings?.seoTitle || t("public.staticPages.title"),
      description: siteSettings?.seoDescription || t("public.staticPages.title"),
      image: siteSettings?.defaultPlaceholderCardImage || undefined,
    },
  }, {
    siteName: siteSettings?.siteName,
  });

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
        }
        @media (min-width: 640px) {
          .static-pages-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }
        }
        @media (min-width: 900px) {
          .static-pages-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
          }
        }
        .static-pages-grid > * {
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
            {t("public.staticPages.title")}
          </h1>

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
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.2s",
                  boxShadow: selectedCategory === "all" ? "0 2px 8px rgba(102, 126, 234, 0.2)" : "none",
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
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.2s",
                  boxShadow: selectedCategory === "blog" ? "0 2px 8px rgba(102, 126, 234, 0.2)" : "none",
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
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.2s",
                  boxShadow: selectedCategory === "tudastar" ? "0 2px 8px rgba(102, 126, 234, 0.2)" : "none",
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
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.2s",
                  boxShadow: selectedCategory === "infok" ? "0 2px 8px rgba(102, 126, 234, 0.2)" : "none",
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
          ) : !isLoading && staticPages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "#666" }}>
              {getNoResultsMessage()}
            </div>
          ) : isLoading && staticPages.length === 0 ? null : (
            <div className="static-pages-grid">
              {staticPages.map((staticPage) => (
                <StaticPageCard key={staticPage.id} staticPage={staticPage} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}


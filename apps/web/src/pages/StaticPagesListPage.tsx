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

  const { data: staticPages = [], isLoading } = useQuery({
    queryKey: ["staticPages", lang, tenantKey, selectedCategory],
    queryFn: () => getStaticPages(lang, tenantKey, selectedCategory === "all" ? undefined : selectedCategory),
  });

  useSeo({
    title: t("admin.staticPages"),
    description: t("admin.staticPages"),
    og: {
      type: "website",
      title: t("admin.staticPages"),
      description: t("admin.staticPages"),
    },
  });

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "blog":
        return t("admin.categoryBlog");
      case "tudastar":
        return t("admin.categoryTudastar");
      case "infok":
        return t("admin.categoryInfok");
      default:
        return category;
    }
  };

  return (
    <>
      <FloatingHeader />
      <LoadingSpinner isLoading={isLoading} />
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)",
          padding: "72px 12px 24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
          }}
        >
          {/* Header */}
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <h1
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#1a1a1a",
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              {t("admin.staticPages")}
            </h1>
          </div>

          {/* Category Filter */}
          <div style={{ maxWidth: 960, margin: "0 auto 32px" }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => setSelectedCategory("all")}
                style={{
                  padding: "8px 16px",
                  background: selectedCategory === "all" ? "#007bff" : "#f5f5f5",
                  color: selectedCategory === "all" ? "white" : "#666",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {t("public.filters.all")}
              </button>
              <button
                onClick={() => setSelectedCategory("blog")}
                style={{
                  padding: "8px 16px",
                  background: selectedCategory === "blog" ? "#007bff" : "#f5f5f5",
                  color: selectedCategory === "blog" ? "white" : "#666",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {t("admin.categoryBlog")}
              </button>
              <button
                onClick={() => setSelectedCategory("tudastar")}
                style={{
                  padding: "8px 16px",
                  background: selectedCategory === "tudastar" ? "#007bff" : "#f5f5f5",
                  color: selectedCategory === "tudastar" ? "white" : "#666",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {t("admin.categoryTudastar")}
              </button>
              <button
                onClick={() => setSelectedCategory("infok")}
                style={{
                  padding: "8px 16px",
                  background: selectedCategory === "infok" ? "#007bff" : "#f5f5f5",
                  color: selectedCategory === "infok" ? "white" : "#666",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {t("admin.categoryInfok")}
              </button>
            </div>
          </div>

          {/* Static Pages Grid */}
          <div
            style={{
              width: "100%",
              maxWidth: "100%",
            }}
          >
            <style>{`
              .static-pages-grid {
                column-count: 1;
                column-gap: 20px;
                margin-bottom: 32px;
                direction: rtl;
              }
              .static-pages-grid > * {
                break-inside: avoid;
                margin-bottom: 24px;
                display: inline-block;
                width: 100%;
                direction: ltr;
              }
              @media (min-width: 640px) {
                .static-pages-grid {
                  column-count: 2;
                }
              }
              @media (min-width: 900px) {
                .static-pages-grid {
                  column-count: 3;
                }
              }
            `}</style>
            <div className="static-pages-grid">
              {staticPages.map((staticPage) => (
                <StaticPageCard key={staticPage.id} staticPage={staticPage} />
              ))}
            </div>
            {staticPages.length === 0 && !isLoading && (
              <div style={{ padding: 48, textAlign: "center", color: "#999" }}>
                {t("public.noPlacesFound") || "Nincs megjeleníthető oldal ebben a kategóriában."}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


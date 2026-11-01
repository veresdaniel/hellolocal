// src/pages/StaticPagesListPage.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSiteContext } from "../app/site/useSiteContext";
import { getStaticPages } from "../api/static-pages.api";
import { StaticPageCard } from "../ui/static-page/StaticPageCard";
import { FloatingHeader } from "../components/FloatingHeader";
import { HAS_MULTIPLE_SITES } from "../app/config";
import { PublicCardSkeletonGrid } from "../components/PublicSkeleton";
import { EmptyResults } from "../components/EmptyResults";
import { useSeo } from "../seo/useSeo";
import "../styles/story.css";

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

  const categories = [
    { id: "all" as const, label: t("public.filters.all") },
    { id: "blog" as const, label: t("admin.categoryBlog") },
    { id: "tudastar" as const, label: t("admin.categoryTudastar") },
    { id: "infok" as const, label: t("admin.categoryInfok") },
  ];

  return (
    <>
      <FloatingHeader />
      <div className="story">
        <div className="story__sky" aria-hidden="true" />
        <div className="story__wrap">
          {platformSettings?.siteName ? (
            <p className="story__eyebrow">{platformSettings.siteName}</p>
          ) : null}
          <h1>{t("public.staticPages.title")}</h1>
          <div className="story__tools">
            <input
              className="story__search"
              type="text"
              placeholder={t("public.searchPlaces") || "Keresés..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="story__chips">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={
                    selectedCategory === category.id ? "story__chip story__chip--on" : "story__chip"
                  }
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
          {!isLoading && isError ? (
            <p className="story__empty">{t("public.errorLoadingPlaces")}</p>
          ) : isLoading && staticPages.length === 0 ? (
            <PublicCardSkeletonGrid count={6} variant="story" label={t("common.loading")} />
          ) : !isLoading && filteredStaticPages.length === 0 ? (
            <EmptyResults
              className="story__empty"
              title={searchQuery ? t("public.noResults") : getNoResultsMessage()}
              description={
                searchQuery ? t("public.emptyResultsSearchHint") : t("public.emptyResultsDefaultHint")
              }
            />
          ) : (
            <div className="story__grid">
              {filteredStaticPages.map((staticPage) => (
                <StaticPageCard key={staticPage.id} staticPage={staticPage} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

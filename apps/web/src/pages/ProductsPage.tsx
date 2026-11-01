import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useSiteContext } from "../app/site/useSiteContext";
import { getPublicProducts } from "../api/products.api";
import { FloatingHeader } from "../components/FloatingHeader";
import { ProductCard } from "../components/ProductCard";
import { PublicCardSkeletonGrid } from "../components/PublicSkeleton";
import { useSeo } from "../seo/useSeo";
import { isLang, type Lang } from "../app/config";
import "../styles/products.css";

const PAGE_SIZE = 24;
const SKELETON_COUNT = 8;

export function ProductsPage() {
  const { t } = useTranslation();
  const { lang: routeLang, siteKey } = useSiteContext();
  const lang: Lang = isLang(routeLang) ? routeLang : "hu";
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const placeId = params.get("placeId") || "";
  const page = Math.max(1, Number(params.get("page") || 1));
  const [search, setSearch] = useState(params.get("q") || "");
  const [q, setQ] = useState(search);

  useEffect(() => {
    const timer = window.setTimeout(() => setQ(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", lang, siteKey, category, placeId, q, page],
    queryFn: () =>
      getPublicProducts(lang, siteKey || "default", {
        category: category || undefined,
        placeId: placeId || undefined,
        q: q || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: Boolean(siteKey || lang),
  });

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE));

  const catalogTitle = t("public.catalog.title");
  const catalogDescription = t("public.catalog.lead");
  const catalogCanonical =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`.replace(/\/$/, "")
      : "";
  useSeo({
    title: catalogTitle,
    description: catalogDescription,
    canonical: catalogCanonical,
    robots: "index, follow",
    og: {
      type: "website",
      title: catalogTitle,
      description: catalogDescription,
    },
    twitter: {
      card: "summary",
      title: catalogTitle,
      description: catalogDescription,
    },
    schemaOrg: {
      type: "WebPage",
      data: {
        name: catalogTitle,
        description: catalogDescription,
        url: catalogCanonical,
        inLanguage: lang,
      },
    },
  });

  function update(next: Record<string, string | null>) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (!value) merged.delete(key);
      else merged.set(key, value);
    }
    if (!("page" in next)) merged.delete("page");
    setParams(merged);
  }

  return (
    <div className="catalog">
      <FloatingHeader />
      <div className="catalog__wrap">
        <h1>{t("public.catalog.title")}</h1>
        <p className="catalog__lead">{t("public.catalog.lead")}</p>
        <div className="catalog__tools">
          <input
            className="catalog__search"
            value={search}
            placeholder={t("public.catalog.search")}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="catalog__chips">
            <button
              type="button"
              className={`catalog__chip${category ? "" : " is-on"}`}
              onClick={() => update({ category: null })}
            >
              {t("public.catalog.all")}
            </button>
            {(data?.categories || []).map((item) => (
              <button
                key={item}
                type="button"
                className={`catalog__chip${category === item ? " is-on" : ""}`}
                onClick={() => update({ category: item })}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        {isError ? <p className="catalog__empty">{t("public.catalog.error")}</p> : null}
        {!isLoading && !isError && (data?.items.length || 0) === 0 ? (
          <p className="catalog__empty">{t("public.catalog.empty")}</p>
        ) : null}
        {isLoading ? (
          <PublicCardSkeletonGrid
            count={SKELETON_COUNT}
            variant="catalog"
            label={t("common.loading")}
          />
        ) : (
          <div className="catalog__grid">
            {(data?.items || []).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                lang={lang}
                siteKey={siteKey}
                placeId={placeId || product.placeId}
              />
            ))}
          </div>
        )}
        {totalPages > 1 ? (
          <div className="catalog__pager">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => update({ page: String(page - 1) })}
            >
              {t("public.catalog.prev")}
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => update({ page: String(page + 1) })}
            >
              {t("public.catalog.next")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

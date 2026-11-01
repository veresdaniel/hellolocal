import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPublicProducts } from "../api/products.api";
import { ProductCard } from "./ProductCard";
import { buildUrl } from "../app/urls";
import { isLang, type Lang } from "../app/config";
import "../styles/products.css";

export function PlaceProductStrip({
  lang,
  siteKey,
  placeId,
}: {
  lang?: string;
  siteKey?: string;
  placeId?: string;
}) {
  const { t } = useTranslation();
  const safeLang: Lang = isLang(lang) ? lang : "hu";
  const { data } = useQuery({
    queryKey: ["products", safeLang, siteKey, placeId, "strip"],
    queryFn: () =>
      getPublicProducts(safeLang, siteKey || "default", { placeId, page: 1, pageSize: 6 }),
    enabled: Boolean(siteKey && placeId),
  });

  if (!data?.items.length) return null;

  return (
    <section className="catalog-strip">
      <h3>{t("public.catalog.title")}</h3>
      <div className="catalog-strip__grid">
        {data.items.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            lang={safeLang}
            siteKey={siteKey}
            placeId={placeId}
          />
        ))}
      </div>
      <Link
        className="catalog-strip__more"
        to={buildUrl({ lang: safeLang, siteKey, path: `products?placeId=${placeId}` })}
      >
        {t("public.catalog.title")}
      </Link>
    </section>
  );
}

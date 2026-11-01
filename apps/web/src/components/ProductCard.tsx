import { Link } from "react-router-dom";
import { formatMoney } from "../utils/formatMoney";
import { sanitizeImageUrl } from "../utils/urlValidation";
import { buildPublicUrl } from "../app/urls";
import type { Lang } from "../app/config";
import type { PublicProduct } from "../api/products.api";
import { trackProductClick } from "../lib/analytics/track";

const LOCALE: Record<Lang, string> = { hu: "hu-HU", en: "en-GB", de: "de-DE" };

export function formatProductPrice(product: Pick<PublicProduct, "price" | "currency">, lang: Lang) {
  return formatMoney(product.price, { locale: LOCALE[lang], currency: product.currency || "HUF" });
}

export function ProductCard({
  product,
  lang,
  siteKey,
  placeId,
}: {
  product: PublicProduct;
  lang: Lang;
  siteKey?: string;
  placeId?: string | null;
}) {
  const image = sanitizeImageUrl(product.imageUrl);
  return (
    <article
      className="catalog-card"
      onClick={() => {
        void trackProductClick({
          productId: product.id,
          placeId: placeId || product.placeId,
        });
      }}
    >
      <div className="catalog-card__media">
        {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : null}
      </div>
      <div className="catalog-card__body">
        {product.category ? <p className="catalog-card__category">{product.category}</p> : null}
        <h3>{product.name}</h3>
        {product.description ? <p>{product.description}</p> : null}
        {product.placeName && product.placeSlug ? (
          <Link
            to={buildPublicUrl({ lang, siteKey, entityType: "place", slug: product.placeSlug })}
            className="catalog-strip__more"
            onClick={(event) => event.stopPropagation()}
          >
            {product.placeName}
          </Link>
        ) : product.placeName ? (
          <p>{product.placeName}</p>
        ) : null}
        <div className="catalog-card__price">{formatProductPrice(product, lang)}</div>
      </div>
    </article>
  );
}

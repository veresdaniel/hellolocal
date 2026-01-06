import { Link } from "react-router-dom";
import type { Place } from "../../types/place";
import { useTenantContext } from "../../app/tenant/useTenantContext";
import { buildPath } from "../../app/routing/buildPath";

export function PlaceCard({ place }: { place: Place }) {
  const { lang, tenantSlug } = useTenantContext();

  return (
    <article style={{ border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
      {place.heroImage && (
        <img
          src={place.heroImage}
          alt={place.name}
          style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
        />
      )}

      <div style={{ padding: 12, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0 }}>{place.name}</h3>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{place.category}</span>
        </div>

        {place.description && (
          <div style={{ fontSize: 14, opacity: 0.85 }} dangerouslySetInnerHTML={{ __html: place.description }} />
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {place.priceBand && <span style={pillStyle}>{place.priceBand}</span>}
          {place.tags?.slice(0, 3).map(t => (
            <span key={t} style={pillStyle}>{t}</span>
          ))}
        </div>

        <Link to={buildPath({ tenantSlug, lang, path: `place/${place.slug}` })}>
          Megnyitás →
        </Link>
      </div>
    </article>
  );
}

const pillStyle: React.CSSProperties = {
  fontSize: 12,
  border: "1px solid #eee",
  borderRadius: 999,
  padding: "2px 8px",
};

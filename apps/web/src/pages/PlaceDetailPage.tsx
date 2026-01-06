import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { getPlace } from "../api/places.api";
import { buildPlaceSeo } from "../seo/buildPlaceSeo";
import { useSeo } from "../seo/useSeo";

export function PlaceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = useTenantContext();

  const { data: place, isLoading, isError, error } = useQuery({
    queryKey: ["place", lang, slug],
    queryFn: () => getPlace(lang, slug!),
    enabled: !!slug,
  });

  const seo = useMemo(() => {
    if (!place) {
      return {
        title: "Betöltés…",
        description: "Hely részleteinek betöltése folyamatban.",
      };
    }
    return buildPlaceSeo(place.seo, place, {
      canonical: window.location.href,
    });
  }, [place]);

  useSeo(seo);

  if (!slug) return <div style={{ padding: 24 }}>Hiányzó slug.</div>;
  if (isLoading) return <div style={{ padding: 24 }}>Betöltés…</div>;
  if (isError)
    return (
      <div style={{ padding: 24 }}>
        <p>Hiba történt.</p>
        <pre style={{ whiteSpace: "pre-wrap" }}>{String(error)}</pre>
      </div>
    );
  if (!place) return <div style={{ padding: 24 }}>Nincs találat.</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>{place.name}</h1>
      {place.description && (
        <div dangerouslySetInnerHTML={{ __html: place.description }} />
      )}
    </div>
  );
}

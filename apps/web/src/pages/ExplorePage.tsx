import { useQuery } from "@tanstack/react-query";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { getPlaces } from "../api/places.api";
import { PlaceCard } from "../ui/place/PlaceCard";
import { useSeo } from "../seo/useSeo";

export function ExplorePage() {
  const { lang } = useTenantContext();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["places", lang],
    queryFn: () => getPlaces(lang),
  });

  useSeo({
    title: "Felfedezés",
    description: "Helyi élmények: borászat, gasztro, szállás, kézműves.",
  });

  if (isLoading) return <div style={{ padding: 24 }}>Betöltés…</div>;
  if (isError)
    return (
      <div style={{ padding: 24 }}>
        <p>Hiba a place-ek betöltésekor.</p>
        <pre style={{ whiteSpace: "pre-wrap" }}>{String(error)}</pre>
      </div>
    );

  return (
    <div style={{ padding: 24 }}>
      <h1>Felfedezés</h1>

      <div style={{ display: "grid", gap: 16 }}>
        {data?.map((place) => (
          <PlaceCard key={place.slug} place={place} />
        ))}
      </div>
    </div>
  );
}

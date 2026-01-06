// src/pages/StaticPage.tsx
import { useQuery } from "@tanstack/react-query";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { useSeo } from "../seo/useSeo";
import { getLegalPage } from "../api/legal.api";

type Props = {
  pageKey: "imprint" | "terms" | "privacy";
};

export function StaticPage({ pageKey }: Props) {
  const { lang } = useTenantContext();

  const { data, isLoading } = useQuery({
    queryKey: ["legal", lang, pageKey],
    queryFn: () => getLegalPage(lang, pageKey),
  });

  if (isLoading || !data) return <p>Betöltés…</p>;

  useSeo(data.seo);

  return (
    <div style={{ padding: 24 }}>
      <h1>{data.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: data.content }} />
    </div>
  );
}

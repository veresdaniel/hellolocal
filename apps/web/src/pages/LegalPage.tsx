import { useParams } from "react-router-dom";
import { useLegalPage } from "../hooks/useLegalPage";
import { useSeo } from "../seo/useSeo";

type Props = {
  pageKey: "imprint" | "terms" | "privacy";
};

export function LegalPage({ pageKey }: Props) {
  const { lang } = useParams<{ lang: string }>();
  const safeLang = lang ?? "hu";

  const { data, isLoading, error } = useLegalPage(safeLang, pageKey);

  useSeo(data?.seo);

  if (isLoading) return <main className="p-4">Loading…</main>;
  if (error || !data) return <main className="p-4">Not found.</main>;

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-semibold mb-4">{data.title}</h1>
      <article
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: data.content }}
      />
    </main>
  );
}

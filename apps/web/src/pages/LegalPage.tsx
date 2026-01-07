import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLegalPage } from "../hooks/useLegalPage";
import { useSeo } from "../seo/useSeo";
import { getSiteSettings } from "../api/places.api";
import type { Seo } from "../types/seo";

type Props = {
  pageKey: "imprint" | "terms" | "privacy";
};

export function LegalPage({ pageKey }: Props) {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const safeLang = lang ?? "hu";

  const { data, isLoading, error } = useLegalPage(safeLang, pageKey);

  // Load site settings for SEO
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", safeLang],
    queryFn: () => getSiteSettings(safeLang),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Use SEO from data if available, otherwise use i18n fallback
  const seo: Seo = data?.seo ? {
    title: data.seo.title || siteSettings?.seoTitle || t(`public.legal.${pageKey}.title`),
    description: data.seo.description || siteSettings?.seoDescription || "",
    image: data.seo.image || undefined,
    keywords: data.seo.keywords || [],
  } : {
    title: siteSettings?.seoTitle || t(`public.legal.${pageKey}.title`),
    description: siteSettings?.seoDescription || "",
  };

  useSeo(seo, {
    siteName: siteSettings?.siteName,
  });

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

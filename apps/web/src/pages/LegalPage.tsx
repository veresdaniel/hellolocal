import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { useLegalPage } from "../hooks/useLegalPage";
import { useSeo } from "../seo/useSeo";
import { getSiteSettings } from "../api/places.api";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { FloatingHeader } from "../components/FloatingHeader";

type Props = {
  pageKey: "imprint" | "terms" | "privacy";
};

export function LegalPage({ pageKey }: Props) {
  const { t } = useTranslation();
  const { lang, tenantSlug } = useTenantContext();
  const safeLang = lang ?? "hu";

  const { data, isLoading, error } = useLegalPage(safeLang, pageKey);

  // Load site settings for SEO
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", safeLang, tenantSlug],
    queryFn: () => getSiteSettings(safeLang, tenantSlug),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Use SEO from data if available, otherwise use i18n fallback
  const seo = data?.seo ? {
    ...data.seo,
    og: {
      type: "article",
      title: data.seo.og?.title || data.seo.title,
      description: data.seo.og?.description || data.seo.description,
      image: data.seo.og?.image || data.seo.image,
    },
    twitter: {
      card: data.seo.image ? "summary_large_image" as const : "summary" as const,
      title: data.seo.twitter?.title || data.seo.title,
      description: data.seo.twitter?.description || data.seo.description,
      image: data.seo.twitter?.image || data.seo.image,
    },
  } : {
    title: siteSettings?.seoTitle || t(`public.legal.${pageKey}.title`),
    description: siteSettings?.seoDescription || "",
    og: {
      type: "article" as const,
      title: siteSettings?.seoTitle || t(`public.legal.${pageKey}.title`),
      description: siteSettings?.seoDescription || "",
    },
  };

  useSeo(seo, {
    siteName: siteSettings?.siteName,
  });

  if (error || !data) {
    return (
      <div style={{ padding: 64, textAlign: "center", color: "#c00" }}>
        <p>{t("public.errorLoadingPlace")}</p>
      </div>
    );
  }

  return (
    <>
      <LoadingSpinner isLoading={isLoading} />
      <FloatingHeader />
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)",
          paddingTop: 80,
        }}
      >
        <article
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "0 16px 64px",
            width: "100%",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(24px, 5vw, 36px)",
              fontWeight: 700,
              marginBottom: 24,
              color: "#1a1a1a",
              lineHeight: 1.3,
            }}
          >
            {data.title}
          </h1>
          <div
            style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: "#333",
            }}
            dangerouslySetInnerHTML={{ __html: data.content }}
          />
        </article>
      </div>
    </>
  );
}

import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FloatingHeader } from "../components/FloatingHeader";
import { Footer } from "../ui/layout/Footer";
import { LandingHtml } from "../components/LandingHtml";
import { useSeo } from "../seo/useSeo";
import { getPlatformGuide } from "../api/platformGuides";
import { guideCanonical } from "../app/guideCanonical";
import { isLang, type Lang } from "../app/config";
import "../styles/overview.css";

export function PlatformGuidePage() {
  const { lang: langParam, slug = "" } = useParams<{ lang: string; slug: string }>();
  const lang: Lang = isLang(langParam) ? langParam : "hu";
  const origin = typeof window === "undefined" ? "https://hellolocal.hu" : window.location.origin;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["platform-guide", lang, slug],
    queryFn: () => getPlatformGuide(slug, lang),
    enabled: Boolean(slug),
  });

  const canonical = data ? guideCanonical(origin, lang, data.slug) : undefined;
  const image =
    data?.imageUrl && data.imageUrl.startsWith("http")
      ? data.imageUrl
      : data?.imageUrl
        ? `${origin.replace(/\/$/, "")}${data.imageUrl}`
        : undefined;

  useSeo(
    data
      ? {
          title: data.seoTitle || data.title,
          description: data.seoDescription,
          image,
          canonical,
          robots: data.indexable ? "index, follow" : "noindex, nofollow",
          og: {
            type: "article",
            title: data.seoTitle || data.title,
            description: data.seoDescription,
            image,
          },
        }
      : undefined
  );

  useEffect(() => {
    if (!data) return;
    const links: HTMLLinkElement[] = [];
    const langs = data.languages?.length ? data.languages : [lang];
    for (const code of langs) {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = code;
      link.href = guideCanonical(origin, code, data.slug);
      link.dataset.guideHreflang = "1";
      document.head.appendChild(link);
      links.push(link);
    }
    const xDefault = document.createElement("link");
    xDefault.rel = "alternate";
    xDefault.hreflang = "x-default";
    xDefault.href = guideCanonical(origin, langs.includes("hu") ? "hu" : lang, data.slug);
    xDefault.dataset.guideHreflang = "1";
    document.head.appendChild(xDefault);
    links.push(xDefault);
    return () => {
      links.forEach((link) => link.remove());
    };
  }, [data, lang, origin]);

  return (
    <div className="hl-public" data-theme="classic">
      <FloatingHeader hideMapViewButton />
      <main className="overview guide">
        <article className="guide__article">
          <p className="guide__back">
            <Link to={`/${lang}`}>HelloLocal</Link>
          </p>
          {isLoading ? <p className="overview__lead">…</p> : null}
          {isError || (!isLoading && !data) ? (
            <p className="overview__lead">
              <Link to={`/${lang}`}>HelloLocal</Link>
            </p>
          ) : null}
          {data ? (
            <>
              <h1>{data.title}</h1>
              {data.imageUrl ? (
                <figure className="guide__figure">
                  <img src={data.imageUrl} alt={data.imageCaption || data.title} />
                  {data.imageCaption ? <figcaption className="overview__caption">{data.imageCaption}</figcaption> : null}
                </figure>
              ) : null}
              <LandingHtml html={data.body} className="guide__body" as="div" />
            </>
          ) : null}
        </article>
      </main>
      <Footer lang={lang} variant="overview" />
    </div>
  );
}

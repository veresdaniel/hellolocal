import { useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FloatingHeader } from "../components/FloatingHeader";
import { Footer } from "../ui/layout/Footer";
import { useSeo } from "../seo/useSeo";
import { buildUrl } from "../app/urls";
import { APP_LANGS, DEFAULT_LANG, type Lang } from "../app/config";
import { useRouteCtx } from "../app/useRouteCtx";
import "../styles/overview.css";

const FEATURE_KEYS = ["places", "events", "map", "languages", "sites", "editors"] as const;
const AUDIENCE_KEYS = ["municipality", "office", "destination"] as const;
const STEP_KEYS = ["collect", "publish", "share"] as const;
const FAQ_KEYS = ["app", "languages", "editors", "towns"] as const;
const LANGS: Lang[] = ["hu", "en", "de"];

function isLang(value: string): value is Lang {
  return (APP_LANGS as readonly string[]).includes(value);
}

export function OverviewPage() {
  const { t, i18n } = useTranslation();
  const { lang: routeLang } = useRouteCtx();
  const lang: Lang = isLang(routeLang) ? routeLang : DEFAULT_LANG;
  const outlet = useOutletContext<{ platform?: unknown } | null>();
  const insideSiteLayout = Boolean(outlet?.platform);

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
    }
  }, [i18n, lang]);

  const title = t("public.overview.title");
  const description = t("public.overview.seoDescription");
  const seoTitle = t("public.overview.seoTitle");
  const origin = typeof window === "undefined" ? "https://hello-local.io" : window.location.origin;
  const image = `${origin}/marketing/map-szeged.jpg`;

  useSeo({
    title: seoTitle,
    description,
    keywords: t("public.overview.keywords")
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean),
    image,
    canonical: `${origin}/${lang}/overview`,
    robots: "index,follow",
    og: { type: "website", title: seoTitle, description, image },
    twitter: { card: "summary_large_image", title: seoTitle, description, image },
  });

  useEffect(() => {
    LANGS.forEach((code) => {
      const selector = `link[rel="alternate"][hreflang="${code}"]`;
      let link = document.head.querySelector<HTMLLinkElement>(selector);
      if (!link) {
        link = document.createElement("link");
        link.rel = "alternate";
        link.hreflang = code;
        document.head.appendChild(link);
      }
      link.href = `${origin}/${code}/overview`;
    });
    let xDefault = document.head.querySelector<HTMLLinkElement>(
      'link[rel="alternate"][hreflang="x-default"]'
    );
    if (!xDefault) {
      xDefault = document.createElement("link");
      xDefault.rel = "alternate";
      xDefault.hreflang = "x-default";
      document.head.appendChild(xDefault);
    }
    xDefault.href = `${origin}/hu/overview`;

    const graph = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
          name: "HelloLocal",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: `${origin}/${lang}/overview`,
          description,
          inLanguage: ["hu", "en", "de"],
          image,
        },
        {
          "@type": "FAQPage",
          mainEntity: FAQ_KEYS.map((key) => ({
            "@type": "Question",
            name: t(`public.overview.faq.${key}.q`),
            acceptedAnswer: {
              "@type": "Answer",
              text: t(`public.overview.faq.${key}.a`),
            },
          })),
        },
      ],
    };
    let script = document.getElementById("overview-jsonld") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "overview-jsonld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(graph);
  }, [description, image, lang, t]);

  return (
    <>
      <FloatingHeader hideMapViewButton />
      <main className="overview">
        <div className="overview__wrap">
          <header className="overview__hero">
            <div className="overview__rise">
              <p className="overview__eyebrow">{t("public.overview.eyebrow")}</p>
              <h1>{title}</h1>
              <p className="overview__lead">{t("public.overview.lead")}</p>
              <div className="overview__actions">
                <Link className="overview__cta" to={buildUrl({ lang, path: "" })}>
                  {t("public.overview.cta")}
                </Link>
                <a className="overview__ghost" href="#how">
                  {t("public.overview.ctaSecondary")}
                </a>
              </div>
              <ul className="overview__stats">
                <li>
                  <strong>3</strong>
                  <span>{t("public.overview.statsLanguages")}</span>
                </li>
                <li>
                  <strong>1</strong>
                  <span>{t("public.overview.statsMap")}</span>
                </li>
                <li>
                  <strong>0</strong>
                  <span>{t("public.overview.statsApp")}</span>
                </li>
              </ul>
            </div>
            <figure className="overview__stage overview__rise">
              <div className="overview__window">
                <div className="overview__chrome">
                  <i />
                  <i />
                  <i />
                  <span>hello-local.io</span>
                </div>
                <img src="/marketing/map-szeged.jpg" alt={t("public.overview.shotCaption")} />
              </div>
              <figcaption className="overview__caption">{t("public.overview.shotLabel")}</figcaption>
            </figure>
          </header>

          <section className="overview__section" id="how">
            <h2>{t("public.overview.stepsTitle")}</h2>
            <ol className="overview__steps">
              {STEP_KEYS.map((key, index) => (
                <li className="overview__step" key={key}>
                  <span>0{index + 1}</span>
                  <h3>{t(`public.overview.steps.${key}.title`)}</h3>
                  <p>{t(`public.overview.steps.${key}.text`)}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="overview__section">
            <h2>{t("public.overview.featuresTitle")}</h2>
            <p>{t("public.overview.featuresLead")}</p>
            <ul className="overview__grid">
              {FEATURE_KEYS.map((key) => (
                <li className="overview__card" key={key}>
                  <h3>{t(`public.overview.features.${key}.title`)}</h3>
                  <p>{t(`public.overview.features.${key}.text`)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="overview__section overview__audience">
            <h2>{t("public.overview.audienceTitle")}</h2>
            <ul>
              {AUDIENCE_KEYS.map((key) => (
                <li key={key}>
                  <h3>{t(`public.overview.audience.${key}.title`)}</h3>
                  <p>{t(`public.overview.audience.${key}.text`)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="overview__section">
            <h2>{t("public.overview.faqTitle")}</h2>
            <div className="overview__faq">
              {FAQ_KEYS.map((key) => (
                <article key={key}>
                  <h3>{t(`public.overview.faq.${key}.q`)}</h3>
                  <p>{t(`public.overview.faq.${key}.a`)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="overview__close">
            <h2>{t("public.overview.closingTitle")}</h2>
            <p>{t("public.overview.closingText")}</p>
            <Link className="overview__cta" to={buildUrl({ lang, path: "" })}>
              {t("public.overview.cta")}
            </Link>
          </section>
        </div>
      </main>
      {!insideSiteLayout && <Footer lang={lang} />}
    </>
  );
}

import { useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FloatingHeader } from "../components/FloatingHeader";
import { PlanPicker } from "../components/PlanPicker";
import { OverviewSkeleton } from "../components/PublicSkeleton";
import { Footer } from "../ui/layout/Footer";
import { useSeo } from "../seo/useSeo";
import { buildUrl } from "../app/urls";
import { APP_LANGS, DEFAULT_LANG, type Lang, isLang } from "../app/config";
import { useRouteCtx } from "../app/useRouteCtx";
import { useLandingText } from "../hooks/useLandingText";
import { getPlatformSettings } from "../api/places.api";
import { useApplyPublicFonts } from "../hooks/useApplyPublicFonts";
import { useApplyPublicTheme, publicThemeStyle } from "../hooks/useApplyPublicTheme";
import { publicFontCssVars } from "../styles/publicFonts";
import "../styles/overview.css";

const FEATURE_KEYS = ["places", "events", "map", "languages", "sites", "editors"] as const;
const STORY_KEYS = ["maker", "service", "quiet", "town"] as const;
const STORY_IMAGES: Record<(typeof STORY_KEYS)[number], string> = {
  maker: "/marketing/craft-workshop.jpg",
  service: "/marketing/local-service.jpg",
  quiet: "/marketing/side-street.jpg",
  town: "/marketing/map-szeged.jpg",
};
const STEP_KEYS = ["collect", "publish", "share"] as const;
const DIFFERENCE_KEYS = ["hidden", "traffic", "region"] as const;
const FAQ_KEYS = ["app", "languages", "editors", "towns"] as const;
const LANGS: readonly Lang[] = APP_LANGS;


export function OverviewPage() {
  const { i18n } = useTranslation();
  const { lang: routeLang} = useRouteCtx();
  const lang: Lang = isLang(routeLang) ? routeLang : DEFAULT_LANG;
  const outlet = useOutletContext<{
    platform?: { brand?: { theme?: unknown }; siteTheme?: unknown };
  } | null>();
  const insideSiteLayout = Boolean(outlet?.platform);
  const text = useLandingText(lang);
  const { data: platformSettings, isPending: isThemePending } = useQuery({
    queryKey: ["platformSettings", lang, "default", "theme"],
    queryFn: () => getPlatformSettings(lang),
    staleTime: 5 * 60 * 1000,
    enabled: !insideSiteLayout,
  });
  const fontTheme = outlet?.platform?.brand?.theme ?? platformSettings?.brand?.theme;
  const siteTheme = outlet?.platform?.siteTheme ?? platformSettings?.siteTheme;
  const brandTheme = outlet?.platform?.brand?.theme ?? platformSettings?.brand?.theme;
  useApplyPublicFonts(fontTheme);
  useApplyPublicTheme(siteTheme, brandTheme);

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
    }
  }, [i18n, lang]);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".overview__story"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      nodes.forEach((node) => node.classList.add("is-in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [lang]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".overview");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!root || reduce) return;
    root.classList.add("overview--parallax");
    const sky = root.querySelector<HTMLElement>(".overview__sky");
    // Only soft-parallax the hero mock — story images stay in normal flow (no layout voids).
    const layers = Array.from(
      root.querySelectorAll<HTMLElement>(".overview__shot[data-parallax], .overview__shot [data-parallax]")
    );
    let frame = 0;
    const update = () => {
      frame = 0;
      const mobile = window.matchMedia("(max-width: 860px)").matches;
      const viewHeight = window.innerHeight || 1;
      if (sky) {
        sky.style.transform = `translate3d(0, ${window.scrollY * 0.18}px, 0)`;
      }
      layers.forEach((layer) => {
        const speed = Number(layer.dataset.parallax) || 0.2;
        if (mobile && layer.dataset.parallaxMobile === "off") {
          layer.style.transform = "";
          return;
        }
        const rect = layer.getBoundingClientRect();
        const progress = (rect.top + rect.height / 2 - viewHeight / 2) / viewHeight;
        const shift = progress * speed * -48;
        layer.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
      });
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      layers.forEach((layer) => {
        layer.style.transform = "";
      });
      if (sky) sky.style.transform = "";
      root.classList.remove("overview--parallax");
    };
  }, [lang]);

  const title = text("title");
  const description = text("seoDescription");
  const seoTitle = text("seoTitle");
  const origin = typeof window === "undefined" ? "https://hello-local.io" : window.location.origin;
  const image = `${origin}/marketing/map-szeged.jpg`;

  useSeo({
    title: seoTitle,
    description,
    keywords: text("keywords")
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
    xDefault.href = `${origin}/${DEFAULT_LANG}/overview`;

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
          inLanguage: LANGS,
          image,
        },
        {
          "@type": "FAQPage",
          mainEntity: FAQ_KEYS.map((key) => ({
            "@type": "Question",
            name: text(`faq.${key}.q`),
            acceptedAnswer: {
              "@type": "Answer",
              text: text(`faq.${key}.a`),
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
  }, [description, image, lang, text]);

  // Avoid a blank navy flash before theme/settings resolve (standalone overview).
  if (!insideSiteLayout && isThemePending) {
    return (
      <div className="hl-public">
        <FloatingHeader hideMapViewButton />
        <OverviewSkeleton />
      </div>
    );
  }

  return (
    <div
      className="hl-public"
      style={{ ...publicFontCssVars(fontTheme), ...publicThemeStyle(siteTheme, brandTheme) }}
    >
      <FloatingHeader hideMapViewButton />
      <main className="overview">
        <div className="overview__sky" aria-hidden="true" />
        <div className="overview__wrap">
          <header className="overview__hero">
            <div className="overview__rise">
              <p className="overview__brand">HelloLocal</p>
              <p className="overview__eyebrow">{text("eyebrow")}</p>
              <h1>{title}</h1>
              <p className="overview__lead">{text("lead")}</p>
              <div className="overview__actions">
                <Link className="overview__cta" to={buildUrl({ lang, path: "" })}>
                  {text("cta")}
                </Link>
                <a className="overview__ghost" href="#how">
                  {text("ctaSecondary")}
                </a>
              </div>
            </div>
            <figure className="overview__shot overview__rise" data-parallax="0.18" data-parallax-mobile="off">
              <div className="overview__window">
                <div className="overview__chrome" aria-hidden="true">
                  <span className="overview__dots">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <img
                  src="/marketing/map-szeged.jpg"
                  alt={text("shotCaption")}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
              <figcaption className="overview__caption">{text("shotLabel")}</figcaption>
            </figure>
          </header>

          <ul className="overview__stats">
            <li>
              <strong>{text("statsLanguagesValue")}</strong>
              <span>{text("statsLanguages")}</span>
            </li>
            <li>
              <strong>1</strong>
              <span>{text("statsMap")}</span>
            </li>
            <li>
              <strong>0</strong>
              <span>{text("statsApp")}</span>
            </li>
          </ul>

          <section className="overview__section overview__difference" id="why">
            <p className="overview__kicker">{text("differenceKicker")}</p>
            <h2>{text("differenceTitle")}</h2>
            <p>{text("differenceLead")}</p>
            <ul>
              {DIFFERENCE_KEYS.map((key) => (
                <li key={key}>
                  <h3>{text(`difference.${key}.title`)}</h3>
                  <p>{text(`difference.${key}.text`)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="overview__section" id="who">
            <h2>{text("storiesTitle")}</h2>
            <p>{text("storiesLead")}</p>
            {STORY_KEYS.map((key) => (
              <article
                className={`overview__story${key === "service" || key === "town" ? " is-flip" : ""}`}
                key={key}
              >
                <div className="overview__frame">
                  <img
                    src={STORY_IMAGES[key]}
                    alt={text(`stories.${key}.alt`)}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="overview__story-copy">
                  <p className="overview__kicker">{text(`stories.${key}.kicker`)}</p>
                  <h3>{text(`stories.${key}.title`)}</h3>
                  <p>{text(`stories.${key}.text`)}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="overview__section" id="how">
            <h2>{text("stepsTitle")}</h2>
            <ol className="overview__steps">
              {STEP_KEYS.map((key, index) => (
                <li className="overview__step" key={key}>
                  <span>0{index + 1}</span>
                  <h3>{text(`steps.${key}.title`)}</h3>
                  <p>{text(`steps.${key}.text`)}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="overview__section">
            <h2>{text("featuresTitle")}</h2>
            <p>{text("featuresLead")}</p>
            <ul className="overview__grid">
              {FEATURE_KEYS.map((key) => (
                <li className="overview__card" key={key}>
                  <h3>{text(`features.${key}.title`)}</h3>
                  <p>{text(`features.${key}.text`)}</p>
                </li>
              ))}
            </ul>
          </section>

          <PlanPicker lang={lang} />

          <section className="overview__section">
            <h2>{text("faqTitle")}</h2>
            <div className="overview__faq">
              {FAQ_KEYS.map((key) => (
                <article key={key}>
                  <h3>{text(`faq.${key}.q`)}</h3>
                  <p>{text(`faq.${key}.a`)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="overview__close">
            <h2>{text("closingTitle")}</h2>
            <p>{text("closingText")}</p>
            <Link className="overview__cta" to={buildUrl({ lang, path: "" })}>
              {text("cta")}
            </Link>
          </section>
        </div>
      </main>
      {!insideSiteLayout && <Footer lang={lang} />}
    </div>
  );
}

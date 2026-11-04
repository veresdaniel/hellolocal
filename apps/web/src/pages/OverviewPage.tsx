import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FloatingHeader } from "../components/FloatingHeader";
import { OverviewSkeleton } from "../components/PublicSkeleton";
import { Footer } from "../ui/layout/Footer";
import { useSeo } from "../seo/useSeo";
import { LiveDemoLink } from "../components/LiveDemoLink";
import { APP_LANGS, DEFAULT_LANG, type Lang, isLang } from "../app/config";
import { overviewSegment } from "../app/entityPaths";
import { useRouteCtx } from "../app/useRouteCtx";
import { useLandingText } from "../hooks/useLandingText";
import { getPlatformSettings } from "../api/places.api";
import { useApplyPublicFonts } from "../hooks/useApplyPublicFonts";
import { useApplyPublicTheme, publicThemeStyle } from "../hooks/useApplyPublicTheme";
import { publicFontCssVars } from "../styles/publicFonts";
import "../styles/overview.css";

const FAQ_KEYS = ["app", "languages", "editors", "towns"] as const;
const OverviewBelowFold = lazy(() =>
  import("./OverviewBelowFold").then((module) => ({ default: module.OverviewBelowFold }))
);
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

  const foldSentinel = useRef<HTMLDivElement>(null);
  const [showBelow, setShowBelow] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);

  useEffect(() => {
    if (showBelow) return;
    const reveal = () => setShowBelow(true);
    let idleId = 0;
    let timeoutId = 0;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(reveal, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(reveal, 400);
    }
    const node = foldSentinel.current;
    let observer: IntersectionObserver | undefined;
    if (node && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) reveal();
        },
        { rootMargin: "480px 0px" }
      );
      observer.observe(node);
    }
    return () => {
      if (idleId && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
      observer?.disconnect();
    };
  }, [showBelow]);

  useEffect(() => {
    const revealTo = (id: string) => {
      setPendingTarget(id);
      setShowBelow(true);
    };
    const onDemo = () => revealTo("demo-request");
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href='#how'], a[href='#demo-request']");
      if (!anchor) return;
      event.preventDefault();
      revealTo(anchor.getAttribute("href")?.slice(1) || "demo-request");
    };
    window.addEventListener("overview:reveal-demo", onDemo);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("overview:reveal-demo", onDemo);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    if (!showBelow || !pendingTarget) return;
    let frame = 0;
    let tries = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const node = document.getElementById(pendingTarget);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
        setPendingTarget(null);
        return;
      }
      if (tries++ > 180) return;
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pendingTarget, showBelow]);

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
    canonical: `${origin}/${lang}/${overviewSegment(lang)}`,
    robots:
      (platformSettings?.globalIndexable ?? platformSettings?.isCrawlable) === false
        ? "noindex, nofollow"
        : "index, follow",
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
      link.href = `${origin}/${code}/${overviewSegment(code)}`;
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
    xDefault.href = `${origin}/${DEFAULT_LANG}/${overviewSegment(DEFAULT_LANG)}`;

    const graph = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
          name: "HelloLocal",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: `${origin}/${lang}/${overviewSegment(lang)}`,
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
                <LiveDemoLink className="overview__cta" lang={lang}>
                  {text("cta")}
                </LiveDemoLink>
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
              <strong>{text("statsMapValue")}</strong>
              <span>{text("statsMap")}</span>
            </li>
            <li>
              <strong>{text("statsAppValue")}</strong>
              <span>{text("statsApp")}</span>
            </li>
          </ul>

          {showBelow ? (
            <Suspense fallback={<div className="overview__fold-fallback" aria-hidden="true" />}>
              <OverviewBelowFold lang={lang} />
            </Suspense>
          ) : (
            <div ref={foldSentinel} className="overview__fold-sentinel" />
          )}
        </div>
      </main>
      {!insideSiteLayout && <Footer lang={lang} variant="overview" />}
    </div>
  );
}

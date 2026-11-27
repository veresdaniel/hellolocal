import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FloatingHeader } from "../components/FloatingHeader";
import { Footer } from "../ui/layout/Footer";
import { useSeo } from "../seo/useSeo";
import { absoluteCanonical } from "../seo/canonical";
import { LiveDemoLink } from "../components/LiveDemoLink";
import {
  LandingHtml,
  LandingInline,
  landingHasText,
  landingPlain,
} from "../components/LandingHtml";
import { APP_LANGS, DEFAULT_LANG, type Lang, isLang } from "../app/config";
import { platformLandingPath } from "../app/entityPaths";
import { useRouteCtx } from "../app/useRouteCtx";
import { useLandingText } from "../hooks/useLandingText";
import { getPlatformSettings } from "../api/places.api";
import { useApplyPublicFonts } from "../hooks/useApplyPublicFonts";
import { useApplyPublicTheme, publicThemeStyle } from "../hooks/useApplyPublicTheme";
import { publicFontCssVars } from "../styles/publicFonts";
import { getPublicUiLanguages } from "../api/uiCopy.api";
import { MarketingPicture } from "../marketing/MarketingPicture";
import { resolveHeroImage, resolveShareImage } from "../marketing/landingCmsImages";
import { trackGtmSelectContent } from "../lib/gtmEvents";
import {
  armPublicSsrRevealFallback,
  isPublicSsrPending,
  revealPublicSpa,
  whenPublicStylesReady,
} from "../lib/publicSsrHold";
import "../styles/overview.css";

const FAQ_KEYS = ["app", "languages", "editors", "towns", "maps"] as const;
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
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", lang, "default", "theme"],
    queryFn: () => getPlatformSettings(lang),
    staleTime: 5 * 60 * 1000,
    enabled: !insideSiteLayout,
  });
  const fontTheme = outlet?.platform?.brand?.theme ?? platformSettings?.brand?.theme;
  // Marketing overview keeps classic navy chrome regardless of region preset.
  const overviewTheme = { presetId: "classic" as const };
  useApplyPublicFonts(fontTheme);
  useApplyPublicTheme(overviewTheme, undefined);

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
    }
  }, [i18n, lang]);

  // Reveal only after async SPA CSS is applied — otherwise the hero FOUCs.
  useLayoutEffect(() => {
    if (!isPublicSsrPending()) {
      document.documentElement.classList.remove("hl-booting");
      return;
    }
    let cancelled = false;
    const disarm = armPublicSsrRevealFallback(8000);
    void whenPublicStylesReady().then(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) revealPublicSpa();
        });
      });
    });
    return () => {
      cancelled = true;
      disarm();
    };
  }, []);

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
  const description =
    landingPlain(text("seoDescription")) ||
    landingPlain(text("subtitle")) ||
    landingPlain(title);
  const seoTitle = landingPlain(text("seoTitle")) || landingPlain(title);
  const origin = typeof window === "undefined" ? "https://hello-local.io" : window.location.origin;
  const landingImages = platformSettings?.platform?.landingImages ?? null;
  const heroImage = useMemo(
    () => resolveHeroImage(landingImages, lang),
    [landingImages, lang]
  );
  const sharePath =
    resolveShareImage(landingImages, lang, platformSettings?.platform?.defaultShareImage) ||
    "/marketing/hellolocal-share.jpg";
  const image = sharePath.startsWith("http") ? sharePath : `${origin}${sharePath}`;
  const { data: uiLanguages } = useQuery({
    queryKey: ["ui-languages"],
    queryFn: getPublicUiLanguages,
    staleTime: 60_000,
    retry: 1,
  });
  const overviewLangs = useMemo(() => {
    const published = (uiLanguages?.languages ?? LANGS).filter(isLang);
    return published.length ? published : LANGS;
  }, [uiLanguages?.languages]);

  const overviewSeo = useMemo(
    () => ({
      title: seoTitle,
      description,
      keywords: landingPlain(text("keywords"))
        .split(",")
        .map((word) => word.trim())
        .filter(Boolean),
      image,
      canonical: absoluteCanonical(platformLandingPath(lang)),
      // Platform landing only: seo.landingIndexable (platform.landingCrawlable). Default off.
      robots:
        platformSettings?.landingIndexable === true ? "index, follow" : "noindex, nofollow",
      og: { type: "website" as const, title: seoTitle, description, image },
      twitter: {
        card: "summary_large_image" as const,
        title: seoTitle,
        description,
        image,
      },
    }),
    [seoTitle, description, image, lang, platformSettings?.landingIndexable, text]
  );

  useSeo(overviewSeo, {
    languages: overviewLangs,
    lang,
    defaultLang: DEFAULT_LANG,
  });

  useEffect(() => {
    const graph = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
          name: "HelloLocal",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: `${origin}${platformLandingPath(lang)}`,
          description,
          inLanguage: LANGS,
          image,
        },
        {
          "@type": "FAQPage",
          mainEntity: FAQ_KEYS.map((key) => ({
            "@type": "Question",
            name: landingPlain(text(`faq.${key}.q`)),
            acceptedAnswer: {
              "@type": "Answer",
              text: landingPlain(text(`faq.${key}.a`)),
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

  return (
    <div
      className="hl-public"
      data-theme="classic"
      style={{ ...publicFontCssVars(fontTheme), ...publicThemeStyle(overviewTheme) }}
    >
      <FloatingHeader hideMapViewButton />
      <main className="overview">
        <div className="overview__sky" aria-hidden="true" />
        <div className="overview__wrap">
          <header className="overview__hero">
            <div className="overview__rise">
              <p className="overview__brand">HelloLocal</p>
              <LandingHtml html={text("eyebrow")} className="overview__eyebrow" as="div" />
              <h1>
                <LandingInline html={title} />
              </h1>
              <LandingHtml html={text("lead")} className="overview__lead" as="div" />
              <div className="overview__actions">
                <LiveDemoLink className="overview__cta" lang={lang} ctaId="hero_live_demo">
                  <LandingInline html={text("cta")} />
                </LiveDemoLink>
                <a
                  className="overview__ghost"
                  href="#how"
                  onClick={() => trackGtmSelectContent("hero_how_it_works")}
                >
                  <LandingInline html={text("ctaSecondary")} />
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
                <MarketingPicture
                  image={heroImage}
                  alt={landingPlain(text("shotCaption"))}
                  priority
                />
              </div>
              <LandingHtml html={text("shotLabel")} className="overview__caption" as="div" />
            </figure>
          </header>

          {(landingHasText(text("introP1")) || landingHasText(text("introP2"))) && (
            <section
              className="overview__intro overview__rise"
              aria-label={landingPlain(text("menu"))}
            >
              <LandingHtml html={text("introP1")} as="div" />
              <LandingHtml html={text("introP2")} as="div" />
            </section>
          )}

          <ul className="overview__stats">
            <li>
              <strong>
                <LandingInline html={text("statsLanguagesValue")} />
              </strong>
              <LandingHtml html={text("statsLanguages")} as="span" />
            </li>
            <li>
              <strong>
                <LandingInline html={text("statsMapValue")} />
              </strong>
              <LandingHtml html={text("statsMap")} as="span" />
            </li>
            <li>
              <strong>
                <LandingInline html={text("statsAppValue")} />
              </strong>
              <LandingHtml html={text("statsApp")} as="span" />
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

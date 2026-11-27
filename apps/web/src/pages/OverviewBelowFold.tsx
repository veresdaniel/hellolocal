import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DemoRequestForm } from "../components/DemoRequestForm";
import { PlanPicker } from "../components/PlanPicker";
import { LiveDemoLink } from "../components/LiveDemoLink";
import type { Lang } from "../app/config";
import { useLandingText } from "../hooks/useLandingText";
import { LandingHtml, LandingInline, landingPlain } from "../components/LandingHtml";
import { MarketingPicture } from "../marketing/MarketingPicture";
import {
  resolveClosingImage,
  resolveStoryImage,
} from "../marketing/landingCmsImages";
import { getPlatformSettings } from "../api/places.api";
import { listPlatformGuides } from "../api/platformGuides";
import { platformGuidePath } from "../app/guidePaths";

const GUIDE_BY_STORY: Partial<Record<(typeof STORY_KEYS)[number], string>> = {
  maker: "helyi-vallalkozas",
  civic: "helyi-intezmenyek",
  town: "onkormanyzat",
};

const FEATURE_KEYS = ["places", "events", "map", "languages", "sites", "editors"] as const;
const STORY_KEYS = ["mobile", "maker", "service", "quiet", "civic", "town"] as const;
const STEP_KEYS = ["collect", "publish", "share"] as const;
const DIFFERENCE_KEYS = ["hidden", "traffic", "region"] as const;
const FAQ_KEYS = ["app", "languages", "editors", "towns", "maps"] as const;

export function OverviewBelowFold({ lang }: { lang: Lang }) {
  const text = useLandingText(lang);
  const { data: guides } = useQuery({
    queryKey: ["platform-guides", lang],
    queryFn: () => listPlatformGuides(lang),
    staleTime: 5 * 60 * 1000,
  });
  const guideSlugs = useMemo(() => new Set((guides ?? []).map((guide) => guide.slug)), [guides]);
  const readMore = landingPlain(text("readMore"));
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", lang, "default", "theme"],
    queryFn: () => getPlatformSettings(lang),
    staleTime: 5 * 60 * 1000,
  });
  const landingImages = platformSettings?.platform?.landingImages ?? null;
  const storyImages = useMemo(
    () =>
      Object.fromEntries(
        STORY_KEYS.map((key) => [key, resolveStoryImage(landingImages, lang, key)])
      ) as Record<(typeof STORY_KEYS)[number], ReturnType<typeof resolveStoryImage>>,
    [landingImages, lang]
  );
  const closingImage = useMemo(
    () => resolveClosingImage(landingImages, lang),
    [landingImages, lang]
  );

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

  return (
    <>
      <section className="overview__section overview__difference" id="why">
        <LandingHtml html={text("differenceKicker")} className="overview__kicker" as="div" />
        <h2>
          <LandingInline html={text("differenceTitle")} />
        </h2>
        <LandingHtml html={text("differenceLead")} as="div" />
        <ul>
          {DIFFERENCE_KEYS.map((key) => (
            <li key={key}>
              <h3>
                <LandingInline html={text(`difference.${key}.title`)} />
              </h3>
              <LandingHtml html={text(`difference.${key}.text`)} as="div" />
            </li>
          ))}
        </ul>
        {guideSlugs.has("google-terkep") ? (
          <p className="overview__more">
            <Link to={platformGuidePath(lang, "google-terkep")}>{readMore}</Link>
          </p>
        ) : null}
      </section>

      <section className="overview__section" id="who">
        <h2>
          <LandingInline html={text("storiesTitle")} />
        </h2>
        <LandingHtml html={text("storiesLead")} as="div" />
        {STORY_KEYS.map((key, index) => (
          <article
            className={`overview__story${index % 2 === 1 ? " is-flip" : ""}`}
            key={key}
          >
            <figure className="overview__photo">
              <div className="overview__frame">
                <MarketingPicture
                  image={storyImages[key]}
                  alt={landingPlain(text(`stories.${key}.alt`))}
                />
              </div>
              <figcaption className="overview__caption">
                {landingPlain(text(`stories.${key}.alt`))}
              </figcaption>
            </figure>
            <div className="overview__story-copy">
              <LandingHtml html={text(`stories.${key}.kicker`)} className="overview__kicker" as="div" />
              <h3>
                <LandingInline html={text(`stories.${key}.title`)} />
              </h3>
              <LandingHtml html={text(`stories.${key}.text`)} as="div" />
              {GUIDE_BY_STORY[key] && guideSlugs.has(GUIDE_BY_STORY[key]) ? (
                <p className="overview__more">
                  <Link to={platformGuidePath(lang, GUIDE_BY_STORY[key]!)}>{readMore}</Link>
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="overview__section" id="how">
        <h2>
          <LandingInline html={text("stepsTitle")} />
        </h2>
        <ol className="overview__steps">
          {STEP_KEYS.map((key, index) => (
            <li className="overview__step" key={key}>
              <span>0{index + 1}</span>
              <h3>
                <LandingInline html={text(`steps.${key}.title`)} />
              </h3>
              <LandingHtml html={text(`steps.${key}.text`)} as="div" />
            </li>
          ))}
        </ol>
        {guideSlugs.has("hogyan-kerul-fel") ? (
          <p className="overview__more">
            <Link to={platformGuidePath(lang, "hogyan-kerul-fel")}>{readMore}</Link>
          </p>
        ) : null}
      </section>

      <section className="overview__section">
        <h2>
          <LandingInline html={text("featuresTitle")} />
        </h2>
        <LandingHtml html={text("featuresLead")} as="div" />
        <ul className="overview__grid">
          {FEATURE_KEYS.map((key) => (
            <li className="overview__card" key={key}>
              <h3>
                <LandingInline html={text(`features.${key}.title`)} />
              </h3>
              <LandingHtml html={text(`features.${key}.text`)} as="div" />
              {key === "sites" && guideSlugs.has("sajat-domain") ? (
                <p className="overview__more">
                  <Link to={platformGuidePath(lang, "sajat-domain")}>{readMore}</Link>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <PlanPicker lang={lang} />

      {guides && guides.length > 0 ? (
        <section className="overview__section" id="guides">
          <h2>
            <LandingInline html={text("guidesTitle")} />
          </h2>
          <ul className="overview__guides">
            {guides.map((guide, index) => (
              <li key={guide.slug}>
                <Link to={platformGuidePath(lang, guide.slug)}>
                  <span className="overview__guides-no" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="overview__guides-title">{guide.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="overview__section">
        <h2>
          <LandingInline html={text("faqTitle")} />
        </h2>
        <div className="overview__faq">
          {FAQ_KEYS.map((key) => (
            <article key={key}>
              <h3>
                <LandingInline html={text(`faq.${key}.q`)} />
              </h3>
              <LandingHtml html={text(`faq.${key}.a`)} as="div" />
            </article>
          ))}
        </div>
      </section>

      <section className="overview__close">
        <div className="overview__close-copy">
          <h2>
            <LandingInline html={text("closingTitle")} />
          </h2>
          <LandingHtml html={text("closingText")} as="div" />
          <LiveDemoLink className="overview__cta" lang={lang} ctaId="closing_live_demo">
            <LandingInline html={text("cta")} />
          </LiveDemoLink>
        </div>
        <figure className="overview__close-figure">
          <MarketingPicture
            className="overview__close-map"
            image={closingImage}
            alt={landingPlain(text("closingImageAlt"))}
          />
          <figcaption className="overview__caption">
            {landingPlain(text("closingImageAlt"))}
          </figcaption>
        </figure>
      </section>

      <section className="overview__section" id="demo-request">
        <DemoRequestForm />
      </section>
    </>
  );
}

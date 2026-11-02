import { useEffect } from "react";
import { Link } from "react-router-dom";
import { DemoRequestForm } from "../components/DemoRequestForm";
import { PlanPicker } from "../components/PlanPicker";
import { REGION_LIST_PATH } from "../app/entityPaths";
import { buildUrl } from "../app/urls";
import type { Lang } from "../app/config";
import { useLandingText } from "../hooks/useLandingText";

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

export function OverviewBelowFold({ lang }: { lang: Lang }) {
  const text = useLandingText(lang);
  const liveUrl = buildUrl({ lang, path: REGION_LIST_PATH[lang] });

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
        <div className="overview__close-copy">
          <h2>{text("closingTitle")}</h2>
          <p>{text("closingText")}</p>
          <Link className="overview__cta" to={liveUrl}>
            {text("cta")}
          </Link>
        </div>
        <img
          className="overview__close-map"
          src="/marketing/visitor-hiker.jpg"
          alt={text("closingImageAlt")}
          loading="lazy"
          decoding="async"
        />
      </section>

      <section className="overview__section" id="demo-request">
        <DemoRequestForm />
      </section>
    </>
  );
}

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { applySocialMeta, publicOrigin, SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from "./socialMeta.js";

const here = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(here, "../src/i18n/languages.json"), "utf8"));
const LANGS = catalog.languages.map((language) => language.code);
const FALLBACK_LANG = catalog.fallback;
const RESERVED = new Set(["api", "assets", "static", "src", "www", "app", "css", "img"]);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PLAN_DEFAULTS = {
  free: { priceHuf: 0, places: 3, events: 0, languages: 1 },
  basic: { priceHuf: 3990, places: 30, events: 30, languages: 1 },
  premium: { priceHuf: 8990, places: 150, events: 200, languages: 3 },
};

const MATRIX_PLAN = { free: "FREE", basic: "BASIC", premium: "PRO" };

function finiteNumber(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.round(n));
}

/** Same priority as apps/web/src/components/publicPlans.ts resolvePublicPlans. */
function resolvePlanNumbers(planOverrides) {
  const root = planOverrides && typeof planOverrides === "object" ? planOverrides : {};
  const customRoot =
    root.publicPlans && typeof root.publicPlans === "object" ? root.publicPlans : {};
  const result = {};
  for (const id of ["free", "basic", "premium"]) {
    const defaults = PLAN_DEFAULTS[id];
    const custom = customRoot[id] ?? {};
    const limits = root[MATRIX_PLAN[id]]?.limits ?? {};
    result[id] = {
      priceHuf: finiteNumber(custom.priceHuf) ?? defaults.priceHuf,
      places: finiteNumber(limits.placesMax) ?? finiteNumber(custom.places) ?? defaults.places,
      events:
        finiteNumber(limits.eventsPerMonthMax) ??
        finiteNumber(custom.events) ??
        defaults.events,
      languages:
        finiteNumber(limits.languagesMax) ??
        finiteNumber(custom.languages) ??
        defaults.languages,
    };
  }
  return result;
}

function fillCount(template, count) {
  return String(template ?? "").replace(/\{\{\s*count\s*\}\}/g, String(count));
}

function renderPlanCards(copy, lang, planOverrides) {
  const plans = copy.plans;
  if (!plans) return "";
  const numbersById = resolvePlanNumbers(planOverrides);
  return ["free", "basic", "premium"]
    .map((id) => {
      const plan = plans[id];
      const numbers = numbersById[id];
      if (!plan) return "";
      const grouped = String(numbers.priceHuf).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
      const price =
        numbers.priceHuf <= 0
          ? `0 ${plans.freeForever || plans.freePrice}`
          : `${grouped} ${plans.priceUnit || ""}`;
      const bullets = [
        fillCount(plans.places, numbers.places),
        numbers.events <= 0 ? plans.eventsNone : fillCount(plans.events, numbers.events),
        numbers.languages <= 1 ? plans.languagesOne : fillCount(plans.languages, numbers.languages),
      ]
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join("");
      return `<article><h3>${escapeHtml(plan.name)}</h3><p>${escapeHtml(price)}</p><p>${escapeHtml(plan.pitch)}</p><ul>${bullets}</ul><p><a href="/${lang}/admin/register?plan=${id}">${escapeHtml(plan.cta)}</a></p></article>`;
    })
    .join("");
}

const STORY_IMAGES = {
  maker: "/marketing/craft-workshop.jpg",
  service: "/marketing/local-service.jpg",
  quiet: "/marketing/side-street.jpg",
  town: "/marketing/map-szeged.jpg",
};

function renderDifference(copy) {
  if (!copy.difference) return "";
  return ["hidden", "traffic", "region"]
    .map((key) => {
      const item = copy.difference[key];
      if (!item) return "";
      return `<article><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`;
    })
    .join("");
}

function renderStories(copy) {
  if (!copy.stories) return "";
  return ["maker", "service", "quiet", "town"]
    .map((key) => {
      const story = copy.stories[key];
      if (!story) return "";
      return `<article><img src="${STORY_IMAGES[key]}" alt="${escapeHtml(story.alt)}" /><h3>${escapeHtml(story.title)}</h3><p>${escapeHtml(story.text)}</p></article>`;
    })
    .join("");
}

function mergeCopy(base, override) {
  if (!override || typeof override !== "object") return base;
  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (typeof value === "string") {
      if (value.trim()) merged[key] = value;
    } else if (value && typeof value === "object" && base?.[key] && typeof base[key] === "object") {
      merged[key] = mergeCopy(base[key], value);
    }
  }
  return merged;
}

function readOverview(lang) {
  const candidates = [
    join(here, "locales", lang, "public.json"),
    join(here, "../src/i18n/locales", lang, "public.json"),
  ];
  for (const file of candidates) {
    try {
      return JSON.parse(readFileSync(file, "utf8")).overview;
    } catch {
      // try the next location
    }
  }
  return null;
}

function overviewFromMessages(messages) {
  const root = {};
  const prefix = "public.overview.";
  for (const [key, value] of Object.entries(messages || {})) {
    if (!key.startsWith(prefix) || typeof value !== "string") continue;
    const parts = key.slice(prefix.length).split(".").filter(Boolean);
    let node = root;
    for (let index = 0; index < parts.length - 1; index += 1) {
      if (!node[parts[index]] || typeof node[parts[index]] !== "object") node[parts[index]] = {};
      node = node[parts[index]];
    }
    node[parts[parts.length - 1]] = value;
  }
  return root;
}

function loadOverview(lang, override, messages) {
  const base = readOverview(lang) || readOverview("en") || readOverview(FALLBACK_LANG);
  if (!base) throw new Error(`Missing overview copy for ${lang}`);
  return mergeCopy(mergeCopy(base, overviewFromMessages(messages)), override);
}

export function overviewLang(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 1 && parts[0] === "overview") return FALLBACK_LANG;
  if (
    parts.length === 2 &&
    /^[a-z]{2,3}$/.test(parts[0]) &&
    !RESERVED.has(parts[0]) &&
    parts[1] === "overview"
  ) {
    return parts[0];
  }
  return null;
}

export function renderOverviewDocument(
  indexHtml,
  { lang, origin, override, messages, languages, planOverrides }
) {
  origin = publicOrigin(origin);
  const copy = loadOverview(lang, override, messages);
  const published = Array.isArray(languages) && languages.length ? languages : LANGS;
  const url = `${origin}/${lang}/overview`;
  const image = `${origin}/marketing/map-szeged.jpg`;
  const keywords = escapeHtml(copy.keywords);
  const alternates = published.map(
    (code) => `<link rel="alternate" hreflang="${code}" href="${origin}/${code}/overview" />`
  ).join("");

  const questions = ["app", "languages", "editors", "towns"].map((key) => ({
    "@type": "Question",
    name: copy.faq[key].q,
    acceptedAnswer: { "@type": "Answer", text: copy.faq[key].a },
  }));
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "HelloLocal",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url,
        description: copy.seoDescription,
        inLanguage: published,
        image,
      },
      { "@type": "FAQPage", mainEntity: questions },
    ],
  });

  const featureItems = Object.values(copy.features)
    .map((item) => `<li><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></li>`)
    .join("");
  const stepItems = Object.values(copy.steps)
    .map((item) => `<li><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></li>`)
    .join("");
  const faqItems = Object.values(copy.faq)
    .map((item) => `<article><h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p></article>`)
    .join("");
  const planItems = renderPlanCards(copy, lang, planOverrides);

  const body = `
    <main>
      <p>${escapeHtml(copy.eyebrow)}</p>
      <h1>${escapeHtml(copy.title)}</h1>
      <p>${escapeHtml(copy.lead)}</p>
      <p><a href="/${lang}">${escapeHtml(copy.cta)}</a></p>
      <figure>
        <img src="/marketing/map-szeged.jpg" alt="${escapeHtml(copy.shotCaption)}" />
        <figcaption>${escapeHtml(copy.shotCaption)}</figcaption>
      </figure>
      <section>
        <h2>${escapeHtml(copy.differenceTitle || "")}</h2>
        <p>${escapeHtml(copy.differenceLead || "")}</p>
        ${renderDifference(copy)}
      </section>
      <section>
        <h2>${escapeHtml(copy.storiesTitle || "")}</h2>
        <p>${escapeHtml(copy.storiesLead || "")}</p>
        ${renderStories(copy)}
      </section>
      <section>
        <h2>${escapeHtml(copy.stepsTitle)}</h2>
        <ol>${stepItems}</ol>
      </section>
      <section>
        <h2>${escapeHtml(copy.featuresTitle)}</h2>
        <p>${escapeHtml(copy.featuresLead)}</p>
        <ul>${featureItems}</ul>
      </section>
      <section>
        <h2>${escapeHtml(copy.plansTitle || "")}</h2>
        <p>${escapeHtml(copy.plansLead || "")}</p>
        ${planItems}
      </section>
      <section>
        <h2>${escapeHtml(copy.faqTitle)}</h2>
        ${faqItems}
      </section>
    </main>`;

  const head = `
    <meta name="keywords" content="${keywords}" />
    <meta name="robots" content="index,follow" />
    ${alternates}
    <link rel="alternate" hreflang="x-default" href="${origin}/${FALLBACK_LANG}/overview" />
    <script type="application/ld+json">${jsonLd}</script>`;

  return applySocialMeta(indexHtml, {
    lang,
    title: copy.seoTitle,
    description: copy.seoDescription,
    url,
    image,
    imageWidth: SHARE_IMAGE_WIDTH,
    imageHeight: SHARE_IMAGE_HEIGHT,
    type: "website",
    siteName: "HelloLocal",
  })
    .replace("</head>", `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

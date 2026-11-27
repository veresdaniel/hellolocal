/**
 * Platform marketing landing SSR (hellolocal.hu /:lang overview).
 * Not used on custom domains — those go through resolvePublicShare instead.
 *
 * Crawl: `indexable` comes from AppSetting platform.landingCrawlable (independent of global);
 * default is noindex until an admin turns landing crawl on.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { applySocialMeta, publicOrigin, SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from "./socialMeta.js";
import { injectOverviewShellHead } from "./overviewShellCss.js";
import { heroPictureHtml, storyPictureHtml } from "./landingCmsImages.js";
import {
  richToPlain,
  sanitizeInlineHtml,
  sanitizeRichHtml,
} from "./sanitizeRichHtml.js";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");

/** Prod image copies catalog next to this file; local/dev keeps it under src/i18n. */
function loadLanguageCatalog() {
  const candidates = [
    join(here, "languages.json"),
    join(here, "../src/i18n/languages.json"),
  ];
  for (const file of candidates) {
    try {
      return JSON.parse(readFileSync(file, "utf8"));
    } catch {
      // try the next location
    }
  }
  // Never crash the HTML server if the catalog is missing from the image.
  return {
    fallback: "hu",
    languages: [{ code: "hu" }, { code: "en" }, { code: "de" }],
  };
}

const catalog = loadLanguageCatalog();
const LANGS = catalog.languages.map((language) => language.code);
const FALLBACK_LANG = catalog.fallback || "hu";
const RESERVED = new Set(["api", "assets", "static", "src", "www", "app", "css", "img"]);
const OVERVIEW_BY_LANG = { hu: "attekintes", en: "overview", de: "ueberblick" };
const OVERVIEW_SEGMENTS = new Set(Object.values(OVERVIEW_BY_LANG));

/**
 * Escape user/admin-provided copy before interpolating into SSR HTML.
 * Prevents XSS from landing copy / plan / FAQ strings (JSON-LD uses a separate `\\u003c` escape).
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PLAN_DEFAULTS = {
  free: { prices: { HUF: 0, EUR: 0 }, places: 1, events: 5, languages: 1 },
  basic: { prices: { HUF: 3990, EUR: 12.9 }, places: 5, events: 15, languages: 1 },
  premium: { prices: { HUF: 8990, EUR: 29 }, places: 30, events: 30, languages: 1 },
};
const PLAN_ENABLED_DEFAULTS = { free: true, basic: true, premium: false, municipal: true };
const DEFAULT_CURRENCY_BY_LANG = { hu: "HUF", en: "EUR", de: "EUR" };
const MATRIX_PLAN = { free: "FREE", basic: "BASIC", premium: "PRO" };

function finiteNumber(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.round(n));
}

function finiteMoney(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100) / 100;
}

function normalizePrices(custom, defaults) {
  const out = { ...defaults };
  const raw =
    custom?.prices && typeof custom.prices === "object" && !Array.isArray(custom.prices)
      ? custom.prices
      : null;
  if (raw) {
    for (const [code, value] of Object.entries(raw)) {
      const amount = finiteMoney(value);
      if (amount !== undefined) out[String(code).toUpperCase()] = amount;
    }
  }
  const legacy = finiteMoney(custom?.priceHuf);
  if (legacy !== undefined && (raw == null || out.HUF === undefined)) out.HUF = legacy;
  return out;
}

function planPriceForCurrency(numbers, currencyCode) {
  const code = String(currencyCode || "HUF").toUpperCase();
  if (numbers.prices[code] !== undefined) return numbers.prices[code];
  if (numbers.prices.HUF !== undefined) return numbers.prices.HUF;
  return 0;
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
      prices: normalizePrices(custom, defaults.prices),
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

function hasCountPlaceholder(template) {
  return /\{\{\s*count\s*\}\}/.test(String(template ?? ""));
}

/** Prefer bundled copy when DB UI strings dropped the `{{count}}` placeholder. */
function fillCountWithFallback(primary, fallback, count) {
  const a = String(primary ?? "");
  const b = String(fallback ?? "");
  const template = hasCountPlaceholder(a) ? a : hasCountPlaceholder(b) ? b : a || b;
  return fillCount(template, count);
}

function planEnabled(planOverrides, id) {
  const root = planOverrides && typeof planOverrides === "object" ? planOverrides : {};
  const flag = root.publicPlans?.[id]?.enabled;
  return typeof flag === "boolean" ? flag : PLAN_ENABLED_DEFAULTS[id];
}

function renderPlanCards(
  copy,
  lang,
  planOverrides,
  freeTrialDays = 30,
  currencyByLang = DEFAULT_CURRENCY_BY_LANG,
  currencies = []
) {
  const plans = copy.plans;
  if (!plans) return "";
  const bundledPlans = (readOverview(lang) || readOverview("en") || {}).plans || {};
  const numbersById = resolvePlanNumbers(planOverrides);
  const trialDays = Number.isFinite(Number(freeTrialDays)) && Number(freeTrialDays) > 0
    ? Math.floor(Number(freeTrialDays))
    : 30;
  const currencyCode =
    (currencyByLang && currencyByLang[lang]) || DEFAULT_CURRENCY_BY_LANG[lang] || "HUF";
  const currencyRow = (currencies || []).find((row) => row.code === currencyCode);
  const currencyLabel = currencyRow?.symbol || currencyCode;
  const locale = lang === "en" ? "en-GB" : lang === "de" ? "de-DE" : "hu-HU";
  const cards = ["free", "basic", "premium"]
    .filter((id) => planEnabled(planOverrides, id))
    .map((id) => {
      const plan = plans[id];
      const numbers = numbersById[id];
      if (!plan) return "";
      const amount = planPriceForCurrency(numbers, currencyCode);
      let price;
      if (amount <= 0) {
        const noteTemplate =
          plans.freeForever ||
          bundledPlans.freeForever ||
          "{{currency}} / {{count}}";
        const freeNote = fillCount(noteTemplate, trialDays).replace(
          /\{\{\s*currency\s*\}\}/g,
          currencyLabel
        );
        price = `0 ${freeNote}`;
      } else {
        let formatted;
        try {
          formatted = new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currencyCode,
            maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
          }).format(amount);
        } catch {
          formatted = `${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0")}\u00a0${currencyCode}`;
        }
        const unit = plans.priceUnit || bundledPlans.priceUnit || "";
        price = `${formatted} ${unit}`.trim();
      }
      const pitch =
        id === "free"
          ? fillCountWithFallback(plan.pitch || "", bundledPlans.free?.pitch || "", trialDays)
          : plan.pitch || "";
      const bullets = [
        fillCount(plans.places, numbers.places),
        numbers.events <= 0 ? plans.eventsNone : fillCount(plans.events, numbers.events),
        numbers.languages <= 1 ? plans.languagesOne : fillCount(plans.languages, numbers.languages),
      ]
        .map((line) => `<li>${sanitizeInlineHtml(line)}</li>`)
        .join("");
      return `<article><h3>${sanitizeInlineHtml(plan.name)}</h3><p>${escapeHtml(price)}</p><div>${sanitizeRichHtml(pitch)}</div><ul>${bullets}</ul><p><a href="/${lang}/admin/register?plan=${id}">${sanitizeInlineHtml(plan.cta)}</a></p></article>`;
    });
  if (planEnabled(planOverrides, "municipal") && plans.municipal) {
    const municipal = plans.municipal;
    cards.push(
      `<article><h3>${sanitizeInlineHtml(municipal.name)}</h3><div>${sanitizeRichHtml(municipal.pitch)}</div><ul><li>${sanitizeInlineHtml(municipal.places)}</li><li>${sanitizeInlineHtml(municipal.events)}</li><li>${sanitizeInlineHtml(municipal.languages)}</li></ul><p>${sanitizeInlineHtml(municipal.cta)}</p></article>`
    );
  }
  return cards.join("");
}


function renderDifference(copy) {
  if (!copy.difference) return "";
  return ["hidden", "traffic", "region"]
    .map((key) => {
      const item = copy.difference[key];
      if (!item) return "";
      return `<article><h3>${sanitizeInlineHtml(item.title)}</h3><div>${sanitizeRichHtml(item.text)}</div></article>`;
    })
    .join("");
}

function renderStories(copy, landingImages, lang) {
  if (!copy.stories) return "";
  return ["mobile", "maker", "service", "quiet", "civic", "town"]
    .map((key) => {
      const story = copy.stories[key];
      if (!story) return "";
      const picture = storyPictureHtml(landingImages, lang, key, escapeHtml(richToPlain(story.alt)));
      const caption = escapeHtml(richToPlain(story.alt));
      return `<article><figure>${picture}${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure><h3>${sanitizeInlineHtml(story.title)}</h3><div>${sanitizeRichHtml(story.text)}</div></article>`;
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

/**
 * Detect platform overview routes:
 * `/`, `/:lang`, legacy `/:lang/overview|attekintes|ueberblick`.
 * Apex `/` uses the fallback language (same landing as `/:lang`).
 * Returns the page language, or null when this path is not the marketing landing.
 */
export function overviewLang(pathname) {
  const parts = String(pathname || "/")
    .split("?")[0]
    .split("/")
    .filter(Boolean);
  // Bare host root (https://hellolocal.hu/) — same landing as the overview page.
  if (parts.length === 0) return FALLBACK_LANG;
  if (parts.length === 1 && OVERVIEW_SEGMENTS.has(parts[0])) return FALLBACK_LANG;
  // Language root is the public opener.
  if (parts.length === 1 && LANGS.includes(parts[0])) return parts[0];
  if (
    parts.length === 2 &&
    /^[a-z]{2,3}$/.test(parts[0]) &&
    !RESERVED.has(parts[0]) &&
    OVERVIEW_SEGMENTS.has(parts[1])
  ) {
    return parts[0];
  }
  return null;
}

/**
 * Public share / canonical URL for an overview request path.
 * Always `/:lang` — never bare `/` or a legacy overview segment.
 */
export function overviewShareUrl(origin, pathname, lang) {
  const base = String(origin || "").replace(/\/$/, "");
  const parts = String(pathname || "/")
    .split("?")[0]
    .split("/")
    .filter(Boolean);
  if (parts.length === 1 && LANGS.includes(parts[0])) return `${base}/${parts[0]}`;
  const code =
    parts.length >= 1 && LANGS.includes(parts[0])
      ? parts[0]
      : LANGS.includes(lang)
        ? lang
        : FALLBACK_LANG;
  return `${base}/${code}`;
}

/**
 * Render the platform overview into the SPA shell (body + head SEO/JSON-LD).
 * `shareImage` is admin/platform defaultShareImage; `indexable` gates robots (default off).
 */
const GUIDE_SEGMENT_FALLBACK = { hu: "utmutato", en: "guide", de: "ratgeber" };

function guideHref(lang, slug, pathSegments) {
  const code = LANGS.includes(lang) ? lang : FALLBACK_LANG;
  const fromDb = pathSegments?.byLang?.[code]?.guide;
  const segment = fromDb || GUIDE_SEGMENT_FALLBACK[code] || GUIDE_SEGMENT_FALLBACK.hu;
  return `/${code}/${segment}/${slug}`;
}

function renderGuideIndex(lang, copy, guides, pathSegments) {
  if (!Array.isArray(guides) || !guides.length) return "";
  const items = guides
    .filter((guide) => guide && guide.slug && guide.title)
    .map(
      (guide, index) =>
        `<li><a href="${escapeHtml(guideHref(lang, guide.slug, pathSegments))}"><span class="overview__guides-no" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><span class="overview__guides-title">${sanitizeInlineHtml(guide.title)}</span></a></li>`
    )
    .join("");
  if (!items) return "";
  const heading = sanitizeInlineHtml(copy.guidesTitle || copy.readMore || "");
  return `<section class="overview__section"><h2>${heading}</h2><ul class="overview__guides">${items}</ul></section>`;
}

export function renderOverviewDocument(
  indexHtml,
  {
    lang,
    origin,
    override,
    messages,
    languages,
    planOverrides,
    shareImage,
    landingImages,
    indexable,
    pathname,
    shareUrl,
    freeTrialDays,
    currencyByLang,
    currencies,
    guides,
    pathSegments,
    /** Host opener language for hreflang x-default (`/hu` on hellolocal.hu). */
    xDefaultLang,
  }
) {
  origin = publicOrigin(origin);
  const copy = loadOverview(lang, override, messages);
  const published = Array.isArray(languages) && languages.length ? languages : LANGS;
  const defaultLang =
    xDefaultLang && LANGS.includes(xDefaultLang) ? xDefaultLang : lang || FALLBACK_LANG;
  const url =
    (shareUrl && String(shareUrl).trim()) ||
    overviewShareUrl(origin, pathname || `/${lang}`, lang);
  const configuredShare = String(shareImage || "").trim();
  // Prefer same-origin marketing image; absolute configured URLs stay as-is
  // except www/apex twin of this host (aligned in absoluteShareImage via applySocialMeta).
  let image = configuredShare
    ? /^https?:\/\//i.test(configuredShare)
      ? configuredShare
      : configuredShare.startsWith("/")
        ? `${origin}${configuredShare}`
        : `${origin}/marketing/hellolocal-share.jpg`
    : `${origin}/marketing/hellolocal-share.jpg`;
  try {
    const base = new URL(origin);
    const abs = new URL(image, origin);
    const baseHost = base.hostname.replace(/^www\./, "");
    const absHost = abs.hostname.replace(/^www\./, "");
    if (baseHost && absHost === baseHost) {
      abs.protocol = base.protocol;
      abs.hostname = base.hostname;
      abs.port = base.port;
      image = abs.toString();
    }
  } catch {
    // keep image
  }
  const keywords = escapeHtml(richToPlain(copy.keywords));
  const alternates = published.map(
    (code) => `<link rel="alternate" hreflang="${code}" href="${origin}/${code}" />`
  ).join("");

  const questions = ["app", "languages", "editors", "towns", "maps"]
    .filter((key) => copy.faq?.[key]?.q)
    .map((key) => ({
      "@type": "Question",
      name: richToPlain(copy.faq[key].q),
      acceptedAnswer: { "@type": "Answer", text: richToPlain(copy.faq[key].a) },
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
        description: richToPlain(copy.seoDescription),
        inLanguage: published,
        image,
      },
      { "@type": "FAQPage", mainEntity: questions },
    ],
  }).replace(/</g, "\\u003c");

  const featureItems = Object.values(copy.features)
    .map((item) => `<li><h3>${sanitizeInlineHtml(item.title)}</h3><div>${sanitizeRichHtml(item.text)}</div></li>`)
    .join("");
  const stepItems = Object.values(copy.steps)
    .map((item) => `<li><h3>${sanitizeInlineHtml(item.title)}</h3><div>${sanitizeRichHtml(item.text)}</div></li>`)
    .join("");
  const faqItems = Object.values(copy.faq)
    .map((item) => `<article><h3>${sanitizeInlineHtml(item.q)}</h3><div>${sanitizeRichHtml(item.a)}</div></article>`)
    .join("");
  const planItems = renderPlanCards(
    copy,
    lang,
    planOverrides,
    freeTrialDays,
    currencyByLang,
    currencies
  );

  const introBlock =
    copy.introP1 || copy.introP2
      ? `<section>${copy.introP1 ? `<div>${sanitizeRichHtml(copy.introP1)}</div>` : ""}${
          copy.introP2 ? `<div>${sanitizeRichHtml(copy.introP2)}</div>` : ""
        }</section>`
      : "";

  const body = `
    <main class="overview overview--ssr">
      <div>${sanitizeRichHtml(copy.eyebrow)}</div>
      <h1>${sanitizeInlineHtml(copy.title)}</h1>
      <div>${sanitizeRichHtml(copy.lead)}</div>
      <p><a href="/${lang}">${sanitizeInlineHtml(copy.cta)}</a></p>
      <figure>
        ${heroPictureHtml(landingImages, lang, escapeHtml(richToPlain(copy.shotCaption)))}
        <figcaption>${sanitizeInlineHtml(copy.shotCaption)}</figcaption>
      </figure>
      ${introBlock}
      <section>
        <h2>${sanitizeInlineHtml(copy.differenceTitle || "")}</h2>
        <div>${sanitizeRichHtml(copy.differenceLead || "")}</div>
        ${renderDifference(copy)}
      </section>
      <section>
        <h2>${sanitizeInlineHtml(copy.storiesTitle || "")}</h2>
        <div>${sanitizeRichHtml(copy.storiesLead || "")}</div>
        ${renderStories(copy, landingImages, lang)}
      </section>
      <section>
        <h2>${sanitizeInlineHtml(copy.stepsTitle)}</h2>
        <ol>${stepItems}</ol>
      </section>
      <section>
        <h2>${sanitizeInlineHtml(copy.featuresTitle)}</h2>
        <div>${sanitizeRichHtml(copy.featuresLead)}</div>
        <ul>${featureItems}</ul>
      </section>
      <section>
        <h2>${sanitizeInlineHtml(copy.plansTitle || "")}</h2>
        <div>${sanitizeRichHtml(copy.plansLead || "")}</div>
        ${planItems}
      </section>
      ${renderGuideIndex(lang, copy, guides, pathSegments)}
      <section>
        <h2>${sanitizeInlineHtml(copy.faqTitle)}</h2>
        ${faqItems}
      </section>
    </main>`;

  // Default off until AppSetting platform.landingCrawlable is enabled.
  const robots = indexable === true ? "index,follow" : "noindex,nofollow";
  const head = `
    <meta name="keywords" content="${keywords}" />
    <meta name="robots" content="${robots}" />
    ${alternates}
    <link rel="alternate" hreflang="x-default" href="${origin}/${defaultLang}" />
    <script type="application/ld+json">${jsonLd}</script>`;

  let html = applySocialMeta(indexHtml, {
    lang,
    title: richToPlain(copy.seoTitle),
    description: richToPlain(copy.seoDescription),
    url,
    image,
    imageWidth:
      configuredShare && !configuredShare.includes("hellolocal-share") ? "" : SHARE_IMAGE_WIDTH,
    imageHeight:
      configuredShare && !configuredShare.includes("hellolocal-share") ? "" : SHARE_IMAGE_HEIGHT,
    type: "website",
    siteName: "HelloLocal",
    origin,
  });
  html = injectOverviewShellHead(html, webRoot);
  return html
    .replace("</head>", `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root" class="hl-public">${body}</div>`);
}

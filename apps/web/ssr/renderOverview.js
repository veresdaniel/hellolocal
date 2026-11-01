import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const LANGS = ["hu", "en", "de"];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadOverview(lang) {
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
  throw new Error(`Missing overview copy for ${lang}`);
}

export function overviewLang(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 1 && parts[0] === "overview") return "hu";
  if (parts.length === 2 && LANGS.includes(parts[0]) && parts[1] === "overview") return parts[0];
  return null;
}

export function renderOverviewDocument(indexHtml, { lang, origin }) {
  const copy = loadOverview(lang);
  const url = `${origin}/${lang}/overview`;
  const image = `${origin}/marketing/map-szeged.jpg`;
  const keywords = escapeHtml(copy.keywords);
  const title = escapeHtml(copy.seoTitle);
  const description = escapeHtml(copy.seoDescription);
  const alternates = LANGS.map(
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
        inLanguage: LANGS,
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
        <h2>${escapeHtml(copy.stepsTitle)}</h2>
        <ol>${stepItems}</ol>
      </section>
      <section>
        <h2>${escapeHtml(copy.featuresTitle)}</h2>
        <p>${escapeHtml(copy.featuresLead)}</p>
        <ul>${featureItems}</ul>
      </section>
      <section>
        <h2>${escapeHtml(copy.faqTitle)}</h2>
        ${faqItems}
      </section>
    </main>`;

  const head = `
    <meta name="description" content="${description}" />
    <meta name="keywords" content="${keywords}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${url}" />
    ${alternates}
    <link rel="alternate" hreflang="x-default" href="${origin}/hu/overview" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="HelloLocal" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <script type="application/ld+json">${jsonLd}</script>`;

  return indexHtml
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace(/<title>.*?<\/title>/i, `<title>${title}</title>`)
    .replace("</head>", `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

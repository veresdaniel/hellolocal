/**
 * Crawlable HTML body fragments for high-value public routes (SSR inject into `#root`).
 * Complements social meta: bots/crawlers get readable content without waiting for the SPA.
 * Admin paths stay an empty shell with robots noindex via {@link applyAdminRobots}.
 */
import {
  applyHostScope,
  clip,
  escapeHtml,
  fetchPublicJson,
  parsePublicPath,
  placePathSegment,
  plainText,
  resolveDomainHost,
} from "./socialMeta.js";

const CONTENT_KINDS = new Set(["site", "town", "place", "event", "sites"]);

const LABELS = {
  hu: {
    places: "Helyek",
    events: "Események",
    regions: "Régiók",
    home: "Kezdőlap",
    more: "Tovább",
    category: "Kategória",
    address: "Cím",
    when: "Időpont",
    atPlace: "Helyszín",
    town: "Település",
  },
  en: {
    places: "Places",
    events: "Events",
    regions: "Regions",
    home: "Home",
    more: "Read more",
    category: "Category",
    address: "Address",
    when: "When",
    atPlace: "Venue",
    town: "Town",
  },
  de: {
    places: "Orte",
    events: "Veranstaltungen",
    regions: "Regionen",
    home: "Startseite",
    more: "Weiter",
    category: "Kategorie",
    address: "Adresse",
    when: "Zeitpunkt",
    atPlace: "Ort",
    town: "Gemeinde",
  },
};

function labelsFor(lang) {
  return LABELS[lang] || LABELS.hu;
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.data)) return value.data;
  return [];
}

function paragraph(text, max = 600) {
  const clean = clip(text, max);
  return clean ? `<p>${escapeHtml(clean)}</p>` : "";
}

function linkItem(href, title, summary) {
  const name = escapeHtml(plainText(title) || href);
  const desc = clip(summary, 180);
  return `<li><a href="${escapeHtml(href)}"><strong>${name}</strong></a>${
    desc ? ` — ${escapeHtml(desc)}` : ""
  }</li>`;
}

function siteBase(lang, siteKey) {
  return siteKey ? `/${lang}/${siteKey}` : `/${lang}`;
}

function placeHref(lang, siteKey, slug) {
  return `${siteBase(lang, siteKey)}/${placePathSegment(lang)}/${encodeURIComponent(slug)}`;
}

function eventHref(lang, siteKey, slug) {
  return `${siteBase(lang, siteKey)}/event/${encodeURIComponent(slug)}`;
}

function formatWhen(start, end, lang) {
  if (!start) return "";
  try {
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) return plainText(start);
    const locale = lang === "de" ? "de-DE" : lang === "en" ? "en-GB" : "hu-HU";
    const startText = startDate.toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    if (!end) return startText;
    const endDate = new Date(end);
    if (Number.isNaN(endDate.getTime())) return startText;
    return `${startText} – ${endDate.toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    })}`;
  } catch {
    return plainText(start);
  }
}

async function loadPlatform(apiUrl, lang, siteKey, forward = null) {
  const key = encodeURIComponent(siteKey);
  let data = await fetchPublicJson(
    `${apiUrl}/api/public/${lang}/${key}/platform`,
    1200,
    forward
  );
  if (!data?.site && lang !== "hu") {
    data = await fetchPublicJson(
      `${apiUrl}/api/public/hu/${key}/platform`,
      1200,
      forward
    );
  }
  return data;
}

async function loadEntity(apiUrl, lang, siteKey, kind, slug, forward = null) {
  const collection = kind === "place" ? "places" : "events";
  const sitePart = encodeURIComponent(siteKey || "default");
  let data = await fetchPublicJson(
    `${apiUrl}/api/public/${lang}/${sitePart}/${collection}/${encodeURIComponent(slug)}`,
    1200,
    forward
  );
  if (!data && lang !== "hu") {
    data = await fetchPublicJson(
      `${apiUrl}/api/public/hu/${sitePart}/${collection}/${encodeURIComponent(slug)}`,
      1200,
      forward
    );
  }
  return data;
}

function renderSitesBody(lang, sites, labels) {
  const items = asList(sites)
    .slice(0, 40)
    .map((site) => {
      const slug = site.slug || site.siteKey;
      if (!slug || !site.name) return "";
      return linkItem(
        `/${lang}/${encodeURIComponent(slug)}`,
        site.name,
        site.shortDescription || site.seoDescription || site.description
      );
    })
    .filter(Boolean)
    .join("");
  return `
    <main>
      <h1>${escapeHtml(labels.regions)}</h1>
      <p>${escapeHtml(lang === "hu" ? "Fedezd fel a régiókat" : lang === "de" ? "Regionen entdecken" : "Discover the regions")}</p>
      ${items ? `<nav aria-label="${escapeHtml(labels.regions)}"><ul>${items}</ul></nav>` : ""}
    </main>`;
}

function renderRegionBody(lang, siteKey, platform, places, events, labels, townSlug) {
  const site = platform?.site || {};
  const title = plainText(site.name) || siteKey;
  const lead =
    platform?.seo?.defaultDescription ||
    site.shortDescription ||
    site.description ||
    "";
  const placeItems = asList(places)
    .slice(0, 40)
    .map((place) => {
      if (!place?.slug || !place?.name) return "";
      return linkItem(
        placeHref(lang, siteKey, place.slug),
        place.name,
        place.shortDescription || place.description
      );
    })
    .filter(Boolean)
    .join("");
  const eventItems = asList(events)
    .slice(0, 20)
    .map((event) => {
      if (!event?.slug || !event?.name) return "";
      return linkItem(
        eventHref(lang, siteKey, event.slug),
        event.name,
        event.shortDescription || event.description
      );
    })
    .filter(Boolean)
    .join("");
  const heading = townSlug ? `${plainText(townSlug)} · ${title}` : title;
  // No "Régiók → /:lang" crumb: on custom domains /:lang is this home; on the
  // platform host that path is the marketing overview, not the region list.
  return `
    <main>
      <h1>${escapeHtml(heading)}</h1>
      ${paragraph(lead, 500)}
      ${
        placeItems
          ? `<section><h2>${escapeHtml(labels.places)}</h2><ul>${placeItems}</ul></section>`
          : ""
      }
      ${
        eventItems
          ? `<section><h2>${escapeHtml(labels.events)}</h2><ul>${eventItems}</ul></section>`
          : ""
      }
    </main>`;
}

function renderPlaceBody(lang, siteKey, place, labels) {
  const name = plainText(place.name) || place.slug;
  const site = siteKey || place.siteKey || "";
  const category = plainText(place.category);
  const address = plainText(place.contact?.address || place.address);
  const body = place.description || place.shortDescription || place.seo?.description || "";
  return `
    <main>
      <p><a href="${escapeHtml(siteBase(lang, site))}">${escapeHtml(labels.home)}</a></p>
      <h1>${escapeHtml(name)}</h1>
      ${category ? `<p>${escapeHtml(labels.category)}: ${escapeHtml(category)}</p>` : ""}
      ${address ? `<p>${escapeHtml(labels.address)}: ${escapeHtml(address)}</p>` : ""}
      ${paragraph(place.shortDescription || place.seo?.description, 300)}
      ${paragraph(body, 900)}
      <p><a href="${escapeHtml(siteBase(lang, site))}">${escapeHtml(labels.more)}</a></p>
    </main>`;
}

function renderEventBody(lang, siteKey, event, labels) {
  const name = plainText(event.name) || event.slug;
  const site = siteKey || event.siteKey || "";
  const when = formatWhen(event.startDate, event.endDate, lang);
  const venueName = plainText(event.placeName);
  const venueSlug = event.placeSlug;
  const venueLink =
    venueName && venueSlug
      ? `<p>${escapeHtml(labels.atPlace)}: <a href="${escapeHtml(
          placeHref(lang, site, venueSlug)
        )}">${escapeHtml(venueName)}</a></p>`
      : venueName
        ? `<p>${escapeHtml(labels.atPlace)}: ${escapeHtml(venueName)}</p>`
        : "";
  const body = event.description || event.shortDescription || event.seo?.description || "";
  return `
    <main>
      <p><a href="${escapeHtml(siteBase(lang, site))}">${escapeHtml(labels.home)}</a></p>
      <h1>${escapeHtml(name)}</h1>
      ${when ? `<p>${escapeHtml(labels.when)}: ${escapeHtml(when)}</p>` : ""}
      ${venueLink}
      ${paragraph(event.shortDescription || event.seo?.description, 300)}
      ${paragraph(body, 900)}
      <p><a href="${escapeHtml(siteBase(lang, site))}">${escapeHtml(labels.more)}</a></p>
    </main>`;
}

/** True when the public path is an admin console route (`/:lang/.../admin` or `/admin`). */
export function isAdminPath(pathname) {
  return parsePublicPath(pathname).kind === "admin";
}

/** Force `noindex, nofollow` on the SPA shell for admin HTML responses. */
export function applyAdminRobots(html) {
  const tag = '<meta name="robots" content="noindex, nofollow" />';
  if (/<meta\s+name\s*=\s*"robots"/i.test(html)) {
    return html.replace(
      /<meta\s+name\s*=\s*"robots"\s+content\s*=\s*"[^"]*"\s*\/?>/i,
      tag
    );
  }
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

/**
 * Inject a pre-rendered body into `#root` (empty shell stays untouched when `body` is falsy).
 * @param {string} html SPA index.html shell
 * @param {string | null | undefined} body Inner HTML for `#root`
 */
export function injectRootContent(html, body) {
  if (!body) return html;
  const wrapped = body.includes("hl-ssr")
    ? body
    : `<article class="hl-ssr hl-public">${body}</article>`;
  if (html.includes('<div id="root"></div>')) {
    return html.replace(
      '<div id="root"></div>',
      `<div id="root" class="hl-public">${wrapped}</div>`
    );
  }
  return html.replace(
    /<div id="root"[^>]*>[\s\S]*?<\/div>/i,
    `<div id="root" class="hl-public">${wrapped}</div>`
  );
}

/**
 * Build crawlable HTML for high-value public routes (region, town, place, event, region list).
 * Returns null when the path should stay an empty SPA shell.
 * Pass `requestHost` / `requestProto` on custom domains so `/hu` is the tenant home
 * (not the platform region list) — same host-scope as resolvePublicShare.
 */
export async function buildPublicContentHtml({
  pathname,
  apiUrl,
  requestHost = null,
  requestProto = "https",
}) {
  let route = parsePublicPath(pathname);
  const base = String(apiUrl || "").replace(/\/$/, "");
  if (!base) return null;

  const host = String(requestHost || "")
    .toLowerCase()
    .split(":")[0]
    .replace(/\.$/, "");
  const forward =
    host && host !== "localhost" && host !== "127.0.0.1"
      ? { host, proto: requestProto || "https" }
      : null;
  if (forward?.host) {
    const resolved = await resolveDomainHost(base, forward.host, forward);
    if (resolved) route = applyHostScope(route, resolved);
  }

  if (!CONTENT_KINDS.has(route.kind)) return null;
  const labels = labelsFor(route.lang);

  try {
    if (route.kind === "sites") {
      const sites =
        (await fetchPublicJson(
          `${base}/api/public/${route.lang}/default/sites?limit=40`,
          1200,
          forward
        )) ||
        (route.lang !== "hu"
          ? await fetchPublicJson(
              `${base}/api/public/hu/default/sites?limit=40`,
              1200,
              forward
            )
          : null);
      if (!asList(sites).length) return null;
      return renderSitesBody(route.lang, sites, labels);
    }

    if (route.kind === "site" || route.kind === "town") {
      if (!route.siteKey) return null;
      const key = encodeURIComponent(route.siteKey);
      const townQuery =
        route.kind === "town" && route.slug
          ? `&town=${encodeURIComponent(route.slug)}`
          : "";
      const [platform, places, events] = await Promise.all([
        loadPlatform(base, route.lang, route.siteKey, forward),
        fetchPublicJson(
          `${base}/api/public/${route.lang}/${key}/places?limit=40${townQuery}`,
          1200,
          forward
        ),
        fetchPublicJson(
          `${base}/api/public/${route.lang}/${key}/events?limit=20`,
          1200,
          forward
        ),
      ]);
      if (!platform?.site && !asList(places).length && !asList(events).length) return null;
      return renderRegionBody(
        route.lang,
        route.siteKey,
        platform,
        places,
        route.kind === "town" ? [] : events,
        labels,
        route.kind === "town" ? route.slug : ""
      );
    }

    if (route.kind === "place" || route.kind === "event") {
      if (!route.slug) return null;
      const entity = await loadEntity(
        base,
        route.lang,
        route.siteKey,
        route.kind,
        route.slug,
        forward
      );
      if (!entity?.name && !entity?.slug) return null;
      const siteKey = route.siteKey || entity.siteKey || "";
      return route.kind === "place"
        ? renderPlaceBody(route.lang, siteKey, entity, labels)
        : renderEventBody(route.lang, siteKey, entity, labels);
    }
  } catch (error) {
    console.error(`[SSR] Public content failed for ${pathname}: ${error.message}`);
  }
  return null;
}

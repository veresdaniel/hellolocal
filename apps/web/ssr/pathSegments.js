/**
 * SSR cache for /api/public/ui/path-segments (mirrors web pathSegmentsStore).
 */
const FALLBACK = {
  hu: {
    place: "hely",
    town: "telepules",
    map: "terkep",
    list: "lista",
    regionList: "regiok",
    overview: "attekintes",
    pricing: "pricing",
    guide: "utmutato",
    "legal.imprint": "impresszum",
    "legal.terms": "aszf",
    "legal.privacy": "adatvedelem",
  },
  en: {
    place: "place",
    town: "town",
    map: "map",
    list: "list",
    regionList: "regions",
    overview: "overview",
    pricing: "tarife",
    guide: "guide",
    "legal.imprint": "imprint",
    "legal.terms": "terms",
    "legal.privacy": "privacy",
  },
  de: {
    place: "ort",
    town: "gemeinde",
    map: "karte",
    list: "liste",
    regionList: "regionen",
    overview: "ueberblick",
    pricing: "preise",
    guide: "ratgeber",
    "legal.imprint": "impressum",
    "legal.terms": "agb",
    "legal.privacy": "datenschutz",
  },
};

let cache = { until: 0, payload: null };

function buildAliases(byLang) {
  const aliases = {};
  for (const [lang, map] of Object.entries(byLang || {})) {
    for (const [key, segment] of Object.entries(map || {})) {
      const prev = aliases[segment];
      if (!prev) aliases[segment] = { key, langs: [lang] };
      else if (prev.key === key && !prev.langs.includes(lang)) prev.langs.push(lang);
    }
  }
  return aliases;
}

function fallbackPayload() {
  return {
    languages: Object.keys(FALLBACK),
    byLang: FALLBACK,
    aliases: buildAliases(FALLBACK),
  };
}

/** @param {string} apiUrl */
export async function loadPathSegments(apiUrl) {
  if (cache.payload && cache.until > Date.now()) return cache.payload;
  const base = String(apiUrl || "").replace(/\/$/, "");
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 800);
    const response = await fetch(`${base}/api/public/ui/path-segments`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    clearTimeout(timer);
    if (response.ok) {
      const payload = await response.json();
      if (payload?.byLang) {
        cache = { until: Date.now() + 60_000, payload };
        return payload;
      }
    }
  } catch {
    // keep fallback
  }
  const payload = fallbackPayload();
  cache = { until: Date.now() + 15_000, payload };
  return payload;
}

export function guideSegmentSync(lang, payload) {
  const code = String(lang || "hu")
    .split("-")[0]
    .toLowerCase();
  const map = payload?.byLang?.[code] || FALLBACK[code] || FALLBACK.en;
  return map.guide || FALLBACK.en.guide;
}

export function isGuideSegmentSync(segment, payload) {
  const aliases = payload?.aliases || buildAliases(FALLBACK);
  return aliases[segment]?.key === "guide";
}

export function guidePathSync(lang, slug, payload) {
  const code = String(lang || "hu")
    .split("-")[0]
    .toLowerCase();
  return `/${code}/${guideSegmentSync(code, payload)}/${slug}`;
}

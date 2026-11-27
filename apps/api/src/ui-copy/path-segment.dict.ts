/**
 * Built-in path-segment dictionary for common languages.
 * Missing language → English map (see {@link pathSegmentsForLang}).
 */

export const PATH_SEGMENT_KEYS = [
  "place",
  "town",
  "map",
  "list",
  "regionList",
  "overview",
  "pricing",
  "guide",
  "legal.imprint",
  "legal.terms",
  "legal.privacy",
] as const;

export type PathSegmentKey = (typeof PATH_SEGMENT_KEYS)[number];

export type PathSegmentMap = Record<PathSegmentKey, string>;

/** English fallback — matches live public routes (en pricing slug is `tarife`). */
const EN: PathSegmentMap = {
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
};

/** Current production values for the three shipped UI languages. */
export const PATH_SEGMENT_DICT: Record<string, PathSegmentMap> = {
  en: EN,
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
  fr: {
    place: "lieu",
    town: "commune",
    map: "carte",
    list: "liste",
    regionList: "regions",
    overview: "apercu",
    pricing: "tarifs",
    guide: "guide",
    "legal.imprint": "mentions-legales",
    "legal.terms": "cgu",
    "legal.privacy": "confidentialite",
  },
  sk: {
    place: "miesto",
    town: "obec",
    map: "mapa",
    list: "zoznam",
    regionList: "regiony",
    overview: "prehlad",
    pricing: "cennik",
    guide: "sprievodca",
    "legal.imprint": "impresum",
    "legal.terms": "obchodne-podmienky",
    "legal.privacy": "ochrana-udajov",
  },
  ro: {
    place: "locatie",
    town: "localitate",
    map: "harta",
    list: "lista",
    regionList: "regiuni",
    overview: "prezentare",
    pricing: "preturi",
    guide: "ghid",
    "legal.imprint": "impresum",
    "legal.terms": "termeni",
    "legal.privacy": "confidentialitate",
  },
  it: {
    place: "luogo",
    town: "comune",
    map: "mappa",
    list: "lista",
    regionList: "regioni",
    overview: "panoramica",
    pricing: "prezzi",
    guide: "guida",
    "legal.imprint": "impressum",
    "legal.terms": "termini",
    "legal.privacy": "privacy",
  },
  es: {
    place: "lugar",
    town: "pueblo",
    map: "mapa",
    list: "lista",
    regionList: "regiones",
    overview: "resumen",
    pricing: "precios",
    guide: "guia",
    "legal.imprint": "aviso-legal",
    "legal.terms": "terminos",
    "legal.privacy": "privacidad",
  },
  pl: {
    place: "miejsce",
    town: "miasto",
    map: "mapa",
    list: "lista",
    regionList: "regiony",
    overview: "przeglad",
    pricing: "cennik",
    guide: "przewodnik",
    "legal.imprint": "impressum",
    "legal.terms": "regulamin",
    "legal.privacy": "prywatnosc",
  },
  hr: {
    place: "mjesto",
    town: "opcina",
    map: "karta",
    list: "popis",
    regionList: "regije",
    overview: "pregled",
    pricing: "cijene",
    guide: "vodic",
    "legal.imprint": "impresum",
    "legal.terms": "uvjeti",
    "legal.privacy": "privatnost",
  },
  cs: {
    place: "misto",
    town: "obec",
    map: "mapa",
    list: "seznam",
    regionList: "regiony",
    overview: "prehled",
    pricing: "cenik",
    guide: "pruvodce",
    "legal.imprint": "impresum",
    "legal.terms": "podminky",
    "legal.privacy": "soukromi",
  },
  nl: {
    place: "plaats",
    town: "gemeente",
    map: "kaart",
    list: "lijst",
    regionList: "regios",
    overview: "overzicht",
    pricing: "prijzen",
    guide: "gids",
    "legal.imprint": "colofon",
    "legal.terms": "voorwaarden",
    "legal.privacy": "privacy",
  },
};

/** English map used when `lang` is absent from {@link PATH_SEGMENT_DICT}. */
export function pathSegmentsForLang(lang: string): PathSegmentMap {
  const code = String(lang || "")
    .trim()
    .toLowerCase()
    .split("-")[0];
  return PATH_SEGMENT_DICT[code] ?? { ...EN };
}

export function isPathSegmentKey(value: string): value is PathSegmentKey {
  return (PATH_SEGMENT_KEYS as readonly string[]).includes(value);
}

/** URL slug: lowercase letters, digits, optional single hyphens. */
export const PATH_SEGMENT_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizePathSegmentSlug(raw: string): string | null {
  const slug = String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  if (!slug || !PATH_SEGMENT_SLUG_RE.test(slug)) return null;
  return slug;
}

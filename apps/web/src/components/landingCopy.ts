import huPublic from "../i18n/locales/hu/public.json";
import enPublic from "../i18n/locales/en/public.json";
import dePublic from "../i18n/locales/de/public.json";
import { LANG_VALUES, isUiLang, type Lang, type UiLang } from "../types/enums";

export type LandingField = {
  path: string;
  label: Record<UiLang, string>;
  long?: boolean;
};

export type LandingGroup = {
  id: string;
  title: Record<UiLang, string>;
  fields: LandingField[];
};

function field(path: string, label: [string, string, string], long = false): LandingField {
  return { path, label: { hu: label[0], en: label[1], de: label[2] }, long };
}

export const LANDING_GROUPS: LandingGroup[] = [
  {
    id: "hero",
    title: { hu: "Nyitóblokk", en: "Hero", de: "Einstieg" },
    fields: [
      field("eyebrow", ["Felirat", "Eyebrow", "Dachzeile"]),
      field("title", ["Cím", "Title", "Titel"], true),
      field("lead", ["Bevezető", "Lead", "Einleitung"], true),
      field("cta", ["Elsődleges gomb", "Primary button", "Primäre Schaltfläche"]),
      field("ctaSecondary", ["Második gomb", "Second button", "Zweite Schaltfläche"]),
      field("shotLabel", ["Képaláírás", "Image label", "Bildunterschrift"]),
      field("shotCaption", ["Kép leírása", "Image description", "Bildbeschreibung"], true),
      field("statsLanguagesValue", ["Nyelvek kiemelése", "Languages highlight", "Sprachen-Kennzahl"]),
      field("statsLanguages", ["Nyelvek sora", "Languages line", "Sprachenzeile"]),
      field("statsMap", ["Térkép sora", "Map line", "Kartenzeile"]),
      field("statsApp", ["Alkalmazás sora", "App line", "App-Zeile"]),
      field("seoTitle", ["SEO cím", "SEO title", "SEO-Titel"]),
      field("seoDescription", ["SEO leírás", "SEO description", "SEO-Beschreibung"], true),
      field("keywords", ["Kulcsszavak", "Keywords", "Schlüsselwörter"], true),
    ],
  },
  {
    id: "difference",
    title: { hu: "Miért más", en: "Why it is different", de: "Was anders ist" },
    fields: [
      field("differenceKicker", ["Kis felirat", "Kicker", "Kleine Zeile"]),
      field("differenceTitle", ["Cím", "Title", "Titel"]),
      field("differenceLead", ["Bevezető", "Lead", "Einleitung"], true),
      field("difference.hidden.title", ["Rejtett érték címe", "Hidden value title", "Titel verborgener Wert"]),
      field("difference.hidden.text", ["Rejtett érték szövege", "Hidden value text", "Text verborgener Wert"], true),
      field("difference.traffic.title", ["Forgalom címe", "Traffic title", "Titel Reichweite"]),
      field("difference.traffic.text", ["Forgalom szövege", "Traffic text", "Text Reichweite"], true),
      field("difference.region.title", ["Régió címe", "Region title", "Titel Region"]),
      field("difference.region.text", ["Régió szövege", "Region text", "Text Region"], true),
    ],
  },
  {
    id: "stories",
    title: { hu: "Kinek szól", en: "Who it is for", de: "Für wen" },
    fields: [
      field("storiesTitle", ["Cím", "Title", "Titel"]),
      field("storiesLead", ["Bevezető", "Lead", "Einleitung"], true),
      field("stories.maker.kicker", ["Kézműves felirat", "Maker kicker", "Handwerk Dachzeile"]),
      field("stories.maker.title", ["Kézműves cím", "Maker title", "Handwerk Titel"]),
      field("stories.maker.text", ["Kézműves szöveg", "Maker text", "Handwerk Text"], true),
      field("stories.maker.alt", ["Kézműves kép leírása", "Maker image description", "Handwerk Bildbeschreibung"]),
      field("stories.service.kicker", ["Szolgáltatás felirat", "Service kicker", "Dienstleistung Dachzeile"]),
      field("stories.service.title", ["Szolgáltatás cím", "Service title", "Dienstleistung Titel"]),
      field("stories.service.text", ["Szolgáltatás szöveg", "Service text", "Dienstleistung Text"], true),
      field("stories.service.alt", ["Szolgáltatás kép leírása", "Service image description", "Dienstleistung Bildbeschreibung"]),
      field("stories.quiet.kicker", ["Mellékutca felirat", "Side street kicker", "Seitenstraße Dachzeile"]),
      field("stories.quiet.title", ["Mellékutca cím", "Side street title", "Seitenstraße Titel"]),
      field("stories.quiet.text", ["Mellékutca szöveg", "Side street text", "Seitenstraße Text"], true),
      field("stories.quiet.alt", ["Mellékutca kép leírása", "Side street image description", "Seitenstraße Bildbeschreibung"]),
      field("stories.town.kicker", ["Település felirat", "Town kicker", "Gemeinde Dachzeile"]),
      field("stories.town.title", ["Település cím", "Town title", "Gemeinde Titel"]),
      field("stories.town.text", ["Település szöveg", "Town text", "Gemeinde Text"], true),
      field("stories.town.alt", ["Település kép leírása", "Town image description", "Gemeinde Bildbeschreibung"]),
    ],
  },
  {
    id: "steps",
    title: { hu: "Hogyan működik", en: "How it works", de: "So funktioniert es" },
    fields: [
      field("stepsTitle", ["Cím", "Title", "Titel"]),
      field("steps.collect.title", ["Első lépés címe", "First step title", "Erster Schritt Titel"]),
      field("steps.collect.text", ["Első lépés szövege", "First step text", "Erster Schritt Text"], true),
      field("steps.publish.title", ["Második lépés címe", "Second step title", "Zweiter Schritt Titel"]),
      field("steps.publish.text", ["Második lépés szövege", "Second step text", "Zweiter Schritt Text"], true),
      field("steps.share.title", ["Harmadik lépés címe", "Third step title", "Dritter Schritt Titel"]),
      field("steps.share.text", ["Harmadik lépés szövege", "Third step text", "Dritter Schritt Text"], true),
    ],
  },
  {
    id: "features",
    title: { hu: "Ami a vendéget ott tartja", en: "What keeps the guest", de: "Was den Gast hält" },
    fields: [
      field("featuresTitle", ["Cím", "Title", "Titel"]),
      field("featuresLead", ["Bevezető", "Lead", "Einleitung"], true),
      field("features.places.title", ["Helyek címe", "Places title", "Orte Titel"]),
      field("features.places.text", ["Helyek szövege", "Places text", "Orte Text"], true),
      field("features.events.title", ["Programok címe", "Events title", "Programm Titel"]),
      field("features.events.text", ["Programok szövege", "Events text", "Programm Text"], true),
      field("features.map.title", ["Térkép címe", "Map title", "Karte Titel"]),
      field("features.map.text", ["Térkép szövege", "Map text", "Karte Text"], true),
      field("features.languages.title", ["Nyelvek címe", "Languages title", "Sprachen Titel"]),
      field("features.languages.text", ["Nyelvek szövege", "Languages text", "Sprachen Text"], true),
      field("features.sites.title", ["Települések címe", "Towns title", "Gemeinden Titel"]),
      field("features.sites.text", ["Települések szövege", "Towns text", "Gemeinden Text"], true),
      field("features.editors.title", ["Szerkesztők címe", "Editors title", "Redaktion Titel"]),
      field("features.editors.text", ["Szerkesztők szövege", "Editors text", "Redaktion Text"], true),
    ],
  },
  {
    id: "faq",
    title: { hu: "Gyakori kérdések", en: "Questions", de: "Fragen" },
    fields: [
      field("faqTitle", ["Cím", "Title", "Titel"]),
      field("faq.app.q", ["Alkalmazás kérdése", "App question", "App-Frage"]),
      field("faq.app.a", ["Alkalmazás válasza", "App answer", "App-Antwort"], true),
      field("faq.languages.q", ["Nyelvek kérdése", "Languages question", "Sprachen-Frage"]),
      field("faq.languages.a", ["Nyelvek válasza", "Languages answer", "Sprachen-Antwort"], true),
      field("faq.editors.q", ["Szerkesztők kérdése", "Editors question", "Redaktion-Frage"]),
      field("faq.editors.a", ["Szerkesztők válasza", "Editors answer", "Redaktion-Antwort"], true),
      field("faq.towns.q", ["Települések kérdése", "Towns question", "Gemeinden-Frage"]),
      field("faq.towns.a", ["Települések válasza", "Towns answer", "Gemeinden-Antwort"], true),
    ],
  },
  {
    id: "closing",
    title: { hu: "Zárás", en: "Closing", de: "Schluss" },
    fields: [
      field("closingTitle", ["Cím", "Title", "Titel"]),
      field("closingText", ["Szöveg", "Text", "Text"], true),
    ],
  },
];

export const LANDING_FIELDS = LANDING_GROUPS.flatMap((group) => group.fields);

const DEFAULTS: Record<UiLang, unknown> = {
  hu: huPublic.overview,
  en: enPublic.overview,
  de: dePublic.overview,
};

export const LANDING_EDITOR_CHROME: Record<
  UiLang,
  { title: string; note: string; save: string; saving: string; countHint: string }
> = {
  hu: {
    title: "Nyitóoldal szövegei",
    note: "Minden nyelv külön menthető. Az üres mező a beépített szöveget használja. A {{count}} helyére a csomag száma kerül.",
    save: "Szövegek mentése",
    saving: "Mentés…",
    countHint: "A {{count}} maradjon a szövegben.",
  },
  en: {
    title: "Landing copy",
    note: "Each language is saved on its own. An empty field uses the built-in text. {{count}} is replaced by the plan number.",
    save: "Save copy",
    saving: "Saving…",
    countHint: "Keep {{count}} in the text.",
  },
  de: {
    title: "Texte der Startseite",
    note: "Jede Sprache wird einzeln gespeichert. Ein leeres Feld nutzt den eingebauten Text. {{count}} wird durch die Paketzahl ersetzt.",
    save: "Texte speichern",
    saving: "Speichern…",
    countHint: "{{count}} im Text lassen.",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function stringAt(source: unknown, path: string): string {
  let current: unknown = source;
  for (const key of path.split(".")) {
    if (!isRecord(current)) return "";
    current = current[key];
  }
  return typeof current === "string" ? current : "";
}

function setAt(target: Record<string, unknown>, path: string, value: string) {
  const keys = path.split(".");
  let current = target;
  keys.slice(0, -1).forEach((key) => {
    const next = current[key];
    if (!isRecord(next)) current[key] = {};
    current = current[key] as Record<string, unknown>;
  });
  current[keys[keys.length - 1]] = value;
}

export function landingOverride(planOverrides: unknown, lang: Lang): unknown {
  if (!isRecord(planOverrides)) return {};
  const copy = planOverrides.landingCopy;
  if (!isRecord(copy)) return {};
  return isRecord(copy[lang]) ? copy[lang] : {};
}

export function landingDefault(lang: Lang, path: string): string {
  const ui: UiLang = isUiLang(lang) ? lang : "en";
  return stringAt(DEFAULTS[ui], path) || stringAt(DEFAULTS.hu, path);
}

export function fillCount(template: string, count?: string | number): string {
  if (count === undefined) return template;
  return template.replace(/\{\{\s*count\s*\}\}/g, String(count));
}

export function landingString(
  override: unknown,
  path: string,
  fallback: string,
  count?: string | number
): string {
  const custom = stringAt(override, path).trim();
  return fillCount(custom || fallback, count);
}

export type LandingDrafts = Record<Lang, Record<string, string>>;

export function landingDrafts(planOverrides: unknown): LandingDrafts {
  const drafts = {} as LandingDrafts;
  for (const lang of LANG_VALUES) {
    const override = landingOverride(planOverrides, lang);
    const fields: Record<string, string> = {};
    for (const item of LANDING_FIELDS) {
      const custom = stringAt(override, item.path).trim();
      fields[item.path] = custom || landingDefault(lang, item.path);
    }
    drafts[lang] = fields;
  }
  return drafts;
}

export function landingOverridesFromDrafts(drafts: LandingDrafts): Partial<Record<Lang, unknown>> {
  const stored: Partial<Record<Lang, unknown>> = {};
  for (const lang of LANG_VALUES) {
    const nested: Record<string, unknown> = {};
    let changed = false;
    for (const item of LANDING_FIELDS) {
      const value = (drafts[lang]?.[item.path] ?? "").trim().slice(0, 800);
      if (!value || value === landingDefault(lang, item.path)) continue;
      setAt(nested, item.path, value);
      changed = true;
    }
    if (changed) stored[lang] = nested;
  }
  return stored;
}

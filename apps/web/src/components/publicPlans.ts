import huPublic from "../i18n/locales/hu/public.json";
import enPublic from "../i18n/locales/en/public.json";
import dePublic from "../i18n/locales/de/public.json";
import { LANG_VALUES, isUiLang, type Lang, type UiLang } from "../types/enums";

export type PublicPlanId = "free" | "basic" | "premium";

export const PUBLIC_PLAN_IDS: PublicPlanId[] = ["free", "basic", "premium"];

export type PublicPlanNumbers = {
  priceHuf: number;
  places: number;
  events: number;
  languages: number;
};

/** Marketing defaults. Premium is the existing PRO subscription. */
export const PUBLIC_PLAN_DEFAULTS: Record<PublicPlanId, PublicPlanNumbers> = {
  free: { priceHuf: 0, places: 3, events: 0, languages: 1 },
  basic: { priceHuf: 3990, places: 30, events: 30, languages: 1 },
  premium: { priceHuf: 8990, places: 150, events: 200, languages: 3 },
};

/** Public marketing cards ↔ entitlement matrix plan keys. Municipal is not mapped. */
export const MATRIX_PLAN: Record<PublicPlanId, "FREE" | "BASIC" | "PRO"> = {
  free: "FREE",
  basic: "BASIC",
  premium: "PRO",
};

const MATRIX_LIMIT_KEY = {
  places: "placesMax",
  events: "eventsPerMonthMax",
  languages: "languagesMax",
} as const;

function finiteNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.round(n));
}

function cloneOverrides(planOverrides: unknown): Record<string, any> {
  if (!planOverrides || typeof planOverrides !== "object") return {};
  // structuredClone keeps Infinity; JSON.stringify would turn it into null.
  return structuredClone(planOverrides) as Record<string, any>;
}

/**
 * Landing numbers. Finite FREE / BASIC / PRO matrix limits win (single source of
 * truth). publicPlans fills gaps and always owns priceHuf. Infinity is ignored.
 */
export function resolvePublicPlans(
  planOverrides: unknown
): Record<PublicPlanId, PublicPlanNumbers> {
  const root =
    planOverrides && typeof planOverrides === "object"
      ? (planOverrides as Record<string, any>)
      : {};
  const customRoot =
    root.publicPlans && typeof root.publicPlans === "object" ? root.publicPlans : {};
  const result = {} as Record<PublicPlanId, PublicPlanNumbers>;

  for (const id of PUBLIC_PLAN_IDS) {
    const defaults = PUBLIC_PLAN_DEFAULTS[id];
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

/**
 * After the feature matrix is saved: copy finite FREE/BASIC/PRO limits into
 * publicPlans so marketing cards stay aligned. Leaves priceHuf and municipal alone.
 */
export function syncPublicPlansFromMatrixLimits(planOverrides: unknown): Record<string, any> {
  const root = cloneOverrides(planOverrides);
  const publicPlans: Record<string, any> = {
    ...(root.publicPlans && typeof root.publicPlans === "object" ? root.publicPlans : {}),
  };

  for (const id of PUBLIC_PLAN_IDS) {
    const limits = root[MATRIX_PLAN[id]]?.limits;
    if (!limits || typeof limits !== "object") continue;
    const current = { ...(publicPlans[id] || {}) };
    let touched = false;
    for (const field of ["places", "events", "languages"] as const) {
      const value = finiteNumber(limits[MATRIX_LIMIT_KEY[field]]);
      if (value === undefined) continue;
      current[field] = value;
      touched = true;
    }
    if (touched) publicPlans[id] = current;
  }

  if (Object.keys(publicPlans).length) root.publicPlans = publicPlans;
  return root;
}

/**
 * After public plan numbers are saved: write places/events/languages into the
 * matching FREE/BASIC/PRO matrix limits. Skips municipal / BUSINESS.
 */
export function syncMatrixLimitsFromPublicPlans(planOverrides: unknown): Record<string, any> {
  const root = cloneOverrides(planOverrides);
  const publicPlans = root.publicPlans;
  if (!publicPlans || typeof publicPlans !== "object") return root;

  for (const id of PUBLIC_PLAN_IDS) {
    const entry = publicPlans[id];
    if (!entry || typeof entry !== "object") continue;
    const matrixKey = MATRIX_PLAN[id];
    if (!root[matrixKey] || typeof root[matrixKey] !== "object") {
      root[matrixKey] = { limits: {}, features: {} };
    }
    if (!root[matrixKey].limits || typeof root[matrixKey].limits !== "object") {
      root[matrixKey].limits = {};
    }
    for (const field of ["places", "events", "languages"] as const) {
      const value = finiteNumber(entry[field]);
      if (value === undefined) continue;
      root[matrixKey].limits[MATRIX_LIMIT_KEY[field]] = value;
    }
  }

  return root;
}

/** Stable UiMessage prefix for the public pricing / plan cards block. */
export const PLAN_COPY_KEY_PREFIX = "public.overview.";

export type PlanCopyField = {
  /** Path under overview, e.g. plans.free.name or plansTitle. */
  path: string;
  label: Record<UiLang, string>;
  long?: boolean;
};

function field(path: string, label: [string, string, string], long = false): PlanCopyField {
  return { path, label: { hu: label[0], en: label[1], de: label[2] }, long };
}

/** Shared labels shown next to the numeric inputs in the admin editor. */
export const PLAN_FIELD_LABEL_FIELDS: PlanCopyField[] = [
  field("plans.fields.priceHuf", ["Havi díj címke", "Monthly price label", "Monatspreis-Label"]),
  field("plans.fields.places", ["Helyek címke", "Places label", "Orte-Label"]),
  field("plans.fields.events", ["Programok címke", "Events label", "Termine-Label"]),
  field("plans.fields.languages", ["Nyelvek címke", "Languages label", "Sprachen-Label"]),
];

export const PLAN_SECTION_FIELDS: PlanCopyField[] = [
  field("plansTitle", ["Szekció cím", "Section title", "Abschnittstitel"]),
  field("plansLead", ["Szekció bevezető", "Section lead", "Abschnitts-Einleitung"], true),
];

export const PLAN_SHARED_LINE_FIELDS: PlanCopyField[] = [
  field("plans.priceUnit", ["Ár mértékegysége", "Price unit", "Preiseinheit"]),
  field("plans.freeForever", ["Ingyenes megjegyzés", "Free note", "Hinweis kostenlos"]),
  field("plans.places", ["Helyek sora", "Places line", "Orte-Zeile"]),
  field("plans.eventsNone", ["Nincs program", "No events", "Keine Termine"]),
  field("plans.events", ["Programok sora", "Events line", "Termine-Zeile"]),
  field("plans.languagesOne", ["Egy nyelv sora", "One language line", "Eine Sprache"]),
  field("plans.languages", ["Több nyelv sora", "Languages line", "Sprachen-Zeile"]),
];

export const PLAN_CARD_FIELDS: Record<PublicPlanId, PlanCopyField[]> = {
  free: [
    field("plans.free.name", ["Név", "Name", "Name"]),
    field("plans.free.kicker", ["Felirat", "Kicker", "Dachzeile"]),
    field("plans.free.pitch", ["Leírás", "Pitch", "Text"], true),
    field("plans.free.cta", ["Gomb", "Button", "Schaltfläche"]),
  ],
  basic: [
    field("plans.basic.name", ["Név", "Name", "Name"]),
    field("plans.basic.kicker", ["Felirat", "Kicker", "Dachzeile"]),
    field("plans.basic.badge", ["Jelvény", "Badge", "Abzeichen"]),
    field("plans.basic.pitch", ["Leírás", "Pitch", "Text"], true),
    field("plans.basic.cta", ["Gomb", "Button", "Schaltfläche"]),
  ],
  premium: [
    field("plans.premium.name", ["Név", "Name", "Name"]),
    field("plans.premium.kicker", ["Felirat", "Kicker", "Dachzeile"]),
    field("plans.premium.pitch", ["Leírás", "Pitch", "Text"], true),
    field("plans.premium.cta", ["Gomb", "Button", "Schaltfläche"]),
  ],
};

export const PLAN_MUNICIPAL_FIELDS: PlanCopyField[] = [
  field("plans.municipal.name", ["Név", "Name", "Name"]),
  field("plans.municipal.kicker", ["Felirat", "Kicker", "Dachzeile"]),
  field("plans.municipal.pitch", ["Leírás", "Pitch", "Text"], true),
  field("plans.municipal.cta", ["Gomb", "Button", "Schaltfläche"]),
  field("plans.municipal.places", ["Helyek sora", "Places line", "Orte-Zeile"]),
  field("plans.municipal.events", ["Programok sora", "Events line", "Termine-Zeile"]),
  field("plans.municipal.languages", ["Nyelvek sora", "Languages line", "Sprachen-Zeile"]),
];

export const ALL_PLAN_COPY_FIELDS: PlanCopyField[] = [
  ...PLAN_SECTION_FIELDS,
  ...PLAN_FIELD_LABEL_FIELDS,
  ...PLAN_SHARED_LINE_FIELDS,
  ...PUBLIC_PLAN_IDS.flatMap((id) => PLAN_CARD_FIELDS[id]),
  ...PLAN_MUNICIPAL_FIELDS,
];

const OVERVIEW_DEFAULTS: Record<UiLang, unknown> = {
  hu: huPublic.overview,
  en: enPublic.overview,
  de: dePublic.overview,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function planCopyStringAt(source: unknown, path: string): string {
  let current: unknown = source;
  for (const key of path.split(".")) {
    if (!isRecord(current)) return "";
    current = current[key];
  }
  return typeof current === "string" ? current : "";
}

export function planCopyDefault(lang: Lang, path: string): string {
  const ui: UiLang = isUiLang(lang) ? lang : "en";
  return (
    planCopyStringAt(OVERVIEW_DEFAULTS[ui], path) ||
    planCopyStringAt(OVERVIEW_DEFAULTS.hu, path)
  );
}

export type PlanCopyDrafts = Record<Lang, Record<string, string>>;

export function emptyPlanCopyDrafts(): PlanCopyDrafts {
  const drafts = {} as PlanCopyDrafts;
  for (const lang of LANG_VALUES) {
    const fields: Record<string, string> = {};
    for (const item of ALL_PLAN_COPY_FIELDS) {
      fields[item.path] = planCopyDefault(lang, item.path);
    }
    drafts[lang] = fields;
  }
  return drafts;
}

/** Merge UiMessage rows into drafts. Empty DB values keep the JSON default. */
export function applyPlanCopyMessages(
  drafts: PlanCopyDrafts,
  lang: Lang,
  messages: Record<string, string>
): PlanCopyDrafts {
  const next = { ...drafts[lang] };
  for (const item of ALL_PLAN_COPY_FIELDS) {
    const key = `${PLAN_COPY_KEY_PREFIX}${item.path}`;
    const value = (messages[key] ?? "").trim();
    if (value) next[item.path] = value;
  }
  return { ...drafts, [lang]: next };
}

export function planCopyEntriesFromDraft(
  fields: Record<string, string> | undefined
): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const item of ALL_PLAN_COPY_FIELDS) {
    const text = (fields?.[item.path] ?? "").trim().slice(0, 800);
    if (text) entries[`${PLAN_COPY_KEY_PREFIX}${item.path}`] = text;
  }
  return entries;
}

export const PLAN_EDITOR_CHROME: Record<
  UiLang,
  { note: string; labelsTitle: string; sharedTitle: string; municipalTitle: string; countHint: string }
> = {
  hu: {
    note: "A hely / program / nyelv számok a jogosultsági mátrix FREE–BASIC–PRO limitjeivel együtt mentődnek. A nevek és a pitch kézzel szerkeszthető (UiMessage). A {{count}} a sablonokban marad; a kártyák a mentett limittel töltik ki.",
    labelsTitle: "Mezőcímkék (az admin és a nyilvános blokk közös szövegei)",
    sharedTitle: "Kártyák közös sorai ({{count}} sablonok)",
    municipalTitle: "Önkormányzati csomag (nincs mátrix-limit sync)",
    countHint: "A {{count}} maradjon a szövegben.",
  },
  en: {
    note: "Place / event / language numbers save together with FREE–BASIC–PRO matrix limits. Names and pitch stay manually editable (UiMessage). Keep {{count}} in the templates; cards fill it from the saved limit.",
    labelsTitle: "Field labels (shared admin and public block text)",
    sharedTitle: "Shared card lines ({{count}} templates)",
    municipalTitle: "Municipal plan (no matrix-limit sync)",
    countHint: "Keep {{count}} in the text.",
  },
  de: {
    note: "Orte / Termine / Sprachen werden mit den FREE–BASIC–PRO-Limits der Matrix gespeichert. Namen und Pitch bleiben manuell (UiMessage). {{count}} bleibt in den Vorlagen; die Karten füllen es aus dem Limit.",
    labelsTitle: "Feldbezeichnungen (gemeinsam für Admin und öffentlichen Block)",
    sharedTitle: "Gemeinsame Kartenzeilen ({{count}}-Vorlagen)",
    municipalTitle: "Gemeinde-Paket (kein Matrix-Limit-Sync)",
    countHint: "{{count}} im Text lassen.",
  },
};

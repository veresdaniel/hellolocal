export type I18nSectionId =
  | "general"
  | "publicChrome"
  | "overview"
  | "pricing"
  | "legal";

export type I18nSectionGroup = "general" | "pages";

export type I18nSectionDef = {
  id: I18nSectionId;
  group: I18nSectionGroup;
  /** Platform UI catalog prefixes. */
  prefixes: string[];
  /** Exclude these prefixes when matching (used for public chrome). */
  excludePrefixes?: string[];
  manageLanguages?: boolean;
};

/** Platform-level localization sections (superadmin only). */
export const I18N_SECTIONS: I18nSectionDef[] = [
  {
    id: "general",
    group: "general",
    prefixes: ["common.", "cookieConsent.", "error.", "offline.", "validation."],
    manageLanguages: true,
  },
  {
    id: "publicChrome",
    group: "general",
    prefixes: ["public."],
    excludePrefixes: ["public.overview.", "public.pricing.", "public.legal."],
  },
  {
    id: "overview",
    group: "pages",
    prefixes: ["public.overview."],
  },
  {
    id: "pricing",
    group: "pages",
    prefixes: ["public.pricing."],
  },
  {
    id: "legal",
    group: "pages",
    prefixes: ["public.legal."],
  },
];

export function sectionMatchesKey(section: I18nSectionDef, key: string): boolean {
  if (section.excludePrefixes?.some((prefix) => key.startsWith(prefix))) return false;
  return section.prefixes.some((prefix) => key.startsWith(prefix));
}

export function defaultSectionId(sections: I18nSectionDef[]): I18nSectionId | null {
  return sections[0]?.id ?? null;
}

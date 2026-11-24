/**
 * Public design presets: classic (navy) + atelier (2026 light aggregator).
 * Keep SSR mirror in sync: apps/web/ssr/publicThemePresets.js
 */

export const PUBLIC_THEME_PRESET_IDS = ["classic", "atelier"] as const;

export type PublicThemePresetId = (typeof PUBLIC_THEME_PRESET_IDS)[number];

export const DEFAULT_PUBLIC_THEME_PRESET: PublicThemePresetId = "classic";

export type PublicThemeColors = {
  bg: string;
  card: string;
  accent: string;
  header: string;
  ink: string;
  muted: string;
  onDark: string;
  onAccent: string;
};

/** Classic navy page wash (current default). */
export const CLASSIC_PUBLIC_THEME_COLORS: PublicThemeColors = {
  bg: "#1b1730",
  card: "#fffdf9",
  accent: "#c45c26",
  header: "#1b1730",
  ink: "#1b1730",
  muted: "#665d78",
  onDark: "#f2f4fb",
  onAccent: "#fffdf9",
};

/** 2026 light: cool off-white lap, dark ink, restrained teal accent (WCAG-friendly). */
export const ATELIER_PUBLIC_THEME_COLORS: PublicThemeColors = {
  bg: "#f4f5f7",
  card: "#ffffff",
  accent: "#0d6e6e",
  header: "#12141a",
  ink: "#12141a",
  muted: "#5a5f6d",
  onDark: "#f2f4fb",
  onAccent: "#ffffff",
};

export type PublicThemePresetMeta = {
  id: PublicThemePresetId;
  /** i18n key under admin.themeColors.* */
  labelKey: string;
  descriptionKey: string;
  colors: PublicThemeColors;
};

export const PUBLIC_THEME_PRESETS: Record<PublicThemePresetId, PublicThemePresetMeta> = {
  classic: {
    id: "classic",
    labelKey: "admin.themeColors.presetClassic",
    descriptionKey: "admin.themeColors.presetClassicHelp",
    colors: CLASSIC_PUBLIC_THEME_COLORS,
  },
  atelier: {
    id: "atelier",
    labelKey: "admin.themeColors.presetAtelier",
    descriptionKey: "admin.themeColors.presetAtelierHelp",
    colors: ATELIER_PUBLIC_THEME_COLORS,
  },
};

export function isPublicThemePresetId(value: unknown): value is PublicThemePresetId {
  return value === "classic" || value === "atelier";
}

function readPresetId(source: unknown): PublicThemePresetId | null {
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  const id = (source as Record<string, unknown>).presetId;
  return isPublicThemePresetId(id) ? id : null;
}

/** Site preset wins, then brand, else classic (no visual change for existing sites). */
export function resolvePublicThemePreset(
  siteTheme?: unknown,
  brandTheme?: unknown
): PublicThemePresetId {
  return (
    readPresetId(siteTheme) ||
    readPresetId(brandTheme) ||
    DEFAULT_PUBLIC_THEME_PRESET
  );
}

export function presetColors(presetId: PublicThemePresetId): PublicThemeColors {
  return { ...PUBLIC_THEME_PRESETS[presetId].colors };
}

export function sanitizePublicThemePresetId(
  value: unknown
): PublicThemePresetId | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (!isPublicThemePresetId(value)) {
    throw new Error("Invalid theme presetId");
  }
  return value;
}

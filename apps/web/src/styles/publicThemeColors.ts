/** Public design colors: site → brand → preset defaults. Native color inputs need #RRGGBB. */

import {
  CLASSIC_PUBLIC_THEME_COLORS,
  isPublicThemePresetId,
  presetColors,
  resolvePublicThemePreset,
  type PublicThemePresetId,
} from "./publicThemePresets";

export const PUBLIC_COLOR_KEYS = [
  "bg",
  "card",
  "accent",
  "header",
  "ink",
  "muted",
  "onDark",
  "onAccent",
] as const;

export type PublicColorKey = (typeof PUBLIC_COLOR_KEYS)[number];

export type PublicThemeColors = Record<PublicColorKey, string>;

/** Page navy/blue wash; cards stay cream; ink dark on cards; onDark for blue backdrop. */
export const DEFAULT_PUBLIC_THEME_COLORS: PublicThemeColors = {
  ...CLASSIC_PUBLIC_THEME_COLORS,
};

/** Re-export so call sites can import preset helpers from one module. */
export {
  PUBLIC_THEME_PRESET_IDS,
  PUBLIC_THEME_PRESETS,
  DEFAULT_PUBLIC_THEME_PRESET,
  ATELIER_PUBLIC_THEME_COLORS,
  CLASSIC_PUBLIC_THEME_COLORS,
  resolvePublicThemePreset,
  presetColors,
  isPublicThemePresetId,
  sanitizePublicThemePresetId,
  type PublicThemePresetId,
} from "./publicThemePresets";

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_RE.test(value.trim());
}

export function normalizeHexColor(value: string): string {
  const trimmed = value.trim();
  if (!HEX_RE.test(trimmed)) {
    throw new Error("Invalid hex color");
  }
  return trimmed.toLowerCase();
}

function pickHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return HEX_RE.test(trimmed) ? trimmed.toLowerCase() : fallback;
}

function readColorsObject(source: unknown): Partial<Record<PublicColorKey, unknown>> {
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const root = source as Record<string, unknown>;
  const nested =
    root.colors && typeof root.colors === "object" && !Array.isArray(root.colors)
      ? (root.colors as Record<string, unknown>)
      : root;
  return {
    bg: nested.bg ?? nested.background,
    card: nested.card ?? nested.surface,
    accent: nested.accent,
    header: nested.header ?? nested.navy,
    ink: nested.ink ?? nested.text ?? nested.inkOnCard,
    muted: nested.muted ?? nested.mutedOnCard,
    onDark: nested.onDark ?? nested.inkOnDark ?? nested.inkStrong,
    onAccent: nested.onAccent,
  };
}

function themeHasPresetId(source: unknown): boolean {
  if (!source || typeof source !== "object" || Array.isArray(source)) return false;
  return isPublicThemePresetId((source as Record<string, unknown>).presetId);
}

/**
 * Merge site over brand over preset defaults.
 * Site color snapshots without `presetId` are ignored so a platform preset
 * switch still reaches regions that only have a legacy baked color map.
 */
export function resolvePublicThemeColors(
  siteTheme?: unknown,
  brandTheme?: unknown
): PublicThemeColors {
  const presetId = resolvePublicThemePreset(siteTheme, brandTheme);
  const brand = readColorsObject(brandTheme);
  const site = themeHasPresetId(siteTheme) ? readColorsObject(siteTheme) : {};
  const defaults = presetColors(presetId);
  const out = { ...defaults };
  for (const key of PUBLIC_COLOR_KEYS) {
    out[key] = pickHex(site[key], pickHex(brand[key], defaults[key]));
  }
  return out;
}

export function sanitizePublicThemeColors(
  input: unknown
): Partial<PublicThemeColors> | null {
  if (input === null) return null;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Theme colors must be an object");
  }
  const raw = input as Record<string, unknown>;
  const source =
    raw.colors && typeof raw.colors === "object" && !Array.isArray(raw.colors)
      ? (raw.colors as Record<string, unknown>)
      : raw;
  const out: Partial<PublicThemeColors> = {};
  for (const key of PUBLIC_COLOR_KEYS) {
    const value = source[key];
    if (value === undefined || value === null || value === "") continue;
    if (!isValidHexColor(value)) {
      throw new Error(`Invalid hex color for ${key}`);
    }
    out[key] = normalizeHexColor(value);
  }
  return out;
}

function mixToward(hex: string, toward: string, amount: number): string {
  const parse = (h: string) => {
    const n = h.slice(1);
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  };
  const [ar, ag, ab] = parse(hex);
  const [br, bg, bb] = parse(toward);
  const ch = (a: number, b: number) =>
    Math.round(a + (b - a) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const n = hex.slice(1);
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** CSS custom properties for `:root` / `.hl-public`. */
export function publicThemeCssVars(
  siteTheme?: unknown,
  brandTheme?: unknown
): Record<string, string> {
  const presetId = resolvePublicThemePreset(siteTheme, brandTheme);
  const c = resolvePublicThemeColors(siteTheme, brandTheme);
  const atelier = presetId === "atelier";
  const bgMid = mixToward(c.bg, atelier ? "#ffffff" : "#3d5a9a", 0.18);
  const bgDeep = mixToward(c.bg, "#000000", atelier ? 0.04 : 0.18);
  const mist = mixToward(c.onDark, "#7a92c8", 0.45);
  const blue = mixToward(c.bg, "#3d5a9a", 0.55);
  const mutedOnDark = mixToward(c.onDark, "#7a92c8", 0.35);

  const bgImage = atelier
    ? [
        `radial-gradient(900px 480px at 12% -8%, ${hexToRgba(c.accent, 0.06)}, transparent 55%)`,
        `linear-gradient(180deg, ${c.bg} 0%, ${bgMid} 48%, ${c.bg} 100%)`,
      ].join(", ")
    : [
        `radial-gradient(980px 560px at 8% -4%, ${hexToRgba(blue, 0.55)}, transparent 58%)`,
        `radial-gradient(820px 520px at 100% 8%, ${hexToRgba(mist, 0.28)}, transparent 52%)`,
        `radial-gradient(700px 480px at 70% 55%, ${hexToRgba(c.accent, 0.08)}, transparent 60%)`,
        `radial-gradient(640px 400px at 20% 90%, ${hexToRgba(blue, 0.45)}, transparent 55%)`,
        `linear-gradient(180deg, ${c.bg} 0%, ${bgMid} 38%, ${c.bg} 72%, ${bgDeep} 100%)`,
      ].join(", ");

  return {
    "--hl-bg": c.bg,
    "--hl-bg-mid": bgMid,
    "--hl-bg-deep": bgDeep,
    "--hl-card": c.card,
    "--hl-surface": c.card,
    "--hl-surface-solid": c.card,
    "--hl-ink": c.ink,
    "--hl-muted": c.muted,
    "--hl-ink-on-card": c.ink,
    "--hl-muted-on-card": c.muted,
    "--hl-on-dark": c.onDark,
    "--hl-on-dark-strong": atelier ? c.ink : "#ffffff",
    "--hl-ink-strong": atelier ? c.ink : c.onDark,
    "--hl-muted-on-dark": atelier ? c.muted : mutedOnDark,
    "--hl-on-accent": c.onAccent,
    "--hl-accent": c.accent,
    "--hl-header": c.header,
    "--hl-navy": c.header,
    "--hl-blue": blue,
    "--hl-mist": mist,
    "--hl-line": hexToRgba(atelier ? c.ink : c.onDark, atelier ? 0.08 : 0.14),
    "--hl-line-on-card": hexToRgba(c.ink, 0.1),
    "--hl-bg-image": bgImage,
    /* Detail column + story sheet: atelier grows a touch with viewport. */
    "--hl-content-max": atelier ? "clamp(960px, 78vw, 1120px)" : "960px",
    "--hl-sheet-max": atelier ? "clamp(780px, 72vw, 920px)" : "760px",
    "--hl-radius-card": atelier ? "8px" : "16px",
    "--hl-radius-list": atelier ? "10px" : "20px",
    "--hl-radius-sheet": atelier ? "12px" : "28px",
    "--hl-radius-control": atelier ? "8px" : "10px",
    "--hl-public-pad-x": atelier ? "clamp(16px, 1.5vw, 24px)" : "clamp(16px, 1.8vw, 28px)",
    "--paper": c.bg,
    "--card": c.card,
    "--ink": atelier ? c.ink : c.onDark,
    "--ink-strong": atelier ? c.ink : "#ffffff",
    "--muted": atelier ? c.muted : mutedOnDark,
    "--line": hexToRgba(atelier ? c.ink : c.onDark, atelier ? 0.08 : 0.14),
    "--panel": c.card,
    "--panel-solid": c.card,
    "--accent": c.accent,
    "--navy": c.header,
    "--blue": blue,
    "--mist": mist,
  };
}

/** Inline style + `data-theme` for `.hl-public` shells. */
export function publicThemeShellProps(
  siteTheme?: unknown,
  brandTheme?: unknown
): { "data-theme": PublicThemePresetId; style: Record<string, string> } {
  return {
    "data-theme": resolvePublicThemePreset(siteTheme, brandTheme),
    style: publicThemeCssVars(siteTheme, brandTheme),
  };
}

export type PublicThemeSource = {
  colors?: Partial<PublicThemeColors> | null;
} | null | undefined;

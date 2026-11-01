/** Public design colors: site → brand → code defaults. Native color inputs need #RRGGBB. */

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
  bg: "#1b1730",
  card: "#fffdf9",
  accent: "#c45c26",
  header: "#1b1730",
  ink: "#1b1730",
  muted: "#665d78",
  onDark: "#f2f4fb",
  onAccent: "#fffdf9",
};

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

/** Merge site over brand over defaults. Empty / invalid hex falls through. */
export function resolvePublicThemeColors(
  siteTheme?: unknown,
  brandTheme?: unknown
): PublicThemeColors {
  const brand = readColorsObject(brandTheme);
  const site = readColorsObject(siteTheme);
  const out = { ...DEFAULT_PUBLIC_THEME_COLORS };
  for (const key of PUBLIC_COLOR_KEYS) {
    out[key] = pickHex(site[key], pickHex(brand[key], DEFAULT_PUBLIC_THEME_COLORS[key]));
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
  const c = resolvePublicThemeColors(siteTheme, brandTheme);
  const bgMid = mixToward(c.bg, "#3d5a9a", 0.18);
  const bgDeep = mixToward(c.bg, "#000000", 0.18);
  const mist = mixToward(c.onDark, "#7a92c8", 0.45);
  const blue = mixToward(c.bg, "#3d5a9a", 0.55);
  const mutedOnDark = mixToward(c.onDark, "#7a92c8", 0.35);

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
    "--hl-on-dark-strong": "#ffffff",
    "--hl-ink-strong": c.onDark,
    "--hl-muted-on-dark": mutedOnDark,
    "--hl-on-accent": c.onAccent,
    "--hl-accent": c.accent,
    "--hl-header": c.header,
    "--hl-navy": c.header,
    "--hl-blue": blue,
    "--hl-mist": mist,
    "--hl-line": hexToRgba(c.onDark, 0.14),
    "--hl-line-on-card": hexToRgba(c.ink, 0.1),
    "--hl-bg-image": [
      `radial-gradient(980px 560px at 8% -4%, ${hexToRgba(blue, 0.55)}, transparent 58%)`,
      `radial-gradient(820px 520px at 100% 8%, ${hexToRgba(mist, 0.28)}, transparent 52%)`,
      `radial-gradient(700px 480px at 70% 55%, ${hexToRgba(c.accent, 0.08)}, transparent 60%)`,
      `radial-gradient(640px 400px at 20% 90%, ${hexToRgba(blue, 0.45)}, transparent 55%)`,
      `linear-gradient(180deg, ${c.bg} 0%, ${bgMid} 38%, ${c.bg} 72%, ${bgDeep} 100%)`,
    ].join(", "),
    "--paper": c.bg,
    "--card": c.card,
    "--ink": c.onDark,
    "--ink-strong": "#ffffff",
    "--muted": mutedOnDark,
    "--line": hexToRgba(c.onDark, 0.14),
    "--panel": c.card,
    "--panel-solid": c.card,
    "--accent": c.accent,
    "--navy": c.header,
    "--blue": blue,
    "--mist": mist,
  };
}

export type PublicThemeSource = {
  colors?: Partial<PublicThemeColors> | null;
} | null | undefined;

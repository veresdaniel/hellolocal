/** Curated public-site faces (Latin-ext). Defaults are sans — no serif. */

export const PUBLIC_FONT_IDS = ["source-sans-3", "inter", "poppins", "fraunces"] as const;

export type PublicFontId = (typeof PUBLIC_FONT_IDS)[number];

export const DEFAULT_HEADING_FONT: PublicFontId = "source-sans-3";
export const DEFAULT_BODY_FONT: PublicFontId = "source-sans-3";

const FONT_STACKS: Record<PublicFontId, string> = {
  "source-sans-3": '"Source Sans 3", sans-serif',
  inter: "Inter, system-ui, sans-serif",
  poppins: "Poppins, system-ui, sans-serif",
  fraunces: 'Fraunces, "Iowan Old Style", Palatino, serif',
};

export function isPublicFontId(value: unknown): value is PublicFontId {
  return typeof value === "string" && (PUBLIC_FONT_IDS as readonly string[]).includes(value);
}

export function resolvePublicFontId(value: unknown, fallback: PublicFontId): PublicFontId {
  return isPublicFontId(value) ? value : fallback;
}

export function publicFontStack(id: PublicFontId): string {
  return FONT_STACKS[id];
}

export type PublicTypographyTheme = {
  headingFont?: unknown;
  bodyFont?: unknown;
  typography?: {
    headingFont?: unknown;
    bodyFont?: unknown;
  };
} | null | undefined;

export function readPublicFonts(theme: PublicTypographyTheme): {
  headingFont: PublicFontId;
  bodyFont: PublicFontId;
} {
  const headingFont = resolvePublicFontId(
    theme?.headingFont ?? theme?.typography?.headingFont,
    DEFAULT_HEADING_FONT
  );
  const bodyFont = resolvePublicFontId(
    theme?.bodyFont ?? theme?.typography?.bodyFont,
    DEFAULT_BODY_FONT
  );
  return { headingFont, bodyFont };
}

/** Inline CSS custom properties for `.hl-public`. */
export function publicFontCssVars(theme: PublicTypographyTheme): Record<string, string> {
  const { headingFont, bodyFont } = readPublicFonts(theme);
  return {
    "--font-heading": publicFontStack(headingFont),
    "--font-body": publicFontStack(bodyFont),
  };
}

import { useEffect } from "react";
import {
  publicFontCssVars,
  readPublicFonts,
  type PublicTypographyTheme,
} from "../styles/publicFonts";

/** Sets --font-heading / --font-body on :root from Brand.theme (or CSS defaults). */
export function useApplyPublicFonts(theme: PublicTypographyTheme) {
  const { headingFont, bodyFont } = readPublicFonts(theme);

  useEffect(() => {
    const vars = publicFontCssVars({ headingFont, bodyFont });
    const root = document.documentElement;
    root.style.setProperty("--font-heading", vars["--font-heading"]);
    root.style.setProperty("--font-body", vars["--font-body"]);
  }, [headingFont, bodyFont]);
}

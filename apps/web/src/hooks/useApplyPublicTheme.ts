import { useEffect } from "react";
import { publicThemeCssVars } from "../styles/publicThemeColors";

/** Sets public --hl-* color tokens on :root from site → brand → defaults. */
export function useApplyPublicTheme(siteTheme?: unknown, brandTheme?: unknown) {
  useEffect(() => {
    const vars = publicThemeCssVars(siteTheme, brandTheme);
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
  }, [siteTheme, brandTheme]);
}

export function publicThemeStyle(
  siteTheme?: unknown,
  brandTheme?: unknown
): Record<string, string> {
  return publicThemeCssVars(siteTheme, brandTheme);
}

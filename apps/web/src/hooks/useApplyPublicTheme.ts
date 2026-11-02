import { useEffect } from "react";
import { publicThemeCssVars } from "../styles/publicThemeColors";

/** Sets public --hl-* color tokens on :root from site → brand → defaults. */
export function useApplyPublicTheme(siteTheme?: unknown, brandTheme?: unknown) {
  // Value-based deps: inline theme objects from parents won't retrigger every render.
  const siteKey = JSON.stringify(siteTheme ?? null);
  const brandKey = JSON.stringify(brandTheme ?? null);

  useEffect(() => {
    const parsedSite = siteKey === "null" ? undefined : JSON.parse(siteKey);
    const parsedBrand = brandKey === "null" ? undefined : JSON.parse(brandKey);
    const vars = publicThemeCssVars(parsedSite, parsedBrand);
    const root = document.documentElement;
    const previous = new Map<string, string>();
    for (const [key, value] of Object.entries(vars)) {
      previous.set(key, root.style.getPropertyValue(key));
      root.style.setProperty(key, value);
    }
    return () => {
      for (const [key, value] of previous) {
        if (value) root.style.setProperty(key, value);
        else root.style.removeProperty(key);
      }
    };
  }, [siteKey, brandKey]);
}

export function publicThemeStyle(
  siteTheme?: unknown,
  brandTheme?: unknown
): Record<string, string> {
  return publicThemeCssVars(siteTheme, brandTheme);
}

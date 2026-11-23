import { DEFAULT_LANG, type Lang, isLang } from "../app/config";
import { swapPublicPathLang } from "./pathLangSwap";

function absoluteUrl(origin: string, pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const cleaned = path === "/" ? "/" : path.replace(/\/$/, "");
  return `${origin.replace(/\/$/, "")}${cleaned}`;
}

/**
 * Inject stable alternate hreflang (+ x-default) link tags for published languages.
 * Generated automatically from the current public path — no admin UI.
 */
export function applyHreflangAlternates(opts: {
  languages: readonly string[];
  currentLang: string;
  pathname?: string;
  origin?: string;
  defaultLang?: string;
}): () => void {
  if (typeof document === "undefined") return () => undefined;

  const published = opts.languages.map((code) => code.toLowerCase()).filter(isLang);
  const langs = published.length ? published : (["hu", "en", "de"] as Lang[]);
  const current = isLang(opts.currentLang) ? opts.currentLang : langs[0];
  const defaultLang = isLang(opts.defaultLang || "")
    ? (opts.defaultLang as Lang)
    : isLang(DEFAULT_LANG)
      ? DEFAULT_LANG
      : langs[0];
  const origin = (opts.origin || window.location.origin).replace(/\/$/, "");
  const pathname = opts.pathname ?? window.location.pathname;
  const managed = new Set<string>();

  for (const code of langs) {
    const href = absoluteUrl(origin, swapPublicPathLang(pathname, current, code));
    const selector = `link[rel="alternate"][hreflang="${code}"]`;
    let link = document.head.querySelector<HTMLLinkElement>(selector);
    if (!link) {
      link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = code;
      document.head.appendChild(link);
    }
    link.href = href;
    managed.add(code);
  }

  const xHref = absoluteUrl(origin, swapPublicPathLang(pathname, current, defaultLang));
  let xDefault = document.head.querySelector<HTMLLinkElement>(
    'link[rel="alternate"][hreflang="x-default"]'
  );
  if (!xDefault) {
    xDefault = document.createElement("link");
    xDefault.rel = "alternate";
    xDefault.hreflang = "x-default";
    document.head.appendChild(xDefault);
  }
  xDefault.href = xHref;
  managed.add("x-default");

  return () => {
    for (const code of managed) {
      document.head
        .querySelectorAll(`link[rel="alternate"][hreflang="${code}"]`)
        .forEach((el) => el.remove());
    }
  };
}

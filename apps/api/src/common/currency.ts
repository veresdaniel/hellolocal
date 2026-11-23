/**
 * Platform currency catalog helpers + per-lang mapping (landing plan cards).
 */
export const CURRENCY_BY_LANG_KEY = "platform.currencyByLang";

export type CurrencyByLang = Record<string, string>;

export const CURRENCY_BY_LANG_DEFAULTS: CurrencyByLang = {
  hu: "HUF",
  en: "EUR",
  de: "EUR",
};

export type CurrencySeed = {
  code: string;
  name: string;
  plural: string;
  symbol?: string | null;
};

export const DEFAULT_CURRENCIES: CurrencySeed[] = [
  { code: "HUF", name: "forint", plural: "forint", symbol: "Ft" },
  { code: "EUR", name: "euro", plural: "euros", symbol: "€" },
];

/** Normalize ISO-ish currency code (2–8 uppercase letters). */
export function normalizeCurrencyCode(raw: string | null | undefined): string | null {
  const code = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (code.length < 2 || code.length > 8) return null;
  return code;
}

export function parseCurrencyByLang(raw: string | null | undefined): CurrencyByLang {
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  const out: CurrencyByLang = { ...CURRENCY_BY_LANG_DEFAULTS };
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    for (const [lang, value] of Object.entries(parsed as Record<string, unknown>)) {
      const code = normalizeCurrencyCode(typeof value === "string" ? value : null);
      if (code) out[lang.toLowerCase()] = code;
    }
  }
  return out;
}

/** Resolve currency code for a UI language. */
export function currencyForLang(
  byLang: CurrencyByLang | null | undefined,
  lang: string | null | undefined
): string {
  const map = byLang && Object.keys(byLang).length ? byLang : CURRENCY_BY_LANG_DEFAULTS;
  const code = lang ? map[lang.toLowerCase()] : undefined;
  return code || map.hu || CURRENCY_BY_LANG_DEFAULTS.hu;
}

/**
 * Auto-fill name/plural/symbol from a currency code (Intl when available).
 * Manual admin edits always win after create.
 */
export function suggestCurrencyMeta(code: string): {
  name: string;
  plural: string;
  symbol: string | null;
} {
  const normalized = normalizeCurrencyCode(code) || "XXX";
  let name = normalized.toLowerCase();
  try {
    const display = new Intl.DisplayNames(["en"], { type: "currency" });
    const label = display.of(normalized);
    if (label) name = label.toLowerCase();
  } catch {
    /* ignore */
  }
  const known: Record<string, { name: string; plural: string; symbol: string | null }> = {
    HUF: { name: "forint", plural: "forint", symbol: "Ft" },
    EUR: { name: "euro", plural: "euros", symbol: "€" },
    USD: { name: "US dollar", plural: "US dollars", symbol: "$" },
    GBP: { name: "pound", plural: "pounds", symbol: "£" },
    CHF: { name: "Swiss franc", plural: "Swiss francs", symbol: "CHF" },
    CZK: { name: "Czech koruna", plural: "Czech korunas", symbol: "Kč" },
    PLN: { name: "złoty", plural: "złotys", symbol: "zł" },
    RON: { name: "Romanian leu", plural: "Romanian lei", symbol: "lei" },
  };
  if (known[normalized]) return known[normalized];
  const plural = name.endsWith("s") ? name : `${name}s`;
  return { name, plural, symbol: null };
}

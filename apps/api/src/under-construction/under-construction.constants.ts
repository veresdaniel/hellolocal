/** AppSetting keys for the public "under development" gate. */
export const UC_ENABLED_KEY = "underConstruction.enabled";
export const UC_ACCESS_TOKEN_KEY = "underConstruction.accessToken";
export const UC_TOKEN_UPDATED_AT_KEY = "underConstruction.tokenUpdatedAt";
export const UC_COPY_KEY = "underConstruction.copy";

/** Query param for preview access links: `?access=<token>`. */
export const UC_QUERY_PARAM = "access";

/** Cookie set after a valid query token so later navigations stay open. */
export const UC_COOKIE_NAME = "hl_uc_access";

/**
 * Cookie Max-Age (seconds). Long-lived: access lasts until the token is
 * regenerated or invalidated (cookie value must still match the current token).
 * Browsers may clamp (e.g. Chrome ~400 days); validity is still token-bound.
 */
export const UC_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400;

export type UcLang = "hu" | "en" | "de";

export type UcCopyFields = {
  title: string;
  body: string;
  buttonLabel: string;
};

export type UcCopyByLang = Record<UcLang, UcCopyFields>;

export const UC_DEFAULT_COPY: UcCopyByLang = {
  hu: {
    title: "Fejlesztés alatt",
    body: "Az oldal jelenleg fejlesztés alatt áll. Hamarosan visszatérünk.",
    buttonLabel: "",
  },
  en: {
    title: "Under development",
    body: "This site is currently under development. Please check back soon.",
    buttonLabel: "",
  },
  de: {
    title: "In Entwicklung",
    body: "Diese Seite befindet sich derzeit in Entwicklung. Bitte schauen Sie bald wieder vorbei.",
    buttonLabel: "",
  },
};

export const UC_SECRET_KEYS = [UC_ACCESS_TOKEN_KEY] as const;
